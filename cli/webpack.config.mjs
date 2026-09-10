import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';

const cliDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(cliDirectory, '..');
const outputDirectory = resolve(cliDirectory, 'dist');
const packageJson = JSON.parse(readFileSync(resolve(cliDirectory, 'package.json'), 'utf8'));
const serverExternalPackages = new Set(Object.keys(packageJson.dependencies ?? {}));

const aliases = {
  '@ailaflow/model$': resolve(rootDirectory, 'model/src/index.ts'),
  '@aibindkit/core$': resolve(rootDirectory, '@aibindkit/core/src/index.ts'),
  '@aibindkit/express$': resolve(rootDirectory, '@aibindkit/express/src/index.ts'),
  '@aibindkit/llm$': resolve(rootDirectory, '@aibindkit/llm/src/index.ts'),
  '@aibindkit/react$': resolve(rootDirectory, '@aibindkit/react/src/index.ts'),
  '@aibindkit/react/css/chat.css$': resolve(rootDirectory, '@aibindkit/react/css/chat.css')
};

const sourceRule = {
  test: /\.tsx?$/,
  exclude: /node_modules/,
  use: {
    loader: 'swc-loader',
    options: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true
        },
        transform: {
          useDefineForClassFields: false,
          react: {
            runtime: 'automatic'
          }
        },
        target: 'es2022'
      }
    }
  }
};

function shared(name, mode) {
  return {
    name,
    mode,
    devtool: mode === 'development' ? 'source-map' : false,
    module: {
      rules: [sourceRule]
    },
    resolve: {
      alias: aliases,
      extensions: ['.tsx', '.ts', '.mjs', '.js', '.json']
    },
    stats: 'errors-warnings'
  };
}

function packageName(request) {
  if (request.startsWith('@')) {
    return request.split('/').slice(0, 2).join('/');
  }
  return request.split('/')[0];
}

function externalizeServerDependency({ request }, callback) {
  if (request && serverExternalPackages.has(packageName(request))) {
    callback(null, `commonjs ${request}`);
    return;
  }
  callback();
}

function portalConfig(mode) {
  const config = shared('portal', mode);
  config.target = 'web';
  config.entry = resolve(rootDirectory, 'portal/src/main.tsx');
  config.output = {
    path: resolve(outputDirectory, 'portal'),
    filename: mode === 'production' ? 'assets/app.[contenthash].js' : 'assets/app.js',
    publicPath: '/'
  };
  config.module.rules.push({
    test: /\.css$/,
    use: [
      MiniCssExtractPlugin.loader,
      'css-loader',
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [tailwindcss({ base: rootDirectory })]
          }
        }
      }
    ]
  });
  config.plugins = [
    new MiniCssExtractPlugin({
      filename: mode === 'production' ? 'assets/app.[contenthash].css' : 'assets/app.css'
    }),
    new HtmlWebpackPlugin({
      template: resolve(rootDirectory, 'portal/index.html')
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: resolve(rootDirectory, 'portal/public/assets/steps'),
          to: 'assets/steps'
        }
      ]
    })
  ];
  return config;
}

function serverConfig(mode) {
  const config = shared('server', mode);
  config.target = 'node22';
  config.entry = resolve(rootDirectory, 'server/src/main.ts');
  config.output = {
    path: resolve(outputDirectory, 'server'),
    filename: 'index.cjs',
    library: { type: 'commonjs2' }
  };
  config.externalsPresets = { node: true };
  config.externals = [externalizeServerDependency];
  config.optimization = { minimize: false };
  return config;
}

function cliConfig(mode) {
  const config = shared('cli', mode);
  config.module.parser = { javascript: { importMeta: false } };
  config.target = 'node22';
  config.entry = resolve(cliDirectory, 'src/cli.ts');
  config.output = {
    path: outputDirectory,
    filename: 'cli.mjs',
    module: true,
    chunkFormat: 'module'
  };
  config.experiments = { outputModule: true };
  config.externalsPresets = { node: true };
  config.plugins = [
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
      entryOnly: true
    })
  ];
  config.optimization = { minimize: false };
  return config;
}

function bridgeServerConfig(mode) {
  const config = shared('bridge-server', mode);
  config.target = 'node24';
  config.entry = resolve(rootDirectory, 'bridge/server/src/main.ts');
  config.output = {
    path: resolve(outputDirectory, 'runtime/bridge/server'),
    filename: 'index.cjs',
    library: { type: 'commonjs2' }
  };
  config.externalsPresets = { node: true };
  config.optimization = { minimize: false };
  config.ignoreWarnings = [{ module: /express[\\/]lib[\\/]view\.js/, message: /Critical dependency/ }];
  config.plugins = [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: resolve(rootDirectory, 'server/assets'),
          to: resolve(outputDirectory, 'runtime/assets')
        },
        {
          from: resolve(rootDirectory, 'bridge/lib/package.json'),
          to: resolve(outputDirectory, 'runtime/bridge/lib/package.json'),
          transform(content) {
            const source = JSON.parse(content.toString());
            return JSON.stringify(
              {
                name: source.name,
                version: source.version,
                type: source.type,
                main: source.main,
                module: source.module,
                types: source.types,
                exports: source.exports
              },
              null,
              2
            );
          }
        }
      ]
    })
  ];
  return config;
}

function bridgeLibraryConfig(mode, format) {
  const config = shared(`bridge-library-${format}`, mode);
  config.target = 'node22';
  config.entry = resolve(rootDirectory, 'bridge/lib/src/lib.ts');
  config.externalsPresets = { node: true };
  config.output = {
    path: resolve(outputDirectory, `runtime/bridge/lib/dist/${format}`),
    filename: format === 'esm' ? 'index.mjs' : 'index.cjs',
    library: { type: format === 'esm' ? 'module' : 'commonjs2' },
    ...(format === 'esm' ? { module: true, chunkFormat: 'module' } : {})
  };
  if (format === 'esm') {
    config.experiments = { outputModule: true };
  }
  config.optimization = { minimize: mode === 'production' };
  return config;
}

export default (_environment, arguments_) => {
  const mode = arguments_.mode === 'production' ? 'production' : 'development';
  return [
    cliConfig(mode),
    portalConfig(mode),
    serverConfig(mode),
    bridgeServerConfig(mode),
    bridgeLibraryConfig(mode, 'cjs'),
    bridgeLibraryConfig(mode, 'esm')
  ];
};

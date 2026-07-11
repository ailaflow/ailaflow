import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const externalPackages = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {})
];

function external(id) {
  return externalPackages.some(packageName => id === packageName || id.startsWith(`${packageName}/`));
}

const ts = typescript({
  useTsconfigDeclarationDir: true,
  clean: true
});

export default [
  {
    input: './src/index.ts',
    plugins: [ts],
    cache: false,
    external,
    output: [
      {
        file: './lib/esm/index.js',
        format: 'es'
      },
      {
        file: './lib/cjs/index.cjs',
        format: 'cjs',
        exports: 'named'
      }
    ]
  },
  {
    input: './build/index.d.ts',
    plugins: [dts()],
    cache: false,
    external,
    output: [
      {
        file: './lib/index.d.ts',
        format: 'es'
      }
    ]
  }
];

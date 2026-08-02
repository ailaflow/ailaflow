import dts from 'rollup-plugin-dts';
import typescript from 'rollup-plugin-typescript2';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const externalPackages = [...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.peerDependencies ?? {})];

const ts = typescript({
  useTsconfigDeclarationDir: true
});

export default [
  {
    input: './src/lib.ts',
    plugins: [ts],
    cache: false,
    output: [
      {
        file: './dist/esm/index.mjs',
        format: 'es'
      },
      {
        file: './dist/cjs/index.cjs',
        format: 'cjs',
        exports: 'named'
      }
    ]
  },
  {
    input: './build/lib.d.ts',
    plugins: [dts()],
    cache: false,
    output: [
      {
        file: './dist/index.d.ts',
        format: 'es'
      }
    ]
  }
];

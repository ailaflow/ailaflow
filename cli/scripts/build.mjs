import { execFile } from 'node:child_process';
import { chmod, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import webpack from 'webpack';
import createConfigurations from '../webpack.config.mjs';

const execFileAsync = promisify(execFile);
const cliDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDirectory = resolve(cliDirectory, '..');
const outputDirectory = resolve(cliDirectory, 'dist');

await rm(outputDirectory, { recursive: true, force: true });

const configurations = createConfigurations({}, { mode: 'production' });
const compiler = webpack(configurations);
const stats = await new Promise((resolveBuild, rejectBuild) => {
  compiler.run((error, result) => {
    compiler.close(closeError => {
      if (error || closeError) {
        rejectBuild(error ?? closeError);
        return;
      }
      resolveBuild(result);
    });
  });
});

process.stdout.write(`${stats.toString({ colors: true, preset: 'errors-warnings' })}\n`);
if (stats.hasErrors()) {
  process.exitCode = 1;
} else {
  const declarationDirectory = resolve(outputDirectory, 'runtime/bridge/lib/dist/types');
  await execFileAsync(
    'pnpm',
    [
      'exec',
      'tsc',
      '-p',
      resolve(rootDirectory, 'bridge/lib/tsconfig.json'),
      '--emitDeclarationOnly',
      '--declarationDir',
      declarationDirectory,
      '--outDir',
      declarationDirectory
    ],
    { cwd: rootDirectory }
  );
  await chmod(resolve(outputDirectory, 'cli.mjs'), 0o755);
}

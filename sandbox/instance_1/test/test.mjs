import { readInput, writeOutput, rpc } from '@aila/bridge-lib';

async function main() {
  const input = readInput();

  //const res = await rpc('test', { hello: 'world' });

  writeOutput({
    name: 'test',
    version: '1.0.0',
    //res,
    input
  });
}

main();

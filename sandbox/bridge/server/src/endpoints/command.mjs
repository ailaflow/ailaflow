import { join } from 'path';
import { spawn } from 'node:child_process';
import { SseResponse } from './sse-response.mjs';
import { Logger } from '../core/logger.mjs';

const INSTANCE_ID = process.env.INSTANCE_ID;
const INSTANCE_PATH = `/${INSTANCE_ID}/`;

export default function setup(app) {
  const logger = new Logger('CommandEndpoint');

  app.post('/command', (req, res) => {
    const cwd = join(INSTANCE_PATH, req.body.folderPath);
    const command = req.body.command;
    const args = req.body.args ?? [];
    const stdin = req.body.stdin;

    logger.log(`Received command: ${command} ${args.join(' ')}, cwd: ${cwd}`);

    const sse = new SseResponse(res);
    const child = spawn(command, args, {
      cwd,
      env: {
        NODE_COMPILE_CACHE: '/tmp/node-compile-cache'
      },
      shell: false
    });

    if (stdin) {
      child.stdin.setEncoding('utf8');
      child.stdin.on('error', error => {
        sse.writeEvent({ error: error.message });
        sse.end();
      });
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', stdout => sse.writeEvent({ stdout }));
    child.stderr.on('data', stderr => sse.writeEvent({ stderr }));
    child.on('error', error => {
      sse.writeEvent({ error: error.message });
      sse.end();
    });
    child.on('close', (code, signal) => {
      sse.writeEvent({ close: { code: code ?? -2, signal } });
      sse.end();
    });

    sse.onClose(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
  });
}

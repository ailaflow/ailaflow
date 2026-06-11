import { spawn } from 'node:child_process';
import type { Express, Request, Response } from 'express';
import { Logger } from '../core/logger';
import { SseResponse } from '../core/sse-response';

interface CommandRequestBody {
  cwd: string;
  command: string;
  args?: string[];
  stdin?: string;
}

export function setupCommandEndpoint(app: Express): void {
  const logger = new Logger('CommandEndpoint');

  app.post('/command', (req: Request<unknown, unknown, CommandRequestBody>, res: Response) => {
    const cwd = req.body.cwd;
    const command = req.body.command;
    const args = req.body.args ?? [];
    const stdin = req.body.stdin;

    logger.log(`Received command: ${command} ${args.join(' ')}, cwd: ${cwd}`);

    const sse = new SseResponse(res);
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        NODE_COMPILE_CACHE: '/tmp/node_compile_cache'
      },
      shell: false
    });

    if (stdin) {
      child.stdin.on('error', error => {
        sse.writeEvent({ error: error.message });
        sse.end();
      });
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (stdout: string) => sse.writeEvent({ stdout }));
    child.stderr.on('data', (stderr: string) => sse.writeEvent({ stderr }));
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

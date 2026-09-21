import { spawn } from 'node:child_process';
import type { HttpServer } from '../core/http-server';
import { Logger } from '../core/logger';
import { SseResponse } from '../core/sse-response';
import { TokenMiddleware } from '../core/token-middleware';

interface ExecuteCommandRequest {
  cwd: string;
  command: string;
  args?: string[];
  stdin?: string;
  env?: Record<string, string>;
}

export function setupExecuteCommandEndpoint(app: HttpServer, tokenMiddleware: TokenMiddleware): void {
  const logger = new Logger('CommandEndpoint');

  app.post<ExecuteCommandRequest>('/command', (req, res) => {
    tokenMiddleware.assert(req);

    const cwd = req.body.cwd;
    const command = req.body.command;
    const args = req.body.args ?? [];
    const stdin = req.body.stdin;

    logger.log(`Received command: ${command} ${args.join(' ')}, cwd: ${cwd}`);

    const env = {
      ...process.env,
      NODE_COMPILE_CACHE: '/tmp/node_compile_cache'
    };
    if (req.body.env) {
      Object.assign(env, req.body.env);
    }

    const sse = new SseResponse(res);
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false
    });

    if (stdin) {
      child.stdin.on('error', error => {
        sse.write({ error: error.message });
        sse.end();
      });
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (stdout: string) => sse.write({ stdout }));
    child.stderr.on('data', (stderr: string) => sse.write({ stderr }));
    child.on('error', error => {
      sse.write({ error: error.message });
      sse.end();
    });
    child.on('close', (code, signal) => {
      sse.write({ close: { code: code ?? -2, signal } });
      sse.end();
    });

    sse.onClose(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
  });
}

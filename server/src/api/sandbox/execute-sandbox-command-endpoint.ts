import { executeSandboxCommandRequestSchema, ExecuteSandboxCommandUpdate } from '@aila/model';
import { Request, Response } from 'express';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { SseResponse } from '../../utilities/sse-response';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';

export class ExecuteSandboxCommandEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/sandboxes/:name/commands';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly sandboxInstanceManager: SandboxInstanceManager) {}

  public async handle(req: Request, res: Response): Promise<void> {
    const sandboxName = String(req.params.name);
    const request = parseBody(executeSandboxCommandRequestSchema, req.body);
    const abortController = new AbortController();
    const sseResponse = new SseResponse<ExecuteSandboxCommandUpdate>(res);
    sseResponse.onClose(() => abortController.abort());

    try {
      const instance = await this.sandboxInstanceManager.getOrCreate(abortController.signal, sandboxName);
      await instance.executeCommand(
        abortController.signal,
        {
          cwd: request.cwd,
          command: '/bin/sh',
          args: ['-lc', request.command]
        },
        {
          onData: update => {
            if (update.stdout) {
              sseResponse.send({ stdout: update.stdout });
            }
            if (update.stderr) {
              sseResponse.send({ stderr: update.stderr });
            }
            if (update.error) {
              sseResponse.send({ error: update.error });
            }
            if (update.close) {
              sseResponse.send({ result: update.close });
            }
          },
          onClose() {
            // Errors are propagated by SandboxRuntime.runCommand().
          }
        }
      );
    } catch (error) {
      if (!abortController.signal.aborted) {
        sseResponse.send({ error: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      res.end();
    }
  }
}

import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { UserRepository } from '../../repositories/user/user-repository';

const requestSchema = z.object({
  name: z.string()
});

export class UserExistsRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'userExists';

  public constructor(private readonly repository: UserRepository) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object): Promise<boolean> {
    const request = requestSchema.parse(data);
    const user = await this.repository.tryGetUser(abortSignal, request.name);
    return Boolean(user);
  }
}

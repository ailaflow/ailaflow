import z from 'zod';
import { Cipher } from '../../core/cipher/cipher';
import { CipherKey } from '../../core/cipher/cipher-key-store';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  secret: z.string()
});

export class EncryptSecretRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'encryptSecret';

  public constructor(private readonly cipher: Cipher) {}

  public async handle(_signal: AbortSignal, _sandboxName: string, _executionId: string, data: unknown): Promise<string> {
    const request = requestSchema.parse(data);
    return this.cipher.encryptSecret(request.secret, CipherKey.ProcessSecretEncryption);
  }
}

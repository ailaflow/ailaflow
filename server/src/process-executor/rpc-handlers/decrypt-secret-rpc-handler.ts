import z from 'zod';
import { Cipher } from '../../core/cipher/cipher';
import { CipherKey } from '../../core/cipher/cipher-key-store';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';

const requestSchema = z.object({
  encryptedSecret: z.string()
});

export class DecryptSecretRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'decryptSecret';

  public constructor(private readonly cipher: Cipher) {}

  public async handle(_signal: AbortSignal, _sandboxName: string, _executionId: string, data: unknown): Promise<string> {
    const request = requestSchema.parse(data);
    return this.cipher.decryptSecret(request.encryptedSecret, CipherKey.ProcessSecretEncryption);
  }
}

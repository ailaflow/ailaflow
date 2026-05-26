import { createHash } from 'crypto';

export class PasswordHasher {
  public async hash(password: string): Promise<string> {
    const hash = createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }
}

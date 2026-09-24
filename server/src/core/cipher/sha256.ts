import { hash } from 'node:crypto';

export function sha256(data: string): string {
  return hash('sha256', data, 'base64url');
}

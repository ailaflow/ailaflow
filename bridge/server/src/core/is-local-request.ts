import { IncomingMessage } from 'node:http';

export function isLocalRequest(req: IncomingMessage): boolean {
  const ip = req.socket.remoteAddress;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

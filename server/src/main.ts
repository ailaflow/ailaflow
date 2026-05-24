import { Server } from './server';

const initAbortController = new AbortController();
let server: Server | null = null;

Server.create(initAbortController.signal).then(s => (server = s));

process.on('SIGTERM', () => {
  initAbortController.abort();
  server?.close();
});

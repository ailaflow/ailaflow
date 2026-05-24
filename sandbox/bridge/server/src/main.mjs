import express, { json } from 'express';
import health from './endpoints/health.mjs';
import command from './endpoints/command.mjs';
import rpc from './endpoints/rpc.mjs';
import { Logger } from './core/logger.mjs';

const PORT = 4096;
const ENDPOINTS = [health, command, rpc];

const logger = new Logger('Main');
const app = express();
app.use(json());
for (const setup of ENDPOINTS) {
  setup(app);
}
app.listen(PORT, () => {
  logger.log(`Bridge is running on port ${PORT}...`);
});

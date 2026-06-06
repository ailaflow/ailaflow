import express, { json } from 'express';
import { Logger } from './core/logger';
import { setupCommandEndpoint } from './endpoints/command';
import { setupHealthEndpoint } from './endpoints/health';
import { setupRpcEndpoint } from './endpoints/rpc';

const PORT = 4096;
const ENDPOINTS = [setupHealthEndpoint, setupCommandEndpoint, setupRpcEndpoint];

const logger = new Logger('Main');
const app = express();
app.use(json());
for (const setup of ENDPOINTS) {
  setup(app);
}
app.listen(PORT, () => {
  logger.log(`Bridge is running on port ${PORT}...`);
});

import express, { json } from 'express';
import { Logger } from './core/logger';
import { setupExecuteCommandEndpoint } from './endpoints/execute-command';
import { setupGetHealthEndpoint } from './endpoints/get-health';
import { setupRpcEndpoints } from './endpoints/rpc';

const PORT = 4096;

const logger = new Logger('Main');
const app = express();
app.use(json());

setupGetHealthEndpoint(app);
setupExecuteCommandEndpoint(app);
setupRpcEndpoints(app);

app.listen(PORT, () => {
  logger.log(`Bridge is running on port ${PORT}...`);
});

import { HttpServer } from './core/http-server';
import { Logger } from './core/logger';
import { setupExecuteCommandEndpoint } from './endpoints/execute-command';
import { setupGetHealthEndpoint } from './endpoints/get-health';
import { setupRpcEndpoints } from './endpoints/rpc';

const PORT = Number(process.env.PORT) || 4096;

const logger = new Logger('Main');
const app = new HttpServer();

setupGetHealthEndpoint(app);
setupExecuteCommandEndpoint(app);
setupRpcEndpoints(app);

app.listen(PORT, () => {
  logger.log(`Bridge is running on port ${PORT}...`);
});

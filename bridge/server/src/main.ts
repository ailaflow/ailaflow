import { HttpServer } from './core/http-server';
import { Logger } from './core/logger';
import { TokenMiddleware } from './core/token-middleware';
import { setupExecuteCommandEndpoint } from './endpoints/execute-command';
import { setupGetHealthEndpoint } from './endpoints/get-health';
import { setupRpcEndpoints } from './endpoints/rpc';

const PORT = Number(process.env.PORT) || 4096;
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;

if (!BRIDGE_TOKEN) {
  throw new Error('BRIDGE_TOKEN is not set');
}

const logger = new Logger('Main');
const app = new HttpServer();
const tokenMiddleware = new TokenMiddleware(BRIDGE_TOKEN);

setupGetHealthEndpoint(app);
setupExecuteCommandEndpoint(app, tokenMiddleware);
setupRpcEndpoints(app, tokenMiddleware);

app.listen(PORT, () => {
  logger.log(`Bridge is running on port ${PORT}...`);
});

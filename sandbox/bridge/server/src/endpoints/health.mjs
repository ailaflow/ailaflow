export default function setup(app) {
  app.get('/', (_, res) => {
    res.status(200).send('Bridge is running');
  });

  app.get('/health', (_, res) => {
    res.status(200).send({ status: 'ok' });
  });
}

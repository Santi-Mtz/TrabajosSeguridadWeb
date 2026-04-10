require('dotenv').config();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const authRoutes = require('./routes/auth.routes');

async function buildServer() {
  const app = Fastify({ logger: true });

  app.decorate('config', {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001'
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  app.get('/health', async () => ({
    statusCode: 200,
    intOpCode: 'GW_HEALTH_OK',
    message: 'API Gateway healthy',
    data: null
  }));

  await app.register(authRoutes, { prefix: '/auth' });

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT || 3000);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();

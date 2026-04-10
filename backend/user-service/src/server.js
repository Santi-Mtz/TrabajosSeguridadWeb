require('dotenv').config();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth.routes');

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  const useDbSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useDbSsl ? { rejectUnauthorized: false } : undefined
  });
  app.decorate('pg', pool);

  app.get('/health', async () => ({
    statusCode: 200,
    intOpCode: 'USR_HEALTH_OK',
    message: 'User service healthy',
    data: null
  }));

  await app.register(authRoutes, { prefix: '/auth' });

  app.addHook('onClose', async () => {
    await pool.end();
  });

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT || 3001);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();

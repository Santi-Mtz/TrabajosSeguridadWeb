require('dotenv').config();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const authRoutes = require('./routes/auth.routes');
const businessRoutes = require('./routes/business.routes');
const { GatewayDatabaseService } = require('./services/database.service');

function parseIntOpCode(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeCode = payload.intOpCode;
  return typeof maybeCode === 'string' && maybeCode.trim().length > 0 ? maybeCode.trim() : null;
}

async function buildServer() {
  const app = Fastify({ logger: true });
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);
  const rateLimitWindow = process.env.RATE_LIMIT_WINDOW || '1 minute';
  const db = new GatewayDatabaseService();

  app.decorate('config', {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    groupServiceUrl: process.env.GROUP_SERVICE_URL || 'http://localhost:3003',
    ticketServiceUrl: process.env.TICKET_SERVICE_URL || 'http://localhost:3002',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me'
  });

  app.decorate('gatewayDb', db);

  app.addHook('onRequest', async (request) => {
    request.gatewayStartTime = process.hrtime.bigint();
  });

  app.addHook('onError', async (request, _reply, error) => {
    if (!error) {
      request.gatewayErrorMessage = null;
      return;
    }

    const stack = typeof error.stack === 'string' ? error.stack : String(error.message || error);
    request.gatewayErrorMessage = stack.slice(0, 2000);
  });

  app.addHook('onResponse', async (request, reply) => {
    if (!app.gatewayDb.isEnabled()) {
      return;
    }

    const start = request.gatewayStartTime;
    const elapsedMs = typeof start === 'bigint'
      ? Number((process.hrtime.bigint() - start) / BigInt(1000000))
      : 0;
    const endpoint = request.routeOptions?.url || request.url;
    const method = request.method;
    const ipAddress = request.ip;
    const statusCode = reply.statusCode;
    const intOpCode = parseIntOpCode(reply.sent ? reply.payload : null);
    const errorMessage = statusCode >= 500 ? request.gatewayErrorMessage || null : null;
    const userId = Number(request.userClaims?.userId || 0) || null;

    try {
      await app.gatewayDb.query(
        `INSERT INTO gateway_request_logs
          (endpoint, method, user_id, ip_address, status_code, int_op_code, response_time_ms, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [endpoint, method, userId, ipAddress, statusCode, intOpCode, elapsedMs, errorMessage]
      );

      await app.gatewayDb.query(
        `INSERT INTO gateway_endpoint_metrics
          (endpoint, method, request_count, total_response_time_ms, avg_response_time_ms, updated_at)
         VALUES ($1, $2, 1, $3::bigint, $4::numeric, NOW())
         ON CONFLICT (endpoint, method)
         DO UPDATE SET
           request_count = gateway_endpoint_metrics.request_count + 1,
           total_response_time_ms = gateway_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms,
           avg_response_time_ms =
             ROUND(
               (gateway_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms)::numeric
               / (gateway_endpoint_metrics.request_count + 1),
               2
             ),
           updated_at = NOW()`,
        [endpoint, method, elapsedMs, elapsedMs]
      );
    } catch (error) {
      app.log.warn(error, 'No se pudieron persistir logs/metricas en BD.');
    }
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: rateLimitWindow,
    errorResponseBuilder: () => ({
      statusCode: 429,
      intOpCode: 'GW_RATE_LIMIT',
      message: 'Too many requests',
      data: null
    })
  });

  app.get('/health', async () => ({
    statusCode: 200,
    intOpCode: 'GW_HEALTH_OK',
    message: 'API Gateway healthy',
    data: null
  }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(businessRoutes);

  return app;
}

const port = Number(process.env.PORT || 3000);

buildServer()
  .then(async (app) => {
    if (app.gatewayDb.isEnabled()) {
      await app.gatewayDb.ensureSchema();
      app.log.info('Gateway DB schema lista para logs y metricas.');
    } else {
      app.log.warn('DATABASE_URL no configurada en gateway: logs y metricas en BD desactivados.');
    }

    await app.listen({ port, host: '0.0.0.0' });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

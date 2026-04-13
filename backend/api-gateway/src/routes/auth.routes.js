const { loginBodySchema, registerBodySchema, gatewayAuthResponseSchema } = require('../schemas/auth.schema');

const AUTH_COOKIE_NAME = 'auth.token';
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function shouldUseSecureCookies() {
  return process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
}

function buildAuthCookie(token) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`
  ];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildClearedAuthCookie() {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

async function forwardAuthRequest(fastify, request, reply, path) {
  const upstreamUrl = `${fastify.config.userServiceUrl}${path}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': request.ip,
        'user-agent': request.headers['user-agent'] || 'gateway'
      },
      body: JSON.stringify(request.body)
    });

    const payload = await upstreamResponse.json();
    const token = typeof payload?.data?.token === 'string' ? payload.data.token.trim() : '';

    if (upstreamResponse.ok && token) {
      reply.header('set-cookie', buildAuthCookie(token));
    }

    return reply.code(upstreamResponse.status).send(payload);
  } catch (error) {
    request.log.error(error, 'Error llamando user-service');
    return reply.code(502).send({
      statusCode: 502,
      intOpCode: 'GW_UPSTREAM_ERROR',
      message: 'No se pudo contactar al servicio de usuarios.',
      data: null
    });
  }
}

async function authRoutes(fastify) {
  fastify.post('/logout', {
    schema: {
      response: {
        200: gatewayAuthResponseSchema,
        500: gatewayAuthResponseSchema
      }
    }
  }, async (_request, reply) => {
    reply.header('set-cookie', buildClearedAuthCookie());
    return reply.code(200).send({
      statusCode: 200,
      intOpCode: 'GW_LOGOUT_OK',
      message: 'Sesion cerrada correctamente.',
      data: null
    });
  });

  fastify.post('/register', {
    schema: {
      body: registerBodySchema,
      response: {
        201: gatewayAuthResponseSchema,
        400: gatewayAuthResponseSchema,
        409: gatewayAuthResponseSchema,
        500: gatewayAuthResponseSchema,
        502: gatewayAuthResponseSchema
      }
    }
  }, async (request, reply) => forwardAuthRequest(fastify, request, reply, '/auth/register'));

  fastify.post('/login', {
    schema: {
      body: loginBodySchema,
      response: {
        200: gatewayAuthResponseSchema,
        400: gatewayAuthResponseSchema,
        401: gatewayAuthResponseSchema,
        403: gatewayAuthResponseSchema,
        500: gatewayAuthResponseSchema,
        502: gatewayAuthResponseSchema
      }
    }
  }, async (request, reply) => forwardAuthRequest(fastify, request, reply, '/auth/login'));
}

module.exports = authRoutes;

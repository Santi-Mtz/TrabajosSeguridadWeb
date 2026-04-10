const { loginBodySchema, gatewayAuthResponseSchema } = require('../schemas/auth.schema');

async function authRoutes(fastify) {
  fastify.post('/login', {
    schema: {
      body: loginBodySchema,
      response: {
        200: gatewayAuthResponseSchema,
        400: gatewayAuthResponseSchema,
        401: gatewayAuthResponseSchema,
        500: gatewayAuthResponseSchema,
        502: gatewayAuthResponseSchema
      }
    }
  }, async (request, reply) => {
    const upstreamUrl = `${fastify.config.userServiceUrl}/auth/login`;

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
  });
}

module.exports = authRoutes;

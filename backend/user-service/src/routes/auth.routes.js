const { loginBodySchema, authResponseSchema } = require('../schemas/auth.schema');

const GET_USER_BY_EMAIL_SQL = `
  SELECT id, username, email, is_active
  FROM users
  WHERE email = $1
  LIMIT 1
`;

const VERIFY_PASSWORD_SQL = `
  SELECT (password_hash = crypt($2, password_hash)) AS matches
  FROM users
  WHERE id = $1
  LIMIT 1
`;

const LOGIN_EVENT_OK_SQL = `
  INSERT INTO login_events (user_id, email_attempt, success, ip_address, user_agent, created_at)
  VALUES ($1, $2, TRUE, $3, $4, NOW())
  RETURNING created_at
`;

const LOGIN_EVENT_FAIL_SQL = `
  INSERT INTO login_events (user_id, email_attempt, success, ip_address, user_agent, created_at)
  VALUES ($1, $2, FALSE, $3, $4, NOW())
`;

const USER_PERMISSIONS_SQL = `
  SELECT COALESCE(ARRAY_AGG(p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
  FROM user_permissions up
  LEFT JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = $1
`;

async function authRoutes(fastify) {
  fastify.post('/login', {
    schema: {
      body: loginBodySchema,
      response: {
        200: authResponseSchema,
        401: authResponseSchema,
        403: authResponseSchema,
        500: authResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'] || 'unknown';

    try {
      const userResult = await fastify.pg.query(GET_USER_BY_EMAIL_SQL, [email]);

      if (userResult.rowCount === 0) {
        await fastify.pg.query(LOGIN_EVENT_FAIL_SQL, [null, email, ipAddress, userAgent]);

        return reply.code(401).send({
          statusCode: 401,
          intOpCode: 'USR_LOGIN_INVALID',
          message: 'Credenciales invalidas.',
          data: null
        });
      }

      const user = userResult.rows[0];
      const userId = Number(user.id);

      if (!user.is_active) {
        await fastify.pg.query(LOGIN_EVENT_FAIL_SQL, [userId, email, ipAddress, userAgent]);
        return reply.code(403).send({
          statusCode: 403,
          intOpCode: 'USR_LOGIN_INACTIVE',
          message: 'La cuenta esta inactiva. Contacta a un administrador.',
          data: null
        });
      }

      const passwordCheckResult = await fastify.pg.query(VERIFY_PASSWORD_SQL, [userId, password]);
      const isValidPassword = Boolean(passwordCheckResult.rows[0]?.matches);

      if (!isValidPassword) {
        await fastify.pg.query(LOGIN_EVENT_FAIL_SQL, [userId, email, ipAddress, userAgent]);
        return reply.code(401).send({
          statusCode: 401,
          intOpCode: 'USR_LOGIN_INVALID',
          message: 'Credenciales invalidas.',
          data: null
        });
      }

      const loginEventResult = await fastify.pg.query(LOGIN_EVENT_OK_SQL, [
        userId,
        user.email,
        ipAddress,
        userAgent
      ]);

      const permissionsResult = await fastify.pg.query(USER_PERMISSIONS_SQL, [userId]);
      const permissions = permissionsResult.rows[0]?.permissions || [];
      const loginDate = loginEventResult.rows[0].created_at;

      return reply.code(200).send({
        statusCode: 200,
        intOpCode: 'USR_LOGIN_OK',
        message: 'Login exitoso.',
        data: {
          id: userId,
          username: user.username,
          email: user.email,
          login_date: loginDate.toISOString(),
          permissions
        }
      });
    } catch (error) {
      request.log.error(error, 'Error en login');
      return reply.code(500).send({
        statusCode: 500,
        intOpCode: 'USR_LOGIN_ERROR',
        message: 'Error interno en servicio de usuarios.',
        data: null
      });
    }
  });
}

module.exports = authRoutes;

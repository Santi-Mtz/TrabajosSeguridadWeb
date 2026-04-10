const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', minLength: 5, maxLength: 120 },
    password: { type: 'string', minLength: 6, maxLength: 128 }
  }
};

const authResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['statusCode', 'intOpCode', 'message', 'data'],
  properties: {
    statusCode: { type: 'integer' },
    intOpCode: { type: 'string' },
    message: { type: 'string' },
    data: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'username', 'email', 'login_date', 'permissions'],
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            login_date: { type: 'string' },
            permissions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        {
          type: 'null'
        }
      ]
    }
  }
};

module.exports = {
  loginBodySchema,
  authResponseSchema
};

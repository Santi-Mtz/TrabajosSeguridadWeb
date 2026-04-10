const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', minLength: 5, maxLength: 120 },
    password: { type: 'string', minLength: 6, maxLength: 128 }
  }
};

const gatewayAuthResponseSchema = {
  type: 'object',
  additionalProperties: true
};

module.exports = {
  loginBodySchema,
  gatewayAuthResponseSchema
};

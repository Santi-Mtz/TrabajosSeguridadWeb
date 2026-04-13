const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', minLength: 5, maxLength: 120 },
    password: { type: 'string', minLength: 6, maxLength: 128 }
  }
};

const registerBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['username', 'email', 'password'],
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 80 },
    email: { type: 'string', format: 'email', minLength: 5, maxLength: 120 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    full_name: { type: 'string', minLength: 1, maxLength: 120 },
    address: { type: 'string', minLength: 1, maxLength: 180 },
    phone: { type: 'string', minLength: 7, maxLength: 20 },
    birth_date: { type: 'string', minLength: 10, maxLength: 10 }
  }
};

const gatewayAuthResponseSchema = {
  type: 'object',
  additionalProperties: true
};

module.exports = {
  loginBodySchema,
  registerBodySchema,
  gatewayAuthResponseSchema
};

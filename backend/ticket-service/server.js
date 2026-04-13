require('dotenv').config();
const fastify = require('fastify');
const cors = require('@fastify/cors');
const { DatabaseService } = require('./services/database.service');
const { TicketService } = require('./services/ticket.service');

const app = fastify({ logger: true });

// Initialize services
const dbService = new DatabaseService();
const ticketService = new TicketService(dbService);

app.addHook('onRequest', async (request) => {
  request.startTimeMs = process.hrtime.bigint();
});

app.addHook('onResponse', async (request, reply) => {
  const start = request.startTimeMs;
  const elapsedMs = typeof start === 'bigint'
    ? Number((process.hrtime.bigint() - start) / BigInt(1000000))
    : 0;

  const endpoint = request.routeOptions?.url || request.url;
  const method = request.method;
  const statusCode = reply.statusCode;
  const ipAddress = request.headers['x-forwarded-for'] || request.ip;
  const parsedUserId = Number(request.headers['x-user-id'] || 0);
  const userId = Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  const errorMessage = statusCode >= 500 ? `HTTP_${statusCode}` : null;

  try {
    await dbService.query(
      `INSERT INTO microservice_request_logs
        (service_name, endpoint, method, user_id, ip_address, status_code, int_op_code, response_time_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['ticket-service', endpoint, method, userId, ipAddress, statusCode, null, elapsedMs, errorMessage]
    );

    await dbService.query(
      `INSERT INTO microservice_endpoint_metrics
        (service_name, endpoint, method, request_count, total_response_time_ms, avg_response_time_ms, updated_at)
       VALUES ($1, $2, $3, 1, $4::bigint, $5::numeric, NOW())
       ON CONFLICT (service_name, endpoint, method)
       DO UPDATE SET
         request_count = microservice_endpoint_metrics.request_count + 1,
         total_response_time_ms = microservice_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms,
         avg_response_time_ms =
           ROUND(
             (microservice_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms)::numeric
             / (microservice_endpoint_metrics.request_count + 1),
             2
           ),
         updated_at = NOW()`,
      ['ticket-service', endpoint, method, elapsedMs, elapsedMs]
    );
  } catch (error) {
    app.log.warn(error, 'No se pudieron persistir logs/metricas en ticket-service.');
  }
});

app.register(cors, {
  origin: '*',
  credentials: true,
});

// Health endpoint
app.get('/health', (request, reply) => {
  return reply.status(200).send({
    statusCode: 200,
    intOpCode: 'TKT_HEALTH_OK',
    message: 'Ticket service is running',
    data: {
      service: 'ticket-service',
      framework: 'fastify',
      timestamp: new Date().toISOString(),
    },
  });
});

// Ticket routes
app.get('/tickets', async (request, reply) => {
  const result = await ticketService.getAllTickets();
  return reply.status(result.statusCode).send(result);
});

app.get('/tickets/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await ticketService.getTicketById(id);
  return reply.status(result.statusCode).send(result);
});

app.post('/tickets', async (request, reply) => {
  const { title, description, status, group_id, assigned_to } = request.body;
  const result = await ticketService.createTicket({
    title,
    description,
    status,
    group_id,
    assigned_to,
    created_by: request.body.created_by || 1,
  });
  return reply.status(result.statusCode).send(result);
});

app.put('/tickets/:id', async (request, reply) => {
  const { id } = request.params;
  const { title, description, status, assigned_to, updated_by } = request.body;
  const result = await ticketService.updateTicket(id, {
    title,
    description,
    status,
    assigned_to,
    updated_by,
  });
  return reply.status(result.statusCode).send(result);
});

app.post('/tickets/:id/comments', async (request, reply) => {
  const { id } = request.params;
  const result = await ticketService.addTicketComment(id, {
    comment: request.body.comment,
    created_by: request.body.created_by || null,
  });
  return reply.status(result.statusCode).send(result);
});

app.get('/tickets/:id/activity', async (request, reply) => {
  const { id } = request.params;
  const result = await ticketService.getTicketActivity(id);
  return reply.status(result.statusCode).send(result);
});

app.delete('/tickets/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await ticketService.deleteTicket(id);
  return reply.status(result.statusCode).send(result);
});

// Get tickets by group
app.get('/groups/:groupId/tickets', async (request, reply) => {
  const { groupId } = request.params;
  const result = await ticketService.getTicketsByGroup(groupId);
  return reply.status(result.statusCode).send(result);
});

const start = async () => {
  try {
    await dbService.ensureObservabilitySchema();
    const PORT = process.env.TICKET_SERVICE_PORT || 3002;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Ticket service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

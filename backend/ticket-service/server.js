require('dotenv').config();
const fastify = require('fastify');
const cors = require('@fastify/cors');
const { DatabaseService } = require('./services/database.service');
const { TicketService } = require('./services/ticket.service');

const app = fastify({ logger: true });

// Initialize services
const dbService = new DatabaseService();
const ticketService = new TicketService(dbService);

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
  const { title, description, status, assigned_to } = request.body;
  const result = await ticketService.updateTicket(id, {
    title,
    description,
    status,
    assigned_to,
  });
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
    const PORT = process.env.TICKET_SERVICE_PORT || 3002;
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Ticket service running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

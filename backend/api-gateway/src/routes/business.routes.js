const jwt = require('jsonwebtoken');

function toError(statusCode, intOpCode, message) {
  return {
    statusCode,
    intOpCode,
    message,
    data: null,
  };
}

function getBearerToken(authorization) {
  if (typeof authorization !== 'string') {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

function hasPermission(request, permission) {
  const protectedEmails = new Set(['admin@seguridadweb.com', 'superadmin@seguridadweb.com']);
  const email = String(request.userClaims?.email || '').trim().toLowerCase();

  if (protectedEmails.has(email)) {
    return true;
  }

  const perms = Array.isArray(request.userClaims?.permissions) ? request.userClaims.permissions : [];
  return perms.includes(permission);
}

function hasAnyPermission(request, permissions) {
  return permissions.some((permission) => hasPermission(request, permission));
}

function denyMissingPermission(reply, permissions) {
  const printable = permissions.join(' | ');
  return reply.code(403).send(toError(403, 'GW_PERM_DENIED', `Permiso requerido: ${printable}`));
}

function canMoveTicket(request) {
  return hasAnyPermission(request, ['ticket:edit:status', 'tickets:move']);
}

function canAddTicket(request) {
  return hasAnyPermission(request, ['ticket:add', 'tickets:add']);
}

function canManageGroups(request) {
  return hasAnyPermission(request, ['groups:manage', 'group:add', 'group:edit', 'group:remove']);
}

function canManageUsers(request) {
  return hasAnyPermission(request, ['users:manage', 'user:add', 'user:edit', 'user:remove', 'user:edit:permissions']);
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function isValidTicketStatus(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  const allowed = new Set(['open', 'in_progress', 'review', 'blocked', 'done', 'closed']);
  return allowed.has(normalized);
}

async function forwardJson(fastify, request, reply, options) {
  const { method, url, body } = options;

  try {
    const serializedBody = body === undefined ? undefined : JSON.stringify(body);
    const forwardedUserId = Number(request.userClaims?.userId || 0);

    const upstreamResponse = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': request.ip,
        ...(forwardedUserId > 0 ? { 'x-user-id': String(forwardedUserId) } : {}),
        'user-agent': request.headers['user-agent'] || 'gateway',
      },
      body: serializedBody,
    });

    const payload = await upstreamResponse.json();
    return reply.code(upstreamResponse.status).send(payload);
  } catch (error) {
    request.log.error(error, `Error llamando upstream ${url}`);
    return reply.code(502).send(
      toError(502, 'GW_UPSTREAM_ERROR', 'No se pudo contactar al microservicio de destino.')
    );
  }
}

async function businessRoutes(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send(toError(401, 'GW_AUTH_REQUIRED', 'Token de autenticacion requerido.'));
    }

    try {
      request.userClaims = jwt.verify(token, fastify.config.jwtSecret);
    } catch {
      return reply.code(401).send(toError(401, 'GW_AUTH_INVALID', 'Token invalido o expirado.'));
    }
  });

  // Users routes
  fastify.get('/users', async (request, reply) => {
    if (!hasAnyPermission(request, ['user:view:all', 'users:manage'])) {
      return denyMissingPermission(reply, ['user:view:all', 'users:manage']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.userServiceUrl}/users`,
    });
  });

  fastify.post('/users', async (request, reply) => {
    if (!canManageUsers(request)) {
      return denyMissingPermission(reply, ['users:manage', 'user:add']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'POST',
      url: `${fastify.config.userServiceUrl}/users`,
      body: request.body,
    });
  });

  fastify.put('/users/:id', async (request, reply) => {
    if (!canManageUsers(request)) {
      return denyMissingPermission(reply, ['users:manage', 'user:edit']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'PUT',
      url: `${fastify.config.userServiceUrl}/users/${request.params.id}`,
      body: request.body,
    });
  });

  fastify.delete('/users/:id', async (request, reply) => {
    if (!canManageUsers(request)) {
      return denyMissingPermission(reply, ['users:manage', 'user:remove']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'DELETE',
      url: `${fastify.config.userServiceUrl}/users/${request.params.id}`,
    });
  });

  fastify.patch('/users/:id/active', async (request, reply) => {
    const isActive = Boolean(request.body?.is_active);
    const required = isActive ? 'user:activate' : 'user:deactivate';

    if (!hasPermission(request, required)) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', `Permiso requerido: ${required}`));
    }

    return forwardJson(fastify, request, reply, {
      method: 'PATCH',
      url: `${fastify.config.userServiceUrl}/users/${request.params.id}/active`,
      body: request.body,
    });
  });

  fastify.get('/users/:id/permissions', async (request, reply) => {
    if (!hasAnyPermission(request, ['user:edit:permissions', 'user:view:all', 'users:manage'])) {
      return denyMissingPermission(reply, ['user:edit:permissions', 'user:view:all', 'users:manage']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.userServiceUrl}/users/${request.params.id}/permissions`,
    });
  });

  fastify.put('/users/:id/permissions', async (request, reply) => {
    if (!hasAnyPermission(request, ['user:edit:permissions', 'users:manage'])) {
      return denyMissingPermission(reply, ['user:edit:permissions', 'users:manage']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'PUT',
      url: `${fastify.config.userServiceUrl}/users/${request.params.id}/permissions`,
      body: request.body,
    });
  });

  // Groups routes
  fastify.get('/groups', async (request, reply) => {
    if (!hasPermission(request, 'group:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: group:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.groupServiceUrl}/groups`,
    });
  });

  fastify.get('/groups/:id', async (request, reply) => {
    if (!hasPermission(request, 'group:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: group:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}`,
    });
  });

  fastify.post('/groups', async (request, reply) => {
    if (!canManageGroups(request)) {
      return denyMissingPermission(reply, ['groups:manage', 'group:add']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'POST',
      url: `${fastify.config.groupServiceUrl}/groups`,
      body: request.body,
    });
  });

  fastify.put('/groups/:id', async (request, reply) => {
    if (!canManageGroups(request)) {
      return denyMissingPermission(reply, ['groups:manage', 'group:edit']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'PUT',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}`,
      body: request.body,
    });
  });

  fastify.delete('/groups/:id', async (request, reply) => {
    if (!canManageGroups(request)) {
      return denyMissingPermission(reply, ['groups:manage', 'group:remove']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'DELETE',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}`,
    });
  });

  fastify.get('/groups/:id/members', async (request, reply) => {
    if (!hasPermission(request, 'group:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: group:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}/members`,
    });
  });

  fastify.post('/groups/:id/members', async (request, reply) => {
    if (!hasAnyPermission(request, ['group:add:members', 'groups:manage'])) {
      return denyMissingPermission(reply, ['group:add:members', 'groups:manage']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'POST',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}/members`,
      body: request.body,
    });
  });

  fastify.delete('/groups/:id/members/:email', async (request, reply) => {
    if (!hasAnyPermission(request, ['group:remove:members', 'groups:manage'])) {
      return denyMissingPermission(reply, ['group:remove:members', 'groups:manage']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'DELETE',
      url: `${fastify.config.groupServiceUrl}/groups/${request.params.id}/members/${request.params.email}`,
    });
  });

  // Tickets routes
  fastify.get('/tickets', async (request, reply) => {
    if (!hasPermission(request, 'ticket:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.ticketServiceUrl}/tickets`,
    });
  });

  fastify.get('/tickets/:id', async (request, reply) => {
    if (!hasPermission(request, 'ticket:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.ticketServiceUrl}/tickets/${request.params.id}`,
    });
  });

  fastify.get('/groups/:groupId/tickets', async (request, reply) => {
    if (!hasPermission(request, 'ticket:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.ticketServiceUrl}/groups/${request.params.groupId}/tickets`,
    });
  });

  fastify.post('/tickets', async (request, reply) => {
    if (!canAddTicket(request)) {
      return denyMissingPermission(reply, ['ticket:add', 'tickets:add']);
    }

    return forwardJson(fastify, request, reply, {
      method: 'POST',
      url: `${fastify.config.ticketServiceUrl}/tickets`,
      body: request.body,
    });
  });

  fastify.put('/tickets/:id', async (request, reply) => {
    const wantsStatusUpdate = typeof request.body?.status === 'string';

    if (wantsStatusUpdate) {
      if (!canMoveTicket(request)) {
        return denyMissingPermission(reply, ['ticket:edit:status', 'tickets:move']);
      }

      const ticketResponse = await fetch(`${fastify.config.ticketServiceUrl}/tickets/${request.params.id}`);
      if (!ticketResponse.ok) {
        const payload = await ticketResponse.json();
        return reply.code(ticketResponse.status).send(payload);
      }

      const ticketPayload = await ticketResponse.json();
      const assignedTo = Number(ticketPayload?.data?.assigned_to ?? 0);
      const tokenUserId = Number(request.userClaims?.userId ?? 0);
      if (!Number.isFinite(assignedTo) || assignedTo !== tokenUserId) {
        return reply.code(403).send(
          toError(403, 'GW_TICKET_MOVE_FORBIDDEN', 'Solo el usuario asignado puede mover el estado del ticket.')
        );
      }
    } else if (!hasPermission(request, 'ticket:edit')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:edit'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'PUT',
      url: `${fastify.config.ticketServiceUrl}/tickets/${request.params.id}`,
      body: request.body,
    });
  });

  fastify.patch('/tickets/:id/status', async (request, reply) => {
    const ticketId = parsePositiveInt(request.params?.id);
    if (!ticketId) {
      return reply.code(400).send(toError(400, 'GW_VALIDATION_ERROR', 'El id del ticket debe ser un entero positivo.'));
    }

    const status = typeof request.body?.status === 'string' ? request.body.status.trim().toLowerCase() : '';
    if (!status) {
      return reply.code(400).send(toError(400, 'GW_VALIDATION_ERROR', 'El campo status es obligatorio.'));
    }

    if (!isValidTicketStatus(status)) {
      return reply.code(400).send(
        toError(400, 'GW_VALIDATION_ERROR', 'El status no es valido. Usa: open, in_progress, review, blocked, done, closed.')
      );
    }

    if (!canMoveTicket(request)) {
      return denyMissingPermission(reply, ['ticket:edit:status', 'tickets:move']);
    }

    const ticketResponse = await fetch(`${fastify.config.ticketServiceUrl}/tickets/${ticketId}`);
    if (!ticketResponse.ok) {
      const payload = await ticketResponse.json();
      return reply.code(ticketResponse.status).send(payload);
    }

    const ticketPayload = await ticketResponse.json();
    const assignedTo = Number(ticketPayload?.data?.assigned_to ?? 0);
    const tokenUserId = Number(request.userClaims?.userId ?? 0);
    if (!Number.isFinite(assignedTo) || assignedTo !== tokenUserId) {
      return reply.code(403).send(
        toError(403, 'GW_TICKET_MOVE_FORBIDDEN', 'Solo el usuario asignado puede mover el estado del ticket.')
      );
    }

    return forwardJson(fastify, request, reply, {
      method: 'PUT',
      url: `${fastify.config.ticketServiceUrl}/tickets/${ticketId}`,
      body: {
        ...request.body,
        status,
      },
    });
  });

  fastify.post('/tickets/:id/comments', async (request, reply) => {
    if (!hasPermission(request, 'ticket:edit:comment')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:edit:comment'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'POST',
      url: `${fastify.config.ticketServiceUrl}/tickets/${request.params.id}/comments`,
      body: request.body,
    });
  });

  fastify.get('/tickets/:id/activity', async (request, reply) => {
    if (!hasPermission(request, 'ticket:view')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:view'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'GET',
      url: `${fastify.config.ticketServiceUrl}/tickets/${request.params.id}/activity`,
    });
  });

  fastify.delete('/tickets/:id', async (request, reply) => {
    if (!hasPermission(request, 'ticket:delete')) {
      return reply.code(403).send(toError(403, 'GW_PERM_DENIED', 'Permiso requerido: ticket:delete'));
    }

    return forwardJson(fastify, request, reply, {
      method: 'DELETE',
      url: `${fastify.config.ticketServiceUrl}/tickets/${request.params.id}`,
    });
  });
}

module.exports = businessRoutes;

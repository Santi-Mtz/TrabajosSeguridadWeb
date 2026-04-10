class TicketService {
  constructor(databaseService) {
    this.db = databaseService;
    this.activitySchemaReady = false;
  }

  async ensureActivityTables() {
    if (this.activitySchemaReady) {
      return;
    }

    await this.db.query(
      `CREATE TABLE IF NOT EXISTS ticket_comments (
        id BIGSERIAL PRIMARY KEY,
        ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        created_by BIGINT,
        comment TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    await this.db.query(
      `CREATE TABLE IF NOT EXISTS ticket_history (
        id BIGSERIAL PRIMARY KEY,
        ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        actor_user_id BIGINT,
        event TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    await this.db.query('CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id)');
    await this.db.query('CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id)');

    this.activitySchemaReady = true;
  }

  async appendHistory(ticketId, actorUserId, event) {
    if (!event || !String(event).trim()) {
      return;
    }

    await this.ensureActivityTables();
    await this.db.query(
      `INSERT INTO ticket_history (ticket_id, actor_user_id, event)
       VALUES ($1, $2, $3)`,
      [ticketId, actorUserId || null, String(event).trim()]
    );
  }

  formatActor(userId) {
    return userId ? `Usuario #${userId}` : 'Sistema';
  }

  async getAllTickets() {
    try {
      const result = await this.db.query(
        `SELECT id, title, description, status, group_id, assigned_to, 
                created_by, created_at, updated_at 
         FROM tickets ORDER BY created_at DESC`,
        []
      );

      return {
        statusCode: 200,
        intOpCode: 'TKT_GET_ALL_SUCCESS',
        message: 'Tickets retrieved successfully',
        data: result.rows,
      };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_GET_ALL',
        message: 'Error fetching tickets',
        data: null,
      };
    }
  }

  async getTicketById(id) {
    try {
      const result = await this.db.query(
        `SELECT id, title, description, status, group_id, assigned_to, 
                created_by, created_at, updated_at 
         FROM tickets WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'TKT_NOT_FOUND',
          message: 'Ticket not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'TKT_GET_SUCCESS',
        message: 'Ticket retrieved successfully',
        data: result.rows[0],
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_GET_ID',
        message: 'Error fetching ticket',
        data: null,
      };
    }
  }

  async createTicket(ticketData) {
    try {
      const { title, description, status, group_id, assigned_to, created_by } = ticketData;

      if (!title || !group_id) {
        return {
          statusCode: 400,
          intOpCode: 'TKT_INVALID_INPUT',
          message: 'Title and group_id are required',
          data: null,
        };
      }

      const result = await this.db.query(
        `INSERT INTO tickets (title, description, status, group_id, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, description, status, group_id, assigned_to, created_by, created_at, updated_at`,
        [title, description || null, status || 'open', group_id, assigned_to || null, created_by]
      );

      const createdTicket = result.rows[0];
      await this.appendHistory(
        createdTicket.id,
        created_by || null,
        `${this.formatActor(created_by)} creo el ticket con estado ${createdTicket.status}`
      );

      return {
        statusCode: 201,
        intOpCode: 'TKT_CREATE_SUCCESS',
        message: 'Ticket created successfully',
        data: createdTicket,
      };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_CREATE',
        message: 'Error creating ticket',
        data: null,
      };
    }
  }

  async updateTicket(id, ticketData) {
    try {
      const { title, description, status, assigned_to, updated_by } = ticketData;

      const existingResult = await this.db.query(
        `SELECT id, title, description, status, group_id, assigned_to, created_by, created_at, updated_at
         FROM tickets WHERE id = $1`,
        [id]
      );

      if (existingResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'TKT_NOT_FOUND',
          message: 'Ticket not found',
          data: null,
        };
      }

      const existingTicket = existingResult.rows[0];

      // Build dynamic query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }

      if (status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (assigned_to !== undefined) {
        updates.push(`assigned_to = $${paramCount}`);
        values.push(assigned_to);
        paramCount++;
      }

      if (updates.length === 0) {
        return {
          statusCode: 400,
          intOpCode: 'TKT_NO_UPDATE_FIELDS',
          message: 'No fields to update',
          data: null,
        };
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await this.db.query(query, values);

      const updatedTicket = result.rows[0];
      const actor = this.formatActor(updated_by);

      if (title !== undefined && title !== existingTicket.title) {
        await this.appendHistory(id, updated_by || null, `${actor} actualizo el titulo`);
      }

      if (description !== undefined && description !== existingTicket.description) {
        await this.appendHistory(id, updated_by || null, `${actor} actualizo la descripcion`);
      }

      if (status !== undefined && status !== existingTicket.status) {
        await this.appendHistory(id, updated_by || null, `${actor} cambio el estado a ${status}`);
      }

      if (assigned_to !== undefined && assigned_to !== existingTicket.assigned_to) {
        if (assigned_to === null) {
          await this.appendHistory(id, updated_by || null, `${actor} desasigno el ticket`);
        } else {
          await this.appendHistory(id, updated_by || null, `${actor} reasigno el ticket a Usuario #${assigned_to}`);
        }
      }

      return {
        statusCode: 200,
        intOpCode: 'TKT_UPDATE_SUCCESS',
        message: 'Ticket updated successfully',
        data: updatedTicket,
      };
    } catch (error) {
      console.error('Error updating ticket:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_UPDATE',
        message: 'Error updating ticket',
        data: null,
      };
    }
  }

  async deleteTicket(id) {
    try {
      const result = await this.db.query(
        'DELETE FROM tickets WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'TKT_NOT_FOUND',
          message: 'Ticket not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'TKT_DELETE_SUCCESS',
        message: 'Ticket deleted successfully',
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_DELETE',
        message: 'Error deleting ticket',
        data: null,
      };
    }
  }

  async getTicketsByGroup(groupId) {
    try {
      const result = await this.db.query(
        `SELECT id, title, description, status, group_id, assigned_to, 
                created_by, created_at, updated_at 
         FROM tickets WHERE group_id = $1 ORDER BY created_at DESC`,
        [groupId]
      );

      return {
        statusCode: 200,
        intOpCode: 'TKT_GET_BY_GROUP_SUCCESS',
        message: 'Group tickets retrieved successfully',
        data: result.rows,
      };
    } catch (error) {
      console.error('Error fetching group tickets:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_GET_BY_GROUP',
        message: 'Error fetching group tickets',
        data: null,
      };
    }
  }

  async addTicketComment(id, payload) {
    try {
      const ticketId = Number(id);
      const comment = String(payload?.comment || '').trim();
      const createdBy = payload?.created_by || null;

      if (!comment) {
        return {
          statusCode: 400,
          intOpCode: 'TKT_INVALID_COMMENT',
          message: 'Comment is required',
          data: null,
        };
      }

      const ticketResult = await this.db.query('SELECT id FROM tickets WHERE id = $1', [ticketId]);
      if (ticketResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'TKT_NOT_FOUND',
          message: 'Ticket not found',
          data: null,
        };
      }

      await this.ensureActivityTables();
      const insertResult = await this.db.query(
        `INSERT INTO ticket_comments (ticket_id, created_by, comment)
         VALUES ($1, $2, $3)
         RETURNING id, ticket_id, created_by, comment, created_at`,
        [ticketId, createdBy, comment]
      );

      await this.appendHistory(
        ticketId,
        createdBy,
        `${this.formatActor(createdBy)} agrego un comentario`
      );

      return {
        statusCode: 201,
        intOpCode: 'TKT_COMMENT_CREATE_SUCCESS',
        message: 'Ticket comment created successfully',
        data: insertResult.rows[0],
      };
    } catch (error) {
      console.error('Error creating ticket comment:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_COMMENT_CREATE',
        message: 'Error creating ticket comment',
        data: null,
      };
    }
  }

  async getTicketActivity(id) {
    try {
      const ticketId = Number(id);
      const ticketResult = await this.db.query('SELECT id FROM tickets WHERE id = $1', [ticketId]);
      if (ticketResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'TKT_NOT_FOUND',
          message: 'Ticket not found',
          data: null,
        };
      }

      await this.ensureActivityTables();

      const commentsResult = await this.db.query(
        `SELECT id, ticket_id, created_by, comment, created_at
         FROM ticket_comments
         WHERE ticket_id = $1
         ORDER BY created_at ASC`,
        [ticketId]
      );

      const historyResult = await this.db.query(
        `SELECT id, ticket_id, actor_user_id, event, created_at
         FROM ticket_history
         WHERE ticket_id = $1
         ORDER BY created_at ASC`,
        [ticketId]
      );

      return {
        statusCode: 200,
        intOpCode: 'TKT_ACTIVITY_GET_SUCCESS',
        message: 'Ticket activity retrieved successfully',
        data: {
          comments: commentsResult.rows,
          history: historyResult.rows,
        },
      };
    } catch (error) {
      console.error('Error fetching ticket activity:', error);
      return {
        statusCode: 500,
        intOpCode: 'TKT_ERROR_ACTIVITY_GET',
        message: 'Error fetching ticket activity',
        data: null,
      };
    }
  }
}

module.exports = { TicketService };

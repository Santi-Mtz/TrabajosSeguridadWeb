class TicketService {
  constructor(databaseService) {
    this.db = databaseService;
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

      return {
        statusCode: 201,
        intOpCode: 'TKT_CREATE_SUCCESS',
        message: 'Ticket created successfully',
        data: result.rows[0],
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
      const { title, description, status, assigned_to } = ticketData;

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
        intOpCode: 'TKT_UPDATE_SUCCESS',
        message: 'Ticket updated successfully',
        data: result.rows[0],
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
}

module.exports = { TicketService };

import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class GroupService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllGroups() {
    try {
      const result = await this.databaseService.query(
        `SELECT id, name, description, created_by, created_at, updated_at 
         FROM groups ORDER BY created_at DESC`,
        []
      );

      return {
        statusCode: 200,
        intOpCode: 'GRP_GET_ALL_SUCCESS',
        message: 'Groups retrieved successfully',
        data: result.rows,
      };
    } catch (error) {
      console.error('Error fetching groups:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_GET_ALL',
        message: 'Error fetching groups',
        data: null,
      };
    }
  }

  async getGroupById(id: number) {
    try {
      const result = await this.databaseService.query(
        `SELECT id, name, description, created_by, created_at, updated_at 
         FROM groups WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_NOT_FOUND',
          message: 'Group not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'GRP_GET_SUCCESS',
        message: 'Group retrieved successfully',
        data: result.rows[0],
      };
    } catch (error) {
      console.error('Error fetching group:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_GET_ID',
        message: 'Error fetching group',
        data: null,
      };
    }
  }

  async createGroup(groupData: any) {
    try {
      const { name, description, created_by } = groupData;

      if (!name) {
        return {
          statusCode: 400,
          intOpCode: 'GRP_INVALID_INPUT',
          message: 'Group name is required',
          data: null,
        };
      }

      const result = await this.databaseService.query(
        `INSERT INTO groups (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_by, created_at, updated_at`,
        [name, description || null, created_by]
      );

      return {
        statusCode: 201,
        intOpCode: 'GRP_CREATE_SUCCESS',
        message: 'Group created successfully',
        data: result.rows[0],
      };
    } catch (error) {
      console.error('Error creating group:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_CREATE',
        message: 'Error creating group',
        data: null,
      };
    }
  }

  async updateGroup(id: number, groupData: any) {
    try {
      const { name, description } = groupData;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }

      if (updates.length === 0) {
        return {
          statusCode: 400,
          intOpCode: 'GRP_NO_UPDATE_FIELDS',
          message: 'No fields to update',
          data: null,
        };
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await this.databaseService.query(query, values);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_NOT_FOUND',
          message: 'Group not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'GRP_UPDATE_SUCCESS',
        message: 'Group updated successfully',
        data: result.rows[0],
      };
    } catch (error) {
      console.error('Error updating group:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_UPDATE',
        message: 'Error updating group',
        data: null,
      };
    }
  }

  async deleteGroup(id: number) {
    try {
      const result = await this.databaseService.query(
        'DELETE FROM groups WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_NOT_FOUND',
          message: 'Group not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'GRP_DELETE_SUCCESS',
        message: 'Group deleted successfully',
        data: { id: result.rows[0].id },
      };
    } catch (error) {
      console.error('Error deleting group:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_DELETE',
        message: 'Error deleting group',
        data: null,
      };
    }
  }

  async getGroupMembers(id: number) {
    try {
      const result = await this.databaseService.query(
        `SELECT u.id, u.username, u.email, u.is_active, gm.joined_at
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1
         ORDER BY gm.joined_at DESC`,
        [id]
      );

      return {
        statusCode: 200,
        intOpCode: 'GRP_GET_MEMBERS_SUCCESS',
        message: 'Group members retrieved successfully',
        data: result.rows,
      };
    } catch (error) {
      console.error('Error fetching group members:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_GET_MEMBERS',
        message: 'Error fetching group members',
        data: null,
      };
    }
  }

  async addGroupMember(groupId: number, email: string) {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return {
          statusCode: 400,
          intOpCode: 'GRP_INVALID_INPUT',
          message: 'Member email is required',
          data: null,
        };
      }

      const groupResult = await this.databaseService.query('SELECT id FROM groups WHERE id = $1', [groupId]);
      if (groupResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_NOT_FOUND',
          message: 'Group not found',
          data: null,
        };
      }

      const userResult = await this.databaseService.query(
        'SELECT id, username, email, is_active FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );

      if (userResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_MEMBER_NOT_FOUND',
          message: 'User not found',
          data: null,
        };
      }

      const user = userResult.rows[0];
      const existingMember = await this.databaseService.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, user.id]
      );

      if (existingMember.rows.length > 0) {
        return {
          statusCode: 409,
          intOpCode: 'GRP_MEMBER_ALREADY_EXISTS',
          message: 'User is already a member of this group',
          data: null,
        };
      }

      const insertResult = await this.databaseService.query(
        `INSERT INTO group_members (group_id, user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [groupId, user.id]
      );

      const result = await this.databaseService.query(
        `SELECT u.id, u.username, u.email, u.is_active, gm.joined_at
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.id = $1`,
        [insertResult.rows[0].id]
      );

      return {
        statusCode: 201,
        intOpCode: 'GRP_ADD_MEMBER_SUCCESS',
        message: 'Group member added successfully',
        data: result.rows[0],
      };
    } catch (error) {
      console.error('Error adding group member:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_ADD_MEMBER',
        message: 'Error adding group member',
        data: null,
      };
    }
  }

  async removeGroupMember(groupId: number, email: string) {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return {
          statusCode: 400,
          intOpCode: 'GRP_INVALID_INPUT',
          message: 'Member email is required',
          data: null,
        };
      }

      const userResult = await this.databaseService.query(
        'SELECT id, username, email, is_active FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );

      if (userResult.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_MEMBER_NOT_FOUND',
          message: 'User not found',
          data: null,
        };
      }

      const user = userResult.rows[0];
      const result = await this.databaseService.query(
        `DELETE FROM group_members
         WHERE group_id = $1 AND user_id = $2
         RETURNING id, group_id, user_id, joined_at`,
        [groupId, user.id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          intOpCode: 'GRP_MEMBER_NOT_FOUND',
          message: 'Group member not found',
          data: null,
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'GRP_REMOVE_MEMBER_SUCCESS',
        message: 'Group member removed successfully',
        data: {
          id: result.rows[0].id,
          group_id: result.rows[0].group_id,
          user_id: result.rows[0].user_id,
        },
      };
    } catch (error) {
      console.error('Error removing group member:', error);
      return {
        statusCode: 500,
        intOpCode: 'GRP_ERROR_REMOVE_MEMBER',
        message: 'Error removing group member',
        data: null,
      };
    }
  }
}

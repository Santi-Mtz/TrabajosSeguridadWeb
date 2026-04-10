import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type ApiResponse<T> = {
  statusCode: number;
  intOpCode: string;
  message: string;
  data: T;
};

type UserRow = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  full_name: string | null;
  address: string | null;
  phone: string | null;
  birth_date: string | null;
  role: string | null;
  team: string | null;
};

@Injectable()
export class UsersService {
  private profileSchemaReady = false;
  private cryptoReady = false;

  constructor(private readonly db: DatabaseService) {}

  private async ensureProfileSchema(): Promise<void> {
    if (this.profileSchemaReady) {
      return;
    }

    await this.db.pool.query(
      `CREATE TABLE IF NOT EXISTS user_profiles (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT,
        address TEXT,
        phone TEXT,
        birth_date DATE,
        role TEXT,
        team TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    this.profileSchemaReady = true;
  }

  private async ensureCrypto(): Promise<void> {
    if (this.cryptoReady) {
      return;
    }

    await this.db.pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    this.cryptoReady = true;
  }

  private mapUser(row: UserRow) {
    return {
      id: Number(row.id),
      username: row.username,
      email: row.email,
      is_active: Boolean(row.is_active),
      full_name: row.full_name ?? row.username,
      address: row.address ?? '',
      phone: row.phone ?? '',
      birth_date: row.birth_date,
      role: row.role ?? 'Miembro',
      team: row.team ?? 'Seguridad web'
    };
  }

  async listUsers(): Promise<ApiResponse<unknown[]>> {
    try {
      await this.ensureProfileSchema();
      const result = await this.db.pool.query(
        `SELECT u.id, u.username, u.email, u.is_active,
                p.full_name, p.address, p.phone, p.birth_date, p.role, p.team
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         ORDER BY u.id ASC`
      );

      return {
        statusCode: 200,
        intOpCode: 'USR_LIST_OK',
        message: 'Users retrieved successfully.',
        data: result.rows.map((row) => this.mapUser(row as UserRow))
      };
    } catch (error) {
      console.error('Error listing users:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_LIST_ERROR',
        message: 'Error listing users.',
        data: []
      };
    }
  }

  async createUser(payload: {
    username?: string;
    email?: string;
    full_name?: string;
    address?: string;
    phone?: string;
    birth_date?: string;
    role?: string;
    team?: string;
    is_active?: boolean;
    password?: string;
  }): Promise<ApiResponse<unknown>> {
    const username = String(payload.username ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();

    if (!username || !email) {
      return {
        statusCode: 400,
        intOpCode: 'USR_CREATE_INVALID',
        message: 'username and email are required.',
        data: null
      };
    }

    const password = String(payload.password ?? 'Admin@12345');

    const client = await this.db.pool.connect();
    try {
      await this.ensureProfileSchema();
      await this.ensureCrypto();
      await client.query('BEGIN');

      const created = await client.query(
        `INSERT INTO users (username, email, password_hash, is_active)
         VALUES ($1, $2, crypt($3, gen_salt('bf')), $4)
         RETURNING id, username, email, is_active`,
        [username, email, password, payload.is_active ?? true]
      );

      const user = created.rows[0] as { id: number; username: string; email: string; is_active: boolean };

      await client.query(
        `INSERT INTO user_profiles (user_id, full_name, address, phone, birth_date, role, team, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           birth_date = EXCLUDED.birth_date,
           role = EXCLUDED.role,
           team = EXCLUDED.team,
           updated_at = NOW()`,
        [
          user.id,
          payload.full_name ?? username,
          payload.address ?? '',
          payload.phone ?? '',
          payload.birth_date ?? null,
          payload.role ?? 'Miembro',
          payload.team ?? 'Seguridad web'
        ]
      );

      await client.query('COMMIT');

      return {
        statusCode: 201,
        intOpCode: 'USR_CREATE_OK',
        message: 'User created successfully.',
        data: {
          id: Number(user.id),
          username: user.username,
          email: user.email,
          is_active: Boolean(user.is_active),
          full_name: payload.full_name ?? username,
          address: payload.address ?? '',
          phone: payload.phone ?? '',
          birth_date: payload.birth_date ?? null,
          role: payload.role ?? 'Miembro',
          team: payload.team ?? 'Seguridad web'
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      const message = error instanceof Error ? error.message : 'Error creating user.';
      console.error('Error creating user:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_CREATE_ERROR',
        message,
        data: null
      };
    } finally {
      client.release();
    }
  }

  async updateUser(id: number, payload: {
    username?: string;
    email?: string;
    full_name?: string;
    address?: string;
    phone?: string;
    birth_date?: string;
    role?: string;
    team?: string;
  }): Promise<ApiResponse<unknown>> {
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return {
        statusCode: 400,
        intOpCode: 'USR_UPDATE_INVALID_ID',
        message: 'Invalid user id.',
        data: null
      };
    }

    const username = String(payload.username ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();

    if (!username || !email) {
      return {
        statusCode: 400,
        intOpCode: 'USR_UPDATE_INVALID',
        message: 'username and email are required.',
        data: null
      };
    }

    const client = await this.db.pool.connect();
    try {
      await this.ensureProfileSchema();
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE users
         SET username = $1,
             email = $2
         WHERE id = $3
         RETURNING id, username, email, is_active`,
        [username, email, userId]
      );

      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 404,
          intOpCode: 'USR_NOT_FOUND',
          message: 'User not found.',
          data: null
        };
      }

      await client.query(
        `INSERT INTO user_profiles (user_id, full_name, address, phone, birth_date, role, team, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           birth_date = EXCLUDED.birth_date,
           role = EXCLUDED.role,
           team = EXCLUDED.team,
           updated_at = NOW()`,
        [
          userId,
          payload.full_name ?? username,
          payload.address ?? '',
          payload.phone ?? '',
          payload.birth_date ?? null,
          payload.role ?? 'Miembro',
          payload.team ?? 'Seguridad web'
        ]
      );

      await client.query('COMMIT');

      const row = updated.rows[0] as { id: number; username: string; email: string; is_active: boolean };
      return {
        statusCode: 200,
        intOpCode: 'USR_UPDATE_OK',
        message: 'User updated successfully.',
        data: {
          id: Number(row.id),
          username: row.username,
          email: row.email,
          is_active: Boolean(row.is_active),
          full_name: payload.full_name ?? username,
          address: payload.address ?? '',
          phone: payload.phone ?? '',
          birth_date: payload.birth_date ?? null,
          role: payload.role ?? 'Miembro',
          team: payload.team ?? 'Seguridad web'
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      const message = error instanceof Error ? error.message : 'Error updating user.';
      console.error('Error updating user:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_UPDATE_ERROR',
        message,
        data: null
      };
    } finally {
      client.release();
    }
  }

  async setUserActive(id: number, isActive: boolean): Promise<ApiResponse<unknown>> {
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return {
        statusCode: 400,
        intOpCode: 'USR_ACTIVE_INVALID_ID',
        message: 'Invalid user id.',
        data: null
      };
    }

    try {
      const result = await this.db.pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, email, is_active`,
        [Boolean(isActive), userId]
      );

      if (result.rowCount === 0) {
        return {
          statusCode: 404,
          intOpCode: 'USR_NOT_FOUND',
          message: 'User not found.',
          data: null
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'USR_ACTIVE_OK',
        message: 'User status updated successfully.',
        data: result.rows[0]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error updating user status.';
      console.error('Error setting user active:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_ACTIVE_ERROR',
        message,
        data: null
      };
    }
  }

  async deleteUser(id: number): Promise<ApiResponse<unknown>> {
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return {
        statusCode: 400,
        intOpCode: 'USR_DELETE_INVALID_ID',
        message: 'Invalid user id.',
        data: null
      };
    }

    try {
      const result = await this.db.pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      if (result.rowCount === 0) {
        return {
          statusCode: 404,
          intOpCode: 'USR_NOT_FOUND',
          message: 'User not found.',
          data: null
        };
      }

      return {
        statusCode: 200,
        intOpCode: 'USR_DELETE_OK',
        message: 'User deleted successfully.',
        data: { id: Number(result.rows[0].id) }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting user.';
      console.error('Error deleting user:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_DELETE_ERROR',
        message,
        data: null
      };
    }
  }

  async getUserPermissions(id: number): Promise<ApiResponse<string[]>> {
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return {
        statusCode: 400,
        intOpCode: 'USR_PERMS_INVALID_ID',
        message: 'Invalid user id.',
        data: []
      };
    }

    try {
      const exists = await this.db.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (exists.rowCount === 0) {
        return {
          statusCode: 404,
          intOpCode: 'USR_NOT_FOUND',
          message: 'User not found.',
          data: []
        };
      }

      const result = await this.db.pool.query(
        `SELECT p.code
         FROM user_permissions up
         INNER JOIN permissions p ON p.id = up.permission_id
         WHERE up.user_id = $1
         ORDER BY p.code ASC`,
        [userId]
      );

      return {
        statusCode: 200,
        intOpCode: 'USR_PERMS_GET_OK',
        message: 'User permissions retrieved successfully.',
        data: result.rows.map((row) => String(row.code))
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error retrieving user permissions.';
      console.error('Error getting user permissions:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_PERMS_GET_ERROR',
        message,
        data: []
      };
    }
  }

  async setUserPermissions(id: number, permissions: string[]): Promise<ApiResponse<string[]>> {
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return {
        statusCode: 400,
        intOpCode: 'USR_PERMS_INVALID_ID',
        message: 'Invalid user id.',
        data: []
      };
    }

    const normalized = [...new Set((permissions ?? []).map((item) => String(item).trim()).filter(Boolean))];

    const client = await this.db.pool.connect();
    try {
      const exists = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (exists.rowCount === 0) {
        return {
          statusCode: 404,
          intOpCode: 'USR_NOT_FOUND',
          message: 'User not found.',
          data: []
        };
      }

      await client.query('BEGIN');
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

      if (normalized.length > 0) {
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id)
           SELECT $1, p.id
           FROM permissions p
           WHERE p.code = ANY($2::text[])`,
          [userId, normalized]
        );
      }

      const result = await client.query(
        `SELECT p.code
         FROM user_permissions up
         INNER JOIN permissions p ON p.id = up.permission_id
         WHERE up.user_id = $1
         ORDER BY p.code ASC`,
        [userId]
      );

      await client.query('COMMIT');

      return {
        statusCode: 200,
        intOpCode: 'USR_PERMS_SET_OK',
        message: 'User permissions updated successfully.',
        data: result.rows.map((row) => String(row.code))
      };
    } catch (error) {
      await client.query('ROLLBACK');
      const message = error instanceof Error ? error.message : 'Error updating user permissions.';
      console.error('Error setting user permissions:', error);
      return {
        statusCode: 500,
        intOpCode: 'USR_PERMS_SET_ERROR',
        message,
        data: []
      };
    } finally {
      client.release();
    }
  }
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiResponse, LoginResponseData } from '../models/auth.models';
import { UsersService } from './users.service';
import jwt from 'jsonwebtoken';

const GET_USER_BY_EMAIL_SQL = `
  SELECT id, username, email, is_active
  FROM users
  WHERE email = $1
  LIMIT 1
`;

const VERIFY_PASSWORD_SQL = `
  SELECT (password_hash = crypt($2, password_hash)) AS matches
  FROM users
  WHERE id = $1
  LIMIT 1
`;

const LOGIN_EVENT_OK_SQL = `
  INSERT INTO login_events (user_id, email_attempt, success, ip_address, user_agent, created_at)
  VALUES ($1, $2, TRUE, $3, $4, NOW())
  RETURNING created_at
`;

const LOGIN_EVENT_FAIL_SQL = `
  INSERT INTO login_events (user_id, email_attempt, success, ip_address, user_agent, created_at)
  VALUES ($1, $2, FALSE, $3, $4, NOW())
`;

const USER_PERMISSIONS_SQL = `
  SELECT COALESCE(ARRAY_AGG(p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
  FROM user_permissions up
  LEFT JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = $1
`;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersService: UsersService
  ) {}

  private signAuthToken(payload: { userId: number; email: string; permissions: string[] }): string {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    return jwt.sign(payload, secret, {
      expiresIn: '8h',
      issuer: 'erpjir-user-service'
    });
  }

  async register(payload: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    address?: string;
    phone?: string;
    birth_date?: string;
  }): Promise<ApiResponse<LoginResponseData>> {
    const created = await this.usersService.createUser({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      address: payload.address,
      phone: payload.phone,
      birth_date: payload.birth_date,
      role: 'Miembro',
      team: 'Seguridad web',
      is_active: true
    });

    if (created.statusCode >= 400 || !created.data) {
      return {
        statusCode: created.statusCode,
        intOpCode: 'USR_REGISTER_ERROR',
        message: created.message,
        data: null
      };
    }

    const data = created.data as {
      id: number;
      username: string;
      email: string;
    };

    const permissions: string[] = [];
    const token = this.signAuthToken({
      userId: Number(data.id),
      email: data.email,
      permissions
    });

    return {
      statusCode: 201,
      intOpCode: 'USR_REGISTER_OK',
      message: 'Registro exitoso.',
      data: {
        id: Number(data.id),
        username: data.username,
        email: data.email,
        login_date: new Date().toISOString(),
        permissions,
        token
      }
    };
  }

  async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<ApiResponse<LoginResponseData>> {
    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await this.db.pool.query(GET_USER_BY_EMAIL_SQL, [normalizedEmail]);

    if (userResult.rowCount === 0) {
      await this.db.pool.query(LOGIN_EVENT_FAIL_SQL, [null, normalizedEmail, ipAddress, userAgent]);
      return {
        statusCode: 401,
        intOpCode: 'USR_LOGIN_INVALID',
        message: 'Credenciales invalidas.',
        data: null
      };
    }

    const user = userResult.rows[0] as { id: string; username: string; email: string; is_active: boolean };
    const userId = Number(user.id);

    if (!user.is_active) {
      await this.db.pool.query(LOGIN_EVENT_FAIL_SQL, [userId, normalizedEmail, ipAddress, userAgent]);
      return {
        statusCode: 403,
        intOpCode: 'USR_LOGIN_INACTIVE',
        message: 'La cuenta esta inactiva. Contacta a un administrador.',
        data: null
      };
    }

    const passwordCheckResult = await this.db.pool.query(VERIFY_PASSWORD_SQL, [userId, password]);
    const isValidPassword = Boolean(passwordCheckResult.rows[0]?.matches);

    if (!isValidPassword) {
      await this.db.pool.query(LOGIN_EVENT_FAIL_SQL, [userId, normalizedEmail, ipAddress, userAgent]);
      return {
        statusCode: 401,
        intOpCode: 'USR_LOGIN_INVALID',
        message: 'Credenciales invalidas.',
        data: null
      };
    }

    const loginEventResult = await this.db.pool.query(LOGIN_EVENT_OK_SQL, [userId, user.email, ipAddress, userAgent]);
    const permissionsResult = await this.db.pool.query(USER_PERMISSIONS_SQL, [userId]);
    const permissions = permissionsResult.rows[0]?.permissions ?? [];
    const token = this.signAuthToken({
      userId,
      email: user.email,
      permissions
    });

    return {
      statusCode: 200,
      intOpCode: 'USR_LOGIN_OK',
      message: 'Login exitoso.',
      data: {
        id: userId,
        username: user.username,
        email: user.email,
        login_date: loginEventResult.rows[0].created_at.toISOString(),
        permissions,
        token
      }
    };
  }
}

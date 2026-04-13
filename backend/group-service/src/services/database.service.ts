import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: Pool;
  private observabilityReady = false;

  constructor() {
    const useDbSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useDbSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }

  async ensureObservabilitySchema(): Promise<void> {
    if (this.observabilityReady) {
      return;
    }

    await this.query(
      `CREATE TABLE IF NOT EXISTS microservice_request_logs (
        id BIGSERIAL PRIMARY KEY,
        service_name VARCHAR(50) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(12) NOT NULL,
        user_id BIGINT,
        ip_address VARCHAR(80),
        status_code INTEGER NOT NULL,
        int_op_code VARCHAR(50),
        response_time_ms INTEGER NOT NULL,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    await this.query(
      `CREATE TABLE IF NOT EXISTS microservice_endpoint_metrics (
        service_name VARCHAR(50) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(12) NOT NULL,
        request_count BIGINT NOT NULL DEFAULT 0,
        total_response_time_ms BIGINT NOT NULL DEFAULT 0,
        avg_response_time_ms NUMERIC(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (service_name, endpoint, method)
      )`
    );

    this.observabilityReady = true;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

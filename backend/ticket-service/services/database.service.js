const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    const sslMode = process.env.DATABASE_SSL === 'true';
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslMode
        ? { rejectUnauthorized: false }
        : false,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool = pool;
    this.observabilityReady = false;
  }

  async ensureObservabilitySchema() {
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

  async query(text, params) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { DatabaseService };

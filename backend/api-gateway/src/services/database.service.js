const { Pool } = require('pg');

class GatewayDatabaseService {
  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    if (!connectionString) {
      this.enabled = false;
      this.pool = null;
      return;
    }

    const sslMode = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
    this.pool = new Pool({
      connectionString,
      ssl: sslMode ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (error) => {
      console.error('Gateway DB pool error:', error);
    });

    this.enabled = true;
    this.schemaReady = false;
  }

  isEnabled() {
    return this.enabled;
  }

  async ensureSchema() {
    if (!this.enabled || this.schemaReady) {
      return;
    }

    await this.query(
      `CREATE TABLE IF NOT EXISTS gateway_request_logs (
        id BIGSERIAL PRIMARY KEY,
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
      `CREATE TABLE IF NOT EXISTS gateway_endpoint_metrics (
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(12) NOT NULL,
        request_count BIGINT NOT NULL DEFAULT 0,
        total_response_time_ms BIGINT NOT NULL DEFAULT 0,
        avg_response_time_ms NUMERIC(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (endpoint, method)
      )`
    );

    this.schemaReady = true;
  }

  async query(text, params = []) {
    if (!this.enabled || !this.pool) {
      return null;
    }

    return this.pool.query(text, params);
  }
}

module.exports = { GatewayDatabaseService };

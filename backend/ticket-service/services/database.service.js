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

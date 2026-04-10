import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    const useDbSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useDbSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

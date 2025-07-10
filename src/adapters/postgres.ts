import { Pool, PoolClient } from 'pg';
import { QueryExecutor, SQLQuery } from '../types';

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class PostgreSQLAdapter implements QueryExecutor {
  private pool: Pool;

  constructor(config: PostgreSQLConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.max || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000
    });
  }

  async execute<T>(query: SQLQuery): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query.sql, query.params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async executeOne<T>(query: SQLQuery): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query.sql, query.params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Transaction executor for use within transactions
export class TransactionExecutor implements QueryExecutor {
  constructor(private client: PoolClient) {}

  async execute<T>(query: SQLQuery): Promise<T[]> {
    const result = await this.client.query(query.sql, query.params);
    return result.rows;
  }

  async executeOne<T>(query: SQLQuery): Promise<T | null> {
    const result = await this.client.query(query.sql, query.params);
    return result.rows[0] || null;
  }
}

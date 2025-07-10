import { Pool, PoolClient } from 'pg';
import { 
  QueryExecutor, 
  SQLQuery, 
  QueryLogEntry,
  QueryLogger,
  ConsoleQueryLogger
} from '../types';

export type LogLevel = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'COUNT';

export interface LoggingConfig {
  enabled: boolean;
  levels?: LogLevel[] | 'all';
  logger?: QueryLogger;
  showTimestamp?: boolean;
}

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
  logging?: boolean | LoggingConfig; // New logging option
}

export class PostgreSQLAdapter implements QueryExecutor {
  private pool: Pool;
  private loggingConfig: LoggingConfig;

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

    // Configure logging
    this.loggingConfig = this.parseLoggingConfig(config.logging);
  }

  private parseLoggingConfig(logging?: boolean | LoggingConfig): LoggingConfig {
    if (logging === undefined || logging === false) {
      return { enabled: false };
    }
    
    if (logging === true) {
      return {
        enabled: true,
        levels: 'all',
        logger: new ConsoleQueryLogger(),
        showTimestamp: true
      };
    }

    // It's a LoggingConfig object
    return {
      enabled: logging.enabled,
      levels: logging.levels || 'all',
      logger: logging.logger || new ConsoleQueryLogger(logging.showTimestamp),
      showTimestamp: logging.showTimestamp !== false
    };
  }

  async execute<T>(query: SQLQuery): Promise<T[]> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(query.sql, query.params);
      
      // Log the query if logging is enabled
      if (this.shouldLogQuery(query.sql)) {
        const executionTime = Date.now() - startTime;
        const operation = this.getOperationType(query.sql);
        
        this.loggingConfig.logger?.log({
          sql: query.sql,
          params: query.params,
          executionTime,
          timestamp: new Date(),
          operation
        });
      }
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async executeOne<T>(query: SQLQuery): Promise<T | null> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(query.sql, query.params);
      
      // Log the query if logging is enabled
      if (this.shouldLogQuery(query.sql)) {
        const executionTime = Date.now() - startTime;
        const operation = this.getOperationType(query.sql);
        
        this.loggingConfig.logger?.log({
          sql: query.sql,
          params: query.params,
          executionTime,
          timestamp: new Date(),
          operation
        });
      }
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Check if query should be logged based on configuration
  private shouldLogQuery(sql: string): boolean {
    if (!this.loggingConfig.enabled) {
      return false;
    }

    if (this.loggingConfig.levels === 'all') {
      return true;
    }

    if (Array.isArray(this.loggingConfig.levels)) {
      const operation = this.getOperationType(sql);
      return this.loggingConfig.levels.includes(operation);
    }

    return false;
  }

  // Helper method to determine operation type from SQL
  private getOperationType(sql: string): QueryLogEntry['operation'] {
    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith('SELECT')) {
      if (trimmedSql.includes('COUNT(')) {
        return 'COUNT';
      }
      return 'SELECT';
    }
    if (trimmedSql.startsWith('INSERT')) return 'INSERT';
    if (trimmedSql.startsWith('UPDATE')) return 'UPDATE';
    if (trimmedSql.startsWith('DELETE')) return 'DELETE';
    return 'SELECT'; // Default fallback
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

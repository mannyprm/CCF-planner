import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static db: Knex | null = null;

  /**
   * Initialize database connection
   */
  static async initialize(): Promise<void> {
    try {
      if (this.db) {
        logger.info('Database already initialized');
        return;
      }

      // Validate database URL
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Configure Knex
      this.db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        acquireConnectionTimeout: 10000,
        debug: process.env.NODE_ENV === 'development',
      });

      // Test connection
      await this.db.raw('SELECT 1');
      logger.info('Database connection established successfully');

      // Run migrations if in development
      if (process.env.NODE_ENV === 'development') {
        await this.runMigrations();
      }
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  static getDb(): Knex {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Run database migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      const db = this.getDb();
      const [batch, migrations] = await db.migrate.latest();
      if (migrations.length > 0) {
        logger.info(`Ran ${migrations.length} migrations:`, migrations);
      } else {
        logger.info('Database is up to date');
      }
    } catch (error) {
      logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  static async rollbackMigrations(): Promise<void> {
    try {
      const db = this.getDb();
      const [batch, migrations] = await db.migrate.rollback();
      if (migrations.length > 0) {
        logger.info(`Rolled back ${migrations.length} migrations:`, migrations);
      }
    } catch (error) {
      logger.error('Failed to rollback migrations:', error);
      throw error;
    }
  }

  /**
   * Run database seeds
   */
  static async runSeeds(): Promise<void> {
    try {
      const db = this.getDb();
      await db.seed.run();
      logger.info('Database seeds completed');
    } catch (error) {
      logger.error('Failed to run seeds:', error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  static async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    const db = this.getDb();
    return db.transaction(callback);
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.db) {
      await this.db!.destroy();
      logger.info('Database connection closed');
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.getDb().raw('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get table info
   */
  static async getTableInfo(tableName: string): Promise<any> {
    return this.getDb()(tableName).columnInfo();
  }

  /**
   * Check if table exists
   */
  static async tableExists(tableName: string): Promise<boolean> {
    return this.getDb().schema.hasTable(tableName);
  }

  /**
   * Raw query execution
   */
  static async raw(sql: string, bindings?: any): Promise<any> {
    return this.getDb().raw(sql, bindings);
  }

  /**
   * Convenience query method returning rows like node-postgres
   * Many routes expect a { rows, rowCount } shape
   */
  static async query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result: any = await this.db!.raw(sql, params ?? []);
    const rows = result?.rows ?? result;
    const rowCount = Array.isArray(rows) ? rows.length : (result?.rowCount ?? 0);
    return { rows, rowCount };
  }

  /**
   * Query builder for a table
   */
  static table(tableName: string): Knex.QueryBuilder {
    return this.getDb()(tableName);
  }
}

// Export type for use in other modules
export type Database = Knex;

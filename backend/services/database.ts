/**
 * Database Service - Abstraction Layer
 *
 * Local: Uses SQLite (better-sqlite3)
 * AWS: Uses PostgreSQL (pg) - switch by changing DB_TYPE env var
 *
 * This allows local development with zero setup, then deploy to AWS
 * by just changing environment variables.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite' or 'postgres'
const DB_PATH = path.join(__dirname, '../database/health_helper.db');

let db: Database.Database;

// Initialize database connection
if (DB_TYPE === 'sqlite') {
  db = new Database(DB_PATH, { verbose: console.log });
  db.pragma('journal_mode = WAL'); // Better performance
  console.log('✅ SQLite database connected (Local Mode)');
  console.log(`📁 Database path: ${DB_PATH}`);
} else {
  // TODO: Initialize PostgreSQL for AWS deployment
  throw new Error('PostgreSQL mode not yet implemented - use DB_TYPE=sqlite for now');
}

/**
 * Database Query Interface
 * Abstracts away the differences between SQLite and PostgreSQL
 */
export class DatabaseService {
  /**
   * Execute a query with parameters
   * Returns rows for SELECT, info for INSERT/UPDATE/DELETE
   */
  query(sql: string, params: any[] = []): any {
    try {
      // Check if it's a SELECT query
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(sql);
        return { rows: stmt.all(...params) };
      } else {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        return {
          rows: [],
          rowCount: info.changes,
          lastInsertRowid: info.lastInsertRowid
        };
      }
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a single query and return first row
   */
  queryOne(sql: string, params: any[] = []): any {
    const result = this.query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Generate UUID (compatible with both SQLite and PostgreSQL)
   */
  generateId(): string {
    return uuidv4();
  }

  /**
   * Transaction support
   */
  beginTransaction(): void {
    db.prepare('BEGIN TRANSACTION').run();
  }

  commit(): void {
    db.prepare('COMMIT').run();
  }

  rollback(): void {
    db.prepare('ROLLBACK').run();
  }

  /**
   * Execute function in a transaction
   */
  transaction<T>(fn: () => T): T {
    this.beginTransaction();
    try {
      const result = fn();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (DB_TYPE === 'sqlite') {
      db.close();
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Get database statistics
   */
  getStats(): any {
    if (DB_TYPE === 'sqlite') {
      const size = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      return {
        type: 'SQLite',
        size: size,
        tables: tables.map((t: any) => t.name),
        path: DB_PATH
      };
    }
    return {};
  }
}

// Export singleton instance
export const database = new DatabaseService();

// Graceful shutdown
process.on('SIGINT', () => {
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  database.close();
  process.exit(0);
});

export default database;

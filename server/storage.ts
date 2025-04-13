import { dbConnections, type DbConnection, type InsertDbConnection, savedQueries, type SavedQuery, type InsertSavedQuery } from "@shared/schema";
import { db, pool as appPool } from "./db";
import { eq } from "drizzle-orm";
import pg from "pg";

const { Pool } = pg;

export interface IStorage {
  // Database connection management
  getConnections(): Promise<DbConnection[]>;
  getConnection(id: number): Promise<DbConnection | undefined>;
  createConnection(connection: InsertDbConnection): Promise<DbConnection>;
  updateConnection(id: number, connection: Partial<InsertDbConnection>): Promise<DbConnection | undefined>;
  deleteConnection(id: number): Promise<boolean>;
  testConnection(connection: InsertDbConnection): Promise<boolean>;
  
  // Saved queries
  getSavedQueries(connectionId?: number): Promise<SavedQuery[]>;
  getSavedQuery(id: number): Promise<SavedQuery | undefined>;
  createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery>;
  updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery | undefined>;
  deleteSavedQuery(id: number): Promise<boolean>;
  
  // Database operations
  listDatabases(connectionId: number): Promise<string[]>;
  listTables(connectionId: number, database?: string): Promise<string[]>;
  getTableSchema(connectionId: number, table: string): Promise<any>;
  executeQuery(connectionId: number, query: string): Promise<any>;
  getTableData(connectionId: number, table: string, page?: number, pageSize?: number): Promise<{ data: any[], total: number }>;
}

export class DatabaseStorage implements IStorage {
  private connectionPools: Map<number, typeof Pool.prototype> = new Map();
  
  private async getConnectionPool(connectionId: number): Promise<typeof Pool.prototype> {
    // Check if we already have a pool for this connection
    if (this.connectionPools.has(connectionId)) {
      return this.connectionPools.get(connectionId)!;
    }
    
    // Get connection details
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }
    
    // Create a new pool
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false
    });
    
    // Store the pool
    this.connectionPools.set(connectionId, pool);
    
    return pool;
  }

  // Connection Management
  async getConnections(): Promise<DbConnection[]> {
    return db.select().from(dbConnections).orderBy(dbConnections.name);
  }

  async getConnection(id: number): Promise<DbConnection | undefined> {
    const [connection] = await db.select().from(dbConnections).where(eq(dbConnections.id, id));
    return connection;
  }

  async createConnection(connection: InsertDbConnection): Promise<DbConnection> {
    const [newConnection] = await db.insert(dbConnections).values(connection).returning();
    return newConnection;
  }

  async updateConnection(id: number, connection: Partial<InsertDbConnection>): Promise<DbConnection | undefined> {
    const [updatedConnection] = await db
      .update(dbConnections)
      .set(connection)
      .where(eq(dbConnections.id, id))
      .returning();
    
    // If the connection details changed, remove the existing pool
    if (this.connectionPools.has(id)) {
      this.connectionPools.delete(id);
    }
    
    return updatedConnection;
  }

  async deleteConnection(id: number): Promise<boolean> {
    const result = await db.delete(dbConnections).where(eq(dbConnections.id, id)).returning({ id: dbConnections.id });
    
    // Clean up the connection pool if it exists
    if (this.connectionPools.has(id)) {
      const pool = this.connectionPools.get(id)!;
      await pool.end();
      this.connectionPools.delete(id);
    }
    
    return result.length > 0;
  }

  async testConnection(connection: InsertDbConnection): Promise<boolean> {
    const testPool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000 // 5 seconds timeout
    });
    
    try {
      // Attempt to connect
      const client = await testPool.connect();
      client.release();
      await testPool.end();
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      try {
        await testPool.end();
      } catch (endError) {
        console.error("Error ending test pool:", endError);
      }
      return false;
    }
  }

  // Saved Queries
  async getSavedQueries(connectionId?: number): Promise<SavedQuery[]> {
    if (connectionId) {
      return db.select().from(savedQueries).where(eq(savedQueries.connectionId, connectionId)).orderBy(savedQueries.name);
    }
    return db.select().from(savedQueries).orderBy(savedQueries.name);
  }

  async getSavedQuery(id: number): Promise<SavedQuery | undefined> {
    const [query] = await db.select().from(savedQueries).where(eq(savedQueries.id, id));
    return query;
  }

  async createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery> {
    const [newQuery] = await db.insert(savedQueries).values(query).returning();
    return newQuery;
  }

  async updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery | undefined> {
    const [updatedQuery] = await db
      .update(savedQueries)
      .set(query)
      .where(eq(savedQueries.id, id))
      .returning();
    return updatedQuery;
  }

  async deleteSavedQuery(id: number): Promise<boolean> {
    const result = await db.delete(savedQueries).where(eq(savedQueries.id, id)).returning({ id: savedQueries.id });
    return result.length > 0;
  }

  // Database Operations
  async listDatabases(connectionId: number): Promise<string[]> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
    return result.rows.map(row => row.datname);
  }

  async listTables(connectionId: number): Promise<string[]> {
    const pool = await this.getConnectionPool(connectionId);
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    return result.rows.map(row => row.table_name);
  }

  async getTableSchema(connectionId: number, table: string): Promise<any> {
    const pool = await this.getConnectionPool(connectionId);
    
    // Get column information
    const columnsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public' 
        AND table_name = $1
      ORDER BY 
        ordinal_position;
    `, [table]);
    
    // Get primary key information
    const pkResult = await pool.query(`
      SELECT
        kcu.column_name
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [table]);
    
    const primaryKeys = pkResult.rows.map(row => row.column_name);
    
    // Get foreign key information
    const fkResult = await pool.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [table]);
    
    // Get index information
    const indexResult = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        schemaname = 'public'
        AND tablename = $1;
    `, [table]);
    
    // Get table count
    const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}";`);
    
    return {
      name: table,
      columns: columnsResult.rows,
      primaryKeys,
      foreignKeys: fkResult.rows,
      indexes: indexResult.rows,
      recordCount: parseInt(countResult.rows[0].count, 10)
    };
  }

  async executeQuery(connectionId: number, query: string): Promise<any> {
    const pool = await this.getConnectionPool(connectionId);
    try {
      const result = await pool.query(query);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields.map(field => ({
          name: field.name,
          dataTypeID: field.dataTypeID
        }))
      };
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async getTableData(
    connectionId: number, 
    table: string, 
    page: number = 1, 
    pageSize: number = 50
  ): Promise<{ data: any[], total: number }> {
    const pool = await this.getConnectionPool(connectionId);
    
    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}";`);
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get paginated data
    const offset = (page - 1) * pageSize;
    const dataResult = await pool.query(`
      SELECT * FROM "${table}"
      LIMIT ${pageSize} OFFSET ${offset};
    `);
    
    return {
      data: dataResult.rows,
      total
    };
  }
}

export const storage = new DatabaseStorage();

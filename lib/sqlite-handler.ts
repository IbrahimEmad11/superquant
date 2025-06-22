import 'server-only';
import Database from 'better-sqlite3';

/**
 * In-memory SQLite handler for serverless environments
 * Works by downloading SQLite files from Vercel Blob into memory buffers
 */
export class InMemorySQLiteHandler {
  public static async downloadBlobToBuffer(blobUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {   
        throw new Error(`Failed to download SQLite file: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading SQLite file:', error);
      throw new Error('Failed to download SQLite file from storage');
    }
  }

  static async testConnection(blobUrl: string): Promise<{ success: boolean; error?: string }> {
    let db: Database.Database | null = null;
    
    try {
      // Download file to memory buffer
      const buffer = await this.downloadBlobToBuffer(blobUrl);
      
      // Create in-memory database from buffer
      db = new Database(buffer, { readonly: true });
      
      // Test connection by running a simple query
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").get();
      
      return { success: true };
    } catch (error) {
      console.error('SQLite connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    } finally {
      if (db) {
        try {
          db.close();
        } catch (closeError) {
          console.warn('Error closing SQLite database:', closeError);
        }
      }
    }
  }

  static async executeQuery<T = any>(
    blobUrl: string, 
    query: string, 
    params: any[] = []
  ): Promise<T[]> {
    let db: Database.Database | null = null;
    
    try {
      // Download file to memory buffer
      const buffer = await this.downloadBlobToBuffer(blobUrl);
      
      // Create in-memory database from buffer
      db = new Database(buffer, { readonly: true });
      
      // Clean and validate the query
      const cleanQuery = query.trim();
      console.log('Executing query:', cleanQuery);
      console.log('With params:', params);
      
      // Execute query
      const stmt = db.prepare(cleanQuery);
      const results = stmt.all(...params) as T[];
      
      return results;
    } catch (error) {
      console.error('Error executing SQLite query:', error);
      console.error('Query was:', query);
      console.error('Params were:', params);
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (db) {
        try {
          db.close();
        } catch (closeError) {
          console.warn('Error closing SQLite database:', closeError);
        }
      }
    }
  }

  static async getDatabaseMetadata(blobUrl: string) {
    let db: Database.Database | null = null;
    try {
      // Download the file ONCE
      const buffer = await this.downloadBlobToBuffer(blobUrl);
      // Open the database ONCE
      db = new Database(buffer, { readonly: true });

      // Execute all necessary queries on the single, open database connection
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);

      const metadata = tableNames.map(tableName => {
        // Use quoted identifiers for table names to handle special characters/spaces
        const quotedTableName = `"${tableName}"`;
        const schema = db!.prepare(`PRAGMA table_info(${quotedTableName})`).all();
        const countResult = db!.prepare(`SELECT COUNT(*) as count FROM ${quotedTableName}`).get() as { count: number };
        
        return {
          name: tableName,
          columns: schema.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: !col.notnull,
            primaryKey: col.pk === 1
          })),
          rowCount: countResult?.count || 0
        };
      });

      return {
        tables: metadata,
        totalTables: tableNames.length
      };
    } catch (error) {
      console.error('Error getting SQLite database metadata:', error);
      throw new Error('Failed to retrieve database metadata');
    } finally {
      if (db) db.close();
    }
  }

  public static async getTableNames(blobUrl: string): Promise<string[]> {
    const tables = await this.executeQuery<{ name: string }>(
      blobUrl,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    return tables.map(t => t.name);
  }

  static async getTableSchema(blobUrl: string, tableName: string): Promise<any[]> {
    // Use quoted identifier for table name
    return this.executeQuery(blobUrl, `PRAGMA table_info("${tableName}")`);
  }

  // New method to get table schema in a format that LangChain can understand
  static async getTableSchemaForLangChain(blobUrl: string, tableName: string): Promise<string> {
    try {
      const schema = await this.getTableSchema(blobUrl, tableName);
      const columns = schema.map((col: any) => `${col.name} ${col.type}`).join(', ');
      return `CREATE TABLE "${tableName}" (${columns})`;
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      return `CREATE TABLE "${tableName}" (id INTEGER)`;
    }
  }

  // Method to get sample data from a table for better context
  static async getSampleData(blobUrl: string, tableName: string, limit: number = 3): Promise<any[]> {
    try {
      return await this.executeQuery(blobUrl, `SELECT * FROM "${tableName}" LIMIT ?`, [limit]);
    } catch (error) {
      console.error(`Error getting sample data for table ${tableName}:`, error);
      return [];
    }
  }
}
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
      
      // Execute query
      const stmt = db.prepare(query);
      const results = stmt.all(...params) as T[];
      
      return results;
    } catch (error) {
      console.error('Error executing SQLite query:', error);
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
    // 1. Download the file ONCE
    const buffer = await this.downloadBlobToBuffer(blobUrl);
    // 2. Open the database ONCE
    db = new Database(buffer, { readonly: true });

    // 3. Execute all necessary queries on the single, open database connection
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    const metadata = tableNames.map(tableName => {
      const schema = db!.prepare(`PRAGMA table_info(${JSON.stringify(tableName)})`).all();
      const countResult = db!.prepare(`SELECT COUNT(*) as count FROM ${JSON.stringify(tableName)}`).get() as { count: number };
      
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
    // 4. Close the single connection
    if (db) db.close();
  }
}

  static async getTableNames(blobUrl: string): Promise<string[]> {
    const tables = await this.executeQuery<{ name: string }>(
      blobUrl,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    return tables.map(t => t.name);
  }

  static async getTableSchema(blobUrl: string, tableName: string): Promise<any[]> {
    return this.executeQuery(blobUrl, `PRAGMA table_info(${tableName})`);
  }
}
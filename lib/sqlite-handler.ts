import 'server-only';
import Database from 'better-sqlite3';

/**
 * In-memory SQLite handler for serverless environments
 * Works by downloading SQLite files from Vercel Blob into memory buffers
 */
export class InMemorySQLiteHandler {
  private static fileCache = new Map<string, Buffer>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static async downloadBlobToBuffer(blobUrl: string): Promise<Buffer> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.fileCache.has(blobUrl)) {
        const expiry = this.cacheExpiry.get(blobUrl) || 0;
        if (now < expiry) {
          console.log('Using cached SQLite file');
          return this.fileCache.get(blobUrl)!;
        } else {
          // Clear expired cache
          this.fileCache.delete(blobUrl);
          this.cacheExpiry.delete(blobUrl);
        }
      }

      console.log('Downloading SQLite file from:', blobUrl);
      const response = await fetch(blobUrl, {
        headers: {
          'User-Agent': 'SQLite-Handler/1.0',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        console.error('HTTP Status:', response.status, response.statusText);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // More specific error messages
        switch (response.status) {
          case 403:
            throw new Error('Access denied to SQLite file. The file may have expired or permissions are insufficient.');
          case 404:
            throw new Error('SQLite file not found. The file may have been deleted or moved.');
          case 500:
            throw new Error('Server error when accessing SQLite file. Please try again later.');
          default:
            throw new Error(`Failed to download SQLite file: ${response.status} ${response.statusText}`);
        }
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Cache the file
      this.fileCache.set(blobUrl, buffer);
      this.cacheExpiry.set(blobUrl, now + this.CACHE_DURATION);
      
      console.log('SQLite file downloaded successfully, size:', buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error('Error downloading SQLite file:', error);
      
      if (error instanceof Error) {
        // Re-throw with more context
        throw new Error(`Failed to download SQLite file: ${error.message}`);
      }
      
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
      
      // Basic SQL injection protection
      if (cleanQuery.toLowerCase().includes('drop ') || 
          cleanQuery.toLowerCase().includes('delete ') || 
          cleanQuery.toLowerCase().includes('update ') ||
          cleanQuery.toLowerCase().includes('insert ')) {
        throw new Error('Modifying queries are not allowed');
      }
      
      // Execute query
      const stmt = db.prepare(cleanQuery);
      const results = stmt.all(...params) as T[];
      
      console.log('Query executed successfully, returned', results.length, 'rows');
      return results;
    } catch (error) {
      console.error('Error executing SQLite query:', error);
      console.error('Query was:', query);
      console.error('Params were:', params);
      
      if (error instanceof Error) {
        throw new Error(`Failed to execute query: ${error.message}`);
      }
      
      throw new Error('Failed to execute query: Unknown error');
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
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        ORDER BY name
      `).all() as { name: string }[];
      
      const tableNames = tables.map(t => t.name);
      console.log('Found tables:', tableNames);

      const metadata = [];
      
      for (const tableName of tableNames) {
        try {
          // Use quoted identifiers for table names to handle special characters/spaces
          const quotedTableName = `"${tableName}"`;
          const schema = db.prepare(`PRAGMA table_info(${quotedTableName})`).all();
          
          let rowCount = 0;
          try {
            const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${quotedTableName}`).get() as { count: number };
            rowCount = countResult?.count || 0;
          } catch (countError) {
            console.warn(`Could not get row count for table ${tableName}:`, countError);
          }
          
          metadata.push({
            name: tableName,
            columns: schema.map((col: any) => ({
              name: col.name,
              type: col.type,
              nullable: !col.notnull,
              primaryKey: col.pk === 1
            })),
            rowCount: rowCount
          });
        } catch (tableError) {
          console.warn(`Error processing table ${tableName}:`, tableError);
          // Continue with other tables
        }
      }

      return {
        tables: metadata,
        totalTables: metadata.length
      };
    } catch (error) {
      console.error('Error getting SQLite database metadata:', error);
      throw new Error(`Failed to retrieve database metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  public static async getTableNames(blobUrl: string): Promise<string[]> {
    try {
      const tables = await this.executeQuery<{ name: string }>(
        blobUrl,
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      return tables.map(t => t.name);
    } catch (error) {
      console.error('Error getting table names:', error);
      return [];
    }
  }

  static async getTableSchema(blobUrl: string, tableName: string): Promise<any[]> {
    try {
      // Use quoted identifier for table name
      return await this.executeQuery(blobUrl, `PRAGMA table_info("${tableName}")`);
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      return [];
    }
  }

  // New method to get table schema in a format that LangChain can understand
  static async getTableSchemaForLangChain(blobUrl: string, tableName: string): Promise<string> {
    try {
      const schema = await this.getTableSchema(blobUrl, tableName);
      if (schema.length === 0) {
        return `CREATE TABLE "${tableName}" (id INTEGER)`;
      }
      
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

  // Method to clear cache (useful for testing or when blob URLs change)
  static clearCache(): void {
    this.fileCache.clear();
    this.cacheExpiry.clear();
    console.log('SQLite file cache cleared');
  }
}
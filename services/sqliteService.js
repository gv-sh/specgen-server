// services/sqliteService.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class SQLiteService {
  constructor() {
    // Determine database path based on environment
    // Construct paths manually without __filename
    let rootDir = path.resolve('.');
    const nodeEnv = (process && process.env && process.env.NODE_ENV) || 'development';
    this.dbPath = nodeEnv === 'test'
      ? path.join(rootDir, 'data/test-generated-content.db')
      : path.join(rootDir, 'data/generated-content.db');

    // Promise to track initialization completion
    this._initialized = this._initialize();
  }

  /**
   * Initialize database connection and tables
   * @returns {Promise<void>}
   * @private
   */
  async _initialize() {
    try {
      // Ensure database directory exists
      await this._ensureDatabaseDirectory();

      // Create or open the database
      this.db = await new Promise((resolve, reject) => {
        const database = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Error opening database', err);
            reject(err);
          } else {
            resolve(database);
          }
        });
      });

      // Create tables if they don't exist
      await this._initializeTables();
    } catch (error) {
      console.error('Error initializing SQLite service:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized before performing operations
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (this._initialized) {
      await this._initialized;
    }
  }

  /**
   * Public method to ensure initialization is complete
   * Useful for tests and setup scripts
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    return this._ensureInitialized();
  }
  
  /**
   * Get all generated content for backup purposes
   * @returns {Promise<Array>} - All generated content items
   */
  async getAllGenerationsForBackup() {
    await this._ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM generated_content ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse and map rows
        const parsedRows = rows.map(row => this._mapRowToObject(row));
        resolve(parsedRows);
      });
    });
  }
  
  /**
   * Restore generations from backup data
   * @param {Array} generations - Array of generation objects to restore
   * @returns {Promise<void>}
   */
  restoreGenerationsFromBackup(generations) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(generations)) {
        reject(new Error('Invalid generations data: must be an array'));
        return;
      }
      
      // Begin transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Clear existing content
        this.db.run('DELETE FROM generated_content', (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Prepare insert statement
          const stmt = this.db.prepare(`
            INSERT INTO generated_content 
            (id, title, type, content, image_data, parameter_values, metadata, year, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          let hasError = false;
          
          // Insert each generation
          generations.forEach(generation => {
            try {
              // Convert complex objects to JSON strings if they aren't already
              const parameterValues = typeof generation.parameterValues === 'string' 
                ? generation.parameterValues 
                : JSON.stringify(generation.parameterValues || {});
                
              const metadata = typeof generation.metadata === 'string' 
                ? generation.metadata 
                : JSON.stringify(generation.metadata || {});
              
              stmt.run(
                generation.id,
                generation.title || `Content ${new Date().toISOString()}`,
                generation.type || 'unknown',
                generation.content || null,
                generation.imageData || null,
                parameterValues,
                metadata,
                generation.year || null,
                generation.createdAt || new Date().toISOString(),
                generation.updatedAt || new Date().toISOString(),
                (err) => {
                  if (err && !hasError) {
                    hasError = true;
                    console.error('Error inserting generation:', err, generation.id);
                  }
                }
              );
            } catch (error) {
              hasError = true;
              console.error('Error processing generation:', error, generation.id);
            }
          });
          
          // Finalize statement
          stmt.finalize((err) => {
            if (err || hasError) {
              this.db.run('ROLLBACK');
              reject(err || new Error('Error during restore'));
              return;
            }
            
            // Commit transaction
            this.db.run('COMMIT', (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              resolve();
            });
          });
        });
      });
    });
  }

  /**
   * Ensure database directory exists
   * @private
   */
  async _ensureDatabaseDirectory() {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    } catch (error) {
      console.error('Error creating database directory', error);
    }
  }

  /**
   * Initialize database tables and indexes
   * @private
   * @returns {Promise<void>}
   */
  _initializeTables() {
    return new Promise((resolve, reject) => {
      // Create the main table first
      this.db.run(`
        CREATE TABLE IF NOT EXISTS generated_content (
          id TEXT PRIMARY KEY,
          title TEXT,
          type TEXT NOT NULL,
          content TEXT,
          image_data BLOB,
          parameter_values TEXT,
          metadata TEXT,
          year INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create indexes for performance optimization
        this._createIndexes()
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Create database indexes for improved query performance
   * @private
   * @returns {Promise<void>}
   */
  _createIndexes() {
    return new Promise((resolve, reject) => {
      const indexes = [
        // Index for ORDER BY created_at DESC queries (most common)
        `CREATE INDEX IF NOT EXISTS idx_generated_content_created_at 
         ON generated_content(created_at DESC)`,
        
        // Index for type filtering
        `CREATE INDEX IF NOT EXISTS idx_generated_content_type 
         ON generated_content(type)`,
        
        // Index for year filtering
        `CREATE INDEX IF NOT EXISTS idx_generated_content_year 
         ON generated_content(year)`,
        
        // Composite index for combined type and year filtering with chronological ordering
        `CREATE INDEX IF NOT EXISTS idx_generated_content_type_year_created 
         ON generated_content(type, year, created_at DESC)`,
        
        // Composite index for type filtering with chronological ordering
        `CREATE INDEX IF NOT EXISTS idx_generated_content_type_created 
         ON generated_content(type, created_at DESC)`,
        
        // Composite index for year filtering with chronological ordering
        `CREATE INDEX IF NOT EXISTS idx_generated_content_year_created 
         ON generated_content(year, created_at DESC)`,
        
        // Index for updated_at (useful for tracking recent changes)
        `CREATE INDEX IF NOT EXISTS idx_generated_content_updated_at 
         ON generated_content(updated_at DESC)`
      ];

      let completed = 0;
      let hasError = false;

      indexes.forEach(indexSql => {
        this.db.run(indexSql, (err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
            return;
          }
          
          completed++;
          if (completed === indexes.length && !hasError) {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Safely parse JSON, returning empty object if parsing fails
   * @private
   * @param {string} jsonString - JSON string to parse
   * @returns {Object} - Parsed JSON or empty object
   */
  _safeJSONParse(jsonString) {
    try {
      return jsonString ? JSON.parse(jsonString) : {};
    } catch (error) {
      console.error('JSON parse error:', error);
      return {};
    }
  }

  /**
   * Map database row to application object
   * @private
   * @param {Object} row - Database row
   * @returns {Object} - Mapped object
   */
  _mapRowToObject(row) {
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      type: row.type,
      content: row.content,
      imageData: row.image_data,
      parameterValues: this._safeJSONParse(row.parameter_values),
      metadata: this._safeJSONParse(row.metadata),
      year: row.year, // Add year to the mapped object
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Save generated content
   * @param {Object} content - Content to save
   * @returns {Promise<Object>} - Saved content
   */
  async saveGeneratedContent(content) {
    await this._ensureInitialized();
    return new Promise((resolve, reject) => {
      // Ensure content has an ID
      if (!content.id) {
        content.id = `content-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      // Prepare the insert statement with year field
      const insertQuery = `
        INSERT OR REPLACE INTO generated_content 
        (id, title, type, content, image_data, parameter_values, metadata, year) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert complex objects to JSON strings
      const parameterValuesJson = JSON.stringify(content.parameterValues || {});
      const metadataJson = JSON.stringify(content.metadata || {});

      // Default title if not provided
      const title = content.title || `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} ${new Date().toISOString().slice(0, 10)}`;

      // Execute the insert
      this.db.run(
        insertQuery,
        [
          content.id,
          title,
          content.type,
          content.content || null,
          content.imageData || null,
          parameterValuesJson,
          metadataJson,
          content.year || null // Save year, defaulting to null if not provided
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Retrieve the just-inserted row to ensure all defaults are applied
          this.getContentById(content.id)
            .then(resolve)
            .catch(reject);
        }
      );
    });
  }

  /**
   * Get all generated content with optional filtering and pagination
   * @param {Object} filters - Optional filters 
   * @returns {Promise<Object>} - Generated content items with pagination info
   */
  getGeneratedContent(filters = {}) {
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereClauses = [];
      const params = [];

      // Add filters
      if (filters.type) {
        whereClauses.push('type = ?');
        params.push(filters.type);
      }

      // Add year filter if provided
      if (filters.year) {
        whereClauses.push('year = ?');
        params.push(filters.year);
      }

      const whereClause = whereClauses.length > 0 
        ? ' WHERE ' + whereClauses.join(' AND ')
        : '';

      // First, get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM generated_content${whereClause}`;
      
      this.db.get(countQuery, params, (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }

        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);

        // Then get the actual data with pagination
        let dataQuery = `SELECT * FROM generated_content${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = [...params, limit, offset];

        this.db.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          // Parse and map rows
          const parsedRows = rows.map(row => this._mapRowToObject(row));
          
          resolve({
            data: parsedRows,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          });
        });
      });
    });
  }

  /**
   * Get content summary without image data for efficient loading
   * @param {Object} filters - Optional filters with pagination
   * @returns {Promise<Object>} - Content summaries with pagination info
   */
  getContentSummary(filters = {}) {
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereClauses = [];
      const params = [];

      // Add filters
      if (filters.type) {
        whereClauses.push('type = ?');
        params.push(filters.type);
      }

      if (filters.year) {
        whereClauses.push('year = ?');
        params.push(filters.year);
      }

      const whereClause = whereClauses.length > 0 
        ? ' WHERE ' + whereClauses.join(' AND ')
        : '';

      // First, get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM generated_content${whereClause}`;
      
      this.db.get(countQuery, params, (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }

        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);

        // Get summary data (exclude content and image_data, but include hasImage flag)
        let summaryQuery = `
          SELECT 
            id, title, type, year, parameter_values, metadata, 
            created_at, updated_at,
            CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END as has_image
          FROM generated_content${whereClause} 
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?
        `;
        const summaryParams = [...params, limit, offset];

        this.db.all(summaryQuery, summaryParams, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          // Map rows to summary objects
          const summaries = rows.map(row => ({
            id: row.id,
            title: row.title,
            type: row.type,
            year: row.year,
            parameterValues: this._safeJSONParse(row.parameter_values),
            metadata: this._safeJSONParse(row.metadata),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            hasImage: Boolean(row.has_image)
          }));
          
          resolve({
            data: summaries,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          });
        });
      });
    });
  }

  /**
   * Get a specific generated content by ID
   * @param {String} id - Content ID
   * @returns {Promise<Object|null>} - Content or null if not found
   */
  getContentById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM generated_content WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(this._mapRowToObject(row));
      });
    });
  }

  /**
   * Update generated content
   * @param {String} id - Content ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} - Updated content or null
   */
  updateGeneratedContent(id, updates) {
    return new Promise((resolve, reject) => {
      // Prepare update query and params
      const updateFields = [];
      const params = [];

      // Map fields to database columns
      if (updates.title) {
        updateFields.push('title = ?');
        params.push(updates.title);
      }
      if (updates.content) {
        updateFields.push('content = ?');
        params.push(updates.content);
      }

      // Handle image data updates
      if (updates.imageData) {
        updateFields.push('image_data = ?');
        params.push(updates.imageData);
      }

      // Handle year updates
      if (updates.year !== undefined) {
        updateFields.push('year = ?');
        params.push(updates.year);
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      // If there are no fields to update, return the original content
      if (updateFields.length === 0) {
        this.getContentById(id)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Prepare the full update query
      const updateQuery = `
            UPDATE generated_content 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
          `;
      params.push(id);

      // Execute the update
      this.db.run(updateQuery, params, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Retrieve the updated content
        this.getContentById(id)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Delete generated content
   * @param {String} id - Content ID to delete
   * @returns {Promise<Boolean>} - Whether content was deleted
   */
  deleteGeneratedContent(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM generated_content WHERE id = ?', [id], function (err) {
        if (err) {
          reject(err);
          return;
        }

        // Resolve with true if a row was deleted
        resolve(this.changes > 0);
      });
    });
  }

  /**
   * Reset the generated content table
   * @returns {Promise<void>}
   */
  async resetGeneratedContent() {
    await this._ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM generated_content', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Get content filtered by year
   * @param {Number} year - Year to filter by
   * @returns {Promise<Array>} - Content items matching the year
   */
  getContentByYear(year) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM generated_content WHERE year = ? ORDER BY created_at DESC', [year], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse and map rows
        const parsedRows = rows.map(row => this._mapRowToObject(row));
        resolve(parsedRows);
      });
    });
  }

  /**
   * Get available years in the content database
   * @returns {Promise<Array>} - List of years that have content
   */
  getAvailableYears() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT DISTINCT year FROM generated_content WHERE year IS NOT NULL ORDER BY year', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Extract year values
        const years = rows.map(row => row.year);
        resolve(years);
      });
    });
  }

  /**
   * Get database performance information including index usage
   * @returns {Promise<Object>} - Database performance metrics
   */
  getDatabaseInfo() {
    return new Promise((resolve, reject) => {
      // Get all indexes
      this.db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='generated_content'", (err, indexes) => {
        if (err) {
          reject(err);
          return;
        }

        // Get table info
        this.db.all("PRAGMA table_info(generated_content)", (err, tableInfo) => {
          if (err) {
            reject(err);
            return;
          }

          // Get total record count
          this.db.get("SELECT COUNT(*) as total FROM generated_content", (err, countResult) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({
              totalRecords: countResult.total,
              indexes: indexes.map(idx => ({
                name: idx.name,
                sql: idx.sql
              })),
              columns: tableInfo.map(col => ({
                name: col.name,
                type: col.type,
                notNull: Boolean(col.notnull),
                primaryKey: Boolean(col.pk)
              }))
            });
          });
        });
      });
    });
  }

  /**
   * Analyze query performance for a specific query
   * @param {string} query - SQL query to analyze
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query execution plan
   */
  analyzeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
      
      this.db.all(explainQuery, params, (err, plan) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          query,
          executionPlan: plan.map(step => ({
            id: step.id,
            parent: step.parent,
            notused: step.notused,
            detail: step.detail
          }))
        });
      });
    });
  }

  /**
   * Run database maintenance operations
   * @returns {Promise<Object>} - Maintenance results
   */
  runMaintenance() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Run ANALYZE to update query planner statistics
      this.db.run("ANALYZE", (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Run VACUUM to reclaim space and defragment
        this.db.run("VACUUM", (err) => {
          if (err) {
            reject(err);
            return;
          }

          const endTime = Date.now();
          resolve({
            operations: ['ANALYZE', 'VACUUM'],
            duration: endTime - startTime,
            message: 'Database maintenance completed successfully'
          });
        });
      });
    });
  }

  /**
   * Close the database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

module.exports = new SQLiteService();
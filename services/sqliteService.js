// services/sqliteService.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class SQLiteService {
  constructor() {
    // Determine database path based on environment
    // Construct paths manually without __filename
    let rootDir = path.resolve('.');
    this.dbPath = globalThis.process?.env?.NODE_ENV === 'test'
      ? path.join(rootDir, 'data/test-generated-content.db')
      : path.join(rootDir, 'data/generated-content.db');

    // Ensure database directory exists
    this.#ensureDatabaseDirectory();

    // Create or open the database
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err);
      }
    });

    // Create tables if they don't exist
    this.#initializeTables();
  }
  
  /**
   * Get all generated content for backup purposes
   * @returns {Promise<Array>} - All generated content items
   */
  getAllGenerationsForBackup() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM generated_content ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse and map rows
        const parsedRows = rows.map(row => this.#mapRowToObject(row));
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
    return new Promise(async (resolve, reject) => {
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
  async #ensureDatabaseDirectory() {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    } catch (error) {
      console.error('Error creating database directory', error);
    }
  }

  /**
   * Initialize database tables
   * @private
   */
  #initializeTables() {
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
    `);
  }

  /**
   * Safely parse JSON, returning empty object if parsing fails
   * @private
   * @param {string} jsonString - JSON string to parse
   * @returns {Object} - Parsed JSON or empty object
   */
  #safeJSONParse(jsonString) {
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
  #mapRowToObject(row) {
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      type: row.type,
      content: row.content,
      imageData: row.image_data,
      parameterValues: this.#safeJSONParse(row.parameter_values),
      metadata: this.#safeJSONParse(row.metadata),
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
  saveGeneratedContent(content) {
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
   * Get all generated content with optional filtering
   * @param {Object} filters - Optional filters 
   * @returns {Promise<Array>} - Generated content items
   */
  getGeneratedContent(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM generated_content';
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

      // Add WHERE clause if filters exist
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      // Add ordering by most recent first
      query += ' ORDER BY created_at DESC';

      // Add limit if provided
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse and map rows
        const parsedRows = rows.map(row => this.#mapRowToObject(row));
        resolve(parsedRows);
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

        resolve(this.#mapRowToObject(row));
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
  resetGeneratedContent() {
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
        const parsedRows = rows.map(row => this.#mapRowToObject(row));
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
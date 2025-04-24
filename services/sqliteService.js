const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class SQLiteService {
  constructor() {
    // Determine database path based on environment
    this.dbPath = process.env.NODE_ENV === 'test' 
      ? path.resolve(__dirname, '../data/test-generated-content.db')
      : path.resolve(__dirname, '../data/generated-content.db');
    
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
        image_url TEXT,
        parameter_values TEXT,
        metadata TEXT,
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
      imageUrl: row.image_url,
      parameterValues: this.#safeJSONParse(row.parameter_values),
      metadata: this.#safeJSONParse(row.metadata),
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

      // Prepare the insert statement
      const insertQuery = `
        INSERT OR REPLACE INTO generated_content 
        (id, title, type, content, image_url, parameter_values, metadata) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Convert complex objects to JSON strings
      const parameterValuesJson = JSON.stringify(content.parameterValues || {});
      const metadataJson = JSON.stringify(content.metadata || {});

      // Execute the insert
      this.db.run(
        insertQuery,
        [
          content.id,
          content.title || `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} ${new Date().toISOString().slice(0, 10)}`,
          content.type,
          content.content || null,
          content.imageUrl || content.image_url || null,
          parameterValuesJson,
          metadataJson
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

      // Add WHERE clause if filters exist
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
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
      
      // Handle both imageUrl and image_url
      if (updates.imageUrl) {
        updateFields.push('image_url = ?');
        params.push(updates.imageUrl);
      } else if (updates.image_url) {
        updateFields.push('image_url = ?');
        params.push(updates.image_url);
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

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
      this.db.run('DELETE FROM generated_content WHERE id = ?', [id], function(err) {
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
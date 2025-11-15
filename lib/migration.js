/**
 * Database migration system
 * Handles versioned SQL migrations for unified database schema
 */

import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import boom from '@hapi/boom';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MigrationService {
  constructor(databasePath) {
    this.databasePath = databasePath;
    this.migrationsPath = path.resolve(__dirname, '../migrations');
  }

  /**
   * Initialize the database connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.databasePath, (err) => {
        if (err) {
          reject(boom.internal('Failed to connect to database', err));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        filename TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) reject(boom.internal('Failed to create migrations table', err));
        else resolve();
      });
    });
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    const sql = 'SELECT version FROM migrations ORDER BY version';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, rows) => {
        if (err) reject(boom.internal('Failed to get applied migrations', err));
        else resolve(rows.map(row => row.version));
      });
    });
  }

  /**
   * Get list of available migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const version = file.split('_')[0];
          return { version, filename: file };
        })
        .sort((a, b) => a.version.localeCompare(b.version));
    } catch (error) {
      throw boom.internal('Failed to read migrations directory', error);
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(migration) {
    const migrationPath = path.join(this.migrationsPath, migration.filename);
    
    try {
      const sql = await fs.readFile(migrationPath, 'utf8');
      
      // Execute migration in a transaction
      await this.executeTransaction(async () => {
        // Split SQL by semicolons, handling multiline statements
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0)
          .map(stmt => {
            // Remove comments and normalize whitespace
            return stmt
              .replace(/--.*$/gm, '') // Remove line comments
              .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          })
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await new Promise((resolve, reject) => {
            this.db.run(statement, (err) => {
              if (err) reject(boom.internal(`Migration failed: ${statement}`, err));
              else resolve();
            });
          });
        }

        // Record migration as applied
        await new Promise((resolve, reject) => {
          this.db.run(
            'INSERT INTO migrations (version, filename) VALUES (?, ?)',
            [migration.version, migration.filename],
            (err) => {
              if (err) reject(boom.internal('Failed to record migration', err));
              else resolve();
            }
          );
        });
      });

      console.log(`✅ Applied migration: ${migration.filename}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration: ${migration.filename}`, error);
      throw error;
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async executeTransaction(fn) {
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          await fn();
          this.db.run('COMMIT', (err) => {
            if (err) reject(boom.internal('Failed to commit transaction', err));
            else resolve();
          });
        } catch (error) {
          this.db.run('ROLLBACK', (rollbackErr) => {
            if (rollbackErr) {
              console.error('Failed to rollback transaction:', rollbackErr);
            }
            reject(error);
          });
        }
      });
    });
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    try {
      await this.init();
      await this.createMigrationsTable();

      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();

      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMigrations.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date. No migrations to run.');
        return;
      }

      console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      console.log(`✅ All migrations completed successfully.`);
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate JSON data to SQLite tables
   */
  async migrateJsonData() {
    try {
      // Read existing JSON files
      const categoriesPath = path.resolve('./data/test-database.json');
      const settingsPath = path.resolve('./data/settings.json');

      let jsonData = { categories: [], parameters: [] };
      let settingsData = {};

      try {
        const jsonContent = await fs.readFile(categoriesPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        console.log('No existing JSON database found, starting fresh.');
      }

      try {
        const settingsContent = await fs.readFile(settingsPath, 'utf8');
        settingsData = JSON.parse(settingsContent);
      } catch (error) {
        console.log('No existing settings found, using defaults.');
      }

      console.log(`🔄 Migrating ${jsonData.categories?.length || 0} categories...`);
      
      // Migrate categories
      if (jsonData.categories?.length > 0) {
        for (const category of jsonData.categories) {
          await new Promise((resolve, reject) => {
            this.db.run(
              `INSERT OR REPLACE INTO categories (id, name, description, visibility, year) 
               VALUES (?, ?, ?, ?, ?)`,
              [category.id, category.name, category.description, category.visibility, category.year],
              (err) => {
                if (err) reject(boom.internal('Failed to migrate category', err));
                else resolve();
              }
            );
          });
        }
      }

      console.log(`🔄 Migrating ${jsonData.parameters?.length || 0} parameters...`);

      // Migrate parameters
      if (jsonData.parameters?.length > 0) {
        for (const parameter of jsonData.parameters) {
          await new Promise((resolve, reject) => {
            this.db.run(
              `INSERT OR REPLACE INTO parameters 
               (id, name, description, type, visibility, category_id, required, parameter_values, parameter_config) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                parameter.id,
                parameter.name,
                parameter.description,
                parameter.type,
                parameter.visibility,
                parameter.categoryId,
                parameter.required ? 1 : 0,
                parameter.values ? JSON.stringify(parameter.values) : null,
                parameter.config ? JSON.stringify(parameter.config) : null
              ],
              (err) => {
                if (err) reject(boom.internal('Failed to migrate parameter', err));
                else resolve();
              }
            );
          });
        }
      }

      // Migrate settings
      if (Object.keys(settingsData).length > 0) {
        console.log('🔄 Migrating settings...');
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT OR REPLACE INTO settings (key, value, description) 
             VALUES (?, ?, ?)`,
            ['app_settings', JSON.stringify(settingsData), 'Main application settings'],
            (err) => {
              if (err) reject(boom.internal('Failed to migrate settings', err));
              else resolve();
            }
          );
        });
      }

      console.log('✅ JSON data migration completed successfully.');
    } catch (error) {
      console.error('❌ JSON data migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

export default MigrationService;
/**
 * Unified data service with simplified patterns
 * Replaces databaseService, sqliteService, and settingsService
 */

import boom from '@hapi/boom';
import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';

class DataService {
  constructor() {
    this.initialized = false;
    this.jsonPath = path.resolve('./data/test-database.json');
    this.sqlitePath = path.resolve('./data/test-generated-content.db');
    this.settingsPath = path.resolve('./data/settings.json');
    
    // Adjust paths for production
    if (process.env.NODE_ENV === 'production') {
      this.jsonPath = path.resolve('./data/database.json');
      this.sqlitePath = path.resolve('./data/generated-content.db');
    }
  }

  /**
   * Initialize database connections
   */
  async init() {
    if (!this.initialized) {
      // Initialize JSON database
      await this.ensureJsonDatabase();
      
      // Initialize SQLite database
      await this.initSqliteDatabase();
      
      this.initialized = true;
    }
  }

  async ensureJsonDatabase() {
    try {
      await fs.access(this.jsonPath);
    } catch {
      const defaultData = { categories: [], parameters: [] };
      await fs.mkdir(path.dirname(this.jsonPath), { recursive: true });
      await fs.writeFile(this.jsonPath, JSON.stringify(defaultData, null, 2));
    }
  }

  async initSqliteDatabase() {
    return new Promise((resolve, reject) => {
      this.sqlite = new sqlite3.Database(this.sqlitePath, (err) => {
        if (err) {
          reject(boom.internal('Failed to connect to SQLite database', err));
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const commands = [
      `CREATE TABLE IF NOT EXISTS generated_content (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        image_data BLOB,
        parameter_values TEXT,
        metadata TEXT,
        year INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_content_type ON generated_content(type)`,
      `CREATE INDEX IF NOT EXISTS idx_content_created_at ON generated_content(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_content_year ON generated_content(year)`
    ];

    for (const command of commands) {
      await new Promise((resolve, reject) => {
        this.sqlite.run(command, (err) => {
          if (err) reject(boom.internal('Database setup failed', err));
          else resolve();
        });
      });
    }
  }

  // === JSON DATABASE OPERATIONS ===

  async readJsonData() {
    const data = await fs.readFile(this.jsonPath, 'utf8');
    return JSON.parse(data);
  }

  async writeJsonData(data) {
    await fs.writeFile(this.jsonPath, JSON.stringify(data, null, 2));
  }

  // === CATEGORIES ===

  async getCategories() {
    await this.init();
    const data = await this.readJsonData();
    return data.categories || [];
  }

  async getCategoryById(id) {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === id) || null;
  }

  async createCategory(category) {
    await this.init();
    
    const data = await this.readJsonData();
    if (!data.categories) data.categories = [];
    
    // Check for duplicate
    if (data.categories.some(cat => cat.name.toLowerCase() === category.name.toLowerCase())) {
      throw boom.conflict(`Category with name "${category.name}" already exists`);
    }

    const newCategory = {
      id: category.name.replace(/\s+/g, '-').toLowerCase(),
      name: category.name,
      description: category.description || '',
      visibility: category.visibility || 'Show',
      year: category.year || null
    };

    data.categories.push(newCategory);
    await this.writeJsonData(data);
    return newCategory;
  }

  async updateCategory(id, updates) {
    await this.init();
    
    const data = await this.readJsonData();
    if (!data.categories) data.categories = [];
    
    const index = data.categories.findIndex(cat => cat.id === id);
    if (index === -1) {
      throw boom.notFound(`Category with ID ${id} not found`);
    }

    // Check for name conflicts
    if (updates.name) {
      const duplicate = data.categories.find(cat => 
        cat.id !== id && cat.name.toLowerCase() === updates.name.toLowerCase()
      );
      if (duplicate) {
        throw boom.conflict(`Category with name "${updates.name}" already exists`);
      }
    }

    data.categories[index] = { ...data.categories[index], ...updates };
    await this.writeJsonData(data);
    return data.categories[index];
  }

  async deleteCategory(id) {
    await this.init();
    
    const data = await this.readJsonData();
    if (!data.categories) data.categories = [];
    
    const categoryIndex = data.categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      throw boom.notFound(`Category with ID ${id} not found`);
    }

    const deletedCategory = data.categories[categoryIndex];
    
    // Remove category and its parameters
    data.categories.splice(categoryIndex, 1);
    const deletedParameters = data.parameters?.filter(param => param.categoryId === id) || [];
    data.parameters = data.parameters?.filter(param => param.categoryId !== id) || [];
    
    await this.writeJsonData(data);
    return {
      deletedCategory,
      deletedParameters,
      parameterCount: deletedParameters.length
    };
  }

  // === PARAMETERS ===

  async getParameters(categoryId = null) {
    await this.init();
    const data = await this.readJsonData();
    const parameters = data.parameters || [];
    
    if (categoryId) {
      return parameters.filter(param => param.categoryId === categoryId);
    }
    
    return parameters;
  }

  async getParameterById(id) {
    const parameters = await this.getParameters();
    return parameters.find(param => param.id === id) || null;
  }

  async createParameter(parameter) {
    await this.init();
    
    // Verify category exists
    const category = await this.getCategoryById(parameter.categoryId);
    if (!category) {
      throw boom.badRequest(`Category with ID ${parameter.categoryId} does not exist`);
    }

    const data = await this.readJsonData();
    if (!data.parameters) data.parameters = [];

    const newParameter = {
      id: `${parameter.categoryId}-${parameter.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: parameter.name,
      description: parameter.description || '',
      type: parameter.type,
      visibility: parameter.visibility || 'Basic',
      categoryId: parameter.categoryId,
      required: parameter.required || false,
      values: parameter.values || null,
      config: parameter.config || null
    };

    data.parameters.push(newParameter);
    await this.writeJsonData(data);
    return newParameter;
  }

  async updateParameter(id, updates) {
    await this.init();
    
    const data = await this.readJsonData();
    if (!data.parameters) data.parameters = [];
    
    const index = data.parameters.findIndex(param => param.id === id);
    if (index === -1) {
      throw boom.notFound(`Parameter with ID ${id} not found`);
    }

    data.parameters[index] = { ...data.parameters[index], ...updates };
    await this.writeJsonData(data);
    return data.parameters[index];
  }

  async deleteParameter(id) {
    await this.init();
    
    const data = await this.readJsonData();
    if (!data.parameters) data.parameters = [];
    
    const index = data.parameters.findIndex(param => param.id === id);
    if (index === -1) {
      throw boom.notFound(`Parameter with ID ${id} not found`);
    }

    const deletedParameter = data.parameters[index];
    data.parameters.splice(index, 1);
    await this.writeJsonData(data);
    return deletedParameter;
  }

  // === GENERATED CONTENT (SQLite) ===

  async getGeneratedContent(filters = {}) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 20, type, year } = filters;
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const params = [];

      if (type) {
        whereClauses.push('type = ?');
        params.push(type);
      }

      if (year) {
        whereClauses.push('year = ?');
        params.push(year);
      }

      const whereClause = whereClauses.length > 0 
        ? ' WHERE ' + whereClauses.join(' AND ')
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM generated_content${whereClause}`;
      
      this.sqlite.get(countQuery, params, (err, countResult) => {
        if (err) {
          reject(boom.internal('Database query failed', err));
          return;
        }

        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);

        // Get data
        const dataQuery = `SELECT * FROM generated_content${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = [...params, limit, offset];

        this.sqlite.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
            reject(boom.internal('Database query failed', err));
            return;
          }

          // Parse JSON fields
          const data = rows.map(row => ({
            ...row,
            parameterValues: row.parameter_values ? JSON.parse(row.parameter_values) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            imageData: row.image_data,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          resolve({
            data,
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

  async getContentSummary(filters = {}) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 20, type, year } = filters;
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const params = [];

      if (type) {
        whereClauses.push('type = ?');
        params.push(type);
      }

      if (year) {
        whereClauses.push('year = ?');
        params.push(year);
      }

      const whereClause = whereClauses.length > 0 
        ? ' WHERE ' + whereClauses.join(' AND ')
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM generated_content${whereClause}`;
      
      this.sqlite.get(countQuery, params, (err, countResult) => {
        if (err) {
          reject(boom.internal('Database query failed', err));
          return;
        }

        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);

        // Get summary data (without content and image_data)
        const summaryQuery = `
          SELECT 
            id, title, type, year, parameter_values, metadata, 
            created_at, updated_at,
            CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END as has_image
          FROM generated_content${whereClause} 
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?
        `;
        const summaryParams = [...params, limit, offset];

        this.sqlite.all(summaryQuery, summaryParams, (err, rows) => {
          if (err) {
            reject(boom.internal('Database query failed', err));
            return;
          }

          const data = rows.map(row => ({
            id: row.id,
            title: row.title,
            type: row.type,
            year: row.year,
            parameterValues: row.parameter_values ? JSON.parse(row.parameter_values) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            hasImage: Boolean(row.has_image)
          }));

          resolve({
            data,
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

  async getContentById(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.sqlite.get('SELECT * FROM generated_content WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(boom.internal('Database query failed', err));
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        const content = {
          ...row,
          parameterValues: row.parameter_values ? JSON.parse(row.parameter_values) : {},
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          imageData: row.image_data,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        resolve(content);
      });
    });
  }

  async saveGeneratedContent(content) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const id = content.id || `content-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const title = content.title || `${content.type} ${new Date().toISOString().slice(0, 10)}`;
      
      const insertQuery = `
        INSERT OR REPLACE INTO generated_content 
        (id, title, type, content, image_data, parameter_values, metadata, year) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        title,
        content.type,
        content.content || null,
        content.imageData || null,
        JSON.stringify(content.parameterValues || {}),
        JSON.stringify(content.metadata || {}),
        content.year || null
      ];

      this.sqlite.run(insertQuery, params, (err) => {
        if (err) {
          reject(boom.internal('Failed to save content', err));
          return;
        }

        this.getContentById(id).then(resolve).catch(reject);
      });
    });
  }

  async updateGeneratedContent(id, updates) {
    await this.init();
    
    const existing = await this.getContentById(id);
    if (!existing) {
      throw boom.notFound(`Content with ID ${id} not found`);
    }

    return new Promise((resolve, reject) => {
      const updateFields = [];
      const params = [];

      if (updates.title) {
        updateFields.push('title = ?');
        params.push(updates.title);
      }
      if (updates.content) {
        updateFields.push('content = ?');
        params.push(updates.content);
      }
      if (updates.year !== undefined) {
        updateFields.push('year = ?');
        params.push(updates.year);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (updateFields.length === 0) {
        resolve(existing);
        return;
      }

      const updateQuery = `
        UPDATE generated_content 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `;
      params.push(id);

      this.sqlite.run(updateQuery, params, (err) => {
        if (err) {
          reject(boom.internal('Failed to update content', err));
          return;
        }

        this.getContentById(id).then(resolve).catch(reject);
      });
    });
  }

  async deleteGeneratedContent(id) {
    await this.init();
    
    const existing = await this.getContentById(id);
    if (!existing) {
      throw boom.notFound(`Content with ID ${id} not found`);
    }

    return new Promise((resolve, reject) => {
      this.sqlite.run('DELETE FROM generated_content WHERE id = ?', [id], (err) => {
        if (err) {
          reject(boom.internal('Failed to delete content', err));
          return;
        }

        resolve(existing);
      });
    });
  }

  async getAvailableYears() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.sqlite.all('SELECT DISTINCT year FROM generated_content WHERE year IS NOT NULL ORDER BY year', (err, rows) => {
        if (err) {
          reject(boom.internal('Database query failed', err));
          return;
        }

        resolve(rows.map(row => row.year));
      });
    });
  }

  // === SETTINGS ===

  async getSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return this.getDefaultSettings();
    }
  }

  async updateSettings(updates) {
    const current = await this.getSettings();
    const merged = { ...current, ...updates };
    
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(merged, null, 2));
    
    return merged;
  }

  getDefaultSettings() {
    return {
      ai: {
        models: {
          fiction: 'gpt-4o-mini',
          image: 'dall-e-3'
        },
        parameters: {
          fiction: {
            temperature: 0.8,
            max_tokens: 1000,
            default_story_length: 500,
            system_prompt: 'You are a speculative fiction generator that creates compelling, imaginative stories.'
          },
          image: {
            size: '1024x1024',
            quality: 'standard',
            prompt_suffix: 'Use high-quality, photorealistic rendering with attention to detail and composition.'
          }
        }
      },
      defaults: {
        content_type: 'fiction'
      }
    };
  }
}

export default new DataService();
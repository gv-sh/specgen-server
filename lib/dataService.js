/**
 * Unified Data Service
 * Handles all database operations for the unified SQLite schema
 * Replaces the previous split between JSON files and SQLite
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

class DataService {
  constructor() {
    this.db = null;
    this.dbPath = config.getDatabasePath();
  }

  /**
   * Initialize database connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(boom.internal('Failed to connect to database', err));
        } else {
          // Enable foreign key constraints
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  /**
   * Generic database query method
   */
  async query(sql, params = []) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(boom.internal(`Database query failed: ${sql}`, err));
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Generic database run method (for INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(boom.internal(`Database operation failed: ${sql}`, err));
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row
   */
  async get(sql, params = []) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(boom.internal(`Database query failed: ${sql}`, err));
        } else {
          resolve(row);
        }
      });
    });
  }

  // ==================== CATEGORIES OPERATIONS ====================

  /**
   * Get all categories
   */
  async getCategories() {
    const categories = await this.query(
      `SELECT * FROM categories 
       WHERE visibility = 'Show' 
       ORDER BY sort_order ASC, name ASC`
    );
    
    return categories.map(category => ({
      ...category,
      created_at: new Date(category.created_at),
      updated_at: new Date(category.updated_at)
    }));
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id) {
    const category = await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (!category) {
      throw boom.notFound(`Category with id ${id} not found`);
    }
    
    return {
      ...category,
      created_at: new Date(category.created_at),
      updated_at: new Date(category.updated_at)
    };
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    const id = categoryData.id || this.generateId(categoryData.name);
    
    await this.run(
      `INSERT INTO categories (id, name, description, visibility, year, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        categoryData.name,
        categoryData.description || '',
        categoryData.visibility || 'Show',
        categoryData.year || null,
        categoryData.sort_order || 0
      ]
    );
    
    return await this.getCategoryById(id);
  }

  /**
   * Update category
   */
  async updateCategory(id, updates) {
    const existingCategory = await this.getCategoryById(id);
    
    await this.run(
      `UPDATE categories 
       SET name = ?, description = ?, visibility = ?, year = ?, sort_order = ?
       WHERE id = ?`,
      [
        updates.name || existingCategory.name,
        updates.description !== undefined ? updates.description : existingCategory.description,
        updates.visibility || existingCategory.visibility,
        updates.year !== undefined ? updates.year : existingCategory.year,
        updates.sort_order !== undefined ? updates.sort_order : existingCategory.sort_order,
        id
      ]
    );
    
    return await this.getCategoryById(id);
  }

  /**
   * Delete category
   */
  async deleteCategory(id) {
    const result = await this.run('DELETE FROM categories WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw boom.notFound(`Category with id ${id} not found`);
    }
    
    return { success: true, message: 'Category deleted successfully' };
  }

  // ==================== PARAMETERS OPERATIONS ====================

  /**
   * Get parameters by category
   */
  async getParametersByCategory(categoryId) {
    const parameters = await this.query(
      `SELECT * FROM parameters 
       WHERE category_id = ? AND visibility != 'Hide'
       ORDER BY sort_order ASC, name ASC`,
      [categoryId]
    );
    
    return parameters.map(param => ({
      ...param,
      required: Boolean(param.required),
      parameter_values: param.parameter_values ? JSON.parse(param.parameter_values) : null,
      parameter_config: param.parameter_config ? JSON.parse(param.parameter_config) : null,
      created_at: new Date(param.created_at),
      updated_at: new Date(param.updated_at)
    }));
  }

  /**
   * Get all parameters
   */
  async getParameters() {
    const parameters = await this.query(
      `SELECT p.*, c.name as category_name 
       FROM parameters p 
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY c.name ASC, p.sort_order ASC, p.name ASC`
    );
    
    return parameters.map(param => ({
      ...param,
      required: Boolean(param.required),
      parameter_values: param.parameter_values ? JSON.parse(param.parameter_values) : null,
      parameter_config: param.parameter_config ? JSON.parse(param.parameter_config) : null,
      created_at: new Date(param.created_at),
      updated_at: new Date(param.updated_at)
    }));
  }

  /**
   * Get parameter by ID
   */
  async getParameterById(id) {
    const parameter = await this.get('SELECT * FROM parameters WHERE id = ?', [id]);
    
    if (!parameter) {
      throw boom.notFound(`Parameter with id ${id} not found`);
    }
    
    return {
      ...parameter,
      required: Boolean(parameter.required),
      parameter_values: parameter.parameter_values ? JSON.parse(parameter.parameter_values) : null,
      parameter_config: parameter.parameter_config ? JSON.parse(parameter.parameter_config) : null,
      created_at: new Date(parameter.created_at),
      updated_at: new Date(parameter.updated_at)
    };
  }

  /**
   * Create new parameter
   */
  async createParameter(parameterData) {
    const id = parameterData.id || this.generateId(parameterData.name);
    
    // Verify category exists
    await this.getCategoryById(parameterData.category_id);
    
    await this.run(
      `INSERT INTO parameters (id, name, description, type, visibility, category_id, required, sort_order, parameter_values, parameter_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parameterData.name,
        parameterData.description || '',
        parameterData.type,
        parameterData.visibility || 'Basic',
        parameterData.category_id,
        parameterData.required ? 1 : 0,
        parameterData.sort_order || 0,
        parameterData.parameter_values ? JSON.stringify(parameterData.parameter_values) : null,
        parameterData.parameter_config ? JSON.stringify(parameterData.parameter_config) : null
      ]
    );
    
    return await this.getParameterById(id);
  }

  /**
   * Update parameter
   */
  async updateParameter(id, updates) {
    const existingParameter = await this.getParameterById(id);
    
    // Verify category exists if being updated
    if (updates.category_id) {
      await this.getCategoryById(updates.category_id);
    }
    
    await this.run(
      `UPDATE parameters 
       SET name = ?, description = ?, type = ?, visibility = ?, category_id = ?, required = ?, sort_order = ?, parameter_values = ?, parameter_config = ?
       WHERE id = ?`,
      [
        updates.name || existingParameter.name,
        updates.description !== undefined ? updates.description : existingParameter.description,
        updates.type || existingParameter.type,
        updates.visibility || existingParameter.visibility,
        updates.category_id || existingParameter.category_id,
        updates.required !== undefined ? (updates.required ? 1 : 0) : existingParameter.required,
        updates.sort_order !== undefined ? updates.sort_order : existingParameter.sort_order,
        updates.parameter_values ? JSON.stringify(updates.parameter_values) : (existingParameter.parameter_values ? JSON.stringify(existingParameter.parameter_values) : null),
        updates.parameter_config ? JSON.stringify(updates.parameter_config) : (existingParameter.parameter_config ? JSON.stringify(existingParameter.parameter_config) : null),
        id
      ]
    );
    
    return await this.getParameterById(id);
  }

  /**
   * Delete parameter
   */
  async deleteParameter(id) {
    const result = await this.run('DELETE FROM parameters WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw boom.notFound(`Parameter with id ${id} not found`);
    }
    
    return { success: true, message: 'Parameter deleted successfully' };
  }

  // ==================== CONTENT OPERATIONS ====================

  /**
   * Save generated content
   */
  async saveGeneratedContent(contentData) {
    const id = uuidv4();
    
    await this.run(
      `INSERT INTO generated_content (id, title, content_type, fiction_content, image_url, image_prompt, prompt_data, metadata, generation_time, word_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        contentData.title,
        contentData.content_type,
        contentData.fiction_content || null,
        contentData.image_url || null,
        contentData.image_prompt || null,
        JSON.stringify(contentData.prompt_data || {}),
        JSON.stringify(contentData.metadata || {}),
        contentData.generation_time || 0,
        contentData.word_count || 0,
        contentData.status || 'completed'
      ]
    );
    
    return await this.getGeneratedContentById(id);
  }

  /**
   * Get generated content by ID
   */
  async getGeneratedContentById(id) {
    const content = await this.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    
    if (!content) {
      throw boom.notFound(`Content with id ${id} not found`);
    }
    
    return {
      ...content,
      prompt_data: JSON.parse(content.prompt_data),
      metadata: JSON.parse(content.metadata),
      created_at: new Date(content.created_at),
      updated_at: new Date(content.updated_at)
    };
  }

  /**
   * Get recent generated content
   */
  async getRecentContent(limit = 20, contentType = null) {
    let sql = 'SELECT * FROM generated_content';
    let params = [];
    
    if (contentType) {
      sql += ' WHERE content_type = ?';
      params.push(contentType);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const content = await this.query(sql, params);
    
    return content.map(item => ({
      ...item,
      prompt_data: JSON.parse(item.prompt_data),
      metadata: JSON.parse(item.metadata),
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at)
    }));
  }

  // ==================== SETTINGS OPERATIONS ====================

  /**
   * Get setting by key
   */
  async getSetting(key) {
    const setting = await this.get('SELECT * FROM settings WHERE key = ?', [key]);
    
    if (!setting) {
      throw boom.notFound(`Setting with key ${key} not found`);
    }
    
    return this.parseSetting(setting);
  }

  /**
   * Get all settings
   */
  async getSettings() {
    const settings = await this.query('SELECT * FROM settings ORDER BY key ASC');
    
    const parsed = {};
    settings.forEach(setting => {
      const parsedSetting = this.parseSetting(setting);
      parsed[setting.key] = parsedSetting.value;
    });
    
    return parsed;
  }

  /**
   * Set setting value
   */
  async setSetting(key, value, dataType = 'string', description = '') {
    const stringValue = this.stringifySettingValue(value, dataType);
    
    await this.run(
      `INSERT OR REPLACE INTO settings (key, value, data_type, description)
       VALUES (?, ?, ?, ?)`,
      [key, stringValue, dataType, description]
    );
    
    return await this.getSetting(key);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate ID from name (kebab-case)
   */
  generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Parse setting value based on data type
   */
  parseSetting(setting) {
    let value = setting.value;
    
    switch (setting.data_type) {
      case 'number':
        value = Number(setting.value);
        break;
      case 'boolean':
        value = setting.value === 'true';
        break;
      case 'json':
        value = JSON.parse(setting.value);
        break;
      default:
        // string - no parsing needed
        break;
    }
    
    return {
      ...setting,
      value,
      created_at: new Date(setting.created_at),
      updated_at: new Date(setting.updated_at)
    };
  }

  /**
   * Convert value to string for storage
   */
  stringifySettingValue(value, dataType) {
    switch (dataType) {
      case 'json':
        return JSON.stringify(value);
      case 'boolean':
      case 'number':
        return String(value);
      default:
        return value;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(resolve);
      });
    }
  }
}

// Export singleton instance
const dataService = new DataService();
export default dataService;
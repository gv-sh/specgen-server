/**
 * Consolidated Services for SpecGen Server
 * Merges dataService and AI service into a single module
 */

import sqlite3 from 'sqlite3';
import axios from 'axios';
import boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import config from './config.js';

// Check if Sharp is available
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.warn('Sharp not available - using URL-only mode:', error.message);
}

// Visual elements patterns for image generation
const VISUAL_PATTERNS = {
  characters: [
    /(Dr\.|Professor|Captain|Agent|Detective|Pandit|Guru|Swami)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(Arjun|Priya|Raj|Kavya|Dev|Meera|Ravi|Anita|Vikram|Shreya)\s+(?:stood|walked|ran|sat|looked|gazed)/gi
  ],
  locations: [
    /(in|at|on|through)\s+(the\s+)?([A-Z][a-z\s]{3,30}(?:city|planet|station|facility|temple|palace))/gi,
    /(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Hyderabad)/gi
  ],
  objects: [
    /(advanced|alien|ancient|glowing|metallic|golden)\s+(scanner|device|weapon|helmet|artifact|tabla|sitar)/gi
  ],
  atmosphere: [
    /(red|blue|green|golden|silver|purple|saffron)\s+(light|glow|mist|sky|flame)/gi
  ]
};

/**
 * Data Service - Handles all database operations
 */
class DataService {
  constructor() {
    this.db = null;
    this.dbPath = config.getDatabasePath();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(boom.internal('Failed to connect to database', err));
        } else {
          try {
            this.db.run('PRAGMA foreign_keys = ON');
            await this.ensureSchema();
            await this.importJsonDataIfNeeded();
            resolve();
          } catch (initError) {
            reject(initError);
          }
        }
      });
    });
  }

  /**
   * Ensure database schema exists
   */
  async ensureSchema() {
    // Check if tables exist
    const tableCheck = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='categories'"
    );
    
    if (!tableCheck) {
      // Create all tables
      await this.createDatabaseSchema();
    }
  }

  /**
   * Create complete database schema
   */
  async createDatabaseSchema() {
    console.log('Creating database schema...');

    // Categories table
    await this.run(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        visibility TEXT DEFAULT 'Show' CHECK(visibility IN ('Show', 'Hide')),
        year INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Parameters table
    await this.run(`
      CREATE TABLE parameters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL CHECK(type IN ('select', 'text', 'number', 'boolean', 'range')),
        visibility TEXT DEFAULT 'Basic' CHECK(visibility IN ('Basic', 'Advanced', 'Hide')),
        category_id TEXT NOT NULL,
        required INTEGER DEFAULT 0 CHECK(required IN (0, 1)),
        sort_order INTEGER DEFAULT 0,
        parameter_values TEXT,
        parameter_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Generated content table
    await this.run(`
      CREATE TABLE generated_content (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) <= 200),
        fiction_content TEXT NOT NULL CHECK(length(fiction_content) <= 50000),
        image_blob BLOB,
        image_thumbnail BLOB,
        image_format TEXT DEFAULT 'png',
        image_size_bytes INTEGER DEFAULT 0,
        thumbnail_size_bytes INTEGER DEFAULT 0,
        image_prompt TEXT CHECK(length(image_prompt) <= 1000),
        prompt_data TEXT,
        metadata TEXT,
        generation_time INTEGER DEFAULT 0 CHECK(generation_time >= 0),
        word_count INTEGER DEFAULT 0 CHECK(word_count >= 0),
        status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    await this.run(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await this.run('CREATE INDEX idx_categories_visibility ON categories(visibility)');
    await this.run('CREATE INDEX idx_categories_sort_order ON categories(sort_order)');
    await this.run('CREATE INDEX idx_parameters_category_id ON parameters(category_id)');
    await this.run('CREATE INDEX idx_parameters_visibility ON parameters(visibility)');
    await this.run('CREATE INDEX idx_content_created_at ON generated_content(created_at DESC)');
    await this.run('CREATE INDEX idx_content_status ON generated_content(status)');
    await this.run('CREATE INDEX idx_content_word_count ON generated_content(word_count)');
    await this.run('CREATE INDEX idx_composite_category_params ON parameters(category_id, visibility, sort_order)');

    // Insert default settings
    await this.run(`
      INSERT INTO settings (key, value, data_type, description) VALUES
      ('app_version', '2.0.0', 'string', 'Application version'),
      ('max_generations_per_session', '50', 'number', 'Maximum generations per session'),
      ('enable_image_generation', 'true', 'boolean', 'Enable image generation'),
      ('rate_limit_per_minute', '10', 'number', 'API rate limit per minute')
    `);

    console.log('✅ Database schema created successfully');
  }

  /**
   * Import JSON data if database is empty and JSON files exist
   */
  async importJsonDataIfNeeded() {
    try {
      // Check if categories exist
      const existingCategories = await this.query('SELECT COUNT(*) as count FROM categories');
      
      if (existingCategories[0].count === 0) {
        console.log('Database is empty, attempting JSON data import...');
        await this.importJsonData();
      }
    } catch (error) {
      // If there's an error, it might be that tables don't exist yet
      console.log('Skipping JSON import (tables may not exist yet)');
    }
  }

  /**
   * Import data from JSON files
   */
  async importJsonData() {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Try to read JSON database file
      const jsonPath = path.resolve('./data/database.json');
      const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      
      console.log('Importing categories...');
      // Import categories
      for (const category of jsonData.categories || []) {
        await this.createCategory({
          id: category.id,
          name: category.name,
          description: category.description || '',
          visibility: category.visibility || 'Show',
          year: category.year || null,
          sort_order: category.sort_order || 0
        });
      }

      console.log('Importing parameters...');
      // Import parameters
      for (const param of jsonData.parameters || []) {
        await this.createParameter({
          id: param.id,
          name: param.name,
          description: param.description || '',
          type: param.type === 'Dropdown' ? 'select' : param.type.toLowerCase(),
          visibility: param.visibility || 'Basic',
          category_id: param.categoryId,
          required: param.required || false,
          sort_order: param.sort_order || 0,
          parameter_values: param.values || param.parameter_values,
          parameter_config: param.config || param.parameter_config
        });
      }

      console.log('✅ JSON data import completed successfully');
      
    } catch (error) {
      console.log('No JSON data to import or import failed:', error.message);
    }
  }

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

  // Categories
  async getCategories() {
    const categories = await this.query(
      `SELECT * FROM categories WHERE visibility = 'Show' ORDER BY sort_order ASC, name ASC`
    );
    return categories.map(category => ({
      ...category,
      created_at: new Date(category.created_at),
      updated_at: new Date(category.updated_at)
    }));
  }

  async getCategoryById(id) {
    const category = await this.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) throw boom.notFound(`Category with id ${id} not found`);
    return {
      ...category,
      created_at: new Date(category.created_at),
      updated_at: new Date(category.updated_at)
    };
  }

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

  async updateCategory(id, updates) {
    const existing = await this.getCategoryById(id);
    await this.run(
      `UPDATE categories SET name = ?, description = ?, visibility = ?, year = ?, sort_order = ? WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.description !== undefined ? updates.description : existing.description,
        updates.visibility || existing.visibility,
        updates.year !== undefined ? updates.year : existing.year,
        updates.sort_order !== undefined ? updates.sort_order : existing.sort_order,
        id
      ]
    );
    return await this.getCategoryById(id);
  }

  async deleteCategory(id) {
    const result = await this.run('DELETE FROM categories WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Category with id ${id} not found`);
    return { success: true, message: 'Category deleted successfully' };
  }

  // Parameters
  async getParametersByCategory(categoryId) {
    const parameters = await this.query(
      `SELECT * FROM parameters WHERE category_id = ? AND visibility != 'Hide' ORDER BY sort_order ASC, name ASC`,
      [categoryId]
    );
    return this.parseParameters(parameters);
  }

  async getParameters() {
    const parameters = await this.query(
      `SELECT p.*, c.name as category_name FROM parameters p 
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY c.name ASC, p.sort_order ASC, p.name ASC`
    );
    return this.parseParameters(parameters);
  }

  async getParameterById(id) {
    const parameter = await this.get('SELECT * FROM parameters WHERE id = ?', [id]);
    if (!parameter) throw boom.notFound(`Parameter with id ${id} not found`);
    return this.parseParameters([parameter])[0];
  }

  async createParameter(parameterData) {
    const id = parameterData.id || this.generateId(parameterData.name);
    await this.getCategoryById(parameterData.category_id); // Verify category exists
    
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

  async updateParameter(id, updates) {
    const existing = await this.getParameterById(id);
    if (updates.category_id) await this.getCategoryById(updates.category_id);
    
    await this.run(
      `UPDATE parameters SET name = ?, description = ?, type = ?, visibility = ?, category_id = ?, required = ?, sort_order = ?, parameter_values = ?, parameter_config = ? WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.description !== undefined ? updates.description : existing.description,
        updates.type || existing.type,
        updates.visibility || existing.visibility,
        updates.category_id || existing.category_id,
        updates.required !== undefined ? (updates.required ? 1 : 0) : existing.required,
        updates.sort_order !== undefined ? updates.sort_order : existing.sort_order,
        updates.parameter_values ? JSON.stringify(updates.parameter_values) : (existing.parameter_values ? JSON.stringify(existing.parameter_values) : null),
        updates.parameter_config ? JSON.stringify(updates.parameter_config) : (existing.parameter_config ? JSON.stringify(existing.parameter_config) : null),
        id
      ]
    );
    return await this.getParameterById(id);
  }

  async deleteParameter(id) {
    const result = await this.run('DELETE FROM parameters WHERE id = ?', [id]);
    if (result.changes === 0) throw boom.notFound(`Parameter with id ${id} not found`);
    return { success: true, message: 'Parameter deleted successfully' };
  }

  // Content
  async saveGeneratedContent(contentData) {
    const id = uuidv4();
    await this.run(
      `INSERT INTO generated_content (id, title, fiction_content, image_blob, image_thumbnail, image_format, image_size_bytes, thumbnail_size_bytes, image_prompt, prompt_data, metadata, generation_time, word_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        contentData.title,
        contentData.fiction_content,
        contentData.image_blob || null,
        contentData.image_thumbnail || null,
        contentData.image_format || 'png',
        contentData.image_size_bytes || 0,
        contentData.thumbnail_size_bytes || 0,
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

  async getGeneratedContentById(id) {
    const content = await this.get('SELECT * FROM generated_content WHERE id = ?', [id]);
    if (!content) throw boom.notFound(`Content with id ${id} not found`);
    return {
      ...content,
      prompt_data: JSON.parse(content.prompt_data),
      metadata: JSON.parse(content.metadata),
      created_at: new Date(content.created_at),
      updated_at: new Date(content.updated_at)
    };
  }

  async getGeneratedContentForApi(id) {
    const content = await this.get(
      'SELECT id, title, fiction_content, image_format, image_size_bytes, thumbnail_size_bytes, image_prompt, prompt_data, metadata, generation_time, word_count, status, created_at, updated_at FROM generated_content WHERE id = ?', 
      [id]
    );
    if (!content) throw boom.notFound(`Content with id ${id} not found`);
    
    const result = {
      ...content,
      prompt_data: JSON.parse(content.prompt_data),
      metadata: JSON.parse(content.metadata),
      created_at: new Date(content.created_at),
      updated_at: new Date(content.updated_at)
    };

    // Add image URLs if we have BLOB data stored
    if (content.image_size_bytes > 0) {
      result.image_original_url = `/api/images/${id}/original`;
      result.image_thumbnail_url = `/api/images/${id}/thumbnail`;
    }

    return result;
  }

  async getRecentContent(limit = 20) {
    const content = await this.query(
      'SELECT id, title, fiction_content, image_format, image_size_bytes, thumbnail_size_bytes, image_prompt, prompt_data, metadata, generation_time, word_count, status, created_at, updated_at FROM generated_content ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return content.map(item => {
      const result = {
        ...item,
        prompt_data: JSON.parse(item.prompt_data),
        metadata: JSON.parse(item.metadata),
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at)
      };

      // Add image URLs if we have BLOB data stored
      if (item.image_size_bytes > 0) {
        result.image_original_url = `/api/images/${item.id}/original`;
        result.image_thumbnail_url = `/api/images/${item.id}/thumbnail`;
      }

      return result;
    });
  }

  // Settings
  async getSetting(key) {
    const setting = await this.get('SELECT * FROM settings WHERE key = ?', [key]);
    if (!setting) throw boom.notFound(`Setting with key ${key} not found`);
    return this.parseSetting(setting);
  }

  async getSettings() {
    const settings = await this.query('SELECT * FROM settings ORDER BY key ASC');
    const parsed = {};
    settings.forEach(setting => {
      const parsedSetting = this.parseSetting(setting);
      parsed[setting.key] = parsedSetting.value;
    });
    return parsed;
  }

  async setSetting(key, value, dataType = 'string', description = '') {
    const stringValue = this.stringifySettingValue(value, dataType);
    await this.run(
      `INSERT OR REPLACE INTO settings (key, value, data_type, description) VALUES (?, ?, ?, ?)`,
      [key, stringValue, dataType, description]
    );
    return await this.getSetting(key);
  }

  // Utility methods
  generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  parseParameters(parameters) {
    return parameters.map(param => ({
      ...param,
      required: Boolean(param.required),
      parameter_values: param.parameter_values ? JSON.parse(param.parameter_values) : null,
      parameter_config: param.parameter_config ? JSON.parse(param.parameter_config) : null,
      created_at: new Date(param.created_at),
      updated_at: new Date(param.updated_at)
    }));
  }

  parseSetting(setting) {
    let value = setting.value;
    switch (setting.data_type) {
      case 'number': value = Number(setting.value); break;
      case 'boolean': value = setting.value === 'true'; break;
      case 'json': value = JSON.parse(setting.value); break;
    }
    return {
      ...setting,
      value,
      created_at: new Date(setting.created_at),
      updated_at: new Date(setting.updated_at)
    };
  }

  stringifySettingValue(value, dataType) {
    switch (dataType) {
      case 'json': return JSON.stringify(value);
      case 'boolean':
      case 'number': return String(value);
      default: return value;
    }
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(resolve);
      });
    }
  }
}

/**
 * AI Service - Handles OpenAI API interactions
 */
class AIService {
  constructor() {
    this.apiKey = config.get('ai.openai.apiKey');
    this.baseUrl = config.get('ai.openai.baseUrl');
    this.isConfigured = Boolean(this.apiKey);
  }

  async generate(parameters, year = null) {
    if (!this.isConfigured) {
      throw boom.internal('OpenAI API key not configured');
    }

    return this.generateCombined(parameters, year);
  }

  async generateFiction(parameters, year) {
    const aiConfig = config.getAIConfig('fiction');
    const prompt = this.buildFictionPrompt(parameters, year);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: aiConfig.model,
          messages: [
            { role: 'system', content: aiConfig.parameters.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: aiConfig.parameters.temperature,
          max_tokens: aiConfig.parameters.maxTokens
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const content = response.data.choices[0].message.content;
      const title = this.extractTitle(content);
      const wordCount = content.split(/\s+/).length;

      return {
        success: true,
        title,
        content,
        type: 'fiction',
        wordCount,
        metadata: {
          model: response.data.model,
          tokens: response.data.usage.total_tokens
        }
      };
    } catch (error) {
      throw boom.internal('Fiction generation failed', error);
    }
  }

  async generateImage(parameters, year, generatedText = null) {
    const aiConfig = config.getAIConfig('image');
    const prompt = this.buildImagePrompt(parameters, year, generatedText);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/images/generations`,
        {
          model: aiConfig.model,
          prompt: prompt.substring(0, 4000),
          size: aiConfig.parameters.size,
          quality: aiConfig.parameters.quality,
          n: 1
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const imageUrl = response.data.data[0].url;
      
      // Download and process the image if Sharp is available
      if (sharp) {
        const imageData = await this.downloadAndProcessImage(imageUrl);
        return {
          success: true,
          imageBlob: imageData.original,
          imageThumbnail: imageData.thumbnail,
          imageFormat: imageData.format,
          imageSizeBytes: imageData.originalSize,
          thumbnailSizeBytes: imageData.thumbnailSize,
          imagePrompt: prompt.substring(0, 100) + '...',
          type: 'image',
          metadata: {
            model: aiConfig.model,
            prompt: prompt.substring(0, 100) + '...',
            originalSize: imageData.originalSize,
            thumbnailSize: imageData.thumbnailSize
          }
        };
      } else {
        // Fallback to URL mode when Sharp is not available
        return {
          success: true,
          imageUrl: imageUrl, // Keep for backward compatibility
          imagePrompt: prompt.substring(0, 100) + '...',
          type: 'image',
          metadata: {
            model: aiConfig.model,
            prompt: prompt.substring(0, 100) + '...'
          }
        };
      }
    } catch (error) {
      throw boom.internal('Image generation failed', error);
    }
  }

  async generateCombined(parameters, year) {
    const fictionResult = await this.generateFiction(parameters, year);
    if (!fictionResult.success) return fictionResult;

    const imageResult = await this.generateImage(parameters, year, fictionResult.content);
    if (!imageResult.success) return imageResult;

    // Handle both BLOB and URL responses
    const result = {
      success: true,
      title: fictionResult.title,
      content: fictionResult.content,
      imagePrompt: imageResult.imagePrompt,
      wordCount: fictionResult.wordCount,
      metadata: {
        fiction: fictionResult.metadata,
        image: imageResult.metadata
      }
    };

    // Add BLOB data if available (Sharp working)
    if (imageResult.imageBlob) {
      result.imageBlob = imageResult.imageBlob;
      result.imageThumbnail = imageResult.imageThumbnail;
      result.imageFormat = imageResult.imageFormat;
      result.imageSizeBytes = imageResult.imageSizeBytes;
      result.thumbnailSizeBytes = imageResult.thumbnailSizeBytes;
    } else {
      // Fallback to URL mode
      result.imageUrl = imageResult.imageUrl;
    }

    return result;
  }

  buildFictionPrompt(parameters, year) {
    let prompt = 'Create a compelling speculative fiction story with the following elements:\n\n';
    
    if (year) prompt += `Setting: Year ${year}\n`;
    
    Object.entries(parameters).forEach(([category, categoryParams]) => {
      if (typeof categoryParams === 'object') {
        Object.entries(categoryParams).forEach(([param, value]) => {
          if (value !== null && value !== undefined) {
            prompt += `${param.replace(/-/g, ' ')}: ${value}\n`;
          }
        });
      }
    });
    
    prompt += '\nWrite a story that incorporates these elements naturally. Include a compelling title.';
    return prompt;
  }

  buildImagePrompt(parameters, year, generatedText) {
    const aiConfig = config.getAIConfig('image');
    let prompt = 'Create a beautiful, detailed image';
    
    if (generatedText) {
      const visualElements = this.extractVisualElements(generatedText);
      if (visualElements.length > 0) {
        prompt += ` showing: ${visualElements.join(', ')}`;
      }
    }
    
    if (year) prompt += ` Set in year ${year}.`;
    prompt += ` ${aiConfig.parameters.promptSuffix}`;
    
    return prompt;
  }

  extractVisualElements(text) {
    const elements = [];
    const cleanText = text.replace(/\*\*Title:.*?\*\*/g, '').trim();
    
    Object.values(VISUAL_PATTERNS).forEach(patterns => {
      patterns.forEach(pattern => {
        const matches = cleanText.match(pattern) || [];
        matches.slice(0, 2).forEach(match => {
          const cleaned = match.replace(/\s+(stood|walked|ran|sat|looked|gazed).*$/i, '').trim();
          if (cleaned.length > 2 && cleaned.length < 50) {
            elements.push(cleaned);
          }
        });
      });
    });
    
    return [...new Set(elements)].slice(0, 5);
  }

  async downloadAndProcessImage(imageUrl) {
    try {
      // Download the image from DALL-E URL
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const originalBuffer = Buffer.from(response.data);
      
      // Process with Sharp to generate thumbnail
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize(150, 150, { fit: 'cover' })
        .png()
        .toBuffer();
      
      // Convert original to PNG for consistency
      const processedOriginal = await sharp(originalBuffer)
        .png()
        .toBuffer();
      
      return {
        original: processedOriginal,
        thumbnail: thumbnailBuffer,
        format: 'png',
        originalSize: processedOriginal.length,
        thumbnailSize: thumbnailBuffer.length
      };
    } catch (error) {
      throw boom.internal('Failed to download and process image', error);
    }
  }

  extractTitle(content) {
    const titleMatch = content.match(/\*\*Title:\s*([^*\n]+)\*\*/);
    if (titleMatch) return titleMatch[1].trim();
    
    const firstLine = content.split('\n')[0];
    if (firstLine.length < 100) {
      return firstLine.replace(/^\*\*|\*\*$/g, '').trim();
    }
    
    return `Fiction ${new Date().toISOString().slice(0, 10)}`;
  }
}

// Export singleton instances
export const dataService = new DataService();
export const aiService = new AIService();
export default { dataService, aiService };
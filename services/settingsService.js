// services/settingsService.js
const fs = require('fs').promises;
const path = require('path');

// Settings file path
const SETTINGS_PATH = path.resolve(__dirname, '../data/settings.json');

// Default settings if file doesn't exist
const DEFAULT_SETTINGS = {
  ai: {
    models: {
      fiction: "gpt-4o-mini",
      image: "dall-e-3"
    },
    parameters: {
      fiction: {
        temperature: 0.8,
        max_tokens: 1000,
        default_story_length: 500,
        system_prompt: "You are a speculative fiction generator that creates compelling, imaginative stories based on the parameters provided by the user."
      },
      image: {
        size: "1024x1024",
        quality: "standard",
        prompt_suffix: "Use high-quality, photorealistic rendering with attention to lighting, detail, and composition. The image should be visually cohesive and striking."
      }
    }
  },
  defaults: {
    content_type: "fiction"
  }
};

/**
 * Service for managing application settings
 */
class SettingsService {
  constructor() {
    this.settings = null;
    this.initialized = false;
  }

  /**
   * Initialize settings - load from file or create default
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Try to read existing settings file
      const fileContents = await fs.readFile(SETTINGS_PATH, 'utf8');
      this.settings = JSON.parse(fileContents);
    } catch (error) {
      // If file doesn't exist or has invalid JSON, use defaults
      console.log('Settings file not found or invalid, using defaults');
      this.settings = { ...DEFAULT_SETTINGS };
      
      // Create settings directory if it doesn't exist
      await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
      
      // Write default settings to file
      await this.saveSettings();
    }
    
    this.initialized = true;
  }

  /**
   * Save current settings to file
   */
  async saveSettings() {
    try {
      await fs.writeFile(
        SETTINGS_PATH,
        JSON.stringify(this.settings, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get all settings
   * @returns {Promise<Object>} - All settings
   */
  async getSettings() {
    await this.init();
    return this.settings;
  }

  /**
   * Update settings
   * @param {Object} updates - Settings updates
   * @returns {Promise<Object>} - Updated settings
   */
  async updateSettings(updates) {
    await this.init();
    
    // Deep merge updates with existing settings
    this.settings = this.deepMerge(this.settings, updates);
    
    // Save updated settings
    await this.saveSettings();
    
    return this.settings;
  }

  /**
   * Get a specific setting by path
   * @param {String} path - Dot notation path to setting (e.g., 'ai.models.fiction')
   * @param {*} defaultValue - Default value if setting not found
   * @returns {Promise<*>} - Setting value
   */
  async getSetting(path, defaultValue = null) {
    await this.init();
    
    // Split the path into parts
    const parts = path.split('.');
    
    // Traverse the settings object
    let current = this.settings;
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * Deep merge two objects
   * @private
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} - Merged object
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   * @private
   * @param {*} item - Value to check
   * @returns {Boolean} - True if object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

module.exports = new SettingsService();
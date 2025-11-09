// controllers/settingsController.js
import settingsService from '../services/settingsService.js';

/**
 * Controller for settings operations
 */
const settingsController = {
  /**
   * Get all settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;
      
      // Validation now handled by middleware
      
      // Apply updates
      const updatedSettings = await settingsService.updateSettings(updates);
      
      res.status(200).json({
        success: true,
        data: updatedSettings
      });
    } catch (error) {
      // Create a structured error response
      console.error('Error updating settings:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        detail: error.message
      });
    }
  },

  /**
   * Reset settings to defaults
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async resetSettings(req, res, next) {
    try {
      // Use an empty object to reset to defaults
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

      const resetSettings = await settingsService.updateSettings(DEFAULT_SETTINGS);
      
      res.status(200).json({
        success: true,
        message: 'Settings reset to defaults',
        data: resetSettings
      });
    } catch (error) {
      next(error);
    }
  }
};

export default settingsController;
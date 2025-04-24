// controllers/contentController.js
const databaseService = require('../services/databaseService');
const { Buffer } = require('buffer');

/**
 * Controller for managing generated content
 */
const contentController = {
  /**
   * Get all generated content, with optional filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllContent(req, res, next) {
    try {
      // Extract filter parameters from query
      const { type } = req.query;

      // Apply filters if provided
      const filters = {};
      if (type) filters.type = type;

      const content = await databaseService.getGeneratedContent(filters);

      res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a specific generated content by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getContentById(req, res, next) {
    try {
      const { id } = req.params;
      const content = await databaseService.getContentById(id);

      if (!content) {
        return res.status(404).json({
          success: false,
          error: `Content with ID ${id} not found`
        });
      }

      if (content.type === 'image' && content.imageData) {
        content.imageData = content.imageData.toString('base64');
      }

      res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      next(error);
    }
  }
  ,

  async updateContent(req, res, next) {
    try {
      const { id } = req.params;
      const { title, content, imageData } = req.body;

      // First check if content exists
      const existingContent = await databaseService.getContentById(id);

      if (!existingContent) {
        return res.status(404).json({
          success: false,
          error: `Content with ID ${id} not found`
        });
      }

      // Prepare the update object
      const updates = {};

      if (title !== undefined) updates.title = title;

      // Update content based on content type
      if (existingContent.type === 'fiction' && content !== undefined) {
        updates.content = content;
      } else if (existingContent.type === 'image' && imageData !== undefined) {
        updates.imageData = Buffer.from(imageData, 'base64');
      }

      // Update the content
      const updatedContent = await databaseService.updateGeneratedContent(id, updates);

      // For image content, prepare for response by converting back to base64
      if (updatedContent.type === 'image' && updatedContent.imageData) {
        updatedContent.imageData = updatedContent.imageData.toString('base64');
      }

      res.status(200).json({
        success: true,
        data: updatedContent
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete generated content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteContent(req, res, next) {
    try {
      const { id } = req.params;

      // First check if content exists
      const existingContent = await databaseService.getContentById(id);

      if (!existingContent) {
        return res.status(404).json({
          success: false,
          error: `Content with ID ${id} not found`
        });
      }

      // Delete the content
      await databaseService.deleteGeneratedContent(id);

      res.status(200).json({
        success: true,
        message: `Content '${existingContent.title}' deleted successfully`,
        data: {
          deletedContent: existingContent
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = contentController;
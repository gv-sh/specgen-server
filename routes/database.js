/* global process */
const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const multer = require('multer');
const fs = require('fs').promises;
const upload = multer({ dest: 'uploads/' });

/**
 * @route   GET /api/database/download
 * @desc    Download the database file
 * @access  Public
 */
router.get('/download', async (req, res) => {
  try {
    const data = await databaseService.getData();
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'No database data found'
      });
    }

    res.json(data);
  } catch (error) {
    // Use a logging service in production
    console.warn('Database download error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to download database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/database/restore
 * @desc    Restore the database from a file
 * @access  Public
 */
router.post('/restore', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Read the uploaded file
    const fileContent = await fs.readFile(req.file.path, 'utf8');
    let data;
    
    try {
      data = JSON.parse(fileContent);
    } catch {
      // Clean up the uploaded file
      await fs.unlink(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON file'
      });
    }

    // Validate the data structure
    if (!data.categories || !data.parameters || 
        !Array.isArray(data.categories) || !Array.isArray(data.parameters)) {
      // Clean up the uploaded file
      await fs.unlink(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'Invalid database structure. File must contain categories and parameters arrays.'
      });
    }

    // Save the data
    await databaseService.saveData(data);
    
    // Clean up the uploaded file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: 'Database restored successfully'
    });
  } catch (error) {
    // Clean up the uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('Error deleting uploaded file:', unlinkError);
      }
    }

    // Use a logging service in production
    console.warn('Database restore error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to restore database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/database/reset
 * @desc    Reset the database to empty state
 * @access  Public
 */
router.post('/reset', async (req, res) => {
  try {
    const emptyDatabase = {
      categories: [],
      parameters: []
    };

    await databaseService.saveData(emptyDatabase);
    
    res.json({
      success: true,
      message: 'Database reset successfully'
    });
  } catch (error) {
    // Use a logging service in production
    console.warn('Database reset error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
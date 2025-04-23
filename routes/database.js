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
router.get('/download', async (req, res, next) => {
  try {
    console.log('Download request received');
    const data = await databaseService.getData();
    console.log('Database data retrieved successfully');
    
    if (!data) {
      console.error('No data returned from database service');
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve database data'
      });
    }

    // Send the data directly without additional wrapping
    res.json(data);
    console.log('Database download response sent');
  } catch (error) {
    console.error('Error in database download:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download database',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/database/restore
 * @desc    Restore the database from a file
 * @access  Public
 */
router.post('/restore', upload.single('file'), async (req, res, next) => {
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
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON file'
      });
    }

    // Validate the data structure
    if (!data.categories || !data.parameters || !Array.isArray(data.categories) || !Array.isArray(data.parameters)) {
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
    console.error('Error in database restore:', error);
    // Clean up the uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      error: 'Failed to restore database',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/database/reset
 * @desc    Reset the database to empty state
 * @access  Public
 */
router.post('/reset', async (req, res, next) => {
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
    console.error('Error in database reset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset database',
      details: error.message
    });
  }
});

module.exports = router; 
/* global process */
const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const sqliteService = require('../services/sqliteService');
const multer = require('multer');
const fs = require('fs').promises;
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /api/database/download:
 *   get:
 *     summary: Download the database file
 *     description: Retrieve the current database file in JSON format.
 *     responses:
 *       200:
 *         description: Database data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: No database data found.
 *       500:
 *         description: Failed to download database.
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
 * @swagger
 * /api/database/generations/download:
 *   get:
 *     summary: Download the generations database
 *     description: Retrieve all generated content from the SQLite database in JSON format.
 *     responses:
 *       200:
 *         description: Generations data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: No generations data found.
 *       500:
 *         description: Failed to download generations database.
 */
router.get('/generations/download', async (req, res) => {
  try {
    const generations = await sqliteService.getAllGenerationsForBackup();
    
    if (!generations || generations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No generations data found'
      });
    }

    res.json({ generations });
  } catch (error) {
    // Use a logging service in production
    console.warn('Generations database download error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to download generations database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/database/restore:
 *   post:
 *     summary: Restore the database from a file
 *     description: Restore the database using an uploaded JSON file. The file should contain valid "categories" and "parameters" arrays.
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Database restored successfully.
 *       400:
 *         description: No file uploaded, invalid JSON file, or invalid database structure.
 *       500:
 *         description: Failed to restore database.
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
 * @swagger
 * /api/database/generations/restore:
 *   post:
 *     summary: Restore the generations database from a file
 *     description: Restore the generations database using an uploaded JSON file. The file should contain a valid "generations" array.
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Generations database restored successfully.
 *       400:
 *         description: No file uploaded, invalid JSON file, or invalid database structure.
 *       500:
 *         description: Failed to restore generations database.
 */
router.post('/generations/restore', upload.single('file'), async (req, res) => {
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
    if (!data.generations || !Array.isArray(data.generations)) {
      // Clean up the uploaded file
      await fs.unlink(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'Invalid database structure. File must contain a generations array.'
      });
    }

    // Save the generations data
    await sqliteService.restoreGenerationsFromBackup(data.generations);
    
    // Clean up the uploaded file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: 'Generations database restored successfully'
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
    console.warn('Generations database restore error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to restore generations database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/database/reset:
 *   post:
 *     summary: Reset the database to an empty state
 *     description: Clear all data from the database by resetting it to an empty state.
 *     responses:
 *       200:
 *         description: Database reset successfully.
 *       500:
 *         description: Failed to reset database.
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

/**
 * @swagger
 * /api/database/generations/reset:
 *   post:
 *     summary: Reset the generations database to an empty state
 *     description: Clear all data from the generations database by resetting it to an empty state.
 *     responses:
 *       200:
 *         description: Generations database reset successfully.
 *       500:
 *         description: Failed to reset generations database.
 */
router.post('/generations/reset', async (req, res) => {
  try {
    await sqliteService.resetGeneratedContent();
    
    res.json({
      success: true,
      message: 'Generations database reset successfully'
    });
  } catch (error) {
    // Use a logging service in production
    console.warn('Generations database reset error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset generations database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/database/reset-all:
 *   post:
 *     summary: Reset all databases to an empty state
 *     description: Clear all data from both the primary database and generations database.
 *     responses:
 *       200:
 *         description: All databases reset successfully.
 *       500:
 *         description: Failed to reset databases.
 */
router.post('/reset-all', async (req, res) => {
  try {
    const emptyDatabase = {
      categories: [],
      parameters: []
    };

    // Reset both databases
    await Promise.all([
      databaseService.saveData(emptyDatabase),
      sqliteService.resetGeneratedContent()
    ]);
    
    res.json({
      success: true,
      message: 'All databases reset successfully'
    });
  } catch (error) {
    // Use a logging service in production
    console.warn('Database reset-all error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset all databases',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
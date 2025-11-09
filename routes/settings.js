// routes/settings.js
import express from 'express';
const router = express.Router();
import settingsController from '../controllers/settingsController.js';
import validateSettings from '../middleware/validateSettings.js';

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Application settings management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Settings:
 *       type: object
 *       properties:
 *         ai:
 *           type: object
 *           properties:
 *             models:
 *               type: object
 *               properties:
 *                 fiction:
 *                   type: string
 *                   description: AI model for fiction generation
 *                   example: "gpt-4o-mini"
 *                 image:
 *                   type: string
 *                   description: AI model for image generation
 *                   example: "dall-e-3"
 *             parameters:
 *               type: object
 *               properties:
 *                 fiction:
 *                   type: object
 *                   properties:
 *                     temperature:
 *                       type: number
 *                       description: Temperature for fiction generation
 *                       example: 0.8
 *                     max_tokens:
 *                       type: integer
 *                       description: Maximum tokens for fiction generation
 *                       example: 1000
 *                     default_story_length:
 *                       type: integer
 *                       description: Default story length in words
 *                       example: 500
 *                 image:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: string
 *                       description: Image size for generation
 *                       example: "1024x1024"
 *                     quality:
 *                       type: string
 *                       description: Image quality for generation
 *                       enum: [standard, hd]
 *                       example: "standard"
 *         defaults:
 *           type: object
 *           properties:
 *             content_type:
 *               type: string
 *               description: Default content type for generation
 *               enum: [fiction, image]
 *               example: "fiction"
 *     
 *     SettingsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Settings'
 *     
 *     SettingsUpdateRequest:
 *       type: object
 *       description: Partial settings update, only include fields to update
 *       example:
 *         ai:
 *           parameters:
 *             fiction:
 *               temperature: 0.9
 *               max_tokens: 1500
 *       
 *     SettingsResetResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Settings reset to defaults"
 *         data:
 *           $ref: '#/components/schemas/Settings'
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all application settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: All application settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResponse'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/', settingsController.getSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update application settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettingsUpdateRequest'
 *     responses:
 *       200:
 *         description: Updated application settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.put('/', validateSettings, settingsController.updateSettings);

/**
 * @swagger
 * /api/settings/reset:
 *   post:
 *     summary: Reset settings to defaults
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings reset to defaults
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResetResponse'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.post('/reset', settingsController.resetSettings);

export default router;
// routes/generate.js
const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');

/**
 * @swagger
 * tags:
 *   name: Generation
 *   description: Story generation endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GenerationParameters:
 *       type: object
 *       description: >
 *         Object containing selected parameter values for story generation.
 *         Keys are category IDs and values are objects with parameter ID/value pairs.
 *       example:
 *         "cat-a93a010f-0368-4dee-a6d2-b3e1d664dd39":
 *           "param-123456": 5000
 *           "param-234567": true
 *           "param-345678": "Deep Space"
 *       additionalProperties:
 *         type: object
 *         additionalProperties: true
 *     
 *     GenerationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the generation was successful
 *           example: true
 *         content:
 *           type: string
 *           description: Generated story content
 *           example: "The starship Nebula drifted silently through the endless void of space..."
 *         metadata:
 *           type: object
 *           properties:
 *             model:
 *               type: string
 *               description: The AI model used for generation
 *               example: "gpt-3.5-turbo"
 *             tokens:
 *               type: integer
 *               description: Total tokens used for this generation
 *               example: 1250
 *       required:
 *         - success
 *         - content
 *         - metadata
 *     
 *     GenerationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Invalid parameters: Parameter 'param-123456' not found"
 *       required:
 *         - success
 *         - error
 */

/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate a story based on selected parameters
 *     description: >
 *       Sends the provided parameter selections to the AI service
 *       and returns a generated story that incorporates those elements.
 *       The request body should contain category IDs as keys, with parameter IDs and their values.
 *     tags: [Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Map of category IDs to parameter selections
 *             example:
 *               "cat-a93a010f-0368-4dee-a6d2-b3e1d664dd39":
 *                 "param-123456": 5000
 *                 "param-234567": true
 *                 "param-345678": "Option 1"
 *               "cat-456789":
 *                 "param-567890": "Anti-hero"
 *                 "param-678901": 3
 *     responses:
 *       200:
 *         description: Story generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationResponse'
 *       400:
 *         description: Invalid parameters provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationError'
 *       500:
 *         description: AI service error or other server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationError'
 */
router.post('/', generateController.generate);

module.exports = router;
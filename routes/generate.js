// routes/generate.js
const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');

/**
 * @swagger
 * tags:
 *   name: Generation
 *   description: Story and image generation endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GenerationParameters:
 *       type: object
 *       description: >
 *         Object containing parameterValues object that maps category IDs to parameter selections.
 *         The parameterValues object has category IDs as keys, with each value being an object of parameter ID/value pairs.
 *       properties:
 *         parameterValues:
 *           type: object
 *           description: Map of category IDs to parameter selections
 *           example:
 *             "science-fiction":
 *               "science-fiction-technology-level": "Near Future"
 *               "science-fiction-alien-life": true
 *               "science-fiction-space-exploration-focus": 7
 *             "fantasy":
 *               "fantasy-magic-system": "Elemental"
 *               "fantasy-mythical-creatures": ["Dragons", "Elves"]
 *         contentType:
 *           type: string
 *           description: Type of content to generate ('fiction' or 'image')
 *           enum: [fiction, image]
 *           default: fiction
 *       required:
 *         - parameterValues
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
 *           description: Generated story content (only provided for fiction type)
 *           example: "The starship Nebula drifted silently through the endless void of space..."
 *         imageUrl:
 *           type: string
 *           description: URL to the generated image (only provided for image type)
 *           example: "https://example.com/generated-image.jpg"
 *         metadata:
 *           type: object
 *           properties:
 *             model:
 *               type: string
 *               description: The AI model used for generation
 *               example: "gpt-3.5-turbo"
 *             tokens:
 *               type: integer
 *               description: Total tokens used for this generation (for fiction type)
 *               example: 1250
 *             prompt:
 *               type: string
 *               description: Prompt used for image generation (for image type)
 *               example: "A futuristic city with flying vehicles..."
 *       required:
 *         - success
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
 *     summary: Generate fiction text or an image based on selected parameters
 *     description: >
 *       Sends the provided parameter selections to the AI service
 *       and returns either a generated story or image URL based on the contentType.
 *       The request body must contain a 'parameterValues' object with category IDs as keys,
 *       and each category having parameter IDs as keys with their respective values.
 *     tags: [Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parameterValues]
 *             properties:
 *               parameterValues:
 *                 type: object
 *                 description: Map of category IDs to parameter selections
 *               contentType:
 *                 type: string
 *                 enum: [fiction, image]
 *                 default: fiction
 *                 description: Type of content to generate
 *           examples:
 *             fictionGeneration:
 *               summary: Fiction generation request
 *               value:
 *                 parameterValues:
 *                   "science-fiction":
 *                     "science-fiction-technology-level": "Near Future"
 *                     "science-fiction-alien-life": true
 *                     "science-fiction-space-exploration-focus": 7
 *                 contentType: "fiction"
 *             imageGeneration:
 *               summary: Image generation request
 *               value:
 *                 parameterValues:
 *                   "fantasy":
 *                     "fantasy-magic-system": "Elemental"
 *                     "fantasy-mythical-creatures": ["Dragons", "Elves"]
 *                 contentType: "image"
 *     responses:
 *       200:
 *         description: Content generated successfully
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
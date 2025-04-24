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
 *           description: Type of content to generate ('fiction', 'image', or 'combined')
 *           enum: [fiction, image, combined]
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
 *           description: Generated story content (only provided for fiction or combined type)
 *           example: "The starship Nebula drifted silently through the endless void of space..."
 *         imageData:
 *           type: string
 *           description: Base64-encoded image data (only provided for image or combined type)
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         metadata:
 *           type: object
 *           properties:
 *             model:
 *               type: string
 *               description: The AI model used for generation (for fiction or image type)
 *               example: "gpt-4o-mini"
 *             tokens:
 *               type: integer
 *               description: Total tokens used for this generation (for fiction type)
 *               example: 1250
 *             prompt:
 *               type: string
 *               description: Prompt used for image generation (for image type)
 *               example: "A futuristic city with flying vehicles..."
 *             fiction:
 *               type: object
 *               description: Fiction generation metadata (for combined type)
 *               properties:
 *                 model:
 *                   type: string
 *                   example: "gpt-4o-mini"
 *                 tokens:
 *                   type: integer
 *                   example: 1250
 *             image:
 *               type: object
 *               description: Image generation metadata (for combined type)
 *               properties:
 *                 model:
 *                   type: string
 *                   example: "dall-e-3"
 *                 prompt:
 *                   type: string
 *                   example: "A fantasy landscape with dragons and elves..."
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
 *                 enum: [fiction, image, combined]
 *                 default: fiction
 *                 description: Type of content to generate ('fiction', 'image', or 'combined')
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
 *             combinedGeneration:
 *               summary: Combined fiction and image generation request
 *               value:
 *                 parameterValues:
 *                   "fantasy":
 *                     "fantasy-magic-system": "Elemental"
 *                     "fantasy-mythical-creatures": ["Dragons", "Elves"]
 *                 contentType: "combined"
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
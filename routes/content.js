// routes/content.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: Generated content management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the content
 *           example: content-1648236587000-123
 *         title:
 *           type: string
 *           description: Title of the generated content
 *           example: "Space Explorer Adventure"
 *         type:
 *           type: string
 *           description: Type of content (fiction or image)
 *           enum: [fiction, image]
 *           example: fiction
 *         content:
 *           type: string
 *           description: The generated fiction content (only for fiction type)
 *           example: "The starship Nebula drifted silently through the endless void of space..."
 *         imageUrl:
 *           type: string
 *           description: URL of the generated image (only for image type)
 *           example: "https://example.com/generated-image.jpg"
 *         year:
 *           type: integer
 *           description: Year in which the story is set
 *           example: 2085
 *         parameterValues:
 *           type: object
 *           description: Parameters used to generate this content
 *           example:
 *             "science-fiction":
 *               "science-fiction-technology-level": "Near Future"
 *               "science-fiction-alien-life": true
 *         metadata:
 *           type: object
 *           description: Additional metadata about the generation
 *           example:
 *             model: "gpt-4o-mini"
 *             tokens: 1250
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the content was created
 *           example: "2023-04-15T12:34:56.789Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the content was last updated
 *           example: "2023-04-15T12:34:56.789Z"
 *       required:
 *         - id
 *         - title
 *         - type
 *         - parameterValues
 *         - createdAt
 *         - updatedAt
 *
 *     ContentList:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/Content'
 *
 *     ContentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Content'
 *       required:
 *         - success
 *         - data
 *       
 *     ContentListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/ContentList'
 *       required:
 *         - success
 *         - data
 *
 *     ContentDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Content 'Space Explorer Adventure' deleted successfully"
 *         data:
 *           type: object
 *           properties:
 *             deletedContent:
 *               $ref: '#/components/schemas/Content'
 *       required:
 *         - success
 *         - message
 *         - data
 */

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all generated content
 *     description: Retrieve a list of all generated content, with optional filtering by type or year
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fiction, image]
 *         description: Filter content by type
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter content by story year
 *     responses:
 *       200:
 *         description: List of generated content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentListResponse'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/', contentController.getAllContent);

/**
 * @swagger
 * /api/content/summary:
 *   get:
 *     summary: Get content summaries without image data
 *     description: Retrieve content metadata for efficient listing and navigation
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page (max 100)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fiction, image, combined]
 *         description: Filter by content type
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *     responses:
 *       200:
 *         description: Content summaries with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [fiction, image, combined]
 *                       year:
 *                         type: integer
 *                       hasImage:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/summary', contentController.getContentSummary);

/**
 * @swagger
 * /api/content/years:
 *   get:
 *     summary: Get all years with content
 *     description: Retrieve a list of all years that have generated content
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: List of years with content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [2050, 2085, 2100, 2150]
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/years', contentController.getAvailableYears);

/**
 * @swagger
 * /api/content/year/{year}:
 *   get:
 *     summary: Get content by year
 *     description: Retrieve all content set in a specific year
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year to filter by
 *     responses:
 *       200:
 *         description: List of content for the specified year
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentListResponse'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/year/:year', contentController.getContentByYear);

/**
 * @swagger
 * /api/content/{id}/image:
 *   get:
 *     summary: Get image for a specific content item
 *     description: Retrieve binary image data for a content item that has an image
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Binary image data
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Cache-Control:
 *             description: Cache control header (24 hours)
 *             schema:
 *               type: string
 *               example: "public, max-age=86400"
 *           ETag:
 *             description: Entity tag for caching
 *             schema:
 *               type: string
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Image not found"
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/:id/image', contentController.getContentImage);

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get a specific generated content
 *     description: Retrieve a single generated content item by its ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Generated content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentResponse'
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/:id', contentController.getContentById);

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update generated content
 *     description: Update a generated content's title, content, imageUrl, or year
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title for the content
 *                 example: "Updated Space Adventure"
 *               content:
 *                 type: string
 *                 description: New content (for fiction type only)
 *                 example: "Updated story content..."
 *               imageUrl:
 *                 type: string
 *                 description: New image URL (for image type only)
 *                 example: "https://example.com/new-image.jpg"
 *               year:
 *                 type: integer
 *                 description: New year for the story setting
 *                 example: 2095
 *     responses:
 *       200:
 *         description: Updated content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentResponse'
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.put('/:id', contentController.updateContent);

/**
 * @swagger
 * /api/content/{id}:
 *   delete:
 *     summary: Delete generated content
 *     description: Delete a generated content item by its ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentDeleteResponse'
 *       404:
 *         description: Content not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.delete('/:id', contentController.deleteContent);

module.exports = router;
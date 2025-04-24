// routes/parameters.js
const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/parameterController');

/**
 * @swagger
 * /api/parameters:
 *   get:
 *     summary: Get all parameters or filter by categoryId
 *     tags: [Parameters]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Optional category ID to filter parameters
 *     responses:
 *       200:
 *         description: List of parameters
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
 *                     $ref: '#/components/schemas/Parameter'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/', parameterController.getAllParameters);

/**
 * @swagger
 * /api/parameters/{id}:
 *   get:
 *     summary: Get a parameter by ID
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter ID
 *     responses:
 *       200:
 *         description: Parameter details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Parameter'
 *       404:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.get('/:id', parameterController.getParameterById);

/**
 * @swagger
 * /api/parameters:
 *   post:
 *     summary: Create a new parameter
 *     tags: [Parameters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Character Type"
 *               description:
 *                 type: string
 *                 example: "The type of main character in the story"
 *               type:
 *                 type: string
 *                 enum: [Dropdown, Slider, Toggle Switch, Radio Buttons, Checkbox]
 *                 example: "Dropdown"
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced]
 *                 default: Basic
 *                 example: "Basic"
 *               categoryId:
 *                 type: string
 *                 example: "science-fiction"
 *               values:
 *                 oneOf:
 *                   - type: array
 *                     description: For Dropdown, Radio Buttons, and Checkbox types
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "hero"
 *                         label:
 *                           type: string
 *                           example: "Hero"
 *                     example: [
 *                       { "label": "Hero" },
 *                       { "label": "Villain" },
 *                       { "label": "Sidekick" }
 *                     ]
 *                   - type: object
 *                     description: For Toggle Switch type
 *                     properties:
 *                       on:
 *                         type: string
 *                         example: "Yes"
 *                       off:
 *                         type: string
 *                         example: "No"
 *                     example: {
 *                       "on": "Yes",
 *                       "off": "No"
 *                     }
 *               config:
 *                 type: object
 *                 description: For Slider type
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 100
 *                   max:
 *                     type: number
 *                     example: 10000
 *                   step:
 *                     type: number
 *                     example: 100
 *                 example: {
 *                   "min": 100,
 *                   "max": 10000,
 *                   "step": 100
 *                 }
 *           examples:
 *             dropdown:
 *               summary: Example Dropdown Parameter
 *               value:
 *                 name: "Character Type"
 *                 type: "Dropdown"
 *                 visibility: "Basic"
 *                 categoryId: "science-fiction"
 *                 values: [
 *                   { "label": "Hero" },
 *                   { "label": "Villain" },
 *                   { "label": "Sidekick" }
 *                 ]
 *             slider:
 *               summary: Example Slider Parameter
 *               value:
 *                 name: "Story Length"
 *                 type: "Slider"
 *                 visibility: "Basic"
 *                 categoryId: "science-fiction"
 *                 config: {
 *                   "min": 100,
 *                   "max": 10000,
 *                   "step": 100
 *                 }
 *             toggle:
 *               summary: Example Toggle Parameter
 *               value:
 *                 name: "Happy Ending"
 *                 type: "Toggle Switch"
 *                 visibility: "Basic"
 *                 categoryId: "science-fiction"
 *                 values: {
 *                   "on": "Yes",
 *                   "off": "No"
 *                 }
 *     responses:
 *       201:
 *         description: Parameter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Parameter'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.post('/', parameterController.createParameter);

/**
 * @swagger
 * /api/parameters/{id}:
 *   put:
 *     summary: Update a parameter
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Character Type"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced]
 *                 example: "Advanced" 
 *               values:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "updated-hero"
 *                         label:
 *                           type: string
 *                           example: "Updated Hero"
 *                     example: [
 *                       { "label": "Updated Hero" },
 *                       { "label": "Updated Villain" }
 *                     ]
 *                   - type: object
 *                     properties:
 *                       on:
 *                         type: string
 *                         example: "Updated Yes"
 *                       off:
 *                         type: string
 *                         example: "Updated No"
 *                     example: {
 *                       "on": "Updated Yes",
 *                       "off": "Updated No"
 *                     }
 *               config:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 200
 *                   max:
 *                     type: number
 *                     example: 20000
 *                   step:
 *                     type: number
 *                     example: 200
 *                 example: {
 *                   "min": 200,
 *                   "max": 20000,
 *                   "step": 200
 *                 }
 *     responses:
 *       200:
 *         description: Parameter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Parameter'
 *       404:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.put('/:id', parameterController.updateParameter);

/**
 * @swagger
 * /api/parameters/{id}:
 *   delete:
 *     summary: Delete a parameter
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parameter ID
 *     responses:
 *       200:
 *         description: Parameter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedParameter:
 *                       $ref: '#/components/schemas/Parameter'
 *       404:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
router.delete('/:id', parameterController.deleteParameter);

module.exports = router;
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
 *                 example: "Climate Focus"
 *               description:
 *                 type: string
 *                 example: "Determines the level of focus on climate change in the story"
 *               type:
 *                 type: string
 *                 enum: [Dropdown, Slider, Toggle Switch, Radio Buttons, Checkbox]
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced]
 *                 default: Basic
 *               categoryId:
 *                 type: string
 *                 example: "cat-1234"
 *               values:
 *                 oneOf:
 *                   - type: array
 *                     description: For Dropdown, Radio Buttons, and Checkbox types
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         label:
 *                           type: string
 *                   - type: object
 *                     description: For Toggle Switch type
 *                     properties:
 *                       on:
 *                         type: string
 *                       off:
 *                         type: string
 *               config:
 *                 type: object
 *                 description: For Slider type
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *                   step:
 *                     type: number
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
 *               description:
 *                 type: string
 *               visibility:
 *                 type: string
 *                 enum: [Basic, Advanced]
 *               values:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         label:
 *                           type: string
 *                   - type: object
 *                     properties:
 *                       on:
 *                         type: string
 *                       off:
 *                         type: string
 *               config:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *                   step:
 *                     type: number
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
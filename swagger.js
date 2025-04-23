// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpecGen API',
      version: '1.0.0',
      description: 'API documentation for SpecGen - a speculative fiction generator',
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
    ],
    components: {
      schemas: {
        Category: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
              description: 'Category unique identifier',
              example: 'cat-1234',
            },
            name: {
              type: 'string',
              description: 'Category name',
              example: 'Environmental Policy',
            },
            description: {
              type: 'string',
              description: 'Optional description of the category',
              example: 'Stories focused on environmental themes and climate change',
            },
            visibility: {
              type: 'string',
              enum: ['Show', 'Hide'],
              description: 'Category visibility status',
              default: 'Show',
            },
          },
        },
        Parameter: {
          type: 'object',
          required: ['name', 'type', 'categoryId'],
          properties: {
            id: {
              type: 'string',
              description: 'Parameter unique identifier',
              example: 'param-1234',
            },
            name: {
              type: 'string',
              description: 'Parameter name',
              example: 'Climate Focus',
            },
            description: {
              type: 'string',
              description: 'Optional description of the parameter',
              example: 'Determines the level of focus on climate change in the story',
            },
            type: {
              type: 'string',
              enum: ['Dropdown', 'Slider', 'Toggle Switch', 'Radio Buttons', 'Checkbox'],
              description: 'Parameter type',
            },
            visibility: {
              type: 'string',
              enum: ['Basic', 'Advanced'],
              description: 'Parameter visibility level',
              default: 'Basic',
            },
            categoryId: {
              type: 'string',
              description: 'ID of the parent category',
              example: 'cat-1234',
            },
            values: {
              type: 'array',
              description: 'Available values for Dropdown, Radio, and Checkbox types',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                },
              },
            },
            config: {
              type: 'object',
              description: 'Configuration for Slider type',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                step: { type: 'number' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message details',
            },
          },
        },
      },
      responses: {
        Error: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options);
// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

// Helper function to ensure URL has proper port if needed
function getServerUrl() {
  if (process.env.API_URL) {
    // If API_URL includes a port already or is a full URL with path, use it as is
    if (process.env.API_URL.match(/(:\d+)/) || process.env.API_URL.includes('/')) {
      return process.env.API_URL;
    }
    // Otherwise, append the port
    return `${process.env.API_URL}:${process.env.PORT || 3000}`;
  }
  // Default fallback
  return `http://localhost:${process.env.PORT || 3000}`;
}

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
        url: getServerUrl(),
        description: 'Local development server',
      },
    ],
    components: {
      schemas: {
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the category',
              example: 'science-fiction'
            },
            name: {
              type: 'string',
              description: 'Display name of the category',
              example: 'Science Fiction'
            },
            description: {
              type: 'string',
              description: 'Optional description of the category',
              example: 'Stories set in the future with advanced technology'
            },
            visibility: {
              type: 'string',
              description: 'Whether to show or hide this category in the UI',
              enum: ['Show', 'Hide'],
              example: 'Show'
            },
            year: {
              type: 'integer',
              description: 'Year associated with this category',
              example: 2050
            }
          },
          required: ['id', 'name', 'visibility']
        },
        Parameter: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the parameter',
              example: 'science-fiction-technology-level'
            },
            name: {
              type: 'string',
              description: 'Display name of the parameter',
              example: 'Technology Level'
            },
            description: {
              type: 'string',
              description: 'Optional description of the parameter',
              example: 'The level of technological advancement in the story'
            },
            visibility: {
              type: 'string',
              description: 'Visibility level of this parameter',
              enum: ['Basic', 'Advanced'],
              example: 'Basic'
            },
            type: {
              type: 'string',
              description: 'Type of the parameter input',
              enum: ['Dropdown', 'Slider', 'Toggle Switch', 'Radio Buttons', 'Checkbox'],
              example: 'Dropdown'
            },
            categoryId: {
              type: 'string',
              description: 'ID of the category this parameter belongs to',
              example: 'science-fiction'
            },
            values: {
              oneOf: [
                {
                  type: 'array',
                  description: 'For Dropdown, Radio Buttons, and Checkbox types',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: 'near-future'
                      },
                      label: {
                        type: 'string',
                        example: 'Near Future'
                      }
                    }
                  },
                  example: [
                    { id: 'near-future', label: 'Near Future' },
                    { id: 'advanced', label: 'Advanced' }
                  ]
                },
                {
                  type: 'object',
                  description: 'For Toggle Switch type',
                  properties: {
                    on: {
                      type: 'string',
                      example: 'Yes'
                    },
                    off: {
                      type: 'string',
                      example: 'No'
                    }
                  },
                  example: {
                    on: 'Yes',
                    off: 'No'
                  }
                }
              ]
            },
            config: {
              type: 'object',
              description: 'Configuration for Slider type',
              properties: {
                min: {
                  type: 'number',
                  example: 0
                },
                max: {
                  type: 'number',
                  example: 100
                },
                step: {
                  type: 'number',
                  example: 1
                }
              },
              example: {
                min: 0,
                max: 100,
                step: 1
              }
            }
          },
          required: ['id', 'name', 'type', 'categoryId']
        }
      },
      responses: {
        Error: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'string',
                    example: 'Error message details'
                  }
                }
              }
            }
          }
        }
      }
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options);
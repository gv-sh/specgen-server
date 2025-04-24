// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

// Process environment handling for browser compatibility
if (typeof process === 'undefined') {
  var process = { env: { PORT: '3000' } };
}

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
    // Rest of your configuration remains the same
    components: {
      // ... existing code
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options);
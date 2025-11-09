// routes/swagger.js
import express from 'express';
const router = express.Router();
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../swagger.js';

// Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { displayx: none }'
}));

// API documentation in JSON format
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
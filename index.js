// index.js
/* global process */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import errorHandler from './middleware/errorHandler.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort, maxAttempts = MAX_PORT_ATTEMPTS) {
  // In production, use the exact port specified
  if (process.env.NODE_ENV === 'production') {
    return startPort;
  }

  // In development, find an available port starting from default port
  if (startPort < DEFAULT_PORT) {
    startPort = DEFAULT_PORT;
  }

  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

// Initialize Express app
const app = express();
let PORT = process.env.PORT || DEFAULT_PORT;

// Middleware
app.use(compression()); // Enable gzip compression for all responses
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production mode: serve React builds
if (process.env.NODE_ENV === 'production') {
  // Serve admin at /admin
  const adminBuildPath = path.join(process.cwd(), 'admin/build');
  if (fs.existsSync(adminBuildPath)) {
    app.use('/admin', express.static(adminBuildPath));
    app.get('/admin/*', (req, res) => {
      res.sendFile(path.join(adminBuildPath, 'index.html'));
    });
    console.log('✅ Admin interface available at /admin');
  }

  // Serve user app at /app and root
  const userBuildPath = path.join(process.cwd(), 'user/build');
  if (fs.existsSync(userBuildPath)) {
    app.use('/app', express.static(userBuildPath));
    app.use('/', express.static(userBuildPath, { index: false }));
    app.get('/app/*', (req, res) => {
      res.sendFile(path.join(userBuildPath, 'index.html'));
    });
    app.get('/', (req, res) => {
      res.sendFile(path.join(userBuildPath, 'index.html'));
    });
    console.log('✅ User interface available at /app and /');
  }
}

// Routes
import categoryRoutes from './routes/categories.js';
import parameterRoutes from './routes/parameters.js';
import generateRoutes from './routes/generate.js';
import databaseRoutes from './routes/database.js';
import contentRoutes from './routes/content.js';
import settingsRoutes from './routes/settings.js';

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);

// Only add Swagger in non-test environment
if (process.env.NODE_ENV !== 'test') {
  const swaggerModule = await import('./routes/swagger.js');
  const swaggerRoutes = swaggerModule.default;
  app.use('/api-docs', swaggerRoutes);
}

// Health check routes
import healthRoutes from './routes/health.js';
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use(errorHandler);

// Check if this file is being run directly
const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  (async () => {
    try {
      PORT = await findAvailablePort(PORT);
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        if (process.env.NODE_ENV !== 'test') {
          console.log(`- API Documentation: http://localhost:${PORT}/api-docs`);
        }
        console.log(`- API is ready for use`);
      });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  })();
}

export default app;

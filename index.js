// index.js
/* global process */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const net = require('net');

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
async function findAvailablePort(startPort, maxAttempts = 10) {
  // In production, use the exact port specified
  if (process.env.NODE_ENV === 'production') {
    return startPort;
  }
  
  // In development, find an available port starting from 3000
  if (startPort < 3000) {
    startPort = 3000;
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
let PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production mode: serve React builds
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
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
const categoryRoutes = require('./routes/categories');
const parameterRoutes = require('./routes/parameters');
const generateRoutes = require('./routes/generate');
const databaseRoutes = require('./routes/database');
const contentRoutes = require('./routes/content');
const settingsRoutes = require('./routes/settings'); // New settings routes

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes); // Add settings routes

// Only add Swagger in non-test environment
if (process.env.NODE_ENV !== 'test') {
  const swaggerRoutes = require('./routes/swagger');
  app.use('/api-docs', swaggerRoutes);
}

// Health check routes
const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use(errorHandler);

if (require.main === module) {
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

module.exports = app;
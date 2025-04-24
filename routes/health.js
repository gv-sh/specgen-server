// routes/health.js
const express = require('express');
const router = express.Router();
const os = require('os');
const { version } = require('../package.json');
const sqliteService = require('../services/sqliteService');
const databaseService = require('../services/databaseService');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Server health monitoring endpoints
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Get server health status
 *     description: Retrieves system health information and server status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-04-25T12:34:56.789Z"
 *                 memory:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total memory in MB
 *                       example: 8192
 *                     free:
 *                       type: number
 *                       description: Free memory in MB
 *                       example: 4096
 *                     usage:
 *                       type: number
 *                       description: Memory usage percentage
 *                       example: 50
 *                 system:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                       example: "linux"
 *                     arch:
 *                       type: string
 *                       example: "x64"
 *                     cpus:
 *                       type: number
 *                       example: 4
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "connected"
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
router.get('/', async (req, res, next) => {
  try {
    // Check database connection
    let databaseStatus = "connected";
    try {
      await databaseService.getData();
    } catch (error) {
      databaseStatus = "disconnected";
    }

    // Check SQLite connection
    let sqliteStatus = "connected";
    try {
      // Just query something simple to verify connection
      await sqliteService.getGeneratedContent({ limit: 1 });
    } catch (error) {
      sqliteStatus = "disconnected";
    }

    // Calculate memory usage
    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const memoryUsagePercent = Math.round(((totalMemoryMB - freeMemoryMB) / totalMemoryMB) * 100);

    // Determine overall status
    const isHealthy = databaseStatus === "connected" && sqliteStatus === "connected";

    // Respond with health status
    res.status(isHealthy ? 200 : 500).json({
      status: isHealthy ? "healthy" : "unhealthy",
      version,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: {
        total: totalMemoryMB,
        free: freeMemoryMB,
        usage: memoryUsagePercent
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length
      },
      services: {
        database: databaseStatus,
        sqlite: sqliteStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint
 *     description: Returns a simple response to verify the server is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Successful ping response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "pong"
 */
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong' });
});

module.exports = router;
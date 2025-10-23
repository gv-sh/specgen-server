// tests/performance/memory-monitor.js

/**
 * Memory monitoring utility for performance tests
 */
class MemoryMonitor {
  constructor(options = {}) {
    this.samplingInterval = options.samplingInterval || 1000; // 1 second default
    this.maxSamples = options.maxSamples || 1000;
    this.samples = [];
    this.isMonitoring = false;
    this.intervalId = null;
    this.baseline = null;
  }

  /**
   * Start monitoring memory usage
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.baseline = this.getCurrentMemoryUsage();
    this.samples = [];

    this.intervalId = setInterval(() => {
      if (this.samples.length >= this.maxSamples) {
        this.stop();
        return;
      }

      const sample = this.getCurrentMemoryUsage();
      sample.timestamp = Date.now();
      sample.sampleNumber = this.samples.length + 1;
      
      this.samples.push(sample);
    }, this.samplingInterval);

    console.log('Memory monitoring started');
    return this.baseline;
  }

  /**
   * Stop monitoring memory usage
   */
  stop() {
    if (!this.isMonitoring) {
      return null;
    }

    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`Memory monitoring stopped. Collected ${this.samples.length} samples`);
    return this.generateReport();
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    const memUsage = process.memoryUsage();
    
    return {
      rss: memUsage.rss,                          // Resident Set Size
      heapUsed: memUsage.heapUsed,                // Heap used
      heapTotal: memUsage.heapTotal,              // Heap total
      external: memUsage.external,                // External memory
      arrayBuffers: memUsage.arrayBuffers || 0   // Array buffers (Node.js 13+)
    };
  }

  /**
   * Convert bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate memory statistics
   */
  calculateStats(values) {
    if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return { min, max, avg, median };
  }

  /**
   * Generate comprehensive memory report
   */
  generateReport() {
    if (!this.baseline || this.samples.length === 0) {
      return { error: 'No memory data collected' };
    }

    const finalSample = this.samples[this.samples.length - 1];
    const duration = finalSample.timestamp - this.samples[0].timestamp;

    // Extract values for analysis
    const rssValues = this.samples.map(s => s.rss);
    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const heapTotalValues = this.samples.map(s => s.heapTotal);
    const externalValues = this.samples.map(s => s.external);

    // Calculate statistics
    const rssStats = this.calculateStats(rssValues);
    const heapUsedStats = this.calculateStats(heapUsedValues);
    const heapTotalStats = this.calculateStats(heapTotalValues);
    const externalStats = this.calculateStats(externalValues);

    // Calculate memory changes from baseline
    const memoryChanges = {
      rss: finalSample.rss - this.baseline.rss,
      heapUsed: finalSample.heapUsed - this.baseline.heapUsed,
      heapTotal: finalSample.heapTotal - this.baseline.heapTotal,
      external: finalSample.external - this.baseline.external
    };

    // Memory leak detection
    const memoryTrend = this.analyzeTrend(heapUsedValues);
    const potentialLeak = memoryTrend.slope > 0 && memoryTrend.correlation > 0.7;

    const report = {
      summary: {
        duration: `${duration}ms`,
        samples: this.samples.length,
        samplingInterval: `${this.samplingInterval}ms`,
        potentialMemoryLeak: potentialLeak
      },
      baseline: {
        rss: this.formatBytes(this.baseline.rss),
        heapUsed: this.formatBytes(this.baseline.heapUsed),
        heapTotal: this.formatBytes(this.baseline.heapTotal),
        external: this.formatBytes(this.baseline.external)
      },
      final: {
        rss: this.formatBytes(finalSample.rss),
        heapUsed: this.formatBytes(finalSample.heapUsed),
        heapTotal: this.formatBytes(finalSample.heapTotal),
        external: this.formatBytes(finalSample.external)
      },
      changes: {
        rss: this.formatBytes(Math.abs(memoryChanges.rss)),
        heapUsed: this.formatBytes(Math.abs(memoryChanges.heapUsed)),
        heapTotal: this.formatBytes(Math.abs(memoryChanges.heapTotal)),
        external: this.formatBytes(Math.abs(memoryChanges.external)),
        rssDirection: memoryChanges.rss >= 0 ? 'increased' : 'decreased',
        heapUsedDirection: memoryChanges.heapUsed >= 0 ? 'increased' : 'decreased'
      },
      statistics: {
        rss: {
          min: this.formatBytes(rssStats.min),
          max: this.formatBytes(rssStats.max),
          avg: this.formatBytes(rssStats.avg),
          median: this.formatBytes(rssStats.median)
        },
        heapUsed: {
          min: this.formatBytes(heapUsedStats.min),
          max: this.formatBytes(heapUsedStats.max),
          avg: this.formatBytes(heapUsedStats.avg),
          median: this.formatBytes(heapUsedStats.median)
        },
        heapTotal: {
          min: this.formatBytes(heapTotalStats.min),
          max: this.formatBytes(heapTotalStats.max),
          avg: this.formatBytes(heapTotalStats.avg),
          median: this.formatBytes(heapTotalStats.median)
        },
        external: {
          min: this.formatBytes(externalStats.min),
          max: this.formatBytes(externalStats.max),
          avg: this.formatBytes(externalStats.avg),
          median: this.formatBytes(externalStats.median)
        }
      },
      trend: {
        slope: memoryTrend.slope,
        correlation: memoryTrend.correlation,
        interpretation: this.interpretTrend(memoryTrend)
      },
      rawData: this.samples // Include raw data for further analysis
    };

    return report;
  }

  /**
   * Analyze memory usage trend
   */
  analyzeTrend(values) {
    if (values.length < 2) {
      return { slope: 0, correlation: 0 };
    }

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    // Calculate linear regression
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    const sumYY = values.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, correlation };
  }

  /**
   * Interpret memory trend
   */
  interpretTrend(trend) {
    const { slope, correlation } = trend;
    
    if (Math.abs(correlation) < 0.3) {
      return 'No clear trend - memory usage is stable';
    } else if (slope > 0 && correlation > 0.7) {
      return 'Strong upward trend - potential memory leak';
    } else if (slope > 0 && correlation > 0.3) {
      return 'Moderate upward trend - monitor for leaks';
    } else if (slope < 0 && correlation < -0.7) {
      return 'Strong downward trend - memory being freed';
    } else if (slope < 0 && correlation < -0.3) {
      return 'Moderate downward trend - memory optimization';
    }
    
    return 'Unclear trend - requires manual analysis';
  }

  /**
   * Check if memory usage meets benchmarks
   */
  checkBenchmarks(requestCount = 1000) {
    if (!this.baseline || this.samples.length === 0) {
      return { error: 'No memory data available for benchmark check' };
    }

    const finalSample = this.samples[this.samples.length - 1];
    const heapIncrease = finalSample.heapUsed - this.baseline.heapUsed;
    const increasePerRequest = heapIncrease / requestCount;
    const increasePerThousandRequests = increasePerRequest * 1000;
    
    // Convert to MB
    const increaseMB = increasePerThousandRequests / (1024 * 1024);
    const BENCHMARK_LIMIT = 10; // 10MB per 1000 requests

    return {
      requestCount,
      heapIncrease: this.formatBytes(heapIncrease),
      increasePerRequest: this.formatBytes(increasePerRequest),
      increasePerThousandRequests: this.formatBytes(increasePerThousandRequests),
      increaseMB: `${increaseMB.toFixed(2)}MB`,
      benchmarkLimit: `${BENCHMARK_LIMIT}MB`,
      passed: increaseMB < BENCHMARK_LIMIT,
      efficiency: increaseMB < 5 ? 'Excellent' : increaseMB < 10 ? 'Good' : 'Needs Improvement'
    };
  }

  /**
   * Reset the monitor for reuse
   */
  reset() {
    this.stop();
    this.samples = [];
    this.baseline = null;
  }
}

/**
 * Helper function to monitor memory during async operation
 */
async function monitorMemoryDuring(asyncOperation, options = {}) {
  const monitor = new MemoryMonitor(options);
  
  monitor.start();
  
  try {
    const result = await asyncOperation();
    const memoryReport = monitor.stop();
    
    return {
      operationResult: result,
      memoryReport
    };
  } catch (error) {
    monitor.stop();
    throw error;
  }
}

/**
 * Memory usage assertion helper for tests
 */
function expectMemoryUsage(monitor, requestCount) {
  const benchmarks = monitor.checkBenchmarks(requestCount);
  
  if (benchmarks.error) {
    throw new Error(benchmarks.error);
  }
  
  console.log(`Memory benchmark: ${benchmarks.increaseMB} for ${requestCount} requests (limit: ${benchmarks.benchmarkLimit})`);
  
  if (!benchmarks.passed) {
    throw new Error(
      `Memory usage exceeds benchmark: ${benchmarks.increaseMB} > ${benchmarks.benchmarkLimit} per 1000 requests`
    );
  }
  
  return benchmarks;
}

module.exports = {
  MemoryMonitor,
  monitorMemoryDuring,
  expectMemoryUsage
};
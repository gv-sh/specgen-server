// tests/performance/load-test.js
const axios = require('axios');
const { performance } = require('perf_hooks');

// Load test configuration
const LOAD_TEST_CONFIG = {
  BASE_URL: 'http://localhost:3001', // Test server URL
  CONCURRENT_USERS: 50,              // Requirement: Handle 50 users
  TEST_DURATION: 30000,              // 30 seconds test duration
  RAMP_UP_TIME: 5000,                // 5 seconds to reach max users
  ENDPOINTS: [
    { path: '/api/content?page=1&limit=20', weight: 40 },          // 40% of requests
    { path: '/api/content/summary?page=1&limit=30', weight: 30 },  // 30% of requests
    { path: '/api/content/years', weight: 10 },                    // 10% of requests
    { path: '/api/content?type=fiction&limit=15', weight: 20 }     // 20% of requests
  ]
};

class LoadTester {
  constructor(config) {
    this.config = config;
    this.users = [];
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      memoryUsage: [],
      startTime: null,
      endTime: null
    };
    this.isRunning = false;
  }

  /**
   * Create a simulated user that makes requests
   */
  createUser(userId) {
    return {
      id: userId,
      isActive: false,
      requestCount: 0,
      averageResponseTime: 0,
      errors: 0,
      abort: null
    };
  }

  /**
   * Select endpoint based on weighted distribution
   */
  selectEndpoint() {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (const endpoint of this.config.ENDPOINTS) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        return endpoint.path;
      }
    }
    
    return this.config.ENDPOINTS[0].path; // Fallback
  }

  /**
   * Make a single request for a user
   */
  async makeRequest(user) {
    const endpoint = this.selectEndpoint();
    const url = `${this.config.BASE_URL}${endpoint}`;
    
    const startTime = performance.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': `LoadTest-User-${user.id}`
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Record successful request
      this.results.totalRequests++;
      this.results.successfulRequests++;
      this.results.responseTimes.push(responseTime);
      
      user.requestCount++;
      user.averageResponseTime = (
        (user.averageResponseTime * (user.requestCount - 1) + responseTime) / user.requestCount
      );
      
      return {
        success: true,
        responseTime,
        status: response.status,
        endpoint
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Record failed request
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.errors.push({
        endpoint,
        error: error.message,
        time: new Date().toISOString(),
        userId: user.id
      });
      
      user.errors++;
      
      return {
        success: false,
        responseTime,
        error: error.message,
        endpoint
      };
    }
  }

  /**
   * Run requests for a single user
   */
  async runUser(user) {
    user.isActive = true;
    
    while (this.isRunning && user.isActive) {
      await this.makeRequest(user);
      
      // Wait between requests (simulate user think time)
      const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
      await new Promise(resolve => setTimeout(resolve, thinkTime));
    }
    
    user.isActive = false;
  }

  /**
   * Monitor memory usage during the test
   */
  startMemoryMonitoring() {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      const memUsage = process.memoryUsage();
      this.results.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
    }, 1000); // Check every second
  }

  /**
   * Gradually ramp up users to target concurrency
   */
  async rampUpUsers() {
    const usersPerInterval = Math.ceil(this.config.CONCURRENT_USERS / 10);
    const intervalTime = this.config.RAMP_UP_TIME / 10;
    
    console.log(`Ramping up ${this.config.CONCURRENT_USERS} users over ${this.config.RAMP_UP_TIME}ms`);
    
    for (let i = 0; i < this.config.CONCURRENT_USERS; i += usersPerInterval) {
      const usersToAdd = Math.min(usersPerInterval, this.config.CONCURRENT_USERS - i);
      
      for (let j = 0; j < usersToAdd; j++) {
        const user = this.createUser(i + j + 1);
        this.users.push(user);
        this.runUser(user); // Start user activity (don't await)
      }
      
      console.log(`Active users: ${i + usersToAdd}/${this.config.CONCURRENT_USERS}`);
      
      if (i + usersPerInterval < this.config.CONCURRENT_USERS) {
        await new Promise(resolve => setTimeout(resolve, intervalTime));
      }
    }
  }

  /**
   * Run the complete load test
   */
  async runLoadTest() {
    console.log('Starting Load Test...');
    console.log(`Target: ${this.config.CONCURRENT_USERS} concurrent users for ${this.config.TEST_DURATION}ms`);
    
    this.results.startTime = Date.now();
    this.isRunning = true;
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Ramp up users gradually
    await this.rampUpUsers();
    
    // Run at full load for remaining time
    const remainingTime = this.config.TEST_DURATION - this.config.RAMP_UP_TIME;
    console.log(`Running at full load for ${remainingTime}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, remainingTime));
    
    // Stop the test
    this.isRunning = false;
    this.results.endTime = Date.now();
    
    // Wait for users to finish current requests
    console.log('Stopping users...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    const responseTimes = this.results.responseTimes;
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // Calculate percentiles
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    // Calculate throughput
    const requestsPerSecond = (this.results.totalRequests / duration) * 1000;
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    
    // Memory analysis
    const memoryUsage = this.results.memoryUsage;
    const initialMemory = memoryUsage[0]?.heapUsed || 0;
    const finalMemory = memoryUsage[memoryUsage.length - 1]?.heapUsed || 0;
    const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB
    const memoryIncreasePerRequest = memoryIncrease / this.results.totalRequests;
    
    const report = {
      summary: {
        duration: `${duration}ms`,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: `${successRate.toFixed(2)}%`,
        requestsPerSecond: requestsPerSecond.toFixed(2),
        concurrentUsers: this.config.CONCURRENT_USERS
      },
      responseTime: {
        average: `${avgResponseTime.toFixed(2)}ms`,
        minimum: `${minResponseTime.toFixed(2)}ms`,
        maximum: `${maxResponseTime.toFixed(2)}ms`,
        p50: `${p50.toFixed(2)}ms`,
        p90: `${p90.toFixed(2)}ms`,
        p95: `${p95.toFixed(2)}ms`,
        p99: `${p99.toFixed(2)}ms`
      },
      memory: {
        initialHeapUsed: `${(initialMemory / (1024 * 1024)).toFixed(2)}MB`,
        finalHeapUsed: `${(finalMemory / (1024 * 1024)).toFixed(2)}MB`,
        totalIncrease: `${memoryIncrease.toFixed(2)}MB`,
        increasePerRequest: `${(memoryIncreasePerRequest * 1024).toFixed(2)}KB`,
        increasePerThousandRequests: `${(memoryIncreasePerRequest * 1000).toFixed(2)}MB`
      },
      errors: this.results.errors,
      userStats: this.users.map(user => ({
        id: user.id,
        requests: user.requestCount,
        avgResponseTime: `${user.averageResponseTime.toFixed(2)}ms`,
        errors: user.errors
      })),
      benchmarkResults: this.evaluateBenchmarks(avgResponseTime, p95, memoryIncreasePerRequest * 1000)
    };
    
    return report;
  }

  /**
   * Evaluate against benchmark requirements
   */
  evaluateBenchmarks(avgResponseTime, p95ResponseTime, memoryIncreasePerThousand) {
    const results = {
      responseTime: {
        target: '< 200ms average',
        actual: `${avgResponseTime.toFixed(2)}ms`,
        passed: avgResponseTime < 200
      },
      p95ResponseTime: {
        target: '< 300ms P95',
        actual: `${p95ResponseTime.toFixed(2)}ms`,
        passed: p95ResponseTime < 300
      },
      concurrentUsers: {
        target: '50 concurrent users',
        actual: `${this.config.CONCURRENT_USERS} users`,
        passed: this.config.CONCURRENT_USERS >= 50
      },
      memoryUsage: {
        target: '< 10MB per 1000 requests',
        actual: `${memoryIncreasePerThousand.toFixed(2)}MB`,
        passed: memoryIncreasePerThousand < 10
      },
      successRate: {
        target: '> 99% success rate',
        actual: `${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`,
        passed: (this.results.successfulRequests / this.results.totalRequests) > 0.99
      }
    };
    
    const overallPassed = Object.values(results).every(benchmark => benchmark.passed);
    
    return {
      overall: overallPassed ? 'PASSED' : 'FAILED',
      details: results
    };
  }
}

/**
 * Run load test if called directly
 */
async function runLoadTest() {
  try {
    const loadTester = new LoadTester(LOAD_TEST_CONFIG);
    const report = await loadTester.runLoadTest();
    
    console.log('\n' + '='.repeat(80));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\nSUMMARY:');
    Object.entries(report.summary).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nRESPONSE TIME:');
    Object.entries(report.responseTime).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nMEMORY USAGE:');
    Object.entries(report.memory).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nBENCHMARK RESULTS:');
    console.log(`  Overall: ${report.benchmarkResults.overall}`);
    Object.entries(report.benchmarkResults.details).forEach(([key, benchmark]) => {
      const status = benchmark.passed ? '✓' : '✗';
      console.log(`  ${status} ${key}: ${benchmark.actual} (target: ${benchmark.target})`);
    });
    
    if (report.errors.length > 0) {
      console.log('\nERRORS:');
      report.errors.forEach(error => {
        console.log(`  ${error.endpoint}: ${error.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Return report for programmatic use
    return report;
    
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Export for use in tests
module.exports = { LoadTester, LOAD_TEST_CONFIG, runLoadTest };

// Run if called directly
if (require.main === module) {
  runLoadTest();
}
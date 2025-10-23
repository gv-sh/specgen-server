# Performance Testing Documentation

## Overview

This document describes the comprehensive performance testing infrastructure implemented for SpecGen Server content loading endpoints. The testing suite validates response times, concurrent user handling, memory usage, and includes automated regression detection.

## Performance Benchmarks

### Response Time Targets

| Endpoint Type | Target Response Time | Test Coverage |
|---------------|---------------------|---------------|
| Pagination (`/api/content`) | < 200ms average | ✅ |
| Summary (`/api/content/summary`) | < 100ms average | ✅ |
| Image serving (`/api/content/:id/image`) | < 50ms average | ✅ |
| Content by ID (`/api/content/:id`) | < 100ms average | ✅ |

### Concurrent Load Targets

- **50 concurrent users** - System must handle 50 simultaneous users without performance degradation
- **Success rate > 99%** - Less than 1% request failures under load
- **Memory efficiency** - < 10MB memory increase per 1000 requests

### Memory Usage Benchmarks

- **Memory leak detection** - Monitor for upward trends in heap usage
- **Memory efficiency** - Benchmark against 10MB increase per 1000 requests
- **Regression detection** - Compare against baseline performance

## Test Suite Structure

### 1. Content Performance Tests (`tests/performance/content.performance.test.js`)

Comprehensive endpoint testing with realistic data sets:

```javascript
// Test dataset: 500 content items with mixed types
DATASET_SIZE = 500;
types = ['fiction', 'image', 'combined'];
```

**Test Categories:**
- Pagination endpoint performance with filters
- Summary endpoint optimization
- Image serving efficiency
- Content retrieval by ID
- Performance regression detection
- Memory usage monitoring

### 2. Load Testing (`tests/performance/load-test.js`)

Simulates real-world concurrent user load:

```javascript
CONCURRENT_USERS: 50
TEST_DURATION: 30000ms (30 seconds)
RAMP_UP_TIME: 5000ms (5 seconds)
```

**Load Distribution:**
- 40% - Pagination requests (`/api/content?page=1&limit=20`)
- 30% - Summary requests (`/api/content/summary?page=1&limit=30`)
- 20% - Filtered content (`/api/content?type=fiction&limit=15`)
- 10% - Metadata requests (`/api/content/years`)

### 3. Memory Monitoring (`tests/performance/memory-monitor.js`)

Real-time memory tracking with statistical analysis:

```javascript
// Memory leak detection with linear regression
analyzeTrend(values) {
  const { slope, correlation } = linearRegression(values);
  return interpretTrend(slope, correlation);
}
```

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/performance-tests.yml`)

Automated performance testing on:
- **Push to main/develop branches**
- **Pull requests**
- **Daily scheduled runs** (2 AM UTC)
- **Manual triggers** with test type selection

**Test Matrix:**
- Node.js versions: 18.x, 20.x
- Timeout: 30 minutes
- Artifact retention: 30 days

### Performance Regression Detection

The CI workflow includes automatic regression detection:

```bash
# 20% performance degradation threshold
if (increase > 20) {
  regressions.push(`${testName}: ${increase.toFixed(1)}% slower`);
}
```

**Baseline Management:**
- Baseline created from main branch successful runs
- Comparisons against previous performance
- Performance trends analysis

## Running Performance Tests

### Local Development

```bash
# Run all performance tests
npm test tests/performance/

# Run specific performance test
npm test tests/performance/content.performance.test.js

# Run load testing
node tests/performance/load-test.js

# Run with CI automation script
chmod +x scripts/run-performance-tests.sh
./scripts/run-performance-tests.sh
```

### CI Script Features

The automation script (`scripts/run-performance-tests.sh`) provides:

- **Server lifecycle management** - Starts/stops test server automatically
- **Health checks** - Verifies server availability before testing
- **Result aggregation** - Combines test results into JSON reports
- **Error handling** - Graceful failure handling and cleanup
- **Dependency validation** - Checks for required tools

## Performance Monitoring

### Real-time Metrics

The performance tests track:

```javascript
// Response time metrics
responseTimes: {
  average: "85.42ms",
  minimum: "12.30ms", 
  maximum: "145.67ms",
  p50: "78.90ms",
  p90: "120.45ms",
  p95: "135.23ms",
  p99: "142.18ms"
}

// Memory usage tracking
memory: {
  initialHeapUsed: "45.23MB",
  finalHeapUsed: "47.84MB", 
  totalIncrease: "2.61MB",
  increasePerRequest: "5.22KB",
  increasePerThousandRequests: "5.22MB"
}
```

### Benchmark Validation

Automated validation against performance targets:

```javascript
benchmarkResults: {
  overall: "PASSED",
  details: {
    responseTime: { target: "< 200ms", actual: "85.42ms", passed: true },
    concurrentUsers: { target: "50 users", actual: "50 users", passed: true },
    memoryUsage: { target: "< 10MB/1000req", actual: "5.22MB", passed: true }
  }
}
```

## Test Data Management

### Dataset Generation

Performance tests use realistic test data:

- **Content variety** - Fiction, image, and combined content types
- **Temporal distribution** - Content spread across multiple years (2020-2024)
- **Size variation** - Different content sizes to simulate real usage
- **Metadata complexity** - Realistic parameter structures

### Cleanup Strategy

- **Automatic cleanup** - Test data removed after test completion
- **Isolation** - Performance tests use dedicated test database
- **Reset capability** - Database reset between test runs

## Performance Optimization Guidelines

### Response Time Optimization

1. **Database Indexing** - Ensure proper indexes on frequently queried fields
2. **Pagination Efficiency** - Use LIMIT/OFFSET optimization techniques
3. **Image Serving** - Implement proper caching headers for static content
4. **Query Optimization** - Monitor and optimize SQL query performance

### Memory Management

1. **Resource Cleanup** - Properly dispose of large objects after use
2. **Stream Processing** - Use streams for large file operations
3. **Connection Pooling** - Implement database connection pooling
4. **Memory Profiling** - Regular memory usage analysis

### Concurrent Load Handling

1. **Connection Limits** - Configure appropriate connection limits
2. **Request Throttling** - Implement rate limiting for API endpoints
3. **Error Handling** - Graceful degradation under high load
4. **Resource Monitoring** - Monitor CPU and memory under load

## Troubleshooting

### Common Performance Issues

**High Response Times:**
- Check database query optimization
- Verify server resource availability
- Review network latency factors

**Memory Leaks:**
- Analyze memory trend reports
- Check for unclosed database connections
- Review object lifecycle management

**Load Test Failures:**
- Verify server capacity limits
- Check concurrent connection settings
- Review error rate patterns

### Debug Information

Performance test failures include detailed debug information:

```bash
# Server logs
tail -f tmp/test_server.log

# Performance results
cat performance-results/performance_*.json

# Memory monitoring output
grep "Memory" performance-results/performance_*.json
```

## Continuous Improvement

### Performance Metrics Evolution

The performance testing infrastructure supports:

- **Baseline updates** - Regular baseline refresh from main branch
- **Threshold adjustments** - Configurable performance thresholds
- **New endpoint coverage** - Easy addition of new endpoints to test suite
- **Enhanced monitoring** - Additional metrics and analysis capabilities

### Future Enhancements

Planned improvements include:

- **Real user monitoring** - Integration with APM tools
- **Performance budgets** - Stricter performance constraints
- **Geographic testing** - Multi-region load testing
- **Device simulation** - Mobile device performance testing

## Integration with Development Workflow

### Pre-commit Hooks

Consider adding performance checks to pre-commit hooks:

```bash
# Run quick performance check before commit
npm run perf:quick
```

### Code Review Guidelines

Performance considerations for code reviews:

- Database query efficiency
- Memory usage patterns
- Response time impact
- Concurrent access handling

### Performance-aware Development

Development practices that support performance goals:

- **Profile during development** - Regular performance profiling
- **Benchmark new features** - Performance testing for new endpoints
- **Monitor production metrics** - Real-world performance validation
- **Iterative optimization** - Continuous performance improvement
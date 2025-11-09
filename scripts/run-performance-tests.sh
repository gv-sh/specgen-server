#!/bin/bash

# scripts/run-performance-tests.sh
# Automated performance testing script for CI/CD integration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PERFORMANCE_RESULTS_DIR="$PROJECT_ROOT/performance-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$PERFORMANCE_RESULTS_DIR/performance_$TIMESTAMP.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== SpecGen Server Performance Testing Suite ===${NC}"
echo "Timestamp: $(date)"
echo "Results will be saved to: $RESULTS_FILE"

# Create results directory
mkdir -p "$PERFORMANCE_RESULTS_DIR"

# Initialize results JSON
cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": {
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)",
    "os": "$(uname -s)",
    "arch": "$(uname -m)"
  },
  "tests": {}
}
EOF

# Function to log with timestamp
log() {
    echo -e "[$(date +'%H:%M:%S')] $1"
}

# Function to update results JSON
update_results() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    # Use Node.js to update JSON (more reliable than jq for complex updates)
    node -e "
        const fs = require('fs');
        const results = JSON.parse(fs.readFileSync('$RESULTS_FILE'));
        results.tests['$test_name'] = {
            status: '$status',
            timestamp: new Date().toISOString(),
            details: $details
        };
        fs.writeFileSync('$RESULTS_FILE', JSON.stringify(results, null, 2));
    "
}

# Function to run performance tests with timeout
run_performance_test() {
    local test_name="$1"
    local test_command="$2"
    local timeout_duration="$3"
    
    log "${YELLOW}Running $test_name...${NC}"
    
    local start_time=$(date +%s)
    local test_output
    local test_exit_code
    
    # Run test with timeout
    if timeout "$timeout_duration" bash -c "$test_command" > "/tmp/perf_test_output.txt" 2>&1; then
        test_exit_code=0
        test_output=$(cat "/tmp/perf_test_output.txt")
    else
        test_exit_code=$?
        test_output=$(cat "/tmp/perf_test_output.txt")
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $test_exit_code -eq 0 ]; then
        log "${GREEN}✓ $test_name completed successfully (${duration}s)${NC}"
        update_results "$test_name" "passed" "{\"duration\": $duration, \"output\": \"Test passed\"}"
    else
        log "${RED}✗ $test_name failed (${duration}s)${NC}"
        log "${RED}Error output:${NC}"
        echo "$test_output" | tail -10 | sed 's/^/  /'
        update_results "$test_name" "failed" "{\"duration\": $duration, \"error\": \"$(echo "$test_output" | tail -5 | tr '\n' ' ' | sed 's/"/\\"/g')\"}"
    fi
    
    return $test_exit_code
}

# Function to check if server is running
check_server() {
    local max_attempts=30
    local attempt=1
    
    log "${YELLOW}Checking if test server is available...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:3001/api/health" > /dev/null 2>&1; then
            log "${GREEN}✓ Test server is available${NC}"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts - waiting for server..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log "${RED}✗ Test server is not available after $max_attempts attempts${NC}"
    return 1
}

# Start test server if not running
start_test_server() {
    log "${YELLOW}Starting test server...${NC}"
    
    # Set test environment
    export NODE_ENV=test
    export PORT=3001
    
    # Start server in background
    cd "$PROJECT_ROOT"
    npm start > "/tmp/test_server.log" 2>&1 &
    local server_pid=$!
    echo $server_pid > "/tmp/test_server.pid"
    
    # Wait for server to be ready
    sleep 5
    
    if check_server; then
        log "${GREEN}✓ Test server started successfully (PID: $server_pid)${NC}"
        return 0
    else
        log "${RED}✗ Failed to start test server${NC}"
        kill $server_pid 2>/dev/null || true
        return 1
    fi
}

# Stop test server
stop_test_server() {
    if [ -f "/tmp/test_server.pid" ]; then
        local server_pid=$(cat "/tmp/test_server.pid")
        log "${YELLOW}Stopping test server (PID: $server_pid)...${NC}"
        kill $server_pid 2>/dev/null || true
        rm -f "/tmp/test_server.pid"
        
        # Wait for server to stop
        sleep 2
        
        log "${GREEN}✓ Test server stopped${NC}"
    fi
}

# Cleanup function
cleanup() {
    log "${YELLOW}Cleaning up...${NC}"
    stop_test_server
    rm -f "/tmp/perf_test_output.txt" "/tmp/test_server.log"
}

# Set up cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local exit_code=0
    
    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log "${YELLOW}Installing dependencies...${NC}"
        cd "$PROJECT_ROOT"
        npm ci
    fi
    
    # Start test server
    if ! start_test_server; then
        exit_code=1
        return $exit_code
    fi
    
    # Wait for server to be fully ready
    sleep 3
    
    # Run performance tests
    log "${BLUE}=== Running Performance Test Suite ===${NC}"
    
    # 1. Content loading performance tests
    if ! run_performance_test "content_performance" \
        "cd '$PROJECT_ROOT' && npm test tests/performance/contentPerformance.test.js" \
        "300"; then
        log "${YELLOW}⚠ Content performance tests had issues but continuing...${NC}"
        # Don't set exit_code=1 for performance tests, as they might have timing variations
    fi
    
    # 2. Database indexing performance tests
    if ! run_performance_test "database_indexing" \
        "cd '$PROJECT_ROOT' && npm test tests/performanceIndexing.test.js" \
        "120"; then
        # Database indexing failure is warning, not critical
        log "${YELLOW}⚠ Database indexing tests failed but continuing...${NC}"
    fi
    
    # 3. Load testing (if server supports it)
    if check_server; then
        if ! run_performance_test "load_testing" \
            "cd '$PROJECT_ROOT' && timeout 60 node tests/performance/loadTest.js" \
            "90"; then
            # Load test failure is warning, not critical
            log "${YELLOW}⚠ Load testing failed but continuing...${NC}"
        fi
    fi
    
    # Generate final report
    generate_performance_report
    
    return $exit_code
}

# Generate performance report
generate_performance_report() {
    log "${BLUE}=== Performance Test Results ===${NC}"
    
    # Parse results and create summary
    node -e "
        const fs = require('fs');
        const results = JSON.parse(fs.readFileSync('$RESULTS_FILE'));
        
        console.log('\\nPerformance Test Summary:');
        console.log('========================');
        console.log('Timestamp:', results.timestamp);
        console.log('Environment:', JSON.stringify(results.environment, null, 2));
        console.log('\\nTest Results:');
        
        let passed = 0;
        let failed = 0;
        
        Object.entries(results.tests).forEach(([name, result]) => {
            const status = result.status === 'passed' ? '✓' : '✗';
            const color = result.status === 'passed' ? '\\\\033[0;32m' : '\\\\033[0;31m';
            console.log(\`  \${color}\${status} \${name} (\${result.details.duration}s)\\\\033[0m\`);
            
            if (result.status === 'passed') {
                passed++;
            } else {
                failed++;
                console.log(\`    Error: \${result.details.error || 'Unknown error'}\`);
            }
        });
        
        console.log('\\nSummary:', \`\${passed} passed, \${failed} failed\`);
        
        // Write summary for CI
        const summary = {
            total: passed + failed,
            passed: passed,
            failed: failed,
            success_rate: ((passed / (passed + failed)) * 100).toFixed(1) + '%'
        };
        
        results.summary = summary;
        fs.writeFileSync('$RESULTS_FILE', JSON.stringify(results, null, 2));
        
        if (failed > 0) {
            console.log('\\\\033[0;31m❌ Performance tests failed\\\\033[0m');
            process.exit(1);
        } else {
            console.log('\\\\033[0;32m✅ All performance tests passed\\\\033[0m');
        }
    "
}

# Check for required tools
check_dependencies() {
    local missing_deps=()
    
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log "${RED}Missing required dependencies: ${missing_deps[*]}${NC}"
        return 1
    fi
    
    return 0
}

# Script entry point
if ! check_dependencies; then
    exit 1
fi

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--help]"
        echo "Runs the complete performance testing suite for SpecGen Server"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  NODE_ENV      Set to 'test' (default)"
        echo "  PORT          Test server port (default: 3001)"
        exit 0
        ;;
    "")
        # Run main function
        main
        exit_code=$?
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

exit $exit_code
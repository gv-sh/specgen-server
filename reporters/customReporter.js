// reporters/customReporter.js
const fs = require('fs');
const path = require('path');
const { DefaultReporter } = require('@jest/reporters');

class CustomReporter extends DefaultReporter {
  constructor(globalConfig) {
    super(globalConfig);
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    
    this.logFile = path.join(logsDir, 'test.log');
    fs.writeFileSync(this.logFile, '', 'utf8');
    
    // Log start timestamp and test run info
    const timestamp = new Date().toISOString();
    const headerContent = [
      `TEST RUN: ${timestamp}`,
      '======================================================',
      `Command: ${process.argv.join(' ')}`,
      '======================================================\n'
    ].join('\n');
    fs.appendFileSync(this.logFile, headerContent, 'utf8');
    
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };
    
    // Store context for proper binding
    const reporter = this;
    
    // Override console methods to capture to log file but not output to terminal
    console.log = function(...args) {
      reporter.captureOutput('LOG', ...args);
    };
    
    console.warn = function(...args) {
      reporter.captureOutput('WARN', ...args);
    };
    
    console.error = function(...args) {
      reporter.captureOutput('ERROR', ...args);
    };
    
    console.info = function(...args) {
      reporter.captureOutput('INFO', ...args);
    };
    
    console.debug = function(...args) {
      reporter.captureOutput('DEBUG', ...args);
    };
  }
  
  captureOutput(level, ...args) {
    const timestamp = new Date().toISOString();
    let formattedArgs;
    
    try {
      formattedArgs = args.map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    } catch (e) {
      formattedArgs = `[Error formatting args: ${e.message}]`;
    }
    
    const logEntry = `[${timestamp}] [${level}]: ${formattedArgs}\n`;
    try {
      fs.appendFileSync(this.logFile, logEntry, 'utf8');
    } catch (error) {
      // If writing to log file fails, use process.stderr as fallback
      process.stderr.write(`Error writing to log: ${error.message}\n`);
    }
  }

  printTestFileHeader(testPath, config, result) {
    // Log test file start to file
    const testFile = path.basename(testPath);
    this.captureOutput('INFO', `----------- Starting tests in ${testFile} -----------`);
    return;
  }

  printTestFileFailureMessage(_testPath, _config, result) {
    return;
  }

  onTestStart(test) {
    // Log test start to file
    const testName = this.getTestName(test);
    this.captureOutput('INFO', `Running test: ${testName}`);
  }
  
  getTestName(test) {
    // Extract just the test name without the full path
    const testFile = path.basename(test.path);
    return `${testFile} - ${test.name || 'unnamed test'}`;
  }

  onTestResult(test, testResult, aggregatedResult) {
    const testFile = path.basename(test.path);
    
    // Log test file completion to file with a separator for readability
    this.captureOutput('INFO', `----------- Test results for ${testFile} -----------`);
    this.captureOutput('INFO', {
      numPassingTests: testResult.numPassingTests,
      numFailingTests: testResult.numFailingTests,
      numPendingTests: testResult.numPendingTests,
      testResults: testResult.testResults.map(r => ({
        title: r.title,
        status: r.status,
        duration: r.duration
      }))
    });
    
    // Terminal output for the test file
    if (testResult.numFailingTests > 0) {
      // Display failed tests
      process.stdout.write(`FAIL  ${testFile}\n`);
      
      testResult.testResults.forEach(result => {
        if (result.status === 'failed') {
          const assertionResults = result.failureMessages.map(msg => {
            const expectedMatch = msg.match(/Expected:[\s]+(.*)/);
            const receivedMatch = msg.match(/Received:[\s]+(.*)/);
            
            let expectedVal = expectedMatch ? expectedMatch[1] : 'unknown';
            let receivedVal = receivedMatch ? receivedMatch[1] : 'unknown';
            
            return `Expected: ${expectedVal}, Received: ${receivedVal}`;
          });
          
          process.stdout.write(`  ${result.title}\n`);
          process.stdout.write(`  ${assertionResults.join('\n  ')}\n`);
        }
      });
    } else if (testResult.numPassingTests > 0) {
      // Display passed tests
      process.stdout.write(`PASS  ${testFile}\n`);
      
      // Show names of passed tests
      testResult.testResults.forEach(result => {
        if (result.status === 'passed') {
          process.stdout.write(`  ${result.title}\n`);
        }
      });
    }
  }
  
  onRunComplete(contexts, results) {
    // Log test completion with a nice separator
    this.captureOutput('INFO', '======================================================');
    this.captureOutput('INFO', 'Test run completed at ' + new Date().toISOString());
    this.captureOutput('INFO', {
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numTotalTests: results.numTotalTests,
      testResults: results.testResults.map(r => ({
        testFilePath: path.basename(r.testFilePath),
        numFailingTests: r.numFailingTests,
        numPassingTests: r.numPassingTests
      }))
    });
    this.captureOutput('INFO', '======================================================');
    
    // Restore original console methods
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method];
    });
    
    const { numFailedTests, numPassedTests, numTotalTests } = results;
    const summary = [
      `\nTest results: ${numPassedTests} passed, ${numFailedTests} failed, ${numTotalTests} total`,
      `Console logs saved to: ${this.logFile}`
    ].join('\n');
    
    process.stdout.write(summary + '\n');
  }
}

module.exports = CustomReporter;
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
    
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };
    
    console.log = (...args) => this.captureOutput('LOG', ...args);
    console.warn = (...args) => this.captureOutput('WARN', ...args);
    console.error = (...args) => this.captureOutput('ERROR', ...args);
    console.info = (...args) => this.captureOutput('INFO', ...args);
    console.debug = (...args) => this.captureOutput('DEBUG', ...args);
  }
  
  captureOutput(level, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    const logEntry = `[${timestamp}] [${level}]: ${formattedArgs}\n`;
    fs.appendFileSync(this.logFile, logEntry, 'utf8');
    
  }

  printTestFileHeader(_testPath, config, result) {
    // Don't print test file headers
    return;
  }

  printTestFileFailureMessage(_testPath, _config, result) {
    return;
  }

  onTestResult(test, testResult, aggregatedResult) {
    if (testResult.numFailingTests > 0) {
      const testFile = path.basename(test.path);

      const failureSummary = [];
      failureSummary.push(`\nFAIL  ${testFile}`);
      
      testResult.testResults.forEach(result => {
        if (result.status === 'failed') {
          const assertionResults = result.failureMessages.map(msg => {
            const expectedMatch = msg.match(/Expected:[\s]+(.*)/);
            const receivedMatch = msg.match(/Received:[\s]+(.*)/);
            
            let expectedVal = expectedMatch ? expectedMatch[1] : 'unknown';
            let receivedVal = receivedMatch ? receivedMatch[1] : 'unknown';
            
            return `  Expected: ${expectedVal}, Received: ${receivedVal}`;
          });
          
          failureSummary.push(`  ● ${result.title}`);
          failureSummary.push(assertionResults.join('\n'));
        }
      });

      process.stdout.write(failureSummary.join('\n') + '\n');
    } else if (testResult.numPassingTests > 0) {
      const testFile = path.basename(test.path);
      process.stdout.write(`PASS  ${testFile}\n`);
    }
  }
  
  onRunComplete(contexts, results) {
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
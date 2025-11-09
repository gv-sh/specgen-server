// fixAndTest.js
import { spawn } from 'child_process';

/**
 * Runs a script using NPM and returns a promise
 * @param {string} scriptName - The name of the NPM script to run
 * @returns {Promise<boolean>} - Resolves to true if the script succeeded, false otherwise
 */
function runNpmScript(scriptName) {
  return new Promise((resolve) => {
    console.log(`\n📋 Running script: npm run ${scriptName}`);
    console.log('--------------------------------------------------');
    
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, ['run', scriptName], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      console.log('--------------------------------------------------');
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully`);
        resolve(true);
      } else {
        console.log(`❌ ${scriptName} failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

/**
 * Main function to fix the database and run tests
 */
async function fixAndTest() {
  console.log('🔧 Starting database fix and test process...');
  
  // Step 1: Recreate the database
  const recreateResult = await runNpmScript('recreate-db');
  if (!recreateResult) {
    console.error('❌ Failed to recreate database');
    process.exit(1);
  }
  
  // Step 2: Run the tests
  const testResult = await runNpmScript('test');
  if (!testResult) {
    console.error('❌ Tests failed');
    process.exit(1);
  }
  
  console.log('\n🎉 All done! Database has been recreated and tests have passed.');
}

// Run the function
fixAndTest().catch(error => {
  console.error('Error in fixAndTest script:', error);
  process.exit(1);
});

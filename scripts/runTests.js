// runTests.js
const { spawn } = require('child_process');

// Run the tests
function runTests() {
  return new Promise((resolve) => {
    console.log('\n📋 Running tests...');
    console.log('--------------------------------------------------');
    
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, ['test'], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      console.log('--------------------------------------------------');
      if (code === 0) {
        console.log('✅ Tests completed successfully');
        resolve(true);
      } else {
        console.log(`❌ Tests failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

runTests().then((success) => {
  process.exit(success ? 0 : 1);
});

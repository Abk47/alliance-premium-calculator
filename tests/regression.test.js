const { execSync } = require('child_process');
const path = require('path');

function run(label, command) {
  console.log(`RUN: ${label}`);
  execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  console.log(`PASS: ${label}`);
}

run('Math tests', 'node tests/math.test.js');
run('SRI consistency check', 'node scripts/sri.js --check');
run('Security/UI integration tests', 'node tests/security-ui.test.js');

console.log('All regression tests passed.');

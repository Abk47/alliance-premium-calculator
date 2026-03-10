const assert = require('assert');
const path = require('path');

const math = require(path.resolve(__dirname, '..', 'js', 'modules', 'calculator-math.js'));

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

runTest('Cashback count map is correct for standard terms', () => {
  assert.strictEqual(math.lookupCashbackCount(5), 1);
  assert.strictEqual(math.lookupCashbackCount(7), 2);
  assert.strictEqual(math.lookupCashbackCount(10), 3);
  assert.strictEqual(math.lookupCashbackCount(12), 4);
  assert.strictEqual(math.lookupCashbackCount(15), 5);
});

runTest('Cashback uses monthly premium x 10', () => {
  const result = math.computeBonuses('Life Plan- With cash back', 10, 10000000, 1000000);
  assert.strictEqual(result.singleCashback, 10000000);
  assert.strictEqual(result.cashbackCount, 3);
  assert.strictEqual(result.totalCashback, 30000000);
});

runTest('No-cashback plans have zero cashback values', () => {
  const result = math.computeBonuses('Life Plan- No cash back', 10, 10000000, 1000000);
  assert.strictEqual(result.singleCashback, 0);
  assert.strictEqual(result.totalCashback, 0);
});

runTest('Education plan uses 4.2 percent reversionary bonus rate', () => {
  const result = math.computeBonuses('Education Plan- With cash back', 10, 10000000, 500000);
  assert.strictEqual(result.totalRevBonus, 4200000);
});

runTest('Life plan uses 3.0 percent reversionary bonus rate', () => {
  const result = math.computeBonuses('Life Plan- With cash back', 10, 10000000, 500000);
  assert.strictEqual(result.totalRevBonus, 3000000);
});

runTest('Terminal bonus is 50 percent of reversionary bonus', () => {
  const result = math.computeBonuses('Life Plan- With cash back', 10, 10000000, 500000);
  assert.strictEqual(result.totalTermBonus, 1500000);
});

runTest('Maturity value combines SA + bonuses + cashback', () => {
  const result = math.computeBonuses('Life Plan- With cash back', 10, 10000000, 1000000);
  const expected = 10000000 + 3000000 + 1500000 + 30000000;
  assert.strictEqual(result.maturityValue, expected);
});

console.log('All math tests passed.');

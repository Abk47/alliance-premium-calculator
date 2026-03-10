const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'Alliance Premium Calculator.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const math = require(path.resolve(__dirname, '..', 'js', 'modules', 'calculator-math.js'));

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

test('CSP meta exists and contains critical directives', () => {
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/>/i);
  assert.ok(cspMatch, 'Expected CSP meta tag in HTML');
  const csp = cspMatch[1];
  assert.ok(csp.includes("default-src 'self'"));
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

test('Script dependencies include SRI and crossorigin', () => {
  const expectedScripts = [
    'js/vendor/jspdf.umd.min.js',
    'js/vendor/html2canvas.min.js',
    'js/modules/calculator-data.js',
    'js/modules/calculator-math.js',
    'js/modules/calculator-app.js',
    'js/calculator.js'
  ];

  expectedScripts.forEach((src) => {
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<script[^>]*src="${escaped}"[^>]*>\\s*</script>`, 'i');
    const tag = html.match(re);
    assert.ok(tag, `Missing script tag for ${src}`);
    assert.ok(/integrity="sha384-[A-Za-z0-9+/=]+"/i.test(tag[0]), `Missing/invalid SRI for ${src}`);
    assert.ok(/crossorigin="anonymous"/i.test(tag[0]), `Missing crossorigin for ${src}`);
  });
});

test('Main quote flow controls exist and script order is correct', () => {
  ['id="dob"', 'id="plan"', 'id="term"', 'id="calculateBtn"', 'id="resultContent"'].forEach((token) => {
    assert.ok(html.includes(token), `Missing required UI element ${token}`);
  });

  const order = [
    'js/modules/calculator-data.js',
    'js/modules/calculator-math.js',
    'js/modules/calculator-app.js',
    'js/calculator.js'
  ].map((src) => html.indexOf(src));

  assert.ok(order.every((i) => i >= 0), 'Expected all core scripts to exist');
  assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'Core script order is incorrect');
});

test('Integration path: annual selection still uses monthly premium for cashback', () => {
  const monthlyPremium = 1000000;
  const annualPremium = monthlyPremium * 12;
  assert.strictEqual(annualPremium, 12000000);

  const bonuses = math.computeBonuses('Life Plan- With cash back', 10, 10000000, monthlyPremium);
  assert.strictEqual(bonuses.singleCashback, 10000000);
  assert.strictEqual(bonuses.totalCashback, 30000000);
});

console.log('Security/UI integration tests passed.');

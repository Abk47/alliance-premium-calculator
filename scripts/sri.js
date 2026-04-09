const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.resolve(projectRoot, 'index.html');

const managedScripts = [
  'js/vendor/jspdf.umd.min.js',
  'js/vendor/html2canvas.min.js',
  'js/modules/calculator-data.js',
  'js/modules/calculator-math.js',
  'js/modules/calculator-app.js',
  'js/calculator.js'
];

function sriForFile(relativeFilePath) {
  const absoluteFilePath = path.resolve(projectRoot, relativeFilePath);
  // Normalize CRLF → LF before hashing so the digest matches what git stores
  // and what GitHub Pages (and any web server) serves from the LF git objects.
  const raw = fs.readFileSync(absoluteFilePath);
  const fileBytes = Buffer.from(raw.toString('binary').replace(/\r\n/g, '\n'), 'binary');
  const digest = crypto.createHash('sha384').update(fileBytes).digest('base64');
  return `sha384-${digest}`;
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateHtmlWithSri(html) {
  let nextHtml = html;

  managedScripts.forEach((src) => {
    const escapedSrc = escapeRegExp(src);
    const re = new RegExp(`<script([^>]*)src="${escapedSrc}"([^>]*)><\\/script>`, 'i');
    const match = nextHtml.match(re);
    if (!match) {
      throw new Error(`Missing script tag for ${src}`);
    }

    const sriValue = sriForFile(src);
    const startTag = match[0];
    let normalizedTag = startTag;

    if (/\sintegrity="[^"]*"/i.test(normalizedTag)) {
      normalizedTag = normalizedTag.replace(/\sintegrity="[^"]*"/i, ` integrity="${sriValue}"`);
    } else {
      normalizedTag = normalizedTag.replace(/<script/i, `<script integrity="${sriValue}"`);
    }

    if (!/\scrossorigin="anonymous"/i.test(normalizedTag)) {
      normalizedTag = normalizedTag.replace(/<script/i, '<script crossorigin="anonymous"');
    }

    // Keep attribute ordering stable: src first, then integrity and crossorigin.
    normalizedTag = normalizedTag
      .replace(/\scrossorigin="anonymous"/i, '')
      .replace(/\sintegrity="[^"]*"/i, '')
      .replace(/src="([^"]+)"/i, `src="$1" integrity="${sriValue}" crossorigin="anonymous"`);

    nextHtml = nextHtml.replace(startTag, normalizedTag);
  });

  return nextHtml;
}

function checkHtmlSri(html) {
  const failures = [];

  managedScripts.forEach((src) => {
    const escapedSrc = escapeRegExp(src);
    const re = new RegExp(`<script[^>]*src="${escapedSrc}"[^>]*>\\s*<\\/script>`, 'i');
    const match = html.match(re);
    if (!match) {
      failures.push(`Missing script tag for ${src}`);
      return;
    }

    const integrityMatch = match[0].match(/integrity="(sha384-[A-Za-z0-9+/=]+)"/i);
    if (!integrityMatch) {
      failures.push(`Missing integrity attribute for ${src}`);
      return;
    }

    const expected = sriForFile(src);
    const actual = integrityMatch[1];
    if (expected !== actual) {
      failures.push(`SRI mismatch for ${src}`);
    }
  });

  return failures;
}

function main() {
  const mode = process.argv[2] || '--check';
  const html = fs.readFileSync(htmlPath, 'utf8');

  if (mode === '--write') {
    const updated = updateHtmlWithSri(html);
    fs.writeFileSync(htmlPath, updated, 'utf8');
    console.log('Updated SRI values in index.html');
    return;
  }

  if (mode === '--check') {
    const failures = checkHtmlSri(html);
    if (failures.length > 0) {
      failures.forEach((failure) => console.error(`FAIL: ${failure}`));
      process.exit(1);
    }
    console.log('PASS: SRI values are in sync with current files.');
    return;
  }

  console.error('Usage: node scripts/sri.js --check | --write');
  process.exit(1);
}

main();

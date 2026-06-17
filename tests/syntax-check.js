/**
 * MomenPix — JS Syntax Check
 * Prevents broken JS from deploying.
 * A SyntaxError in index.html breaks ALL navigation (nav is not defined).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlFile = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlFile, 'utf8');

const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let checked = 0;
let errors = 0;

while ((match = re.exec(html)) !== null) {
  const script = match[1];
  if (script.trim().length < 100) continue;
  checked++;
  try {
    new vm.Script(script, { filename: 'index.html:script#' + checked });
  } catch (e) {
    errors++;
    console.error('❌ SyntaxError in script block #' + checked + ': ' + e.message);
  }
}

if (checked === 0) {
  console.error('❌ No script blocks found in index.html');
  process.exit(1);
}

if (errors > 0) {
  console.error('\n❌ ' + errors + ' block(s) with syntax errors. FIX BEFORE DEPLOYING.');
  process.exit(1);
}

console.log('✅ JS syntax OK — ' + checked + ' script blocks checked');
process.exit(0);

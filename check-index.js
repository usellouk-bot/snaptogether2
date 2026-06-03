#!/usr/bin/env node
/**
 * MomenPix Regression Test Harness
 * Usage: node tests/check-index.js
 * Run this before every commit / file upload.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Config ────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'index.html');
const ADMIN_FILE = path.join(ROOT, 'admin.html');
const TMP_DIR    = require('os').tmpdir();

let passed = 0;
let failed = 0;
const failures = [];

// ── Helpers ───────────────────────────────────────────────
function pass(label) {
  console.log('  \u2705 ' + label);
  passed++;
}

function fail(label, detail) {
  console.log('  \u274C ' + label + (detail ? ': ' + detail : ''));
  failed++;
  failures.push(label + (detail ? ': ' + detail : ''));
}

function check(label, condition, detail) {
  condition ? pass(label) : fail(label, detail || '');
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail('File exists: ' + path.basename(filePath), 'not found at ' + filePath);
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    scripts.push(m[1]);
  }
  return scripts;
}

function syntaxCheck(code, label) {
  const tmp = path.join(TMP_DIR, 'mp_check_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.js');
  fs.writeFileSync(tmp, code, 'utf8');
  try {
    execSync('node --check ' + tmp, { stdio: 'pipe' });
    pass(label);
    return true;
  } catch (e) {
    const msg = (e.stderr || e.stdout || '').toString().split('\n')[0].trim();
    fail(label, msg);
    return false;
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

// ── Load files ────────────────────────────────────────────
const indexHtml = readFile(INDEX_FILE);
const adminHtml = readFile(ADMIN_FILE);

// ═══════════════════════════════════════════════════════════
// SECTION 1 — Syntax check
// ═══════════════════════════════════════════════════════════
console.log('\n[1] Syntax — index.html');
if (indexHtml) {
  const scripts = extractScripts(indexHtml);
  check('index.html: at least 1 script block found', scripts.length > 0, 'no <script> blocks');
  scripts.forEach(function(code, i) {
    syntaxCheck(code, 'index.html script block ' + i + ' (' + code.length + ' chars)');
  });
}

console.log('\n[2] Syntax — admin.html');
if (adminHtml) {
  const scripts = extractScripts(adminHtml);
  check('admin.html: at least 1 script block found', scripts.length > 0, 'no <script> blocks');
  scripts.forEach(function(code, i) {
    syntaxCheck(code, 'admin.html script block ' + i + ' (' + code.length + ' chars)');
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — Critical functions in index.html
// ═══════════════════════════════════════════════════════════
console.log('\n[3] Critical functions — index.html');
if (indexHtml) {
  const criticalFunctions = [
    ['const DB =',                    'DB object defined'],
    ['function nav(',                  'nav()'],
    ['function renderHome(',           'renderHome()'],
    ['function startNew(',             'startNew()'],
    ['function enterEvent(',           'enterEvent()'],
    ['function startCam(',             'startCam()'],
    ['function updatePhotoCloudUrl(',  'updatePhotoCloudUrl()'],
    ['function fbSavePhoto(',          'fbSavePhoto()'],
    ['function fbGetPhotos(',          'fbGetPhotos()'],
    ['function startCleanProjection(', 'startCleanProjection()'],
    ['function stopCleanProjection(',  'stopCleanProjection()'],
    ['function isAdminSession(',       'isAdminSession()'],
  ];

  criticalFunctions.forEach(function(pair) {
    check(pair[1] + ' exists', indexHtml.includes(pair[0]));
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — Firebase Auth basics
// ═══════════════════════════════════════════════════════════
console.log('\n[4] Firebase Auth');
if (indexHtml) {
  check('firebase-auth-compat.js SDK loaded',
        indexHtml.includes('firebase-auth-compat.js'));

  check('auth = firebase.auth() initialized',
        indexHtml.includes('const auth=firebase.auth()'));

  check('ensureGuestAuth() defined',
        indexHtml.includes('function ensureGuestAuth('));

  check('signInAnonymously used',
        indexHtml.includes('signInAnonymously()'));

  check('auth.onAuthStateChanged registered',
        indexHtml.includes('auth.onAuthStateChanged'));

  check('mpCurrentUser variable declared',
        indexHtml.includes('mpCurrentUser'));

  check('mpAuthReady variable declared',
        indexHtml.includes('mpAuthReady'));

  check('fbSavePhoto saves uploaderUid when present',
        indexHtml.includes('uploaderUid') &&
        indexHtml.includes('photo.uploaderUid'));
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — Deep Link logic
// ═══════════════════════════════════════════════════════════
console.log('\n[5] Deep Link — handleDeepLink');
if (indexHtml) {
  check('handleDeepLink() defined',
        indexHtml.includes('function handleDeepLink('));

  check('handleDeepLink handles ?code= param',
        indexHtml.includes("params.get('code')"));

  check('handleDeepLink falls back to fbGetEvent when not local',
        indexHtml.includes('fbGetEvent(upperCode)') ||
        indexHtml.includes('fbGetEvent(liveCode)'));

  check('ensureGuestAuth called on guest entry (code path)',
        indexHtml.includes('ensureGuestAuth'));
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — Projection integrity
// ═══════════════════════════════════════════════════════════
console.log('\n[6] Projection');
if (indexHtml) {
  check('startCleanProjection() defined',
        indexHtml.includes('function startCleanProjection('));

  check('stopCleanProjection() defined',
        indexHtml.includes('function stopCleanProjection('));

  check('stopAllCellTimers() defined (timer cleanup)',
        indexHtml.includes('function stopAllCellTimers('));

  check('projFetchInterval cleared in stopCleanProjection',
        indexHtml.includes('projFetchInterval') &&
        indexHtml.includes('clearInterval(projFetchInterval)'));

  check('projActive flag used',
        indexHtml.includes('projActive'));

  // No duplicate let declarations for projection vars
  const projVarMatches = (indexHtml.match(/\blet projLayout\b/g) || []).length;
  check('projLayout declared exactly once (no duplicates)',
        projVarMatches === 1, 'found ' + projVarMatches + ' declarations');

  const projActiveMatches = (indexHtml.match(/\blet projActive\b/g) || []).length;
  check('projActive declared exactly once (no duplicates)',
        projActiveMatches === 1, 'found ' + projActiveMatches + ' declarations');
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — Cloudinary / Firebase safety
// ═══════════════════════════════════════════════════════════
console.log('\n[7] Cloudinary / Firebase safety');
if (indexHtml) {
  check('fbSavePhoto saves cloudUrl',
        indexHtml.includes('cloudUrl:photo.url') ||
        indexHtml.includes("cloudUrl:'") ||
        indexHtml.includes('cloudUrl:photo.cloudUrl'));

  // No Cloudinary API Secret exposed in client code
  const hasApiSecret = /api_secret\s*[:=]\s*['"][^'"]{10,}['"]/.test(indexHtml);
  check('No Cloudinary API Secret exposed in client', !hasApiSecret,
        'found api_secret assignment in index.html');

  // Upload flow uses Cloudinary upload endpoint
  check('Cloudinary upload endpoint present',
        indexHtml.includes('cloudinary.com') &&
        indexHtml.includes('/upload'));

  // fbSavePhoto is async function
  check('fbSavePhoto is async',
        indexHtml.includes('async function fbSavePhoto('));
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — Admin fallback safety
// ═══════════════════════════════════════════════════════════
console.log('\n[8] Admin fallback');
if (indexHtml) {
  check('isAdminSession() has localStorage fallback',
        indexHtml.includes("mp_admin_session')==='1'"));

  check('activateAdminSession() defined',
        indexHtml.includes('function activateAdminSession('));

  check('ADMIN_EMAIL constant defined',
        indexHtml.includes('ADMIN_EMAIL'));

  check('doAdmLogin() defined',
        indexHtml.includes('function doAdmLogin('));
}

// ═══════════════════════════════════════════════════════════
// FINAL RESULT
// ═══════════════════════════════════════════════════════════
const total = passed + failed;
console.log('\n' + '='.repeat(50));
console.log('Results: ' + passed + '/' + total + ' passed');

if (failed === 0) {
  console.log('\n\u2705  ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.log('\n\u274C  ' + failed + ' TEST(S) FAILED:\n');
  failures.forEach(function(f, i) {
    console.log('  ' + (i + 1) + '. ' + f);
  });
  console.log('');
  process.exit(1);
}

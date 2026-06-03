/**
 * MomenPix — Static Regression Tests
 * node tests/check-index.js
 *
 * בודק שה-index.html מכיל את כל הרכיבים הקריטיים.
 * חייב לעבור 45/45 לפני כל שינוי.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');

if (!fs.existsSync(FILE)) {
  console.error('❌ index.html לא נמצא ב:', FILE);
  process.exit(1);
}

const html = fs.readFileSync(FILE, 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

function check(description, condition) {
  if (condition) {
    passed++;
    process.stdout.write('  ✓ ' + description + '\n');
  } else {
    failed++;
    failures.push(description);
    process.stdout.write('  ✗ ' + description + '\n');
  }
}

// ── 1. תשתית בסיסית ──────────────────────────────────────────
console.log('\n[1] תשתית בסיסית');
check('DOCTYPE html קיים',            html.includes('<!DOCTYPE html>'));
check('charset UTF-8',                html.includes('charset="UTF-8"'));
check('viewport meta קיים',           html.includes('name="viewport"'));
check('title Momenpix',               html.includes('<title>Momenpix</title>'));
check('PWA manifest קיים',            html.includes('pwa-manifest'));
check('apple-touch-icon קיים',        html.includes('apple-mobile-web-app-capable'));
check('theme-color קיים',             html.includes('theme-color'));

// ── 2. Firebase ───────────────────────────────────────────────
console.log('\n[2] Firebase');
check('Firebase App compat נטען',     html.includes('firebase-app-compat.js'));
check('Firebase Firestore נטען',      html.includes('firebase-firestore-compat.js'));
check('Firebase Auth נטען',           html.includes('firebase-auth-compat.js'));
check('FB_CONFIG קיים',               html.includes('const FB_CONFIG='));
check('projectId snaptogether-e3fbf', html.includes('snaptogether-e3fbf'));
check('db = firebase.firestore()',    html.includes('const db=firebase.firestore()'));
check('auth = firebase.auth()',       html.includes('const auth=firebase.auth()'));
check('onAuthStateChanged קיים',      html.includes('auth.onAuthStateChanged'));
check('ensureGuestAuth קיים',         html.includes('function ensureGuestAuth()'));
check('fbSaveEvent קיים',             html.includes('async function fbSaveEvent('));
check('fbGetEvent קיים',              html.includes('async function fbGetEvent('));
check('fbSavePhoto קיים',             html.includes('async function fbSavePhoto('));
check('fbGetPhotos קיים',             html.includes('async function fbGetPhotos('));

// ── 3. Cloudinary ─────────────────────────────────────────────
console.log('\n[3] Cloudinary');
check('CLOUD_NAME = dufzgvkzi',       html.includes("CLOUD_NAME = 'dufzgvkzi'"));

// ── 4. מסכים (screens) ───────────────────────────────────────
console.log('\n[4] מסכים');
const screens = [
  'home','login','register','guest','welcome',
  'create','share','camera','gallery','filter',
  'admin','package','payment','cloud',
  'edit_event','scenarios','live','album','clip',
  'storage','download','ai_package'
];
screens.forEach(s => {
  check('מסך ' + s + ' קיים', html.includes('id="s-' + s + '"'));
});

// ── 5. אלמנטים קריטיים ───────────────────────────────────────
console.log('\n[5] אלמנטים קריטיים');
check('toast element קיים',           html.includes('id="toast"'));
check('app container קיים',           html.includes('id="app"'));
check('projection-screen קיים',       html.includes('id="projection-screen"'));
check('proj-screensaver קיים',        html.includes('id="proj-screensaver"'));
check('viewfinder קיים',              html.includes('id="viewfinder"'));
check('btn-new-event קיים',           html.includes('id="btn-new-event"'));
check('home-saved-events קיים',       html.includes('id="home-saved-events"'));
check('qr-canvas קיים',               html.includes('id="qr-canvas"'));
check('scenarios-list קיים',          html.includes('id="scenarios-list"'));

// ── 6. פונקציות ניווט ────────────────────────────────────────
console.log('\n[6] פונקציות ניווט');
check('function nav() קיימת',         html.includes('function nav(s)'));
check('function back() קיימת',        html.includes('function back()'));
check('function home() קיימת',        html.includes('function home()'));
check('function toast() קיימת',       html.includes('function toast('));
check('GUEST_ALLOWED קיים',           html.includes("const GUEST_ALLOWED=["));
check('ADMIN_SCREENS קיים',           html.includes("const ADMIN_SCREENS=["));

// ── 7. זכויות יוצרים ─────────────────────────────────────────
console.log('\n[7] זכויות יוצרים');
check('copyright 2026 Momenpix',      html.includes('© 2026 Momenpix'));

// ── סיכום ────────────────────────────────────────────────────
const total = passed + failed;
console.log('\n' + '─'.repeat(44));
console.log('תוצאה: ' + passed + '/' + total + ' בדיקות עברו');

if (failed > 0) {
  console.log('\nנכשלו:');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
} else {
  console.log('✅ כל הבדיקות עברו!\n');
  process.exit(0);
}

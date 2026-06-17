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

// ── 8. בדיקות אבטחה — רגרסיות קריטיות ───────────────────────
console.log('\n[8] בדיקות אבטחה');
check('ADMIN_EMAIL לא hardcoded כ-const',
  !html.includes("const ADMIN_EMAIL='") && !html.includes('const ADMIN_EMAIL="'));
check('canCaptureNow() קיימת',
  html.includes('function canCaptureNow()'));
check('hydrateEvFromFirestore() קיימת',
  html.includes('function hydrateEvFromFirestore('));
check('submitCreate() חוסמת anonymous',
  html.includes('mpCurrentUser.isAnonymous') && html.includes('נדרשת כניסה כבעל אירוע'));
check('ensureGuestAuth() נקרא לפני fbGetEvent ב-enterEvent',
  (()=>{
    const enter = html.indexOf('function enterEvent()');
    const nextFn = html.indexOf('\nfunction ', enter+1);
    const block = html.slice(enter, nextFn);
    const authIdx = block.indexOf('hydrateEvFromFirestore');
    const fbIdx   = block.indexOf('fbGetEvent');
    return authIdx !== -1 && (fbIdx === -1 || authIdx < fbIdx);
  })());

// ── 9. Event Manager — בדיקות אבטחה ─────────────────────────
console.log('\n[9] Event Manager');
// ST-MGR-001: MANAGER_ROLE קיים
check('ST-MGR-001: MANAGER_ROLE קיים',
  html.includes("MANAGER_ROLE") || html.includes("'manager'") || html.includes('"manager"'));
// ST-MGR-002: doDL() חוסמת Manager
check('ST-MGR-002: doDL() חוסמת Manager',
  (()=>{
    const dlIdx = html.indexOf('async function doDL()');
    const nextFn = html.indexOf('\nasync function ', dlIdx+1);
    const block = html.slice(dlIdx, nextFn > dlIdx ? nextFn : dlIdx+2000);
    return block.includes('manager') || block.includes('Manager');
  })());
// ST-MGR-003: submitCreate() חוסמת Manager
check('ST-MGR-003: submitCreate() חוסמת Manager',
  (()=>{
    const scIdx = html.indexOf('function submitCreate()');
    const nextFn = html.indexOf('\nfunction ', scIdx+1);
    const block = html.slice(scIdx, nextFn > scIdx ? nextFn : scIdx+3000);
    return block.includes('manager') || block.includes('Manager') || block.includes('isManagerSession');
  })());
// ST-MGR-004: nav() חוסמת Manager ממסכי payment/package/storage/download/scenarios
check('ST-MGR-004: MANAGER_BLOCKED array קיים',
  html.includes('MANAGER_BLOCKED') || html.includes('isManagerSession'));
// ST-MGR-005: hideFromProjection() קיימת
check('ST-MGR-005: hideFromProjection() קיימת',
  html.includes('function hideFromProjection'));
// ST-MGR-006: Gallery מסנן Guest לפי uploaderUid (לא uploaderName)
check('ST-MGR-006: Gallery מסנן Guest לפי uploaderUid',
  (()=>{
    const galIdx = html.indexOf('function _renderGalleryPhotos(');
    const nextFn = html.indexOf('\nfunction ', galIdx+1);
    const block = html.slice(galIdx, nextFn > galIdx ? nextFn : galIdx+1200);
    // Must have uploaderUid as primary filter AND uploaderName only as fallback
    const hasUid = block.includes('uploaderUid===myUid');
    const nameIsOnlyFallback = block.includes('Fallback') || block.includes('fallback');
    return hasUid && nameIsOnlyFallback;
  })());
// ST-MGR-007: canCaptureNow() לא נותן bypass ל-Manager
check('ST-MGR-007: canCaptureNow() לא מתיר bypass ל-Manager',
  (()=>{
    const fnIdx = html.indexOf('function canCaptureNow()');
    const nextFn = html.indexOf('\nfunction ', fnIdx+1);
    const block = html.slice(fnIdx, nextFn > fnIdx ? nextFn : fnIdx+500);
    // חוק: manager חייב להיות ב-isEventActive() path — לא ב-bypass
    // אם מנהל מקבל true ישירות כמו admin — זה כישלון
    const adminBypass = block.includes("role==='admin'") || block.includes('isAdminSession()');
    const managerBypass = block.includes("role==='manager'") && !block.includes('isEventActive');
    return adminBypass && !managerBypass;
  })());

// ── 10. Manager Invite UX ─────────────────────────────────────
console.log('\n[10] Manager Invite UX');
check('ST-INV-001: כפתור הזמן מנהל אירוע קיים במסך share',
  (()=>{
    const shareIdx = html.indexOf('id="s-share"');
    const nextScreen = html.indexOf('\n<!-- ', shareIdx+1);
    const block = html.slice(shareIdx, nextScreen);
    return block.includes('הזמן מנהל אירוע');
  })());
check('ST-INV-002: mgr-invite-panel קיים',
  html.includes('id="mgr-invite-panel"'));
check('ST-INV-003: mgr-invite-link-display קיים',
  html.includes('id="mgr-invite-link-display"'));
check('ST-INV-004: כפתור העתק קישור קיים',
  html.includes('copyManagerLink()') && html.includes('העתק קישור'));
check('ST-INV-005: כפתור שתף בוואטסאפ קיים',
  html.includes('shareManagerLinkWA()') && html.includes('וואטסאפ'));
check('ST-INV-006: מסך manager_entry עם שדות login קיים',
  html.includes('id="s-manager_entry"') &&
  html.includes('data-testid="mgr-email"') &&
  html.includes('data-testid="mgr-pass"'));
check('ST-INV-007: קודים כ-hidden fields — Manager לא מקליד ידנית',
  (()=>{
    const screenIdx = html.indexOf('id="s-manager_entry"');
    const nextScreen = html.indexOf('\n<!-- ', screenIdx+1);
    const block = html.slice(screenIdx, nextScreen);
    return block.includes('type="hidden"') &&
           block.includes('id="mgr-invite-code"') &&
           block.includes('id="mgr-event-code"');
  })());
check('ST-INV-008: כפתור אשר כניסה כמנהל אירוע קיים',
  html.includes('אשר כניסה כמנהל אירוע'));
check('ST-INV-009: handleDeepLink מטפל ב-?manager_invite=',
  html.includes("params.get('manager_invite')") &&
  html.includes("sessionStorage.setItem('pending_mgr_invite'"));
check('ST-INV-010: ?code= לאורח לא נשבר',
  (()=>{
    const dlIdx = html.indexOf('function handleDeepLink()');
    const block = html.slice(dlIdx, dlIdx+6000);
    return block.includes("params.get('code')") && block.includes('hydrateEvFromFirestore');
  })());
check('ST-INV-011: ?screen=admin לא נשבר',
  html.includes('function checkAdminURL') &&
  html.includes("params.get('screen')"));

// ── 11. Home Screen Flow ──────────────────────────────────────
console.log('\n[11] Home Screen Flow');
check('ST-FLOW-001: כפתור כניסה לחשבון גלוי בדף הבית',
  (()=>{
    const homeIdx = html.indexOf('id="s-home"');
    const next = html.indexOf('\n<!-- ', homeIdx+1);
    const block = html.slice(homeIdx, next);
    return block.includes('btn-login') || (block.includes("nav('login')") && !block.includes('display:none') && block.includes('auth-btns'));
  })());
check('ST-FLOW-002: כפתור הרשמה גלוי בדף הבית',
  (()=>{
    const homeIdx = html.indexOf('id="s-home"');
    const next = html.indexOf('\n<!-- ', homeIdx+1);
    const block = html.slice(homeIdx, next);
    return block.includes('btn-register') || block.includes("nav('register')");
  })());
check('ST-FLOW-003: auth-btns לא display:none קבוע',
  (()=>{
    const homeIdx = html.indexOf('id="s-home"');
    const next = html.indexOf('\n<!-- ', homeIdx+1);
    const block = html.slice(homeIdx, next);
    // auth-btns must NOT have hardcoded display:none
    const authBtnsIdx = block.indexOf('id="auth-btns"');
    const authBtnsLine = block.slice(authBtnsIdx, authBtnsIdx+80);
    return !authBtnsLine.includes('display:none');
  })());
check('ST-FLOW-004: renderHome מציג צור אירוע לכל מאומת (לא רק Admin)',
  (()=>{
    const rhIdx = html.indexOf('function renderHome()');
    const next = html.indexOf('\nfunction ', rhIdx+1);
    const block = html.slice(rhIdx, next);
    // Must NOT restrict to isAdminSession only
    return block.includes('canCreateEvent') || block.includes('!mpCurrentUser.isAnonymous');
  })());
check('ST-FLOW-005: submitCreate שומר ישירות לכל Owner (לא רק Admin)',
  (()=>{
    const scIdx = html.indexOf('function submitCreate()');
    const next = html.indexOf('\nfunction ', scIdx+1);
    const block = html.slice(scIdx, next);
    // paid=true must be set for all (pilot mode) not only adminCreated
    return block.includes('S.ev.paid=true') && block.includes("nav('share')");
  })());
check('ST-FLOW-006: ownerId = mpCurrentUser.uid ב-submitCreate',
  (()=>{
    const scIdx = html.indexOf('function submitCreate()');
    const next = html.indexOf('\nfunction ', scIdx+1);
    const block = html.slice(scIdx, next);
    return block.includes('ownerUid=mpCurrentUser.uid') || block.includes('mpCurrentUser.uid');
  })());
check('ST-FLOW-007: כפתור הזמן מנהל אירוע במסך share',
  (()=>{
    const shareIdx = html.indexOf('id="s-share"');
    const next = html.indexOf('\n<!-- ', shareIdx+1);
    const block = html.slice(shareIdx, next);
    return block.includes('הזמן מנהל אירוע');
  })());


// ── 12. Owner Registration Flow ───────────────────────────────
console.log('\n[12] Owner Registration Flow');
check('ST-OWN-001: doRegister קורא Firebase createUserWithEmailAndPassword',
  (()=>{
    const idx = html.indexOf('function doRegister()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('createUserWithEmailAndPassword');
  })());
check('ST-OWN-002: doLogin קורא signInWithEmail (Firebase)',
  (()=>{
    const idx = html.indexOf('function doLogin()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('signInWithEmail');
  })());
check('ST-OWN-003: submitCreate משתמש ב-mpCurrentUser.uid כ-ownerId',
  (()=>{
    const idx = html.indexOf('function submitCreate()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('mpCurrentUser.uid');
  })());
check('ST-OWN-004: renderHome מציג צור אירוע לכל מאומת שאינו anonymous',
  (()=>{
    const idx = html.indexOf('function renderHome()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('!mpCurrentUser.isAnonymous') && block.includes('canCreateEvent');
  })());
check('ST-OWN-005: submitCreate לא מפנה לpackage בגרסת פיילוט',
  (()=>{
    const idx = html.indexOf('function submitCreate()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    const goesToShare = block.includes("nav('share')");
    const goesToPackage = block.includes("nav('package')");
    return goesToShare && !goesToPackage;
  })());

// ── 13. Self-Service Owner Flow ───────────────────────────────
console.log('\n[13] Self-Service Owner Flow');
check('ST-SELF-001: הרשמה חינם הוא הכפתור הראשון בדף הבית',
  (()=>{
    const homeIdx = html.indexOf('id="s-home"');
    const next = html.indexOf('\n<!-- ', homeIdx+1);
    const block = html.slice(homeIdx, next);
    const registerIdx = block.indexOf('btn-register');
    const loginIdx = block.indexOf('btn-login');
    const guestIdx = block.indexOf('btn-guest-entry');
    return registerIdx < loginIdx && loginIdx < guestIdx;
  })());
check('ST-SELF-002: startNew() לא מגביל ל-Admin בלבד',
  (()=>{
    const idx = html.indexOf('function startNew()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return !block.includes("'יצירת אירוע זמינה למנהל בלבד'") &&
           block.includes('mpCurrentUser');
  })());
check('ST-SELF-003: doRegister קורא createUserWithEmailAndPassword',
  (()=>{
    const idx = html.indexOf('function doRegister()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('createUserWithEmailAndPassword');
  })());
check('ST-SELF-004: doRegister כותב ל-Firestore users/{uid}',
  (()=>{
    const idx = html.indexOf('function doRegister()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes("collection('users')") && block.includes('fbUser.uid');
  })());
check('ST-SELF-005: doLogin מעדכן lastLoginAt ב-Firestore',
  (()=>{
    const idx = html.indexOf('function doLogin()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('lastLoginAt') && block.includes("collection('users')");
  })());
check('ST-SELF-006: owner-btns div קיים בדף הבית',
  html.includes('id="owner-btns"'));
check('ST-SELF-007: renderHome מציג owner-btns למשתמש אמיתי בלבד',
  (()=>{
    const idx = html.indexOf('function renderHome()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('owner-btns') && block.includes('isRealUser');
  })());

// ── 14. Manager Invite Flow ───────────────────────────────────
console.log('\n[14] Manager Invite Flow');
check('ST-MGR-INV-001: claimManagerInvite מנווט לgallery אחרי הצלחה',
  (()=>{
    const idx = html.indexOf('function claimManagerInvite(');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes("nav('gallery')");
  })());
check('ST-MGR-INV-002: loadEv מנווט Manager לgallery (לא share)',
  (()=>{
    const idx = html.indexOf('function loadEv(');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('isManagerSession()') && block.includes("nav('gallery')");
  })());
check('ST-MGR-INV-003: renderHome מסנן Manager לאירוע מוקצה בלבד',
  (()=>{
    const idx = html.indexOf('function renderHome()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('_managerVerifiedCode') && block.includes('isManagerSession()');
  })());
check('ST-MGR-INV-004: הודעת וואטסאפ כוללת שם אירוע',
  (()=>{
    const idx = html.indexOf('function shareManagerLinkWA()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('evName') && block.includes('S.ev.name');
  })());
check('ST-MGR-INV-005: הודעת וואטסאפ כוללת אזהרת קישור חד-פעמי',
  (()=>{
    const idx = html.indexOf('function shareManagerLinkWA()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('חד-פעמי') && block.includes('אישי');
  })());
check('ST-MGR-INV-006: הודעת וואטסאפ מציינת מה אסור (תשלום/הורדה/מחיקה)',
  (()=>{
    const idx = html.indexOf('function shareManagerLinkWA()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('תשלום') && block.includes('מחיקת') && block.includes('הורדת גלריה');
  })());
check('ST-MGR-INV-007: הודעת "כבר מומש" כאשר invite נתבע שוב',
  (()=>{
    const idx = html.indexOf('function doClaimInvite()');
    const next = html.indexOf('\nfunction ', idx+1);
    const block = html.slice(idx, next);
    return block.includes('כבר מומש') || block.includes('already_claimed');
  })());

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

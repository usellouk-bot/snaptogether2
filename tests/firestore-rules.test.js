/**
 * MomenPix — Firebase Security Rules Tests
 * Requires Firebase Emulator running on localhost:8080
 *
 * Local:  firebase emulators:start --only firestore --project test
 *         npx jest tests/firestore-rules.test.js
 *
 * CI:     See .github/workflows/test.yml — emulator starts before jest
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const PROJECT_ID  = 'momenpix-rules-test';
const RULES_PATH  = resolve(__dirname, '../firestore.rules');
const OWNER_UID   = 'owner-uid-123';
const OTHER_UID   = 'other-uid-456';
const ANON_UID    = 'anon-uid-789';
const GUEST_UID   = 'guest-uid-abc';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection('events').doc('STTEST1').set({
      code: 'STTEST1', paid: true, deleted: false,
      ownerId: OWNER_UID, date: '2026-06-14',
      startTime: '10:00', endTime: '23:00',
    });
  });
});

// helpers
const anon  = () => testEnv.authenticatedContext(ANON_UID,  { firebase: { sign_in_provider: 'anonymous' } });
const owner = () => testEnv.authenticatedContext(OWNER_UID, { firebase: { sign_in_provider: 'password'  } });
const other = () => testEnv.authenticatedContext(OTHER_UID, { firebase: { sign_in_provider: 'password'  } });
const guest = () => testEnv.authenticatedContext(GUEST_UID, { firebase: { sign_in_provider: 'anonymous' } });
const unauth = () => testEnv.unauthenticatedContext();
const ev = (db) => db.firestore().collection('events').doc('STTEST1');
const photo = (db, id='p1') => db.firestore().collection('events').doc('STTEST1').collection('photos').doc(id);

// ── Events Read ────────────────────────────────────────────────
describe('Events — Read', () => {
  test('✅ authenticated user reads event', () => assertSucceeds(ev(owner()).get()));
  test('✅ anonymous reads event (enterEvent needs this)', () => assertSucceeds(ev(anon()).get()));
  test('❌ unauthenticated cannot read', () => assertFails(ev(unauth()).get()));
});

// ── Events Create ──────────────────────────────────────────────
describe('Events — Create', () => {
  const newEv = (uid) => ({ code:'STNEW', paid:true, deleted:false, ownerId:uid });

  test('✅ non-anonymous owner creates with matching ownerId',
    () => assertSucceeds(owner().firestore().collection('events').doc('STNEW').set(newEv(OWNER_UID))));

  test('❌ anonymous cannot create event',
    () => assertFails(anon().firestore().collection('events').doc('STNEW').set(newEv(ANON_UID))));

  test('❌ wrong ownerId rejected',
    () => assertFails(other().firestore().collection('events').doc('STNEW').set(newEv(OWNER_UID))));
});

// ── Events Update ──────────────────────────────────────────────
describe('Events — Update', () => {
  test('✅ owner updates own event (paid unchanged)',
    () => assertSucceeds(ev(owner()).update({ name: 'New Name', paid: true })));

  test('❌ client cannot change paid to false',
    () => assertFails(ev(owner()).update({ paid: false })));

  test('❌ non-owner cannot update',
    () => assertFails(ev(other()).update({ name: 'Hacked' })));
});

// ── Photos Create ──────────────────────────────────────────────
describe('Photos — Create', () => {
  test('✅ anonymous guest creates photo with matching uploaderUid', () =>
    assertSucceeds(photo(guest()).set({ uploaderUid: GUEST_UID, url: 'https://x.com/p.jpg', capturedAt: new Date().toISOString() })));

  test('❌ guest cannot spoof uploaderUid', () =>
    assertFails(photo(guest(), 'p2').set({ uploaderUid: OWNER_UID, url: 'https://x.com/p.jpg' })));
});

// ── Photos Delete ──────────────────────────────────────────────
describe('Photos — Delete', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('events').doc('STTEST1')
        .collection('photos').doc('seed-photo')
        .set({ uploaderUid: GUEST_UID, url: 'https://x.com/p.jpg' });
    });
  });

  test('✅ event owner can delete photo',
    () => assertSucceeds(owner().firestore().collection('events').doc('STTEST1').collection('photos').doc('seed-photo').delete()));

  test('❌ anonymous guest cannot delete photo',
    () => assertFails(guest().firestore().collection('events').doc('STTEST1').collection('photos').doc('seed-photo').delete()));
});

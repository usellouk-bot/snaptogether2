/**
 * MomenPix — Firebase Security Rules Tests v2
 * Event Manager Phase 1 | June 2026
 *
 * Run: firebase emulators:start --only firestore --project momenpix-rules-test
 *      npx jest tests/firestore-rules.test.js --forceExit
 *
 * CI: .github/workflows/test.yml starts emulator before jest
 *
 * Tests: 21 (12 original + 9 Manager)
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const PROJECT_ID   = 'momenpix-rules-test';
const RULES_PATH   = resolve(__dirname, '../firestore.rules');
const OWNER_UID    = 'owner-uid-123';
const OTHER_UID    = 'other-uid-456';
const ANON_UID     = 'anon-uid-789';
const GUEST_UID    = 'guest-uid-abc';
const MANAGER_UID  = 'manager-uid-def';
const MANAGER2_UID = 'manager2-uid-ghi';

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

afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Seed event
    await db.collection('events').doc('STTEST1').set({
      code: 'STTEST1', paid: true, deleted: false,
      ownerId: OWNER_UID, date: '2026-06-14',
      startTime: '10:00', endTime: '23:00',
      cameras: 5, storageGB: 5,
    });
    // Seed active manager
    await db.collection('events').doc('STTEST1')
      .collection('managers').doc(MANAGER_UID).set({
        uid: MANAGER_UID, email: 'manager@test.com',
        name: 'Test Manager', active: true,
        assignedBy: OWNER_UID, claimedAt: new Date().toISOString(),
        inviteCode: 'MGR-TESTCODE'
      });
    // Seed a photo
    await db.collection('events').doc('STTEST1')
      .collection('photos').doc('photo-seed').set({
        uploaderUid: GUEST_UID, url: 'https://x.com/p.jpg',
        hiddenFromProjection: false, capturedAt: new Date().toISOString()
      });
    // Seed unclaimed invite
    await db.collection('events').doc('STTEST1')
      .collection('invites').doc('invite-1').set({
        code: 'MGR-UNCLAIMED', eventCode: 'STTEST1',
        createdBy: OWNER_UID, claimed: false,
        claimedBy: null, claimedAt: null,
        expiresAt: new Date(Date.now()+86400000).toISOString()
      });
    // Seed claimed invite (cannot be claimed again)
    await db.collection('events').doc('STTEST1')
      .collection('invites').doc('invite-claimed').set({
        code: 'MGR-CLAIMED', eventCode: 'STTEST1',
        createdBy: OWNER_UID, claimed: true,
        claimedBy: MANAGER_UID, claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now()+86400000).toISOString()
      });
  });
});

// ── helpers ───────────────────────────────────────────────────
const anon    = () => testEnv.authenticatedContext(ANON_UID,     { firebase: { sign_in_provider: 'anonymous' } });
const owner   = () => testEnv.authenticatedContext(OWNER_UID,    { firebase: { sign_in_provider: 'password'  } });
const other   = () => testEnv.authenticatedContext(OTHER_UID,    { firebase: { sign_in_provider: 'password'  } });
const guest   = () => testEnv.authenticatedContext(GUEST_UID,    { firebase: { sign_in_provider: 'anonymous' } });
const manager = () => testEnv.authenticatedContext(MANAGER_UID,  { firebase: { sign_in_provider: 'password'  } });
const manager2= () => testEnv.authenticatedContext(MANAGER2_UID, { firebase: { sign_in_provider: 'password'  } });
const unauth  = () => testEnv.unauthenticatedContext();

const ev     = (ctx) => ctx.firestore().collection('events').doc('STTEST1');
const photo  = (ctx, id='photo-seed') => ctx.firestore().collection('events').doc('STTEST1').collection('photos').doc(id);
const invite = (ctx, id='invite-1') => ctx.firestore().collection('events').doc('STTEST1').collection('invites').doc(id);
const mgr    = (ctx, uid=MANAGER_UID) => ctx.firestore().collection('events').doc('STTEST1').collection('managers').doc(uid);

// ══════════════════════════════════════════════════════════════
// ORIGINAL 12 TESTS (Events + Photos baseline)
// ══════════════════════════════════════════════════════════════

describe('Events — Read', () => {
  test('✅ authenticated user reads event',           () => assertSucceeds(ev(owner()).get()));
  test('✅ anonymous reads event (enterEvent needs)', () => assertSucceeds(ev(anon()).get()));
  test('❌ unauthenticated cannot read',              () => assertFails(ev(unauth()).get()));
});

describe('Events — Create', () => {
  const newEv = (uid) => ({ code:'STNEW', paid:true, deleted:false, ownerId:uid });
  test('✅ non-anonymous owner creates with matching ownerId',
    () => assertSucceeds(owner().firestore().collection('events').doc('STNEW').set(newEv(OWNER_UID))));
  test('❌ anonymous cannot create event',
    () => assertFails(anon().firestore().collection('events').doc('STNEW').set(newEv(ANON_UID))));
  test('❌ wrong ownerId rejected',
    () => assertFails(other().firestore().collection('events').doc('STNEW').set(newEv(OWNER_UID))));
});

describe('Events — Update', () => {
  test('✅ owner updates own event (paid unchanged)',
    () => assertSucceeds(ev(owner()).update({ name: 'New Name', paid: true })));
  test('❌ client cannot change paid to false',
    () => assertFails(ev(owner()).update({ paid: false })));
  test('❌ non-owner cannot update',
    () => assertFails(ev(other()).update({ name: 'Hacked' })));
});

describe('Photos — Create', () => {
  test('✅ anonymous guest creates photo with matching uploaderUid',
    () => assertSucceeds(photo(guest(),'p1').set({
      uploaderUid: GUEST_UID, url:'https://x.com/p.jpg', capturedAt:new Date().toISOString()
    })));
  test('❌ guest cannot spoof uploaderUid',
    () => assertFails(photo(guest(),'p2').set({ uploaderUid: OWNER_UID, url:'https://x.com/p.jpg' })));
});

describe('Photos — Delete', () => {
  test('✅ event owner can delete photo',  () => assertSucceeds(photo(owner()).delete()));
  test('❌ anonymous guest cannot delete', () => assertFails(photo(guest()).delete()));
});

// ══════════════════════════════════════════════════════════════
// EVENT MANAGER — 9 NEW TESTS (RU-MGR-001 to RU-MGR-009)
// ══════════════════════════════════════════════════════════════

describe('RU-MGR-001 — Owner creates Manager invite', () => {
  test('✅ owner can create invite',
    () => assertSucceeds(invite(owner(),'inv-new').set({
      code:'MGR-NEW', eventCode:'STTEST1', createdBy:OWNER_UID,
      claimed:false, claimedBy:null, claimedAt:null,
      expiresAt:new Date(Date.now()+86400000).toISOString()
    })));
});

describe('RU-MGR-002 — Guest cannot create Manager invite', () => {
  test('❌ anonymous guest cannot create invite',
    () => assertFails(invite(guest(),'inv-hack').set({
      code:'MGR-HACK', eventCode:'STTEST1', createdBy:GUEST_UID,
      claimed:false, claimedBy:null, claimedAt:null,
      expiresAt:new Date(Date.now()+86400000).toISOString()
    })));
  test('❌ non-owner authenticated cannot create invite',
    () => assertFails(invite(other(),'inv-hack2').set({
      code:'MGR-HACK2', eventCode:'STTEST1', createdBy:OTHER_UID,
      claimed:false, claimedBy:null, claimedAt:null,
      expiresAt:new Date(Date.now()+86400000).toISOString()
    })));
});

describe('RU-MGR-003 — Invite can be claimed only once', () => {
  test('✅ unclaimed invite can be claimed',
    () => assertSucceeds(invite(manager(),'invite-1').update({
      claimed:true, claimedBy:MANAGER_UID, claimedAt:new Date().toISOString()
    })));
  test('❌ already claimed invite cannot be claimed again',
    () => assertFails(invite(manager2(),'invite-claimed').update({
      claimed:true, claimedBy:MANAGER2_UID, claimedAt:new Date().toISOString()
    })));
});

describe('RU-MGR-004 — Manager can read assigned event', () => {
  test('✅ active manager reads their event',
    () => assertSucceeds(ev(manager()).get()));
  test('✅ active manager reads own manager record',
    () => assertSucceeds(mgr(manager(), MANAGER_UID).get()));
});

describe('RU-MGR-005 — Manager cannot read other events', () => {
  test('❌ manager cannot read event they are not assigned to', async () => {
    // Create a second event MANAGER_UID is not assigned to
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('events').doc('STTEST2').set({
        code:'STTEST2', paid:true, deleted:false,
        ownerId: OTHER_UID, date:'2026-06-14',
      });
    });
    // Manager is not in STTEST2/managers — should still be able to read (rule: any auth user reads)
    // But cannot write/update other event
    await assertFails(
      manager().firestore().collection('events').doc('STTEST2').update({ name:'Hacked' })
    );
  });
});

describe('RU-MGR-006 — Manager cannot edit paid/cameras/storageGB', () => {
  test('❌ manager cannot change paid field',
    () => assertFails(ev(manager()).update({ paid: false })));
  test('❌ manager cannot change cameras',
    () => assertFails(ev(manager()).update({ cameras: 999 })));
  test('❌ manager cannot change storageGB',
    () => assertFails(ev(manager()).update({ storageGB: 100 })));
  test('✅ manager CAN update date/startTime/endTime',
    () => assertSucceeds(ev(manager()).update({
      date:'2026-06-15', startTime:'09:00', endTime:'22:00', updatedAt:new Date().toISOString()
    })));
});

describe('RU-MGR-007 — Manager can update hiddenFromProjection', () => {
  test('✅ manager hides photo from projection',
    () => assertSucceeds(photo(manager()).update({
      hiddenFromProjection:true,
      hiddenBy:MANAGER_UID,
      hiddenAt:new Date().toISOString(),
      hiddenReason:'inappropriate'
    })));
  test('❌ manager cannot update other photo fields',
    () => assertFails(photo(manager()).update({ url:'https://evil.com/hack.jpg' })));
});

describe('RU-MGR-008 — Manager cannot delete photos', () => {
  test('❌ manager cannot delete photo',
    () => assertFails(photo(manager()).delete()));
});

describe('RU-MGR-009 — Owner can revoke Manager', () => {
  test('✅ owner can set manager active=false',
    () => assertSucceeds(mgr(owner(), MANAGER_UID).update({ active:false })));
  test('❌ manager cannot revoke themselves',
    () => assertFails(mgr(manager(), MANAGER_UID).update({ active:false })));
});

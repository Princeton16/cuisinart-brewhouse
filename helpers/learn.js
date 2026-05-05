/* helpers/learn.js — Coffee IQ XP, tiers, lesson + cert state.
   Loaded after data.js and app.js. Plain global functions. */

const BEAN_LESSONS_KEY = 'beanapp_lessons';
const BEAN_LESSONS_INPROGRESS_KEY = 'beanapp_lessons_in_progress';
const BEAN_CERTS_KEY = 'beanapp_certs';

/* ----- Storage ----- */
function loadCompletedLessons() {
  try { return JSON.parse(localStorage.getItem(BEAN_LESSONS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveCompletedLessons(arr) {
  localStorage.setItem(BEAN_LESSONS_KEY, JSON.stringify(arr || []));
}
function loadInProgressLessons() {
  try { return JSON.parse(localStorage.getItem(BEAN_LESSONS_INPROGRESS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveInProgressLessons(arr) {
  localStorage.setItem(BEAN_LESSONS_INPROGRESS_KEY, JSON.stringify(arr || []));
}
function loadEarnedCerts() {
  try { return JSON.parse(localStorage.getItem(BEAN_CERTS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveEarnedCerts(arr) {
  localStorage.setItem(BEAN_CERTS_KEY, JSON.stringify(arr || []));
}

/* ----- Lookup helpers ----- */
function _allLessons() {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA.beanTracks)) return [];
  return DATA.beanTracks.reduce((acc, t) => acc.concat(t.lessons || []), []);
}
function _findLesson(lessonId) {
  return _allLessons().find(l => l.id === lessonId) || null;
}
function _findTrackForLesson(lessonId) {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA.beanTracks)) return null;
  return DATA.beanTracks.find(t => (t.lessons || []).some(l => l.id === lessonId)) || null;
}

/* ----- XP + tier ----- */
function getXP() {
  const completed = loadCompletedLessons();
  const lessons = _allLessons();
  return completed.reduce((sum, id) => {
    const l = lessons.find(x => x.id === id);
    return sum + (l ? (l.xp || 0) : 0);
  }, 0);
}

function getTier() {
  const xp = getXP();
  const tiers = (typeof DATA !== 'undefined' && Array.isArray(DATA.beanTiers)) ? DATA.beanTiers : [];
  // Highest tier whose minXp <= xp
  let current = tiers[0] || { id: 'bean-curious', name: 'Bean Curious', minXp: 0 };
  for (let i = 0; i < tiers.length; i++) {
    if (xp >= tiers[i].minXp) current = tiers[i];
  }
  return current;
}

function getTierProgress() {
  const xp = getXP();
  const tiers = (typeof DATA !== 'undefined' && Array.isArray(DATA.beanTiers)) ? DATA.beanTiers : [];
  const current = getTier();
  const idx = tiers.findIndex(t => t.id === current.id);
  const next = (idx >= 0 && idx + 1 < tiers.length) ? tiers[idx + 1] : null;
  if (!next) {
    return { xp: xp, currentTier: current, nextTier: null, xpInTier: 0, xpForNextTier: 0, percent: 100 };
  }
  const xpInTier = xp - current.minXp;
  const xpForNextTier = next.minXp - current.minXp;
  const percent = Math.max(0, Math.min(100, Math.round((xpInTier / xpForNextTier) * 100)));
  return { xp: xp, currentTier: current, nextTier: next, xpInTier: xpInTier, xpForNextTier: xpForNextTier, percent: percent };
}

/* ----- Lesson state ----- */
function getLessonState(lessonId) {
  const completed = loadCompletedLessons();
  if (completed.indexOf(lessonId) !== -1) return 'completed';
  const inProgress = loadInProgressLessons();
  // Determine unlocked: first in track is always unlocked; others unlock when previous is completed
  const track = _findTrackForLesson(lessonId);
  if (!track) return 'locked';
  const lessons = track.lessons || [];
  const idx = lessons.findIndex(l => l.id === lessonId);
  if (idx === -1) return 'locked';
  if (idx === 0) {
    return inProgress.indexOf(lessonId) !== -1 ? 'in-progress' : 'unlocked';
  }
  const prevId = lessons[idx - 1].id;
  if (completed.indexOf(prevId) === -1) return 'locked';
  return inProgress.indexOf(lessonId) !== -1 ? 'in-progress' : 'unlocked';
}

function getTrackProgress(trackId) {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA.beanTracks)) return { completed: 0, total: 0, percent: 0 };
  const track = DATA.beanTracks.find(t => t.id === trackId);
  if (!track) return { completed: 0, total: 0, percent: 0 };
  const completed = loadCompletedLessons();
  const total = (track.lessons || []).length;
  const done = (track.lessons || []).filter(l => completed.indexOf(l.id) !== -1).length;
  return { completed: done, total: total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/* ----- Cert state ----- */
function getCertProgress(certId) {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA.beanCerts)) return { earned: false, completed: 0, required: 0, percent: 0, eligible: false, locked: true };
  const cert = DATA.beanCerts.find(c => c.id === certId);
  if (!cert) return { earned: false, completed: 0, required: 0, percent: 0, eligible: false, locked: true };
  const earned = loadEarnedCerts();
  const isEarned = earned.indexOf(certId) !== -1;

  const trackIds = cert.requiredTracks || [];
  const requiredLessons = (DATA.beanTracks || [])
    .filter(t => trackIds.indexOf(t.id) !== -1)
    .reduce((acc, t) => acc.concat(t.lessons || []), []);
  const completedSet = new Set(loadCompletedLessons());
  const doneLessons = requiredLessons.filter(l => completedSet.has(l.id)).length;
  const percent = requiredLessons.length ? Math.round((doneLessons / requiredLessons.length) * 100) : 0;

  // A prerequisite cert (e.g., Coffee Sommelier requires home-barista first)
  let prereqMet = true;
  if (cert.requiresCert) prereqMet = earned.indexOf(cert.requiresCert) !== -1;

  // Eligible to earn = all lessons done, prereq cert earned, and not yet earned
  const eligible = !isEarned && doneLessons === requiredLessons.length && prereqMet;
  // Locked = display the lock overlay (prereq not met yet)
  const locked = !prereqMet && !isEarned;

  return {
    earned: isEarned,
    completed: doneLessons,
    required: requiredLessons.length,
    percent: percent,
    eligible: eligible,
    locked: locked
  };
}

/* ----- Mutations ----- */
function markLessonInProgress(lessonId) {
  const completed = loadCompletedLessons();
  if (completed.indexOf(lessonId) !== -1) return; // already done
  const inProgress = loadInProgressLessons();
  if (inProgress.indexOf(lessonId) !== -1) return; // already in progress
  inProgress.push(lessonId);
  saveInProgressLessons(inProgress);
}

function markLessonComplete(lessonId) {
  const completed = loadCompletedLessons();
  if (completed.indexOf(lessonId) !== -1) return false; // no-op
  completed.push(lessonId);
  saveCompletedLessons(completed);
  // Remove from in-progress
  const inProgress = loadInProgressLessons().filter(id => id !== lessonId);
  saveInProgressLessons(inProgress);
  return true;
}

function earnCert(certId) {
  const earned = loadEarnedCerts();
  if (earned.indexOf(certId) !== -1) return false;
  earned.push(certId);
  saveEarnedCerts(earned);
  return true;
}

/* Demo seed — runs once when the demo user is created.
   Plants 3 completed lessons (160 XP → Bean Scholar tier) +
   3 in-progress lessons. Idempotent. */
const BEAN_LESSONS_DEMO_SEEDED_KEY = 'beanapp_lessons_demo_seeded';

function seedDemoLessonsIfNeeded() {
  if (localStorage.getItem(BEAN_LESSONS_DEMO_SEEDED_KEY)) return;
  if (localStorage.getItem(BEAN_LESSONS_KEY)) return; // user already has data
  saveCompletedLessons(['bean-1', 'bean-2', 'brew-1']);
  saveInProgressLessons(['bean-3', 'brew-2', 'craft-1']);
  saveEarnedCerts([]);
  localStorage.setItem(BEAN_LESSONS_DEMO_SEEDED_KEY, '1');
}

// Catch existing demo sessions that pre-date Phase 4: if user is demo
// and lesson data is missing, plant the seed at module load.
(function _autoSeedForDemo() {
  try {
    const raw = localStorage.getItem('beanapp_user');
    if (!raw) return;
    const u = JSON.parse(raw);
    if (u && u.isDemo) seedDemoLessonsIfNeeded();
  } catch (_) { /* ignore */ }
})();

/* helpers/passport.js — cafe visit storage + filtering for the Passport tab.
   Loaded after data.js, helpers/posts.js, and app.js. */

const BEAN_VISITS_KEY = 'beanapp_visits';
const BEAN_VISITS_DEMO_SEEDED_KEY = 'beanapp_visits_demo_seeded';

/* ----- Storage ----- */
function loadBeanVisits() {
  try { return JSON.parse(localStorage.getItem(BEAN_VISITS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveBeanVisits(arr) {
  localStorage.setItem(BEAN_VISITS_KEY, JSON.stringify(arr || []));
}

/* All cafes from DATA, defensively. */
function _allCafes() {
  return (typeof DATA !== 'undefined' && Array.isArray(DATA.cafes)) ? DATA.cafes : [];
}

/* Find cafe by id. */
function getCafeById(cafeId) {
  return _allCafes().find(c => c.id === cafeId) || null;
}

/* ----- Visit lookup helpers ----- */
function getVisitedCafes() {
  const visits = loadBeanVisits();
  const visitedIds = new Set(visits.map(v => v.cafeId));
  return _allCafes().filter(c => visitedIds.has(c.id));
}

function getVisitForCafe(cafeId) {
  return loadBeanVisits().find(v => v.cafeId === cafeId) || null;
}

function isVisited(cafeId) {
  return loadBeanVisits().some(v => v.cafeId === cafeId);
}

function isTopMatch(cafe) {
  return !!(cafe && cafe.topMatch);
}

function isFriendsPick(cafe) {
  if (!cafe) return false;
  const posts = (typeof loadBeanPosts === 'function') ? loadBeanPosts() : [];
  return posts.some(p => p.type === 'shop' && p.shop && p.shop.name === cafe.name);
}

/* ----- Mark / update / remove visit ----- */
function markVisited(cafeId, rating, notes) {
  const visits = loadBeanVisits();
  const existing = visits.find(v => v.cafeId === cafeId);
  if (existing) {
    if (typeof rating !== 'undefined') existing.rating = rating;
    if (typeof notes !== 'undefined') existing.notes = notes;
  } else {
    visits.push({
      cafeId: cafeId,
      dateISO: new Date().toISOString(),
      rating: rating || null,
      notes: notes || ''
    });
  }
  saveBeanVisits(visits);
  return existing || visits[visits.length - 1];
}

function removeVisit(cafeId) {
  const visits = loadBeanVisits().filter(v => v.cafeId !== cafeId);
  saveBeanVisits(visits);
}

/* ----- Stats for header tiles ----- */
function getCafeStats() {
  const visits = loadBeanVisits();
  const cafes = _allCafes();
  const visitedIds = new Set(visits.map(v => v.cafeId));
  const visitedCafes = cafes.filter(c => visitedIds.has(c.id));
  const cities = new Set(visitedCafes.map(c => (c.city || '').toLowerCase()).filter(Boolean));
  const ratings = visits.map(v => v.rating).filter(r => typeof r === 'number' && r > 0);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;
  return {
    visited: visits.length,
    cities: cities.size,
    avgRating: avg
  };
}

/* ----- Filter + search ----- */
function getFilteredCafes(filterId, searchQuery) {
  let out = _allCafes().slice();
  const visited = new Set(loadBeanVisits().map(v => v.cafeId));

  if (filterId === 'visited') out = out.filter(c => visited.has(c.id));
  else if (filterId === 'not-visited') out = out.filter(c => !visited.has(c.id));
  else if (filterId === 'top-matches') out = out.filter(c => !!c.topMatch);
  else if (filterId === 'friends-picks') out = out.filter(c => isFriendsPick(c));
  // 'all' (or anything else) keeps everything

  if (searchQuery && String(searchQuery).trim()) {
    const q = String(searchQuery).trim().toLowerCase();
    out = out.filter(c => {
      const haystack = [
        c.name || '',
        c.city || '',
        c.state || '',
        (c.drinks || []).join(' ')
      ].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }
  return out;
}

/* ----- Demo seed ----- */
function seedDemoVisitsIfNeeded() {
  if (localStorage.getItem(BEAN_VISITS_DEMO_SEEDED_KEY)) return;
  if (loadBeanVisits().length > 0) return;
  const now = Date.now();
  const DAY = 86400000;
  const seed = [
    { cafeId: 'dirt-cowboy', dateISO: new Date(now - 5 * DAY).toISOString(),  rating: 5, notes: 'Best pour-over in Hanover.' },
    { cafeId: 'the-works',   dateISO: new Date(now - 12 * DAY).toISOString(), rating: 4, notes: '' },
    { cafeId: 'stumptown',   dateISO: new Date(now - 30 * DAY).toISOString(), rating: 5, notes: 'First time in Portland. The Hair Bender lived up.' }
  ];
  saveBeanVisits(seed);
  localStorage.setItem(BEAN_VISITS_DEMO_SEEDED_KEY, '1');
}

// Catch existing demo sessions that pre-date Phase 5: if user is demo
// and visits are missing, plant the seed at module load.
(function _autoSeedVisitsForDemo() {
  try {
    const raw = localStorage.getItem('beanapp_user');
    if (!raw) return;
    const u = JSON.parse(raw);
    if (u && u.isDemo) seedDemoVisitsIfNeeded();
  } catch (_) { /* ignore */ }
})();

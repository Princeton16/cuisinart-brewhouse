/* ============================================================
   Brew Lab — App logic
   - State + localStorage
   - Hash-based router
   - View renderers for the app shell
   ============================================================ */

const STORE_KEY = 'brewlab.v1';

const state = {
  user: null,         // { name, email, joined, isGuest }
  profile: null,      // { machine, experience, roast, flavors[], milk, goals[] }
  journal: [],        // [{ date, time, recipe, bean, method, rating, notes, flavors[] }]
  badges: [],         // [badgeId]
  favorites: [],      // [recipeId]
  points: 0,
  joinedChallenges: [],
  completedClasses: [], // [classId]
  lattVotes: {},      // { pourId: true }
  ownedProducts: [],  // [productId]
  following: ['catherine', 'aleks', 'andrew', 'zach', 'dan'], // FYP team seed
  streak: 0,          // current daily streak
  lastCheckIn: null,  // YYYY-MM-DD of last check-in
  todayQuestId: null, // id of today's quest
  todayQuestDone: false,
  freezesAvailable: 1,
  isMember: true,
  communityPosts: [], // [{ id, text, kind, icon, verb, when, timestamp }]
  giveawayEntries: [], // [giveawayId]
  phase2Waitlist: [], // [email] (also persisted server-side)
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { console.warn('Could not load state', e); }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

/* ---------------- Helpers ---------------- */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), attrs[k]);
    else node.setAttribute(k, attrs[k]);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') {
      node.appendChild(document.createTextNode(String(c)));
    } else {
      node.appendChild(c);
    }
  }
  return node;
}

function initials(name) {
  if (!name) return '☕';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || '☕';
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast' });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

function fmtDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(t) { return t || ''; }
function pluralize(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

// Extract YouTube video id from a typical youtube.com/watch?v=... or youtu.be/... URL
function ytIdFromUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getMachine() {
  if (!state.profile?.machine) return null;
  return DATA.machines.find(m => m.id === state.profile.machine);
}

function getRecipe(id) { return DATA.recipes.find(r => r.id === id); }
function getBean(id) { return DATA.beans.find(b => b.id === id); }
function getOrigin(id) { return DATA.origins.find(o => o.id === id); }

/* ---------------- Daily streak / quest helpers ---------------- */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { return new Date(Date.now() - 86400000).toISOString().slice(0, 10); }

function ensureDailyState() {
  const today = todayStr();
  // Pick today's quest if not set or stale
  if (!state.todayQuestId || state.todayQuestDate !== today) {
    const idx = (new Date().getDate()) % DATA.dailyQuests.length;
    state.todayQuestId = DATA.dailyQuests[idx].id;
    state.todayQuestDate = today;
    state.todayQuestDone = false;
  }
  // Reset streak if a day was missed (no check-in yesterday or today)
  if (state.lastCheckIn && state.lastCheckIn !== today && state.lastCheckIn !== yesterdayStr()) {
    if (state.freezesAvailable > 0) {
      state.freezesAvailable -= 1;
      state.lastCheckIn = yesterdayStr();
    } else {
      state.streak = 0;
    }
  }
  save();
}
function getTodayQuest() {
  return DATA.dailyQuests.find(q => q.id === state.todayQuestId) || DATA.dailyQuests[0];
}
function checkIn() {
  const today = todayStr();
  if (state.lastCheckIn === today) {
    toast('Already checked in today');
    return;
  }
  if (state.lastCheckIn === yesterdayStr() || !state.lastCheckIn) {
    state.streak = (state.lastCheckIn === yesterdayStr() ? state.streak : 0) + 1;
  } else {
    state.streak = 1;
  }
  state.lastCheckIn = today;
  state.points += 10;
  save();
  toast('Checked in. ' + state.streak + ' day streak. +10 pts');
  render();
}
function completeTodayQuest() {
  if (state.todayQuestDone) {
    toast('Already completed today');
    return;
  }
  const q = getTodayQuest();
  state.todayQuestDone = true;
  state.points += q.reward;
  save();
  toast('Quest completed. +' + q.reward + ' pts');
  render();
}

/* ---------------- Grind Score (multi-dimensional) ---------------- */
/* Brew, IQ, Community, Palate — each 0-100 driven by user activity. */
function grindScore() {
  const dims = grindDims();
  const total = state.points + dims.brew + dims.iq + dims.community + dims.palate;
  return Math.round(total);
}

function grindDims() {
  const completed = state.completedClasses || [];
  // Brew: weighted by brews logged + practical classes (latte art, pour over, milk steaming)
  const practicalClasses = ['latte-art-101', 'latte-art-201', 'pour-over-mastery', 'milk-steaming'];
  const brew = Math.min(100, state.journal.length * 3 + practicalClasses.filter(c => completed.includes(c)).length * 12);

  // IQ: weighted by theory classes (espresso fundamentals, cupping)
  const theoryClasses = ['espresso-fundamentals', 'cupping'];
  const iq = Math.min(100, theoryClasses.filter(c => completed.includes(c)).length * 30 + (state.completedClasses || []).length * 6);

  // Community: friends + posts + votes
  const wallPosts = (state.wallPosts || []).length;
  const lattVotes = Object.keys(state.lattVotes || {}).length;
  const community = Math.min(100, (state.following || []).length * 8 + wallPosts * 12 + lattVotes * 3);

  // Palate: origins tried + ratings given
  const origins = uniqueOriginsTried();
  const ratedBrews = state.journal.filter(e => e.rating).length;
  const palate = Math.min(100, origins * 12 + ratedBrews * 2);

  return { brew, iq, community, palate };
}

function grindSubTier(score) {
  if (score >= 80) return 'Master';
  if (score >= 60) return 'Adept';
  if (score >= 40) return 'Practitioner';
  if (score >= 20) return 'Apprentice';
  return 'Curious';
}

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

/* ---------------- Brew personality helper ---------------- */
function brewPersonality() {
  const p = state.profile || {};
  const exp = p.experience;
  const milk = p.milk;
  const flavors = p.flavors || [];
  const goals = p.goals || [];

  if (exp === 'nerd') return DATA.brewPersonalities.find(x => x.id === 'methodical');
  if (goals.includes('discover') || goals.includes('learn')) return DATA.brewPersonalities.find(x => x.id === 'explorer');
  if (milk === 'sweet' || goals.includes('art')) return DATA.brewPersonalities.find(x => x.id === 'creator');
  if (milk === 'black' && flavors.includes('floral')) return DATA.brewPersonalities.find(x => x.id === 'purist');
  if (goals.includes('community')) return DATA.brewPersonalities.find(x => x.id === 'social');
  return DATA.brewPersonalities.find(x => x.id === 'comfort');
}

/* ---------------- Sommelier Tier helpers ---------------- */
function uniqueOriginsTried() {
  const set = new Set();
  state.journal.forEach(e => {
    const bean = getBean(e.bean);
    if (bean && bean.originRef) set.add(bean.originRef);
  });
  return set.size;
}

function checkRequirement(req) {
  const completed = state.completedClasses || [];
  switch (req.type) {
    case 'profile': return !!state.profile;
    case 'class': return completed.includes(req.value);
    case 'journal': return state.journal.length >= req.value;
    case 'streak': return computeStreak(state.journal) >= req.value;
    case 'origins': return uniqueOriginsTried() >= req.value;
    case 'allClasses': return DATA.classes.every(c => completed.includes(c.id));
    default: return false;
  }
}

function tierComplete(tier) {
  return tier.requirements.every(checkRequirement);
}

function computeTier() {
  // Walk down from highest tier; first one whose requirements are all met is the user's current tier
  for (let i = DATA.sommelierTiers.length - 1; i >= 0; i--) {
    if (tierComplete(DATA.sommelierTiers[i])) return DATA.sommelierTiers[i];
  }
  return DATA.sommelierTiers[0];
}

function nextTier() {
  const current = computeTier();
  const idx = DATA.sommelierTiers.findIndex(t => t.id === current.id);
  return DATA.sommelierTiers[idx + 1] || null;
}

function tierProgress(tier) {
  const total = tier.requirements.length;
  const met = tier.requirements.filter(checkRequirement).length;
  return { met, total, pct: total ? Math.round((met / total) * 100) : 0 };
}

/* ---------------- Recommendation engine ---------------- */
function recommendRecipes(limit = 4) {
  const p = state.profile;
  const machine = getMachine();
  const all = DATA.recipes.slice();

  // score each recipe
  const scored = all.map(r => {
    let score = 0;
    if (machine && r.machineCompat.includes(machine.id)) score += 10;
    if (p?.milk === 'latte' && r.method === 'Espresso') score += 5;
    if (p?.milk === 'sweet' && r.tags.includes('sweet')) score += 5;
    if (p?.milk === 'black' && (r.method === 'Drip' || r.method === 'Pour over')) score += 4;
    if (p?.experience === 'beginner' && r.difficulty === 'Easy') score += 3;
    if (p?.experience === 'nerd' && r.difficulty === 'Hard') score += 3;
    if (p?.flavors?.includes('chocolate') && r.tags.includes('balanced')) score += 2;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.r);
}

function recommendBeans(limit = 3) {
  const p = state.profile;
  const all = DATA.beans.slice();
  const scored = all.map(b => {
    let score = 0;
    if (p?.flavors) {
      if (p.flavors.includes('chocolate') && b.tags.includes('chocolatey')) score += 5;
      if (p.flavors.includes('chocolate') && b.tags.includes('balanced')) score += 3;
      if (p.flavors.includes('fruity') && b.tags.includes('fruity')) score += 5;
      if (p.flavors.includes('floral') && b.tags.includes('tea-like')) score += 4;
      if (p.flavors.includes('nutty') && b.tags.includes('classic')) score += 3;
    }
    if (p?.roast === 'light' && b.roast === 'Light') score += 5;
    if (p?.roast === 'medium' && b.roast === 'Medium') score += 4;
    if (p?.roast === 'medium-dark' && b.roast === 'Medium-dark') score += 5;
    return { b, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.b);
}

function topRecipe() {
  return recommendRecipes(1)[0] || DATA.recipes[0];
}

/* ---------------- Auth ---------------- */
async function signOut() {
  try {
    await DB.signOut();
  } catch (e) {
    console.warn('Sign out error', e);
  }
  state.user = null;
  state.profile = null;
  state.journal = [];
  state.badges = [];
  state.favorites = [];
  state.points = 0;
  state.joinedChallenges = [];
  state.following = [];
  state.completedClasses = [];
  state.ownedProducts = [];
  localStorage.removeItem(STORE_KEY);
  window.location.href = 'index.html';
}

/* ---------------- Router ---------------- */
const ROUTES = {
  '': renderHome,
  'home': renderHome,
  'brew': renderBrew,
  'discover': renderHome,
  'learn': renderLearn,
  'devices': renderDevices,
  'you': renderYou,

  // Sub-routes (deeper detail pages)
  'recipes': renderRecipes,
  'recipe': renderRecipeDetail,
  'journal': renderJournal,
  'beans': renderBeans,
  'origins': renderOrigins,
  'origin': renderOriginDetail,
  'products': renderProducts,
  'product': renderProductDetail,
  'community': renderCommunity,
  'machine': renderMachine,
  'barista': renderBarista,
  'drops': renderDrops,
  'classes': renderClasses,
  'class': renderClassDetail,
  'latte-art': renderLatteArt,
  'wall': renderWall,
  'sommelier': renderSommelier,
  'passport': renderPassport,
  'profile': renderYou,
  'onboard': renderOnboarding
};

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [route, ...rest] = hash.split('/');
  return { route: route || '', param: rest.join('/') };
}

function navigate(path) {
  window.location.hash = '#/' + path.replace(/^\//, '');
}

function render() {
  const { route, param } = parseRoute();
  const fn = ROUTES[route] || renderHome;

  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = '';
  main.classList.add('fade-in');
  setTimeout(() => main.classList.remove('fade-in'), 400);

  // Update active nav state. Tabs may map to multiple routes (e.g.
  // Recipes covers both 'recipes' and 'recipe'; Profile covers 'you' too).
  document.querySelectorAll('.bl-nav-link').forEach(l => {
    const to = l.getAttribute('data-route');
    let isActive;
    if (to === 'home') isActive = (route === '' || route === 'home');
    else if (to === 'recipes') isActive = (route === 'recipes' || route === 'recipe');
    else if (to === 'devices') isActive = (route === 'devices');
    else if (to === 'profile') isActive = (route === 'profile' || route === 'you');
    else isActive = (to === route);
    l.classList.toggle('active', isActive);
  });

  fn(main, param);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', render);

/* ============================================================
   APP SHELL: header + nav
   ============================================================ */

function mountAppShell() {
  const tabs = [
    { route: 'home',      label: 'Home',      href: '#/home' },
    { route: 'recipes',   label: 'Recipes',   href: '#/recipes' },
    { route: 'learn',     label: 'Learn',     href: '#/learn' },
    { route: 'community', label: 'Community', href: '#/community' },
    { route: 'devices',   label: 'Products',  href: '#/devices' },
    { route: 'profile',   label: 'Profile',   href: '#/profile' }
  ];

  const header = el('header', { class: 'bl-header' },
    el('div', { class: 'bl-header-inner' },
      el('a', { href: '#/home', class: 'bl-brand' },
        el('span', { class: 'bl-brand-mark' }, '◐'),
        el('span', { class: 'bl-brand-text' },
          el('span', { class: 'bl-brand-name' }, 'Brew Lab'),
          el('span', { class: 'bl-brand-tag' }, 'by Cuisinart')
        )
      ),
      el('nav', { class: 'bl-nav' },
        tabs.map(t => el('a',
          { href: t.href, class: 'bl-nav-link', 'data-route': t.route },
          t.label
        ))
      ),
      el('div', { class: 'bl-header-actions' },
        el('button', { class: 'bl-log-brew', onclick: openBrewLogModal },
          el('span', { class: 'bl-log-brew-plus' }, '+'),
          el('span', {}, 'Log brew')
        ),
        // Show Sign in button for guests, avatar (with sign-out menu) for signed-in users
        state.user?.isGuest || !state.user
          ? el('button', {
              class: 'btn btn-accent btn-sm',
              style: 'border-radius:999px;padding:8px 16px;font-size:0.85rem',
              onclick: () => openSignupModal({ mode: 'signin' })
            }, 'Sign in')
          : el('a', { href: '#/profile', class: 'bl-avatar', title: state.user?.name || 'You' },
              initials(state.user?.name)
            )
      )
    )
  );

  const main = el('main', { id: 'main', class: 'app-main' });
  document.body.appendChild(header);
  document.body.appendChild(main);

  // Floating Ask Barista button (always visible, bottom-right)
  const fab = el('button', {
    id: 'baristaFab',
    style: 'position:fixed;bottom:24px;right:24px;z-index:60;background:var(--espresso);color:var(--crema);width:auto;height:auto;padding:14px 20px;border-radius:999px;box-shadow:0 8px 24px rgba(31,20,16,0.2);display:flex;align-items:center;gap:10px;font-weight:600;font-size:0.92rem;cursor:pointer;transition:transform 0.15s, box-shadow 0.15s',
    onmouseover: (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(31,20,16,0.28)'; },
    onmouseout: (e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(31,20,16,0.2)'; },
    onclick: openBaristaWheel
  },
    el('span', { style: 'font-size:1.2rem' }, '☕'),
    el('span', {}, 'Ask Barista')
  );
  document.body.appendChild(fab);
}

/* ============================================================
   Log brew modal — quick capture, persisted to localStorage
   under 'brewlab.brewlog' (separate from the legacy journal).
   ============================================================ */
const BREWLOG_KEY = 'brews';
const BREW_METHODS = ['V60', 'Espresso', 'AeroPress', 'French press', 'Chemex', 'Cold brew', 'Moka pot'];
const BREW_GRINDS = ['Extra fine', 'Fine', 'Medium-fine', 'Medium', 'Medium-coarse', 'Coarse'];

function loadBrewLog() {
  try { return JSON.parse(localStorage.getItem(BREWLOG_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveBrewLog(entries) {
  localStorage.setItem(BREWLOG_KEY, JSON.stringify(entries));
}

function openBrewLogModal() {
  // Avoid double-mounting
  if (document.getElementById('bl-modal-backdrop')) return;

  let rating = 0;
  const ratingWrap = el('div', { class: 'bl-rating' });
  for (let i = 1; i <= 5; i++) {
    const star = el('button', {
      type: 'button',
      class: 'bl-star',
      'data-i': String(i),
      onclick: () => {
        rating = i;
        ratingWrap.querySelectorAll('.bl-star').forEach((s, idx) => {
          s.classList.toggle('filled', idx + 1 <= rating);
        });
      }
    }, '★');
    ratingWrap.appendChild(star);
  }

  const form = el('form', { class: 'bl-modal-form', onsubmit: (e) => { e.preventDefault(); submit(); } },
    el('label', { class: 'bl-field' },
      el('span', { class: 'bl-field-label' }, 'Bean'),
      el('input', { type: 'text', name: 'bean', class: 'bl-input', placeholder: 'e.g. Counter Culture Apollo', required: '' })
    ),
    el('div', { class: 'bl-field-row' },
      el('label', { class: 'bl-field' },
        el('span', { class: 'bl-field-label' }, 'Method'),
        el('select', { name: 'method', class: 'bl-input' },
          BREW_METHODS.map(m => el('option', { value: m }, m))
        )
      ),
      el('label', { class: 'bl-field' },
        el('span', { class: 'bl-field-label' }, 'Grind'),
        el('select', { name: 'grind', class: 'bl-input' },
          BREW_GRINDS.map(g => el('option', { value: g }, g))
        )
      )
    ),
    el('label', { class: 'bl-field' },
      el('span', { class: 'bl-field-label' }, 'Ratio'),
      el('input', { type: 'text', name: 'ratio', class: 'bl-input', placeholder: '1:16' })
    ),
    el('div', { class: 'bl-field' },
      el('span', { class: 'bl-field-label' }, 'Rating'),
      ratingWrap
    ),
    el('label', { class: 'bl-field' },
      el('span', { class: 'bl-field-label' }, 'Notes'),
      el('textarea', { name: 'notes', class: 'bl-input bl-textarea', rows: '3', placeholder: 'Tasting notes, what worked, what to try next…' })
    ),
    el('div', { class: 'bl-modal-actions' },
      el('button', { type: 'button', class: 'bl-btn-ghost', onclick: close }, 'Cancel'),
      el('button', { type: 'submit', class: 'bl-btn-primary' }, 'Save brew')
    )
  );

  const existingCount = loadBrewLog().length;
  const countLabel = existingCount === 0
    ? 'Your first one — make it count.'
    : (existingCount === 1 ? '1 brew logged so far.' : existingCount + ' brews logged so far.');

  const card = el('div', { class: 'bl-modal-card', onclick: (e) => e.stopPropagation() },
    el('div', { class: 'bl-modal-head' },
      el('div', {},
        el('div', { class: 'bl-modal-eyebrow' }, 'Log brew'),
        el('h2', { class: 'bl-modal-title' }, 'How was it?'),
        el('p', { class: 'bl-modal-count' }, countLabel)
      ),
      el('button', { type: 'button', class: 'bl-modal-close', onclick: close, 'aria-label': 'Close' }, '×')
    ),
    form
  );

  const backdrop = el('div', { id: 'bl-modal-backdrop', class: 'bl-modal-backdrop', onclick: close }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    backdrop.classList.add('open');
    const beanInput = form.querySelector('[name="bean"]');
    if (beanInput) beanInput.focus();
  }, 10);

  document.addEventListener('keydown', onKey);

  function onKey(e) { if (e.key === 'Escape') close(); }

  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 180);
  }

  function submit() {
    const data = new FormData(form);
    const entry = {
      id: 'brew_' + Date.now(),
      ts: new Date().toISOString(),
      bean: (data.get('bean') || '').toString().trim(),
      method: (data.get('method') || '').toString(),
      grind: (data.get('grind') || '').toString(),
      ratio: (data.get('ratio') || '').toString().trim(),
      rating: rating,
      notes: (data.get('notes') || '').toString().trim()
    };
    if (!entry.bean) return;
    const entries = loadBrewLog();
    entries.unshift(entry);
    saveBrewLog(entries);
    toast('Brew logged');
    close();
  }
}

/* ============================================================
   Vibe wheel — six-wedge SVG picker shared across three surfaces:
   the openBaristaWheel modal (FAB), the aiRecommenderCard inline on
   the Profile page, and a small decorative version on the Home hero.
   Selections are turned into natural language and forwarded through
   sendBaristaMsg via the window._pendingBaristaQuery hand-off.
   ============================================================ */
const VIBE_ICONS = {
  hot:    [{ tag: 'path', d: 'M16 4 Q22 12 22 18 a6 6 0 0 1 -12 0 Q10 14 14 10 Q14 14 16 14 Q16 8 16 4 Z', fill: 'currentColor' }],
  iced:   [{ tag: 'path', d: 'M16 4 V28 M4 16 H28 M7 7 L25 25 M7 25 L25 7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' }],
  sweet:  [
    { tag: 'rect', x: '6', y: '6', width: '20', height: '20', rx: '3', fill: 'currentColor' },
    { tag: 'rect', x: '9', y: '9', width: '14', height: '14', rx: '2', fill: 'rgba(255,255,255,0.35)' }
  ],
  bitter: [
    { tag: 'ellipse', cx: '16', cy: '16', rx: '7', ry: '11', fill: 'currentColor', transform: 'rotate(20 16 16)' },
    { tag: 'path', d: 'M16 6 Q 13 16 16 26', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': '1.5', fill: 'none', transform: 'rotate(20 16 16)' }
  ],
  bold:   [{ tag: 'path', d: 'M18 3 L8 18 L14 18 L12 29 L24 14 L18 14 Z', fill: 'currentColor' }],
  mellow: [{ tag: 'path', d: 'M5 16 Q 11 8 16 16 T 27 16', stroke: 'currentColor', 'stroke-width': '2.5', fill: 'none', 'stroke-linecap': 'round' }],
  creamy: [{ tag: 'path', d: 'M16 4 C11 11 8 16 8 21 C8 25 12 28 16 28 C20 28 24 25 24 21 C24 16 21 11 16 4 Z', fill: 'currentColor' }],
  black:  [{ tag: 'circle', cx: '16', cy: '16', r: '10', fill: 'currentColor' }],
  quick:  [
    { tag: 'circle', cx: '16', cy: '16', r: '11', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
    { tag: 'path', d: 'M16 9 V16 L21 19', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' }
  ],
  slow:   [{ tag: 'path', d: 'M10 5 H22 V9 L16 16 L22 23 V27 H10 V23 L16 16 L10 9 Z', fill: 'currentColor' }],
  // New flavor / character wedges
  nutty:    [
    { tag: 'ellipse', cx: '16', cy: '16', rx: '8', ry: '10', fill: 'currentColor', transform: 'rotate(-15 16 16)' },
    { tag: 'path', d: 'M14 8 Q16 12 14 16 Q12 20 14 24', stroke: 'rgba(255,255,255,0.5)', 'stroke-width': '1.5', fill: 'none' }
  ],
  fruity:   [
    { tag: 'circle', cx: '12', cy: '20', r: '6', fill: 'currentColor' },
    { tag: 'circle', cx: '20', cy: '20', r: '6', fill: 'currentColor', opacity: '0.85' },
    { tag: 'path', d: 'M16 4 L16 14 M14 6 Q16 10 18 6', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none', 'stroke-linecap': 'round' }
  ],
  chocolate:[
    { tag: 'rect', x: '5', y: '8', width: '22', height: '16', rx: '2', fill: 'currentColor' },
    { tag: 'path', d: 'M11 8 V24 M17 8 V24 M23 8 V24 M5 16 H27', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': '1.5', fill: 'none' }
  ],
  floral:   [
    { tag: 'circle', cx: '16', cy: '16', r: '3', fill: 'currentColor' },
    { tag: 'circle', cx: '16', cy: '8',  r: '4', fill: 'currentColor', opacity: '0.7' },
    { tag: 'circle', cx: '16', cy: '24', r: '4', fill: 'currentColor', opacity: '0.7' },
    { tag: 'circle', cx: '8',  cy: '16', r: '4', fill: 'currentColor', opacity: '0.7' },
    { tag: 'circle', cx: '24', cy: '16', r: '4', fill: 'currentColor', opacity: '0.7' }
  ],
  spiced:   [
    { tag: 'path', d: 'M16 4 Q12 8 14 14 Q10 14 10 20 Q14 22 16 26 Q18 22 22 20 Q22 14 18 14 Q20 8 16 4 Z', fill: 'currentColor' },
    { tag: 'circle', cx: '16', cy: '16', r: '2', fill: 'rgba(255,255,255,0.4)' }
  ],
  earthy:   [
    { tag: 'path', d: 'M4 24 Q10 14 16 22 Q22 12 28 24 Z', fill: 'currentColor' },
    { tag: 'path', d: 'M4 24 H28', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none' }
  ],
  citrus:   [
    { tag: 'circle', cx: '16', cy: '16', r: '11', fill: 'currentColor' },
    { tag: 'path', d: 'M16 6 V26 M6 16 H26 M9 9 L23 23 M9 23 L23 9', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': '1.5', fill: 'none' }
  ]
};

const BARISTA_CLIPART_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="%23FAEDD7"/><path d="M22 28h18a4 4 0 0 1 4 4v6a8 8 0 0 1-8 8h-10a8 8 0 0 1-8-8v-6a4 4 0 0 1 4-4z" fill="%232A1A14"/><path d="M40 30h2a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-2" fill="none" stroke="%232A1A14" stroke-width="2" stroke-linecap="round"/><path d="M26 22c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z" fill="%23C5962B" opacity="0.7"/><path d="M32 20c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z" fill="%23C5962B" opacity="0.7"/></svg>';

// MECE pairs across five dimensions: temperature, sweetness, strength,
// milk, time. Order is clockwise from 12 o'clock so opposites sit
// roughly across from each other on the wheel.
const BARISTA_VIBES = [
  // Temperature
  { id: 'hot',       label: 'Hot',       bg: '#FAECE7', sel: '#F0997B', text: '#4A1B0C', iconKey: 'hot' },
  { id: 'iced',      label: 'Iced',      bg: '#E6F1FB', sel: '#85B7EB', text: '#042C53', iconKey: 'iced' },
  // Strength
  { id: 'bold',      label: 'Bold',      bg: '#EAF3DE', sel: '#97C459', text: '#173404', iconKey: 'bold' },
  { id: 'mellow',    label: 'Mellow',    bg: '#EBEFE3', sel: '#A4B881', text: '#2F3A1E', iconKey: 'mellow' },
  // Sweetness / character
  { id: 'sweet',     label: 'Sweet',     bg: '#FBEAF0', sel: '#ED93B1', text: '#4B1528', iconKey: 'sweet' },
  { id: 'bitter',    label: 'Bitter',    bg: '#ECE5DC', sel: '#8A6D4C', text: '#2D1F0E', iconKey: 'bitter' },
  // Milk
  { id: 'creamy',    label: 'Creamy',    bg: '#FAEEDA', sel: '#FAC775', text: '#412402', iconKey: 'creamy' },
  { id: 'black',     label: 'Black',     bg: '#ECEDEE', sel: '#5C5651', text: '#1A1614', iconKey: 'black'  },
  // Time
  { id: 'quick',     label: 'Quick',     bg: '#EEEDFE', sel: '#AFA9EC', text: '#26215C', iconKey: 'quick' },
  { id: 'slow',      label: 'Slow',      bg: '#F1E9F2', sel: '#B68FBE', text: '#3D2A4A', iconKey: 'slow'   },
  // Flavor profile (NEW)
  { id: 'nutty',     label: 'Nutty',     bg: '#F4EAD8', sel: '#C9A678', text: '#4A3520', iconKey: 'nutty' },
  { id: 'fruity',    label: 'Fruity',    bg: '#FDE8E2', sel: '#E89478', text: '#5C2517', iconKey: 'fruity' },
  { id: 'chocolate', label: 'Chocolate', bg: '#EFE0D2', sel: '#7A4828', text: '#2A1610', iconKey: 'chocolate' },
  { id: 'floral',    label: 'Floral',    bg: '#F4E5F0', sel: '#C895C2', text: '#4A2A48', iconKey: 'floral' },
  { id: 'spiced',    label: 'Spiced',    bg: '#FAE7D7', sel: '#D08A4F', text: '#4A2511', iconKey: 'spiced' },
  { id: 'citrus',    label: 'Citrus',    bg: '#FDF4D2', sel: '#E5C24A', text: '#5C470A', iconKey: 'citrus' }
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildVibeWheelSvg(opts) {
  // opts: { size, onWedgeClick, isWedgeSelected }
  // Returns: { svg, wedgePaths } — SVG node and a map of vibe id to path.
  const size = opts.size || 320;
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) - 4;
  // Inner hub radius — keep proportional so labels have room
  const r = Math.round(size * 0.22);
  const iconSize = size > 280 ? 30 : Math.max(18, Math.round(size * 0.085));
  // Icon sits closer to the hub; label sits near the outer rim where chord is widest
  const iconR = r + (R - r) * 0.32;
  const labelR = r + (R - r) * 0.74;

  function polar(rad, ang) {
    const a = (ang - 90) * Math.PI / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  }
  function sectorPath(start, end) {
    const [ox1, oy1] = polar(R, start);
    const [ox2, oy2] = polar(R, end);
    const [ix2, iy2] = polar(r, end);
    const [ix1, iy1] = polar(r, start);
    return 'M ' + ox1 + ' ' + oy1 +
      ' A ' + R + ' ' + R + ' 0 0 1 ' + ox2 + ' ' + oy2 +
      ' L ' + ix2 + ' ' + iy2 +
      ' A ' + r + ' ' + r + ' 0 0 0 ' + ix1 + ' ' + iy1 + ' Z';
  }
  function makeIcon(iconKey, color) {
    const g = document.createElementNS(SVG_NS, 'g');
    VIBE_ICONS[iconKey].forEach(spec => {
      const node = document.createElementNS(SVG_NS, spec.tag);
      Object.keys(spec).forEach(k => {
        if (k === 'tag') return;
        let val = spec[k];
        if (val === 'currentColor') val = color;
        node.setAttribute(k, val);
      });
      g.appendChild(node);
    });
    return g;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('class', 'bw-wheel');
  svg.setAttribute('aria-hidden', 'true');

  const wedgePaths = {};
  const sweep = 360 / BARISTA_VIBES.length;
  BARISTA_VIBES.forEach((v, i) => {
    const startCW = i * sweep;
    const endCW = (i + 1) * sweep;
    const midCW = startCW + sweep / 2;
    const iconPos = polar(iconR, midCW);
    const labelPos = polar(labelR, midCW);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'bw-wedge');
    g.setAttribute('data-vibe', v.id);
    g.style.cursor = 'pointer';
    if (opts.onWedgeClick) {
      g.addEventListener('click', () => opts.onWedgeClick(v.id));
    }

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', sectorPath(startCW, endCW));
    const isSel = opts.isWedgeSelected ? opts.isWedgeSelected(v.id) : false;
    path.setAttribute('fill', isSel ? v.sel : v.bg);
    path.setAttribute('stroke', '#FFFFFF');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
    g.appendChild(path);

    const iconEl = makeIcon(v.iconKey, v.text);
    const tx = iconPos[0] - iconSize / 2;
    const ty = iconPos[1] - iconSize / 2;
    let xform = 'translate(' + tx + ' ' + ty + ')';
    if (iconSize !== 32) xform += ' scale(' + (iconSize / 32) + ')';
    iconEl.setAttribute('transform', xform);
    iconEl.style.pointerEvents = 'none';
    g.appendChild(iconEl);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', labelPos[0]);
    label.setAttribute('y', labelPos[1]);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    // Scale font with wheel size; chord at labelR for 22.5° sweep is ~0.39 * labelR
    // For "Chocolate" (longest, ~9 chars) we need chord >= ~font*5.4
    const maxChord = 2 * labelR * Math.sin((Math.PI / BARISTA_VIBES.length));
    const fontPx = Math.max(8, Math.min(14, Math.floor(maxChord / 5.6)));
    label.setAttribute('font-size', fontPx);
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', v.text);
    label.setAttribute('font-family', 'var(--font-body, Inter, sans-serif)');
    label.style.pointerEvents = 'none';
    label.textContent = v.label;
    g.appendChild(label);

    svg.appendChild(g);
    wedgePaths[v.id] = path;
  });

  return { svg: svg, wedgePaths: wedgePaths };
}

function mountVibeChooser(container, opts) {
  // opts: { size = 360, onSubmit(query) }
  // Mounts wheel + Ask button + chips + free-form input into container,
  // wiring all behavior. State lives in this closure.
  const size = opts.size || 360;
  const selected = new Set();

  const askBtn = el('button', { class: 'bw-ask disabled', type: 'button', onclick: () => askSubmit() }, 'Ask Barista');
  askBtn.setAttribute('disabled', '');

  const wheel = buildVibeWheelSvg({
    size: size,
    onWedgeClick: toggleVibe,
    isWedgeSelected: (id) => selected.has(id)
  });

  const hub = el('div', { class: 'bw-hub' },
    el('img', { src: BARISTA_CLIPART_URL, class: 'bw-hub-img', alt: '' }),
    askBtn
  );

  const wheelWrap = el('div', { class: 'bw-wheel-wrap', style: 'width:' + size + 'px;height:' + size + 'px' });
  wheelWrap.appendChild(wheel.svg);
  wheelWrap.appendChild(hub);

  const chipRow = el('div', { class: 'bw-chips' });

  const freeInput = el('input', {
    class: 'bw-free-input',
    type: 'text',
    placeholder: 'Or describe what you want…',
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); sendFree(); } }
  });
  const freeBtn = el('button', { class: 'bw-free-send', type: 'button', 'aria-label': 'Send', onclick: sendFree }, '→');

  container.appendChild(wheelWrap);
  container.appendChild(chipRow);
  container.appendChild(el('div', { class: 'bw-free' }, freeInput, freeBtn));

  function toggleVibe(id) {
    const v = BARISTA_VIBES.find(x => x.id === id);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    wheel.wedgePaths[id].setAttribute('fill', selected.has(id) ? v.sel : v.bg);
    updateAsk();
    updateChips();
  }
  function updateAsk() {
    if (selected.size === 0) {
      askBtn.setAttribute('disabled', '');
      askBtn.classList.add('disabled');
    } else {
      askBtn.removeAttribute('disabled');
      askBtn.classList.remove('disabled');
    }
  }
  function updateChips() {
    chipRow.innerHTML = '';
    chipRow.classList.toggle('has-chips', selected.size > 0);
    BARISTA_VIBES.filter(v => selected.has(v.id)).forEach(v => {
      chipRow.appendChild(el('span',
        { class: 'bw-chip', style: 'background:' + v.sel + ';color:' + v.text },
        v.label.toLowerCase()
      ));
    });
  }
  function askSubmit() {
    if (selected.size === 0) return;
    const labels = BARISTA_VIBES.filter(v => selected.has(v.id)).map(v => v.label.toLowerCase());
    let q = 'I want something ' + labels.join(', ') + '.';
    const free = freeInput.value.trim();
    if (free) q += ' ' + free;
    opts.onSubmit(q);
  }
  function sendFree() {
    const text = freeInput.value.trim();
    if (!text) return;
    opts.onSubmit(text);
  }
}

function sendVibeQueryToBarista(query) {
  // query is either an array of vibe ids (from the wheel) or a string (free text)
  const vibes = Array.isArray(query) ? query : (query ? [query] : []);
  showBaristaThinking();
  callBaristaAPI(vibes);
}

// Show a "thinking" modal while we wait on Claude
function showBaristaThinking() {
  const existing = document.getElementById('barista-result-backdrop');
  if (existing) existing.remove();

  const card = el('div', { class: 'bw-card', style: 'max-width:520px;text-align:center', onclick: (e) => e.stopPropagation() },
    el('div', { style: 'padding:32px 24px' },
      el('div', { style: 'display:inline-block;width:56px;height:56px;border:4px solid rgba(216,90,42,0.18);border-top-color:var(--caramel);border-radius:50%;animation:bspin 1s linear infinite;margin-bottom:18px' }),
      el('div', { style: 'font-family:var(--font-display);font-size:1.4rem;font-weight:500;letter-spacing:-0.01em;margin-bottom:6px' }, 'Asking the barista...'),
      el('div', { style: 'color:var(--ink-soft);font-size:0.92rem' }, 'Claude is picking your drink based on the vibes you chose.')
    )
  );
  // Inject the spin keyframe once
  if (!document.getElementById('bw-spin-style')) {
    const s = document.createElement('style');
    s.id = 'bw-spin-style';
    s.textContent = '@keyframes bspin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
  const backdrop = el('div', { id: 'barista-result-backdrop', class: 'bw-backdrop open', onclick: closeBaristaResult }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
}

function closeBaristaResult() {
  const b = document.getElementById('barista-result-backdrop');
  if (b) b.remove();
  document.body.style.overflow = '';
}

async function callBaristaAPI(vibes) {
  let result;
  try {
    if (typeof DB !== 'undefined' && DB.askBarista) {
      result = await DB.askBarista(vibes, state.profile);
    } else {
      throw new Error('DB.askBarista not available');
    }
  } catch (e) {
    console.warn('Barista API failed, falling back to local pick', e);
    // Fallback: pick a daily drink locally so the UI still works
    const fallback = DAILY_DRINKS[Math.floor(Math.random() * DAILY_DRINKS.length)];
    result = {
      name: fallback.name,
      tagline: 'Picked locally — connect Claude to get a personalized rec.',
      description: fallback.desc,
      method: 'drip',
      matchedVibes: vibes,
      _fallback: true
    };
  }
  renderBaristaResult(result, vibes);
}

function renderBaristaResult(rec, vibes) {
  closeBaristaResult();
  const card = el('div', { class: 'bw-card', style: 'max-width:540px', onclick: (e) => e.stopPropagation() },
    el('div', { style: 'padding:28px 28px 24px' },
      el('button', { type: 'button', class: 'bw-close', onclick: closeBaristaResult, 'aria-label': 'Close', style: 'position:absolute;top:14px;right:14px' }, '×'),
      el('div', { class: 'eyebrow', style: 'color:var(--caramel-deep);margin-bottom:8px' }, '✨ Your match'),
      el('h2', { style: 'font-family:var(--font-display);font-size:1.8rem;font-weight:600;letter-spacing:-0.015em;line-height:1.1;margin-bottom:8px' }, rec.name || 'Coffee'),
      rec.tagline ? el('p', { style: 'font-style:italic;color:var(--ink-soft);font-size:1rem;margin-bottom:14px' }, rec.tagline) : null,
      el('p', { style: 'color:var(--ink-soft);font-size:0.95rem;line-height:1.55;margin-bottom:18px' }, rec.description || ''),
      rec.matchedVibes && rec.matchedVibes.length ? el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px' },
        rec.matchedVibes.map(v => el('span', { style: 'background:var(--caramel-soft);color:var(--caramel-deep);padding:4px 12px;border-radius:999px;font-size:0.78rem;font-weight:600' }, '✓ ' + v))
      ) : null,
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' },
        el('button', { class: 'btn btn-accent', onclick: () => { closeBaristaResult(); navigate('recipes'); } }, 'Find a recipe →'),
        el('button', { class: 'btn btn-secondary', onclick: () => { closeBaristaResult(); openBaristaWheel(); } }, 'Try different vibes')
      ),
      rec._fallback ? el('p', { style: 'margin-top:14px;font-size:0.78rem;color:var(--ink-muted)' }, 'Connect the Claude API in Supabase to get personalized picks.') : null
    )
  );
  const backdrop = el('div', { id: 'barista-result-backdrop', class: 'bw-backdrop open', onclick: closeBaristaResult }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
}

function openBaristaWheel() {
  if (document.getElementById('bw-backdrop')) return;

  const card = el('div', { class: 'bw-card', onclick: (e) => e.stopPropagation() },
    el('div', { class: 'bw-head' },
      el('div', { class: 'bw-head-text' },
        el('h2', { class: 'bw-title' }, 'What are you craving?'),
        el('p', { class: 'bw-sub' }, 'Tap the vibes you want. We’ll suggest a drink.')
      ),
      el('button', { type: 'button', class: 'bw-close', onclick: close, 'aria-label': 'Close' }, '×')
    )
  );

  mountVibeChooser(card, {
    size: 380,
    onSubmit: (query) => { close(); sendVibeQueryToBarista(query); }
  });

  const backdrop = el('div', { id: 'bw-backdrop', class: 'bw-backdrop', onclick: close }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  setTimeout(() => backdrop.classList.add('open'), 10);
  document.addEventListener('keydown', onKey);

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 180);
  }
}

/* ============================================================
   VIEWS
   ============================================================ */

/* ----- Onboarding quiz ----- */
function renderOnboarding(main) {
  // Reset and use a centered narrow container, not the standard one
  main.innerHTML = '';
  let stepIdx = 0;
  const answers = {};
  const quiz = DATA.quiz;

  const wrap = el('div', { class: 'quiz-container' });
  const progress = el('div', { class: 'quiz-progress' },
    el('div', { class: 'quiz-progress-bar', id: 'quizBar' })
  );
  wrap.appendChild(progress);

  const slot = el('div', { class: 'quiz-step', id: 'quizSlot' });
  wrap.appendChild(slot);
  main.appendChild(wrap);

  function paint() {
    const step = quiz[stepIdx];
    document.getElementById('quizBar').style.width = ((stepIdx) / quiz.length * 100) + '%';

    slot.innerHTML = '';
    slot.classList.remove('fade-in');
    void slot.offsetWidth;
    slot.classList.add('fade-in');

    slot.appendChild(el('div', { class: 'eyebrow' }, `Step ${stepIdx + 1} of ${quiz.length}`));
    slot.appendChild(el('h2', { class: 'h2', html: step.title }));
    slot.appendChild(el('p', { class: 'lead' }, step.subtitle));

    const isMulti = step.type === 'multi';
    const useGrid = step.options.length > 5 && !isMulti ? false : (isMulti);
    const optsWrap = el('div', { class: useGrid ? 'quiz-grid' : 'quiz-options' });

    answers[step.id] = answers[step.id] || (isMulti ? [] : null);

    step.options.forEach(opt => {
      const isSel = isMulti ? answers[step.id].includes(opt.value) : answers[step.id] === opt.value;
      const btn = el('button', {
        class: 'quiz-option' + (isSel ? ' selected' : ''),
        onclick: () => {
          if (isMulti) {
            const arr = answers[step.id];
            const i = arr.indexOf(opt.value);
            if (i >= 0) arr.splice(i, 1); else arr.push(opt.value);
          } else {
            answers[step.id] = opt.value;
          }
          paint();
        }
      },
        el('span', { class: 'quiz-option-icon' }, opt.icon),
        el('div', { class: 'quiz-option-body' },
          el('div', { class: 'quiz-option-title' }, opt.label),
          el('div', { class: 'quiz-option-desc' }, opt.desc)
        )
      );
      optsWrap.appendChild(btn);
    });
    slot.appendChild(optsWrap);

    const isFirst = stepIdx === 0;
    const isLast = stepIdx === quiz.length - 1;
    const hasAnswer = isMulti ? (answers[step.id] || []).length > 0 : !!answers[step.id];

    const actions = el('div', { class: 'quiz-actions' },
      el('button', {
        class: 'btn btn-ghost' + (isFirst ? ' hide' : ''),
        onclick: () => { stepIdx--; paint(); }
      }, '← Back'),
      el('button', {
        class: 'btn btn-accent btn-lg',
        disabled: hasAnswer ? null : 'disabled',
        onclick: () => {
          if (!hasAnswer) return;
          if (isLast) {
            finishQuiz(answers);
          } else {
            stepIdx++;
            paint();
          }
        }
      }, isLast ? 'See my recommendations →' : 'Continue →')
    );
    slot.appendChild(actions);
  }

  function finishQuiz(a) {
    state.profile = {
      machine: a.machine,
      experience: a.experience,
      roast: a.roast,
      flavors: a.flavors || [],
      milk: a.milk,
      goals: a.goal || []
    };
    if (!state.badges.includes('taste-profile')) state.badges.push('taste-profile');
    if (a.machine && a.machine !== 'other' && !state.badges.includes('machine-master')) state.badges.push('machine-master');
    if (!state.badges.includes('beta')) state.badges.push('beta');
    state.points += 250;

    // Seed journal for demo richness if empty
    if (state.journal.length === 0) {
      state.journal = JSON.parse(JSON.stringify(DATA.seedJournal));
    }
    save();
    toast('Welcome to Brew Lab. Profile saved.');
    setTimeout(() => navigate('home'), 600);
  }

  paint();
}

/* ----- Home (retired)
   The previous Apprentice Brewer dashboard (greeting + Grind Score +
   Today's Pour + daily quest + community scroll + challenge + Latte Art /
   Passport CTAs) was retired. Home now renders the same view as
   renderHome (Today's brew, cafe story, picks, map, cafe row).
   Routes for '', 'home', 'discover' all resolve to renderHome.
   The dashboard implementation is parked below in case any logic
   needs to be revived; this stub does not render. */
function renderDashboard(main) {
  return renderHome(main);
  /*
  main.innerHTML = '';
  const c = el('div', { class: 'container-narrow', style: 'max-width:760px' });
  main.appendChild(c);

  const top = topRecipe();
  const checkedInToday = state.lastCheckIn === todayStr();
  const quest = getTodayQuest();
  const tier = computeTier();
  const nextT = nextTier();
  const personality = brewPersonality();
  const score = grindScore();
  const dims = grindDims();
  const featuredChallenge = DATA.challenges.find(ch => ch.featured) || DATA.challenges[0];
  const machine = getMachine();

  const firstName = (state.user?.name || 'there').split(' ')[0];

  // Greeting (serif italic name treatment, like The Grind)
  c.appendChild(el('div', { style: 'margin-bottom:28px' },
    el('div', { style: 'font-family:var(--font-display);font-size:clamp(2rem, 5vw, 2.6rem);line-height:1.05;letter-spacing:-0.02em;color:var(--ink)' },
      timeOfDayGreeting() + ',',
      el('br', {}),
      el('em', { style: 'font-style:italic;font-weight:500' }, firstName + '.')
    ),
    el('p', { style: 'margin-top:10px;color:var(--ink-soft);font-size:1rem' }, "What's in the cup today?")
  ));

  // Grind Score / Tier card (the dark centerpiece, like The Grind)
  c.appendChild(grindCard(score, tier, nextT, dims, state.streak, checkedInToday));

  // Today's pour (clean white card with spec strip)
  c.appendChild(todaysPourCard(top));

  // Daily quest (compact)
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px;padding:20px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:var(--caramel-soft);border-color:rgba(216,90,42,0.25)' },
    el('div', { style: 'font-size:2rem' }, quest.icon),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { class: 'eyebrow', style: 'color:var(--caramel-deep);margin-bottom:2px' }, 'Daily quest · +' + quest.reward + ' pts'),
      el('div', { style: 'font-weight:600;font-size:1.05rem;margin-bottom:2px' }, quest.title),
      el('div', { style: 'font-size:0.88rem;color:var(--ink-soft)' }, quest.desc)
    ),
    el('button', {
      class: 'btn ' + (state.todayQuestDone ? 'btn-secondary' : 'btn-accent'),
      onclick: () => completeTodayQuest()
    }, state.todayQuestDone ? '✓ Done' : 'Mark complete')
  ));

  // From the community — horizontal scroll of recent wall posts
  c.appendChild(el('div', { class: 'section-title', style: 'margin-bottom:14px' },
    el('h3', { class: 'h3' }, 'From the community'),
    el('a', { href: '#/wall' }, 'See all →')
  ));
  const communityScroll = el('div', { style: 'display:flex;gap:14px;overflow-x:auto;padding:0 0 16px;margin-bottom:32px' });
  DATA.wallPosts.slice(0, 6).forEach(p => communityScroll.appendChild(communityCard(p)));
  c.appendChild(communityScroll);

  // Weekly challenge (lifted from The Grind)
  c.appendChild(weeklyChallengeCard(featuredChallenge));

  // Two-column: Coffee Wall + Latte Art Leaderboard CTAs (kept from before)
  const ctaPair = el('div', { class: 'split', style: 'margin-bottom:32px' });
  ctaPair.appendChild(el('div', {
    class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer',
    onclick: () => navigate('latte-art')
  },
    el('div', { style: 'aspect-ratio:5/2;background:linear-gradient(135deg, var(--espresso) 0%, #3D2418 100%);display:flex;align-items:center;justify-content:center;color:white' },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font-size:2.2rem' }, '🎨'),
        el('div', { style: 'font-family:var(--font-display);font-size:1.2rem;font-weight:500;margin-top:4px' }, 'Latte Art Leaderboard')
      )
    ),
    el('div', { style: 'padding:16px 20px' },
      el('div', { style: 'font-size:0.88rem;color:var(--ink-soft)' }, "This week's best member pours.")
    )
  ));
  ctaPair.appendChild(el('div', {
    class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer',
    onclick: () => navigate('passport')
  },
    el('div', { style: 'aspect-ratio:5/2;background:linear-gradient(135deg, var(--green) 0%, #1d3327 100%);display:flex;align-items:center;justify-content:center;color:white' },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font-size:2.2rem' }, '🌍'),
        el('div', { style: 'font-family:var(--font-display);font-size:1.2rem;font-weight:500;margin-top:4px' }, 'Coffee Passport')
      )
    ),
    el('div', { style: 'padding:16px 20px' },
      el('div', { style: 'font-size:0.88rem;color:var(--ink-soft)' }, uniqueOriginsTried() + ' / ' + DATA.passportRegions.length + ' stamps collected.')
    )
  ));
  c.appendChild(ctaPair);
  */
}

/* ----- Helper components for Home ----- */

// Story circle (Instagram-style, used in stories scroll row)
function storyCircle({ label, initials: ini, icon, isMe, avatarBg, ringed, recentBrew, onclick }) {
  const ring = isMe ? 'border:2px dashed var(--line)' : (ringed ? 'background:linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%);padding:2px' : 'background:var(--bg-subtle);padding:2px');
  const inner = el('div', {
    style: 'width:60px;height:60px;border-radius:50%;background:' + (isMe ? 'var(--surface-2)' : (avatarBg || 'var(--bg-subtle)')) + ';display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:0.92rem;border:2px solid var(--bg);' + (isMe ? 'color:var(--ink-muted);font-size:1.6rem' : '')
  }, icon || ini || '');
  const wrap = el('div', { style: 'flex-shrink:0;display:flex;flex-direction:column;align-items:center;cursor:pointer;width:74px', title: recentBrew || '', onclick },
    el('div', { style: 'border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;' + ring }, inner),
    el('div', { style: 'margin-top:6px;font-size:0.72rem;color:var(--ink-muted);text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, label || '')
  );
  return wrap;
}

// Grind Score hero card — dark forest green, like The Grind
function grindCard(score, tier, nextT, dims, streakDays, checkedInToday) {
  const tierColors = {
    apprentice: 'var(--caramel)', 'home-barista': 'var(--caramel)',
    specialty: '#7AAE8A', connoisseur: '#E8C896', sommelier: '#E8C896'
  };
  const accent = tierColors[tier.id] || 'var(--caramel)';
  const subTierBrew = grindSubTier(dims.brew);
  const subTierIQ = grindSubTier(dims.iq);
  const subTierComm = grindSubTier(dims.community);
  const subTierPalate = grindSubTier(dims.palate);

  const card = el('div', { style: 'background:linear-gradient(160deg, #1F352A 0%, #0F1F18 100%);color:var(--bg);border-radius:20px;padding:28px;margin-bottom:32px;position:relative;overflow:hidden' });

  // Top row: score circle + tier name
  const top = el('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-bottom:24px' });

  // Circular score with ring (SVG for the progress ring)
  const ringPct = Math.min(100, score / 50); // max ~5000
  const ringWrap = el('div', { style: 'position:relative;width:104px;height:104px;flex-shrink:0' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', '104'); svg.setAttribute('height', '104');
  const trackC = document.createElementNS(svgNS, 'circle');
  trackC.setAttribute('cx', '50'); trackC.setAttribute('cy', '50'); trackC.setAttribute('r', '44');
  trackC.setAttribute('fill', 'none'); trackC.setAttribute('stroke', 'rgba(255,255,255,0.12)'); trackC.setAttribute('stroke-width', '6');
  svg.appendChild(trackC);
  const ringC = document.createElementNS(svgNS, 'circle');
  ringC.setAttribute('cx', '50'); ringC.setAttribute('cy', '50'); ringC.setAttribute('r', '44');
  ringC.setAttribute('fill', 'none'); ringC.setAttribute('stroke', accent); ringC.setAttribute('stroke-width', '6');
  ringC.setAttribute('stroke-linecap', 'round');
  ringC.setAttribute('transform', 'rotate(-90 50 50)');
  ringC.setAttribute('stroke-dasharray', (Math.PI * 88).toFixed(1));
  ringC.setAttribute('stroke-dashoffset', (Math.PI * 88 * (1 - ringPct / 100)).toFixed(1));
  svg.appendChild(ringC);
  ringWrap.appendChild(svg);
  ringWrap.appendChild(el('div', { style: 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1' },
    el('div', { style: 'font-family:var(--font-display);font-size:1.65rem;font-weight:500;letter-spacing:-0.02em' }, score.toLocaleString()),
    el('div', { style: 'font-size:0.6rem;letter-spacing:0.14em;color:rgba(232,200,150,0.7);margin-top:4px' }, 'GRIND SCORE')
  ));
  top.appendChild(ringWrap);

  const tierBlock = el('div', {});
  tierBlock.appendChild(el('div', { style: 'font-size:0.7rem;letter-spacing:0.14em;color:rgba(232,200,150,0.6);text-transform:uppercase;margin-bottom:4px' }, 'Tier'));
  tierBlock.appendChild(el('div', { style: 'font-family:var(--font-display);font-size:1.6rem;font-weight:500;letter-spacing:-0.015em;margin-bottom:6px' }, tier.name));
  if (nextT) {
    tierBlock.appendChild(el('div', { style: 'font-size:0.85rem;color:rgba(232,200,150,0.7);margin-bottom:10px;display:flex;align-items:center;gap:6px' },
      el('span', { style: 'color:' + accent }, '↗'),
      el('span', {}, 'Up next: ' + nextT.name)
    ));
  }
  // Streak pill — only show if streak >= 1
  if (streakDays >= 1) {
    tierBlock.appendChild(el('button', {
      style: 'background:' + accent + ';color:#1F352A;padding:6px 14px;border-radius:999px;font-size:0.85rem;font-weight:600;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px',
      onclick: () => checkIn()
    }, '🔥 ' + streakDays + '-day streak'));
  } else if (!checkedInToday) {
    tierBlock.appendChild(el('button', {
      style: 'background:' + accent + ';color:#1F352A;padding:6px 14px;border-radius:999px;font-size:0.85rem;font-weight:600;border:0;cursor:pointer',
      onclick: () => checkIn()
    }, '+ Start your streak (+10)'));
  }
  top.appendChild(tierBlock);
  card.appendChild(top);

  // Four sub-tier blocks
  const subs = el('div', { style: 'display:grid;grid-template-columns:repeat(2, 1fr);gap:12px' });
  [
    { icon: '🔥', label: 'Brew', tierName: subTierBrew, pct: dims.brew },
    { icon: '📖', label: 'IQ', tierName: subTierIQ, pct: dims.iq },
    { icon: '👥', label: 'Community', tierName: subTierComm, pct: dims.community },
    { icon: '✨', label: 'Palate', tierName: subTierPalate, pct: dims.palate }
  ].forEach(s => {
    subs.appendChild(el('div', { style: 'background:rgba(0,0,0,0.18);border-radius:12px;padding:14px 16px' },
      el('div', { style: 'font-size:0.7rem;letter-spacing:0.12em;color:rgba(232,200,150,0.55);text-transform:uppercase;display:flex;align-items:center;gap:6px;margin-bottom:6px' },
        el('span', {}, s.icon),
        el('span', {}, s.label)
      ),
      el('div', { style: 'font-weight:600;font-size:0.95rem;margin-bottom:8px' }, s.tierName),
      el('div', { style: 'height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden' },
        el('div', { style: 'height:100%;width:' + Math.max(2, s.pct) + '%;background:' + accent })
      )
    ));
  });
  card.appendChild(subs);

  return card;
}

// Today's Pour card — clean white card, spec strip, "why this" line
function todaysPourCard(recipe) {
  const machine = getMachine();
  const reason = computePickReason(recipe);
  const card = el('div', { class: 'card', style: 'margin-bottom:32px;padding:0;overflow:hidden' });
  card.appendChild(el('div', { style: 'padding:24px 28px 8px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap' },
    el('div', {},
      el('div', { class: 'eyebrow', style: 'color:var(--caramel-deep);margin-bottom:6px' }, "★ Today's pour"),
      el('h2', { class: 'h2', style: 'font-size:1.7rem' }, recipe.name)
    ),
    el('span', { style: 'background:var(--bg-subtle);color:var(--ink-soft);padding:4px 12px;border-radius:999px;font-size:0.72rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase' }, recipe.method)
  ));
  if (reason) {
    card.appendChild(el('p', { style: 'padding:0 28px 16px;color:var(--ink-soft);font-size:0.92rem;line-height:1.55;margin:0' }, reason));
  }
  // Spec strip
  card.appendChild(el('div', { style: 'padding:0 28px 20px;display:flex;gap:8px;flex-wrap:wrap' },
    recipe.ratio ? specPill('Ratio', recipe.ratio) : null,
    recipe.water ? specPill('Water', recipe.water.split(' ')[0]) : null,
    recipe.grind ? specPill('Grind', recipe.grind.split(' ')[0]) : null,
    el('span', { style: 'background:var(--bg-subtle);color:var(--ink-soft);padding:6px 12px;border-radius:8px;font-size:0.82rem' },
      el('span', { style: 'color:var(--ink-muted);font-size:0.72rem;margin-right:6px;text-transform:uppercase;letter-spacing:0.06em' }, 'Time'),
      recipe.time
    )
  ));
  // CTA + author byline
  card.appendChild(el('div', { style: 'border-top:1px solid var(--line);padding:18px 28px;display:flex;align-items:center;gap:12px;flex-wrap:wrap' },
    el('button', { class: 'btn btn-accent', onclick: () => navigate('recipe/' + recipe.id) }, 'Brew it →'),
    el('button', { class: 'btn btn-secondary btn-sm', onclick: () => navigate('journal') }, '+ Log this'),
    recipe.author ? el('div', { style: 'margin-left:auto;font-size:0.78rem;color:var(--ink-muted)' }, 'by ' + recipe.author) : null
  ));
  // Subtle Cuisinart machine reference
  if (machine && machine.kind) {
    card.appendChild(el('div', { style: 'background:var(--surface-2);padding:10px 28px;font-size:0.78rem;color:var(--ink-muted);border-top:1px solid var(--line-soft)' },
      'Calibrated for ' + machine.name.toLowerCase() + ' · settings in step-by-step view'
    ));
  }
  return card;
}

function specPill(label, value) {
  return el('span', { style: 'background:var(--bg-subtle);color:var(--ink-soft);padding:6px 12px;border-radius:8px;font-size:0.82rem' },
    el('span', { style: 'color:var(--ink-muted);font-size:0.72rem;margin-right:6px;text-transform:uppercase;letter-spacing:0.06em' }, label),
    value
  );
}

// Compute "why this pick" reason from journal patterns
function computePickReason(recipe) {
  const j = state.journal;
  if (!j.length) return 'A clean introduction to your brew method. Try it once, log it, and we will learn what you like.';
  // Find favorite tag
  const tagFreq = {};
  j.forEach(e => {
    const r = getRecipe(e.recipe);
    if (r && e.rating >= 4) {
      r.tags.forEach(t => tagFreq[t] = (tagFreq[t] || 0) + 1);
    }
  });
  const topTag = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a])[0];
  if (topTag && recipe.tags.includes(topTag)) {
    return 'Picked because you rate ' + topTag + ' brews highest. ' + tagFreq[topTag] + ' five-star ' + topTag + ' brews logged this month.';
  }
  // Find favorite bean
  const beanFreq = {};
  j.forEach(e => beanFreq[e.bean] = (beanFreq[e.bean] || 0) + 1);
  const topBean = Object.keys(beanFreq).sort((a, b) => beanFreq[b] - beanFreq[a])[0];
  const bean = getBean(topBean);
  if (bean) {
    return 'Picked because you have been brewing ' + bean.name + ' a lot. This recipe brings out its ' + (bean.tags?.[0] || 'flavors') + ' notes.';
  }
  return 'Picked for your taste profile. Refine it any time in You.';
}

// Compact community card (horizontal scroll on home)
function communityCard(p) {
  return el('div', { style: 'flex:0 0 240px;background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer', onclick: () => navigate('wall') },
    el('div', { style: 'aspect-ratio:1;background:var(--bg-subtle);position:relative;overflow:hidden' },
      p.photo ? el('img', { src: p.photo, alt: '', style: 'width:100%;height:100%;object-fit:cover;display:block' }) : null,
      el('span', { style: 'position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.95);color:var(--ink);padding:3px 8px;border-radius:999px;font-size:0.7rem;font-weight:600' }, p.drink)
    ),
    el('div', { style: 'padding:12px 14px' },
      el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' },
        el('div', { style: 'width:24px;height:24px;border-radius:50%;background:' + p.avatarBg + ';color:white;font-size:0.65rem;font-weight:600;display:flex;align-items:center;justify-content:center' }, p.initials),
        el('div', { style: 'font-size:0.78rem;color:var(--ink-soft)' }, '@' + (p.author || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 10))
      ),
      el('div', { style: 'font-size:0.85rem;font-weight:500;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden' }, p.caption || '')
    )
  );
}

// Weekly challenge card with progress + brewing along
function weeklyChallengeCard(ch) {
  const joined = state.joinedChallenges.includes(ch.id);
  const progressPct = joined ? 50 : 0;
  return el('div', {
    style: 'background:linear-gradient(135deg, #4574B5 0%, #2C4F87 100%);color:white;border-radius:20px;padding:28px;margin-bottom:32px;position:relative;overflow:hidden'
  },
    el('div', { style: 'font-size:0.7rem;letter-spacing:0.14em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px' },
      el('span', {}, '🏆'),
      el('span', {}, 'Weekly challenge · ' + ch.duration + ' left')
    ),
    el('div', { style: 'font-family:var(--font-display);font-size:1.8rem;font-weight:500;letter-spacing:-0.015em;line-height:1.1;margin-bottom:8px' }, ch.name),
    el('p', { style: 'color:rgba(255,255,255,0.85);font-size:0.95rem;line-height:1.5;margin-bottom:18px;max-width:480px' }, ch.desc),
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;margin-bottom:8px' },
      el('span', {}, '👥 ' + ch.participants.toLocaleString() + ' brewing along'),
      el('span', { style: 'font-weight:600' }, progressPct + '%')
    ),
    el('div', { style: 'height:6px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden;margin-bottom:18px' },
      el('div', { style: 'height:100%;width:' + progressPct + '%;background:var(--caramel);transition:width 0.4s' })
    ),
    el('button', {
      style: 'background:var(--caramel);color:white;padding:14px 24px;border-radius:999px;font-size:0.95rem;font-weight:600;border:0;cursor:pointer;width:100%;transition:background 0.15s',
      onclick: () => {
        if (!joined) {
          state.joinedChallenges.push(ch.id);
          state.points += 25;
          save();
          toast('Joined ' + ch.name);
          render();
        } else {
          navigate('community');
        }
      }
    }, joined ? 'See your progress →' : 'Join challenge')
  );
}

function activityRow(icon, who, what, when) {
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-thumb' }, icon),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title' },
        el('strong', {}, who),
        el('span', { style: 'font-weight:400;color:var(--ink-soft)' }, ' ' + what)
      ),
      el('div', { class: 'list-item-meta' }, when)
    )
  );
}

/* ----- Brew tab (recipes + journal + flavor rankings) ----- */
function renderBrew(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Brew'),
    el('h1', { class: 'h1' }, 'Make today\'s cup.'),
    el('p', { style: 'max-width:580px' }, 'Recipes for every method. Log what you brew. See what the community is drinking.')
  ));

  // Top action cards: Recipes / Log a brew
  const actions = el('div', { class: 'grid grid-2', style: 'margin-bottom:48px' });
  actions.appendChild(el('div', { class: 'card', style: 'padding:28px;cursor:pointer', onclick: () => navigate('recipes') },
    el('div', { style: 'font-size:2rem;margin-bottom:12px' }, '📖'),
    el('h3', { class: 'h3' }, 'Recipes'),
    el('p', { class: 'muted mt-sm', style: 'font-size:0.92rem' }, 'Drip, espresso, pour over, cold brew, French press, AeroPress.'),
    el('div', { style: 'margin-top:12px;color:var(--caramel-deep);font-size:0.9rem;font-weight:500' }, DATA.recipes.length + ' recipes →')
  ));
  actions.appendChild(el('div', { class: 'card', style: 'padding:28px;cursor:pointer', onclick: () => navigate('journal') },
    el('div', { style: 'font-size:2rem;margin-bottom:12px' }, '📓'),
    el('h3', { class: 'h3' }, 'Brew Journal'),
    el('p', { class: 'muted mt-sm', style: 'font-size:0.92rem' }, 'Log what you brew. We surface taste patterns over time.'),
    el('div', { style: 'margin-top:12px;color:var(--caramel-deep);font-size:0.9rem;font-weight:500' }, state.journal.length + ' entries →')
  ));
  c.appendChild(actions);

  // Top brews this week (community ranking)
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Top brews this week'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, 'Voted by the community')
  ));
  const topBrews = DATA.recipes.slice().sort((a, b) => (b.id.length * 7 + b.tags.length * 13) - (a.id.length * 7 + a.tags.length * 13)).slice(0, 6);
  const brewGrid = el('div', { class: 'grid grid-3', style: 'margin-bottom:48px' });
  topBrews.forEach((r, i) => {
    const tile = recipeTile(r);
    // Add rank flag
    const flagWrap = tile.querySelector('.tile-thumb');
    flagWrap.appendChild(el('span', { style: 'position:absolute;bottom:12px;left:12px;background:rgba(255,255,255,0.95);color:var(--ink);padding:4px 10px;border-radius:999px;font-size:0.78rem;font-weight:700;font-family:var(--font-display)' }, '#' + (i + 1)));
    brewGrid.appendChild(tile);
  });
  c.appendChild(brewGrid);

  // Flavor rankings
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Flavors trending'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, 'Most logged this week')
  ));
  const flavors = [
    { name: 'Chocolate', icon: '🍫', count: 4280, change: '+12%' },
    { name: 'Caramel', icon: '🍯', count: 3940, change: '+8%' },
    { name: 'Berry', icon: '🍓', count: 2810, change: '+24%' },
    { name: 'Citrus', icon: '🍋', count: 2240, change: '+5%' },
    { name: 'Floral', icon: '🌸', count: 1820, change: '+3%' },
    { name: 'Earthy', icon: '🌿', count: 1640, change: '-2%' }
  ];
  const flavorGrid = el('div', { class: 'grid grid-3' });
  flavors.forEach(f => flavorGrid.appendChild(el('div', { class: 'card', style: 'padding:20px;display:flex;align-items:center;gap:14px' },
    el('div', { style: 'font-size:2rem' }, f.icon),
    el('div', { style: 'flex:1' },
      el('div', { style: 'font-weight:600;font-size:1rem' }, f.name),
      el('div', { style: 'font-size:0.82rem;color:var(--ink-muted)' }, f.count.toLocaleString() + ' brews')
    ),
    el('span', { class: 'pill', style: 'color:' + (f.change.startsWith('+') ? 'var(--success)' : 'var(--ink-muted)') }, f.change)
  )));
  c.appendChild(flavorGrid);
}

/* ----- Home — Today's brew, cafe story, picks, places ----- */
// Each daily drink links to an actual recipe from DATA.recipes (recipeId)
// Each drink has a category. The hero photo is selected by category, not by
// specific recipe — that keeps photos honest (a latte photo for a latte drink,
// a cold brew photo for a cold brew drink) without claiming a stock photo
// shows e.g. "brown butter mocha" specifically.
const DRINK_CATEGORY_PHOTOS = {
  // A standard latte with foam pulled — works for any milk-based espresso drink
  latte:   'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=1000&q=90',
  // A cold brew in a glass with ice — works for any cold-extracted drink
  cold:    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1000&q=90',
  // An iced espresso/shaken drink with ice cubes
  iced:    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1000&q=90',
  // Dessert / affogato — espresso poured over ice cream
  dessert: 'https://images.unsplash.com/photo-1626078299034-94497af9d4ff?w=1000&q=90'
};

const DAILY_DRINKS = [
  { name: 'Maple bourbon cold brew',     recipeId: 'cold-brew-classic',     category: 'cold',    desc: 'Cold brew concentrate kissed with maple syrup and a thread of bourbon barrel-aged bitters. The grown-up summer drink.' },
  { name: 'Honey lavender latte',        recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Steamed milk infused with dried lavender, drizzled with raw honey, finished with a double shot. A garden in a glass.' },
  { name: 'Saigon egg coffee',           recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Vietnamese-style. A whipped egg yolk and condensed milk float on a bed of dark roast espresso. Velvet and caramel.' },
  { name: 'Dirty matcha latte',          recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Ceremonial matcha whisked with oat milk, a single shot of espresso poured down the side. Two worlds collide.' },
  { name: 'Cinnamon brown sugar shaken espresso', recipeId: 'iced-vanilla-latte', category: 'iced', desc: 'Iced espresso shaken with brown sugar and a dash of cinnamon. Frothy, sweet, cold-coffee perfection.' },
  { name: 'Spanish latte',               recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Espresso, sweetened condensed milk, steamed milk. Liquid caramel that tastes like every bakery in Madrid.' },
  { name: 'Espresso tonic',              recipeId: 'sat-morning-latte',     category: 'iced',    desc: 'A double shot poured over ice and tonic water with a twist of lemon. Bitter, bright, weirdly refreshing.' },
  { name: 'Japanese iced pour over',     recipeId: 'pour-over-light',       category: 'iced',    desc: 'Brewed hot directly onto ice on a V60. Locks in florals that flash-cooling preserves. Cleanest cold coffee you will taste.' },
  { name: 'Tahini date oat milk latte',  recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Steamed oat milk with tahini and date syrup, espresso poured slowly. Nutty, caramelly, like halva in a mug.' },
  { name: 'Cardamom rose cortado',       recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Equal parts espresso and rose-water cardamom milk. Floral, spiced, the small drink with the big finish.' },
  { name: 'Cold brew old fashioned',     recipeId: 'cold-brew-classic',     category: 'cold',    desc: 'Cold brew concentrate, demerara syrup, orange peel, a dash of bitters. Stirred, served on a single big rock.' },
  { name: 'Coconut cardamom cortado',    recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Coconut milk steamed with green cardamom pods, espresso pulled short. Tropical with a backbone.' },
  { name: 'Brown butter mocha',          recipeId: 'sat-morning-latte',     category: 'latte',   desc: 'Espresso, brown-buttered chocolate ganache, steamed milk. Toasted, deep, almost dessert.' },
  { name: 'Affogato al cafe',            recipeId: 'sat-morning-latte',     category: 'dessert', desc: 'A scoop of vanilla bean gelato. A double shot of hot espresso poured over the top. The rules of dessert and coffee, broken.' }
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function renderHome(main) {
  return renderMagazineHome(main);
}

// Magazine-style home — DECLUTTERED. Two clear paths up top, secondaries below.
function renderMagazineHome(main) {
  main.innerHTML = '';
  const page = el('div', {});
  main.appendChild(page);

  const today = new Date();
  // Drink rotates WEEKLY now (one drink per week, not per day)
  const weekNum = Math.floor(dayOfYear(today) / 7);
  const drink = DAILY_DRINKS[weekNum % DAILY_DRINKS.length];
  const giveaway = (DATA.giveaways || [])[0];
  const competition = (DATA.challenges || []).find(c => c.featured) || (DATA.challenges || [])[0];
  const cafeOfWeek = (DATA.cafes || [])[weekNum % (DATA.cafes || []).length];

  // Magazine masthead bar — issue, date, weather-ish line
  const issueNum = ((dayOfYear(today) % 99) + 1).toString().padStart(2, '0');
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  /* === HERO: clear binary choice === */
  // Personal hello line — light personalization above the masthead
  const userName = (state.user && state.user.name) ? state.user.name.split(' ')[0] : 'friend';
  const lastBrew = (state.journal || [])[0];
  const lastBrewName = lastBrew ? (getRecipe(lastBrew.recipe) || {}).name : null;
  const helloPieces = [
    'Welcome back, ',
    el('strong', { style: 'color:var(--ink)' }, userName),
    '.'
  ];
  if (state.streak && state.streak > 0) {
    helloPieces.push(' Brew streak: ', el('strong', { style: 'color:var(--tomato)' }, state.streak + (state.streak === 1 ? ' day' : ' days')), '.');
  }
  if (lastBrewName) {
    helloPieces.push(' Last brewed: ', el('em', { style: 'font-style:italic' }, lastBrewName), '.');
  }

  const hero = el('section', { style: 'padding:12px 0 32px' },
    el('div', { class: 'container' },
      // Personal hello line (small, italic)
      el('div', {
        style: 'font-family:var(--font-display);font-style:italic;font-size:14px;color:var(--ink-soft);margin-bottom:14px;letter-spacing:0.01em'
      }, helloPieces),
      // Newspaper-style masthead rule
      el('div', {
        style: 'display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--ink);border-bottom:1px solid var(--ink);padding:10px 0;margin-bottom:24px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink)'
      },
        el('span', { style: 'font-weight:700' }, 'Vol. III · No. ' + issueNum),
        el('span', { style: 'opacity:0.7' }, dateStr),
        el('span', { style: 'font-weight:700' }, 'The Daily Brew')
      ),
      // Newsroom briefs ticker — 4 mini headlines
      (() => {
        const briefs = [
          { eyebrow: 'Drops', text: 'Onyx unveils new ', emph: 'Monarch', tail: ' lot Friday at 10 a.m. Eastern.', to: 'devices' },
          { eyebrow: 'Community', text: 'Catherine takes the ', emph: 'Latte Art crown', tail: ', her third this season.', to: 'community' },
          { eyebrow: 'Open', text: 'Espresso Open registrations close ', emph: 'Sunday', tail: '. Sixty seats filled.', to: 'community' },
          { eyebrow: 'Trip', text: 'Stumptown teases a ', emph: 'Hair Bender', tail: ' refresh after fifteen years untouched.', to: 'home' }
        ];
        const strip = el('div', {
          style: 'display:grid;grid-template-columns:repeat(4, 1fr);gap:0;border-bottom:1px solid var(--ink);padding-bottom:16px;margin-bottom:32px'
        });
        briefs.forEach((b, i) => {
          strip.appendChild(el('a', {
            onclick: () => navigate(b.to),
            style: 'cursor:pointer;padding:0 16px;' + (i < 3 ? 'border-right:1px solid var(--ink);' : '') + (i === 0 ? 'padding-left:0;' : '') + (i === 3 ? 'padding-right:0;' : '') + 'transition:opacity 0.2s'
          },
            el('div', {
              style: 'font-family:var(--font-mono);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--tomato);font-weight:800;margin-bottom:6px'
            }, '◆ ' + b.eyebrow),
            el('div', {
              style: 'font-family:var(--font-display);font-size:13px;line-height:1.35;color:var(--ink)'
            }, b.text, el('em', { style: 'font-style:italic;font-weight:700' }, b.emph), b.tail)
          ));
        });
        return strip;
      })(),
      el('h1', {
        style: 'font-family:var(--font-display);font-weight:800;font-size:clamp(48px, 7vw, 96px);line-height:0.94;letter-spacing:-0.025em;margin-bottom:48px;max-width:880px'
      },
        "What are you ",
        el('em', { style: 'font-style:italic;color:var(--tomato)' }, 'drinking'),
        ' today?'
      ),
      // Two primary tiles — smaller now — This Week's Brew | Ask the Barista
      el('div', {
        style: 'display:grid;grid-template-columns:1fr 1fr;gap:24px'
      },
        // 1. THIS WEEK'S BREW (marigold yellow)
        el('a', {
          class: 'tile dotd',
          style: 'min-height:400px',
          onclick: () => navigate(drink.recipeId ? 'recipe/' + drink.recipeId : 'recipes')
        },
          el('div', { class: 'tag' },
            el('span', {}, "★ This Week's Brew")
          ),
          el('h3', { style: 'font-size:36px' },
            (() => {
              const parts = drink.name.split(' ');
              return [parts.slice(0, -1).join(' '), ' ', el('em', {}, parts.slice(-1)[0] + '.')];
            })()
          ),
          el('p', { style: 'font-size:15px;margin-bottom:auto' }, drink.desc.split('.').slice(0, 1).join('.') + '.'),
          el('div', { class: 'dotd-art', style: 'margin:14px 0' },
            el('div', { class: 'dotd-cup' }, milkPourSmileySvg(drink))
          ),
          el('div', { class: 'dotd-meta' },
            el('span', {}, el('strong', {}, '5 min')),
            el('span', {}, el('strong', {}, '★★★★★'), ' 4.8')
          ),
          el('span', { class: 'arrow-cta' }, 'See recipe ', el('span', { class: 'ar' }, '→'))
        ),
        // 2. ASK THE BARISTA (tomato red — vibe chips instead of wheel)
        el('a', {
          class: 'tile barista',
          style: 'min-height:400px;grid-row:auto;overflow:hidden',
          onclick: () => openBaristaWheel()
        },
          el('div', { class: 'tag' },
            el('span', {}, '● Ask the barista')
          ),
          el('h3', { style: 'font-size:36px' },
            'Or pick ',
            el('em', {}, 'your own.')
          ),
          el('p', { style: 'font-size:15px;margin-bottom:14px' }, "Tell us how you feel. We'll pour something."),
          // Vibe wheel preview — full version lives in the modal
          el('div', { style: 'flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;margin:4px 0' },
            (() => {
              const wrap = el('div', { style: 'width:min(280px, 100%);aspect-ratio:1;display:flex;align-items:center;justify-content:center' });
              const mini = buildVibeWheelSvg({ size: 280, onWedgeClick: () => openBaristaWheel(), isWedgeSelected: () => false });
              mini.svg.setAttribute('style', 'width:100%;height:100%;display:block');
              mini.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              wrap.appendChild(mini.svg);
              return wrap;
            })()
          ),
          el('span', { class: 'arrow-cta' }, 'Open the wheel ', el('span', { class: 'ar' }, '→'))
        )
      )
    )
  );
  page.appendChild(hero);

  /* === WORLD MAP: cafes + bean farms === */
  const mapSection = el('section', { style: 'padding:32px 0' },
    el('div', { class: 'container' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:24px' },
        el('div', {},
          el('span', { class: 'eyebrow' }, '● The Atlas'),
          el('h2', { style: 'margin-top:8px' },
            'Beans and ',
            el('em', {}, 'cafés'),
            ', mapped.'
          ),
          el('p', { class: 'lead', style: 'margin-top:6px;max-width:520px' }, 'Curated coffee shops worth a trip and the farms behind your favorite bags.')
        ),
        el('div', { style: 'display:flex;gap:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft)' },
          el('span', { style: 'display:flex;align-items:center;gap:6px' },
            el('span', { style: 'width:12px;height:12px;border-radius:50%;background:var(--tomato);border:1.5px solid var(--ink)' }),
            ' Cafés'
          ),
          el('span', { style: 'display:flex;align-items:center;gap:6px' },
            el('span', { style: 'width:12px;height:12px;border-radius:50%;background:var(--ink);border:1.5px solid var(--ink);position:relative;display:inline-flex;align-items:center;justify-content:center;color:var(--marigold);font-size:9px;line-height:1' }, '●'),
            ' Bean farms'
          )
        )
      ),
      el('div', {
        id: 'home-atlas-map',
        style: 'aspect-ratio:16/8;width:100%;background:#F5E6D2;border-radius:22px;overflow:hidden;outline:none;box-shadow:8px 8px 0 0 var(--ink)'
      })
    )
  );
  page.appendChild(mapSection);

  // Mount the Leaflet map after the DOM is in place
  requestAnimationFrame(() => {
    const mapEl = document.getElementById('home-atlas-map');
    if (!window.L || !mapEl) return;

    // Flat world view: lock to one cube, no horizontal repeat
    const worldBounds = [[-65, -180], [78, 180]];
    const map = L.map(mapEl, {
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: false,
      scrollWheelZoom: false,
      minZoom: 2,
      maxZoom: 8,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0
    }).fitBounds(worldBounds, { padding: [10, 10] });

    // Colored Voyager tiles — warmer than light_all, still editorial
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      noWrap: true,
      bounds: worldBounds
    }).addTo(map);

    // Refined map pins: unified circular badge, color-coded by category
    // Café: tomato disc + cream cup glyph. Bean farm: ink disc + marigold bean glyph.
    const cupPinHtml = `<svg viewBox="0 0 36 36" width="32" height="32" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 3px 6px rgba(31,26,20,0.35)) drop-shadow(0 1px 2px rgba(31,26,20,0.25))">
      <!-- Outer disc -->
      <circle cx="18" cy="18" r="15" fill="#E84F1A"/>
      <circle cx="18" cy="18" r="15" fill="none" stroke="#1F1A14" stroke-width="1.3"/>
      <!-- Inner highlight ring (subtle bevel) -->
      <circle cx="18" cy="18" r="13" fill="none" stroke="#FFF5EB" stroke-width="0.8" opacity="0.35"/>
      <!-- Espresso cup silhouette, viewed front-on -->
      <g transform="translate(18 19)">
        <!-- Saucer -->
        <ellipse cx="0" cy="6" rx="7.5" ry="1.4" fill="#FFF5EB" opacity="0.9"/>
        <!-- Cup body (slight taper) -->
        <path d="M-5,-3 Q-5.4,3 -3,5.2 L3,5.2 Q5.4,3 5,-3 Z" fill="#FFF5EB"/>
        <!-- Cup rim line -->
        <ellipse cx="0" cy="-3" rx="5" ry="0.9" fill="#1F1A14" opacity="0.85"/>
        <!-- Handle (curl on right) -->
        <path d="M5,-1.5 Q8,-1 8,1.5 Q8,3.5 5,3.5" fill="none" stroke="#FFF5EB" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Steam wisp -->
        <path d="M-1,-7 Q-2,-9 0,-11" stroke="#FFF5EB" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.85"/>
      </g>
    </svg>`;

    const beanPinHtml = `<svg viewBox="0 0 36 36" width="32" height="32" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 3px 6px rgba(31,26,20,0.35)) drop-shadow(0 1px 2px rgba(31,26,20,0.25))">
      <!-- Outer disc -->
      <circle cx="18" cy="18" r="15" fill="#1F1A14"/>
      <circle cx="18" cy="18" r="15" fill="none" stroke="#1F1A14" stroke-width="1.3"/>
      <!-- Inner highlight ring -->
      <circle cx="18" cy="18" r="13" fill="none" stroke="#F5C518" stroke-width="0.8" opacity="0.35"/>
      <!-- Coffee bean — refined kidney shape with crisp seam -->
      <g transform="translate(18 18) rotate(-22)">
        <!-- Bean silhouette -->
        <path d="M-6,-9 Q-9,-3 -7,5 Q-4,10 3,9 Q8,6 8,0 Q7,-7 1,-9 Q-4,-10 -6,-9 Z"
              fill="#F5C518" stroke="none"/>
        <!-- Bean inner shadow for depth -->
        <path d="M-5,-7 Q-7,-2 -5,4 Q-2,8 2,7" stroke="#C28F0E" stroke-width="0.8" fill="none" opacity="0.6"/>
        <!-- Center seam (defining feature) -->
        <path d="M-2,-8 Q0,0 -1,8" stroke="#1F1A14" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      </g>
    </svg>`;

    const cafeIcon = L.divIcon({
      className: 'atlas-marker',
      html: cupPinHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17]
    });
    const farmIcon = L.divIcon({
      className: 'atlas-marker',
      html: beanPinHtml,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });

    // Plot cafés (only ones with real coords) — popup shows specialty drinks + awards
    (DATA.cafes || []).forEach(s => {
      if (!s.coords) return;
      const drinks = (s.drinks || []).map(d => '<span style="display:inline-block;background:#FAEAD9;color:#A85F1F;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;margin:2px 3px 0 0">' + d + '</span>').join('');
      const awards = (CAFE_AWARDS[s.id] || []).map(a => '<div style="font-size:11px;color:#4A4239;margin-top:3px"><span style="color:#C5962B;font-weight:700">★</span> ' + a + '</div>').join('');
      const photo = s.photoUrl
        ? '<div style="width:100%;aspect-ratio:5/3;background-image:url(\'' + s.photoUrl + '\');background-size:cover;background-position:center;border-radius:8px 8px 0 0"></div>'
        : '';
      L.marker(s.coords, { icon: cafeIcon })
        .addTo(map)
        .bindPopup(
          photo +
          '<div style="padding:10px 12px 12px">' +
          '<div style="font-family:var(--font-display, Georgia, serif);font-weight:700;font-size:15px;color:#1F1A14">' + s.name + '</div>' +
          '<div style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8A7E6E;margin-top:2px">CAFÉ · ' + s.hood + '</div>' +
          (drinks ? '<div style="margin-top:8px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8A7E6E;font-weight:700;margin-bottom:4px">Specialty drinks</div>' + drinks + '</div>' : '') +
          (awards ? '<div style="margin-top:8px;border-top:1px solid #ECE7DF;padding-top:8px">' + awards + '</div>' : '') +
          '</div>',
          { closeButton: true, maxWidth: 240, minWidth: 220 }
        );
    });

    // Plot bean farms (origins with coords) — popup shows tasting notes + unique facts
    (DATA.origins || []).forEach(o => {
      if (!o.coords) return;
      // Find a real bean from this origin to show tasting notes
      const bean = (DATA.beans || []).find(b => b.originRef === o.id);
      const flavors = bean && bean.flavors ? bean.flavors.map(f => '<span style="display:inline-block;background:#F4E9C8;color:#806017;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;margin:2px 3px 0 0">' + f + '</span>').join('') : '';
      const facts = [];
      if (o.altitude)   facts.push(['ALTITUDE',  o.altitude]);
      if (o.varietal)   facts.push(['VARIETAL',  o.varietal]);
      if (o.processing) facts.push(['PROCESSING', o.processing]);
      const factsHtml = facts.map(([k, v]) => '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #F4EFE6"><span style="color:#8A7E6E;letter-spacing:0.06em;font-weight:600">' + k + '</span><span style="color:#1F1A14;font-weight:500;text-align:right">' + v + '</span></div>').join('');

      L.marker(o.coords, { icon: farmIcon })
        .addTo(map)
        .bindPopup(
          '<div style="padding:10px 12px 12px">' +
          '<div style="font-family:var(--font-display, Georgia, serif);font-weight:700;font-size:15px;color:#1F1A14">' + (o.farmName || o.region) + '</div>' +
          '<div style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8A7E6E;margin-top:2px">FARM · ' + o.region + ' · ' + o.country + '</div>' +
          (flavors ? '<div style="margin-top:8px"><div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8A7E6E;font-weight:700;margin-bottom:4px">Tasting notes</div>' + flavors + '</div>' : '') +
          (factsHtml ? '<div style="margin-top:10px">' + factsHtml + '</div>' : '') +
          (o.story ? '<div style="margin-top:8px;font-size:11px;line-height:1.45;color:#4A4239;font-style:italic">"' + o.story + '"</div>' : '') +
          '</div>',
          { closeButton: true, maxWidth: 260, minWidth: 240 }
        );
    });

    setTimeout(() => map.invalidateSize(), 50);
  });

  /* === LATTE ART MARQUEE — one entry per distinct pattern === */
  // Each pattern gets ONE photo that shows that pattern. Only well-known
  // patterns I can match to verified photos make it in. The marquee
  // duplicates each entry below to keep the loop seamless.
  const latteShowcase = [
    {
      url: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=500&q=85',
      pattern: 'Heart',
      desc: 'Single foam heart',
      handle: '@catherine.brews'
    },
    {
      url: 'https://images.unsplash.com/photo-1542556398-95fb5b9dba8c?w=500&q=85',
      pattern: 'Rosetta',
      desc: 'Multi-leaf wiggle pour',
      handle: '@aleks.pulls'
    },
    {
      url: 'https://images.unsplash.com/photo-1525480122447-64809d765a36?w=500&q=85',
      pattern: 'Tulip',
      desc: 'Stacked hearts',
      handle: '@andrew.brewer'
    },
    {
      url: 'https://images.unsplash.com/photo-1572286258217-215cf8e25c43?w=500&q=85',
      pattern: 'Layered Heart',
      desc: 'Three-stack heart',
      handle: '@zach.cup'
    },
    {
      url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&q=85',
      pattern: 'Smiley',
      desc: 'Etched foam smile',
      handle: '@dan.dripper'
    },
    {
      url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=85',
      pattern: 'Inverted Rosetta',
      desc: 'Pulled-back leaves',
      handle: '@morgan.coffee'
    }
  ];
  const marqueeSection = el('section', { style: 'padding:36px 0 24px' },
    el('div', { class: 'container' },
      el('div', {
        style: 'display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:8px;margin-bottom:18px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink)'
      },
        el('span', { style: 'font-weight:700' }, '◉ The Latte Art Wall · live'),
        el('a', {
          onclick: () => navigate('community'),
          style: 'cursor:pointer;color:var(--tomato);font-weight:700'
        }, 'Vote on this week\'s pours →')
      )
    ),
    // Full-width marquee runs edge-to-edge
    el('div', { class: 'latte-marquee' },
      el('div', { class: 'latte-marquee-track' },
        // Render the strip TWICE so the loop seam is invisible
        latteShowcase.concat(latteShowcase).map(item => {
          return el('div', { class: 'latte-card', onclick: () => navigate('community') },
            el('div', {
              class: 'latte-photo',
              style: 'background-image:url(\'' + item.url + '\')'
            }),
            el('div', { class: 'latte-meta' },
              el('div', { class: 'latte-pattern' }, item.pattern),
              el('div', { class: 'latte-handle' }, item.handle)
            )
          );
        })
      )
    )
  );
  page.appendChild(marqueeSection);

  /* === FROM THE BREW SCHOOL — REMOVED per request === */
  if (false) {
    const featuredClass = (DATA.classes || [])[0];
    const ytId = featuredClass && featuredClass.videoUrl ? (featuredClass.videoUrl.match(/(?:v=|youtu\.be\/)([\w-]{11})/) || [])[1] : null;
    const thumbUrl = ytId ? 'https://img.youtube.com/vi/' + ytId + '/maxresdefault.jpg' : null;
    const schoolSection = el('section', { style: 'padding:32px 0' },
      el('div', { class: 'container' },
        el('div', {
          style: 'display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:8px;margin-bottom:20px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink)'
        },
          el('span', { style: 'font-weight:700' }, '◆ From the Brew School'),
          el('a', {
            onclick: () => navigate('learn'),
            style: 'cursor:pointer;color:var(--tomato);font-weight:700'
          }, 'See all classes →')
        ),
        el('a', {
          onclick: () => navigate('class/' + featuredClass.id),
          style: 'display:grid;grid-template-columns:1.2fr 1fr;gap:24px;cursor:pointer;background:var(--cream);border:2px solid var(--ink);border-radius:18px;box-shadow:8px 8px 0 0 var(--ink);overflow:hidden;transition:transform 0.2s, box-shadow 0.2s',
          onmouseenter: function() { this.style.transform = 'translate(-2px,-2px)'; this.style.boxShadow = '10px 10px 0 0 var(--ink)'; },
          onmouseleave: function() { this.style.transform = 'translate(0,0)'; this.style.boxShadow = '8px 8px 0 0 var(--ink)'; }
        },
          // Thumbnail
          el('div', {
            style: 'aspect-ratio:16/10;background:' + (thumbUrl ? 'url(\'' + thumbUrl + '\') center/cover, ' : '') + '#1F1A14;position:relative;border-right:2px solid var(--ink)'
          },
            // Play button overlay
            el('div', {
              style: 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;background:var(--tomato);border:3px solid var(--cream);display:flex;align-items:center;justify-content:center;color:var(--cream);font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,0.4)'
            }, '▶')
          ),
          // Body
          el('div', { style: 'padding:24px 28px;display:flex;flex-direction:column;justify-content:center' },
            el('div', { style: 'font-family:var(--font-mono);font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--tomato);font-weight:800;margin-bottom:10px' },
              '☕ Featured class · ' + (featuredClass.duration || '15 min')
            ),
            el('h3', {
              style: 'font-family:var(--font-display);font-weight:800;font-size:30px;line-height:1.04;letter-spacing:-0.02em;color:var(--ink);margin:0 0 10px'
            },
              (() => {
                const parts = (featuredClass.name || '').split(' ');
                return [parts.slice(0, -1).join(' '), ' ', el('em', { style: 'font-style:italic;color:var(--tomato)' }, parts.slice(-1)[0])];
              })()
            ),
            el('p', {
              style: 'font-family:var(--font-display);font-size:15px;line-height:1.5;color:var(--ink-soft);margin:0 0 14px'
            }, featuredClass.desc || ''),
            featuredClass.instructor ? el('div', {
              style: 'font-family:var(--font-display);font-size:13px;color:var(--ink);font-style:italic'
            }, 'Taught by ', el('strong', { style: 'font-style:normal;font-weight:700' }, featuredClass.instructor)) : null
          )
        )
      )
    );
    page.appendChild(schoolSection);
  }

  /* === PHASE 2 TEASER — connected coffee maker waitlist (rendered at bottom) === */
  const phase2Section = el('section', { style: 'padding:48px 0 96px' },
    el('div', { class: 'container' },
      el('div', {
        style: 'background:linear-gradient(135deg, var(--ink) 0%, #2A1F14 100%);color:var(--cream);border-radius:18px;border:2px solid var(--ink);box-shadow:8px 8px 0 0 var(--marigold);padding:36px 40px;display:grid;grid-template-columns:1.4fr 1fr;gap:36px;align-items:center'
      },
        // Left: copy
        el('div', {},
          el('div', {
            style: 'font-family:var(--font-mono);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--marigold);font-weight:800;margin-bottom:14px'
          }, '◉ Coming next · Phase II'),
          el('h2', {
            style: 'font-family:var(--font-display);font-weight:800;font-size:clamp(28px, 4vw, 44px);line-height:1.02;letter-spacing:-0.02em;margin:0 0 14px;color:var(--cream)'
          },
            'A connected coffee maker that ',
            el('em', { style: 'font-style:italic;color:var(--marigold)' }, 'pours your favorites'),
            ' automatically.'
          ),
          el('p', {
            style: 'font-family:var(--font-display);font-size:16px;line-height:1.5;color:rgba(250, 246, 241, 0.78);margin:0 0 22px;max-width:520px'
          }, 'Brew Lab will sync straight to the next Cuisinart smart machine. Save a recipe here, brew it there. Be the first to know when it ships.'),
          // Email capture
          el('form', {
            style: 'display:flex;gap:8px;flex-wrap:wrap;max-width:480px',
            onsubmit: async (e) => {
              e.preventDefault();
              const input = e.target.querySelector('input');
              const btn = e.target.querySelector('button[type=submit]');
              const email = input ? input.value.trim() : '';
              if (!email) return;
              if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }
              try {
                if (typeof DB !== 'undefined' && DB && DB.joinWaitlist) {
                  await DB.joinWaitlist(email, 'phase2-home');
                }
                state.phase2Waitlist = (state.phase2Waitlist || []).concat([email]);
                save();
                input.value = '';
                toast("You're on the list. We'll be in touch.");
              } catch (err) {
                console.warn('Waitlist signup failed', err);
                // Fallback to localStorage so the demo still feels real
                state.phase2Waitlist = (state.phase2Waitlist || []).concat([email]);
                save();
                input.value = '';
                toast(err && /duplicate/i.test(err.message || '') ? "You're already on the list." : "Saved locally. We'll sync when reconnected.");
              } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Join the waitlist'; }
              }
            }
          },
            el('input', {
              type: 'email',
              placeholder: 'your@email.com',
              required: '',
              style: 'flex:1;min-width:200px;padding:14px 16px;border:1.5px solid var(--cream);background:transparent;color:var(--cream);border-radius:999px;font-family:var(--font-body);font-size:14px;outline:none'
            }),
            el('button', {
              type: 'submit',
              style: 'background:var(--marigold);color:var(--ink);border:1.5px solid var(--marigold);border-radius:999px;padding:14px 24px;font-family:var(--font-body);font-weight:700;font-size:14px;letter-spacing:0.04em;cursor:pointer;white-space:nowrap'
            }, 'Join the waitlist')
          ),
          el('div', {
            style: 'font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(250, 246, 241, 0.5);margin-top:14px'
          }, '◆ ' + ((state.phase2Waitlist || []).length + 1247).toLocaleString() + ' brewers already on the list')
        ),
        // Right: stylized smart-machine illustration
        el('div', { style: 'display:flex;align-items:center;justify-content:center' },
          (() => {
            const NS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 200 200');
            svg.setAttribute('style', 'width:100%;max-width:200px;height:auto');
            svg.innerHTML = `
              <defs>
                <linearGradient id="machine-body" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#FFFEFB"/>
                  <stop offset="100%" stop-color="#C9AC85"/>
                </linearGradient>
              </defs>
              <!-- Base / drip tray -->
              <rect x="40" y="160" width="120" height="14" rx="3" fill="#2A1F14" stroke="#FFFEFB" stroke-width="1.5"/>
              <!-- Cup on tray -->
              <path d="M82,148 Q80,162 90,164 L110,164 Q120,162 118,148 Z" fill="#FFFEFB" stroke="#1F1A14" stroke-width="1.5"/>
              <ellipse cx="100" cy="148" rx="18" ry="2.5" fill="#3C2110"/>
              <!-- Body of machine -->
              <rect x="40" y="40" width="120" height="118" rx="10" fill="url(#machine-body)" stroke="#FFFEFB" stroke-width="2"/>
              <!-- Top water tank -->
              <rect x="48" y="20" width="40" height="24" rx="4" fill="#85B7EB" stroke="#FFFEFB" stroke-width="1.5"/>
              <!-- Bean hopper -->
              <rect x="112" y="20" width="40" height="30" rx="4" fill="#3C2110" stroke="#FFFEFB" stroke-width="1.5"/>
              <circle cx="124" cy="32" r="2" fill="#9C6F44"/>
              <circle cx="132" cy="36" r="2" fill="#9C6F44"/>
              <circle cx="140" cy="30" r="2" fill="#9C6F44"/>
              <!-- LCD screen -->
              <rect x="58" y="62" width="84" height="44" rx="4" fill="#1F1A14" stroke="#FFFEFB" stroke-width="1.2"/>
              <text x="100" y="78" text-anchor="middle" font-family="monospace" font-size="9" fill="#F5C518" font-weight="700">BREW LAB</text>
              <text x="100" y="92" text-anchor="middle" font-family="monospace" font-size="7" fill="#85B7EB">Saturday Latte</text>
              <text x="100" y="102" text-anchor="middle" font-family="monospace" font-size="6" fill="rgba(255,245,235,0.6)">brewing · 28s</text>
              <!-- Steam wand -->
              <rect x="78" y="118" width="6" height="28" rx="2" fill="#1F1A14"/>
              <!-- Spout -->
              <path d="M115,120 L130,120 L130,140 L120,144 L115,140 Z" fill="#1F1A14" stroke="#FFFEFB" stroke-width="1"/>
              <!-- WiFi signal -->
              <g transform="translate(150 32)">
                <path d="M0,8 Q4,4 8,8" stroke="#85B7EB" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                <path d="M-2,11 Q4,3 10,11" stroke="#85B7EB" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7"/>
                <circle cx="4" cy="13" r="1.2" fill="#85B7EB"/>
              </g>
              <!-- Coffee dripping -->
              <ellipse cx="122" cy="146" rx="1.5" ry="2.5" fill="#3C2110" opacity="0.8"/>
              <!-- Steam from cup -->
              <path d="M95,140 Q92,132 95,124" stroke="#FFFEFB" stroke-width="1.2" fill="none" opacity="0.4" stroke-linecap="round"/>
              <path d="M105,140 Q108,132 105,124" stroke="#FFFEFB" stroke-width="1.2" fill="none" opacity="0.4" stroke-linecap="round"/>
            `;
            return svg;
          })()
        )
      )
    )
  );
  // Phase 2 teaser is appended at the bottom — see end of function

  /* === LETTERS TO THE EDITOR — REMOVED per request === */

  /* === SECONDARY ROW: Giveaway + Competition + Café of the Week === */
  const secondary = el('section', { style: 'padding:32px 0 48px' },
    el('div', { class: 'container' },
      // Eyebrow rule across the row
      el('div', {
        style: 'display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:8px;margin-bottom:20px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink)'
      },
        el('span', { style: 'font-weight:700' }, '◆ This Week in Brew Lab'),
        el('span', { style: 'opacity:0.6' }, 'Section B')
      ),
      el('div', { style: 'display:grid;grid-template-columns:repeat(3, 1fr);gap:24px' },
        // 1. GIVEAWAY (ink)
        giveaway ? el('a', {
          class: 'tile give',
          style: 'min-height:320px',
          onclick: () => {
            navigate('community');
            setTimeout(() => {
              const target = document.getElementById('giveaway-' + giveaway.id);
              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);
          }
        },
          el('div', { class: 'tag' }, el('span', { style: 'color:var(--marigold)' }, '★ Giveaway · live')),
          el('h3', { style: 'font-size:30px' }, 'Win the ', el('em', {}, giveaway.name)),
          el('p', { style: 'font-size:14px;opacity:0.85;margin-top:8px' }, 'Free entry. ' + (giveaway.status || 'Drawing soon.')),
          el('div', { class: 'countdown', style: 'margin-top:auto' },
            el('div', { class: 'cd' }, el('div', { class: 'n' }, '14'), el('div', { class: 'u' }, 'DAYS')),
            el('div', { class: 'cd' }, el('div', { class: 'n' }, '06'), el('div', { class: 'u' }, 'HRS')),
            el('div', { class: 'cd' }, el('div', { class: 'n' }, '42'), el('div', { class: 'u' }, 'MIN'))
          ),
          el('span', { class: 'arrow-cta', style: 'color:var(--marigold);margin-top:14px' }, 'Enter ', el('span', { class: 'ar' }, '→'))
        ) : null,
        // 2. COMPETITION (tomato)
        competition ? el('a', {
          class: 'tile compete',
          style: 'min-height:320px',
          onclick: () => navigate('community')
        },
          el('div', { class: 'tag' }, el('span', { style: 'color:var(--marigold)' }, '◉ Competition · open')),
          el('h3', { style: 'font-size:30px' },
            (() => {
              const parts = competition.name.split(' ');
              return [parts.slice(0, -1).join(' '), ' ', el('em', {}, parts.slice(-1)[0] + '.')];
            })()
          ),
          el('p', { style: 'font-size:14px;opacity:0.92;margin-top:8px' }, competition.desc.split('.').slice(0, 1).join('.') + '.'),
          el('div', { style: 'display:flex;gap:14px;margin-top:auto;font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase' },
            el('span', {}, el('strong', { style: 'font-size:18px;font-family:var(--font-display);font-weight:800;display:block;letter-spacing:-0.01em' }, competition.participants.toLocaleString()), 'Brewers'),
            el('span', {}, el('strong', { style: 'font-size:18px;font-family:var(--font-display);font-weight:800;display:block;letter-spacing:-0.01em' }, competition.duration), 'Window')
          ),
          el('span', { class: 'arrow-cta', style: 'color:var(--marigold);margin-top:14px' }, 'Join up ', el('span', { class: 'ar' }, '→'))
        ) : null,
        // 3. CAFÉ OF THE WEEK (cream + photo)
        cafeOfWeek ? el('a', {
          class: 'tile cafeweek',
          style: 'min-height:320px',
          onclick: () => navigate('home')
        },
          // Photo top
          cafeOfWeek.photoUrl ? el('div', {
            style: 'aspect-ratio:5/3;background-image:url(\'' + cafeOfWeek.photoUrl + '\');background-size:cover;background-position:center;border-bottom:2px solid var(--ink)'
          }) : null,
          el('div', { style: 'padding:20px 24px 24px;display:flex;flex-direction:column;flex:1' },
            el('div', { class: 'tag', style: 'color:var(--tomato)' }, el('span', {}, '☕ Café of the week')),
            el('h3', { style: 'font-size:26px;margin-top:6px' },
              cafeOfWeek.short || cafeOfWeek.name
            ),
            el('p', { style: 'font-size:13px;font-family:var(--font-mono);letter-spacing:0.06em;text-transform:uppercase;color:var(--ink-soft);margin-top:2px' }, cafeOfWeek.hood),
            el('div', { style: 'margin-top:auto;padding-top:12px;font-size:13px;color:var(--ink-soft);font-style:italic' },
              ((CAFE_AWARDS[cafeOfWeek.id] || [])[0]) || ((cafeOfWeek.drinks || []).slice(0, 3).join(' · '))
            )
          )
        ) : null
      )
    )
  );
  page.appendChild(secondary);

  // Phase 2 teaser at the very bottom of the home page
  page.appendChild(phase2Section);
  return;
}

// Real recognitions / awards / facts per café — surfaced in atlas popups
const CAFE_AWARDS = {
  'dirt-cowboy':     ['Hanover institution since 1993', 'Featured in NYT Travel'],
  'the-works':       ['Locally roasted Vermont coffee', 'Open since 1989'],
  'umplebys':        ['James Beard semifinalist 2019', 'Wood-fired bakery'],
  'joe-coffee':      ['Founded 2003', 'Sources direct from farms in Colombia + Ethiopia'],
  'counter-culture': ['Annual transparency report (paid prices public)', 'Direct Trade pioneer', 'NYC Coffee Festival winner'],
  'intelligentsia':  ['One of the original third-wave roasters', 'Black Cat Espresso since 1995'],
  'sweet-bloom':     ['Two-time Good Food Award winner', 'Selected for World Brewers Cup'],
  'cuvee':           ['First U.S. roaster to ship nitro cold brew nationally', 'Texas Monthly best-of'],
  'stumptown':       ['Pioneered Direct Trade in U.S.', 'Hair Bender espresso since 1999', 'Now in 6 cities'],
  'blue-bottle':     ['Founded 2002, Oakland CA', 'Sources from George Howell network', 'New Orleans iced coffee is the original viral cold brew']
};

// "This Week's Brew" hero image — selected by drink category (latte, cold,
// iced, dessert) so the visual honestly matches the drink type. We don't
// claim a stock photo shows a specific named recipe.
function milkPourSmileySvg(drinkOverride) {
  const today = new Date();
  const weekNum = Math.floor(dayOfYear(today) / 7);
  const drink = drinkOverride || DAILY_DRINKS[weekNum % DAILY_DRINKS.length];
  const cat = (drink && drink.category) || 'latte';
  const url = DRINK_CATEGORY_PHOTOS[cat] || DRINK_CATEGORY_PHOTOS.latte;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;border-radius:14px;overflow:hidden;border:1.5px solid var(--ink);box-shadow:6px 6px 0 0 var(--ink);position:relative';
  const img = document.createElement('img');
  img.src = url;
  img.alt = (drink && drink.name) ? drink.name : "This week's featured brew";
  img.loading = 'lazy';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  wrap.appendChild(img);
  return wrap;
}

// (legacy) — kept for the modal fallback if anything references it
function milkPourSmileySvg_LEGACY_UNUSED() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 240');
  svg.setAttribute('class', 'milk-anim');
  svg.innerHTML = `
    <defs>
      <radialGradient id="coffee-top" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#A07142"/>
        <stop offset="40%" stop-color="#5C3920"/>
        <stop offset="100%" stop-color="#1A0D05"/>
      </radialGradient>
      <radialGradient id="saucer-top" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#FFFEFB"/>
        <stop offset="80%" stop-color="#F2DEC1"/>
        <stop offset="100%" stop-color="#C9AC85"/>
      </radialGradient>
      <radialGradient id="crema-glow" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#D8A66B" stop-opacity="0.7"/>
        <stop offset="50%" stop-color="#9F6634" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#5C3920" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Drop shadow under the cup -->
    <ellipse cx="120" cy="200" rx="98" ry="14" fill="#1F1A14" opacity="0.15"/>

    <!-- Saucer (top-down circle) -->
    <circle cx="120" cy="120" r="115" fill="url(#saucer-top)" stroke="#1F1A14" stroke-width="2"/>
    <circle cx="120" cy="120" r="100" fill="none" stroke="#1F1A14" stroke-width="0.8" opacity="0.25"/>

    <!-- Cup rim ring (we're looking straight down into the cup) -->
    <circle cx="120" cy="120" r="88" fill="#FFFEFB" stroke="#1F1A14" stroke-width="2.2"/>
    <circle cx="120" cy="120" r="80" fill="#1F1A14"/>

    <!-- Coffee surface — circular, top-down -->
    <circle cx="120" cy="120" r="76" fill="url(#coffee-top)"/>
    <circle cx="120" cy="120" r="76" fill="url(#crema-glow)"/>

    <!-- Crema swirl ring -->
    <circle cx="120" cy="120" r="70" fill="none" stroke="#C9A06A" stroke-width="0.8" opacity="0.3"/>

    <!-- Static white heart latte art — crisp, centered -->
    <g class="latte-heart">
      <path d="M120,98
               C108,84 84,84 84,108
               C84,128 102,140 120,156
               C138,140 156,128 156,108
               C156,84 132,84 120,98 Z"
            fill="#FFFEFB" stroke="#E8DECB" stroke-width="0.8"/>
      <!-- Subtle inner curl -->
      <path d="M104,108 C100,104 96,108 96,114" stroke="#E8DECB" stroke-width="1" fill="none" opacity="0.7" stroke-linecap="round"/>
    </g>

    <!-- Animated steam wisps rising from the cup -->
    <g class="steam">
      <path class="wisp w1" d="M88,46 C84,32 92,22 94,14" stroke="#1F1A14" stroke-width="2.2" fill="none" opacity="0.32" stroke-linecap="round"/>
      <path class="wisp w2" d="M120,38 C116,22 124,8 124,0"  stroke="#1F1A14" stroke-width="2.2" fill="none" opacity="0.38" stroke-linecap="round"/>
      <path class="wisp w3" d="M152,46 C156,32 148,22 146,14" stroke="#1F1A14" stroke-width="2.2" fill="none" opacity="0.3" stroke-linecap="round"/>
    </g>
  `;
  return svg;
}

// Cover photo SVG — coffee cup illustration matching the design system kit
function coverPhotoSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 500');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.innerHTML = `
    <defs>
      <radialGradient id="cup-g" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#A07E59"/>
        <stop offset="100%" stop-color="#1F0E05"/>
      </radialGradient>
      <linearGradient id="bg-g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#3D2818"/>
        <stop offset="100%" stop-color="#0F0703"/>
      </linearGradient>
      <linearGradient id="steam-g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#FFF5EB" stop-opacity=".5"/>
        <stop offset="100%" stop-color="#FFF5EB" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#bg-g)"/>
    <circle cx="80" cy="80" r="120" fill="#E84F1A" opacity=".15"/>
    <circle cx="350" cy="380" r="100" fill="#F5C518" opacity=".18"/>
    <path d="M170,80 Q150,40 180,20 Q210,40 195,90" stroke="url(#steam-g)" stroke-width="3" fill="none" opacity=".55"/>
    <path d="M210,90 Q230,40 200,10 Q175,50 215,100" stroke="url(#steam-g)" stroke-width="3" fill="none" opacity=".5"/>
    <path d="M240,80 Q260,50 240,30 Q220,55 235,90" stroke="url(#steam-g)" stroke-width="3" fill="none" opacity=".4"/>
    <ellipse cx="200" cy="180" rx="135" ry="22" fill="#1F0E05"/>
    <ellipse cx="200" cy="178" rx="125" ry="14" fill="url(#cup-g)"/>
    <path d="M75,180 Q60,360 100,440 L300,440 Q340,360 325,180" fill="#FFF5EB" stroke="#1F1A14" stroke-width="2"/>
    <ellipse cx="200" cy="178" rx="125" ry="14" fill="url(#cup-g)" opacity=".95"/>
    <path d="M200,160 Q175,170 165,180 Q175,190 200,185 Q225,190 235,180 Q225,170 200,160 Z" fill="#FFF5EB" opacity=".92"/>
    <ellipse cx="200" cy="178" rx="35" ry="6" fill="#FFF5EB" opacity=".85"/>
    <ellipse cx="320" cy="280" rx="28" ry="50" fill="none" stroke="#FFF5EB" stroke-width="14"/>
    <ellipse cx="200" cy="450" rx="170" ry="20" fill="#1F1A14" opacity=".4"/>
    <ellipse cx="200" cy="445" rx="160" ry="14" fill="#FBE9D0" stroke="#1F1A14" stroke-width="2"/>
  `;
  return svg;
}

// Atlas tile abstract map SVG
function atlasArtSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = el('div', { style: 'flex:1;position:relative;margin:10px 0;display:flex;align-items:center;justify-content:center' });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 280 140');
  svg.setAttribute('style', 'width:100%;height:auto;max-height:160px');
  svg.innerHTML = `
    <defs>
      <pattern id="leaf-p" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20,8 Q10,18 12,28 Q22,30 28,22 Q30,12 20,8" fill="#5A7A3D" opacity=".3"/>
      </pattern>
    </defs>
    <rect width="280" height="140" fill="url(#leaf-p)" opacity=".5"/>
    <path d="M20,40 Q60,30 80,60 Q100,90 70,110 Q40,100 20,80 Z" fill="#1F4D2E" opacity=".7" stroke="#FFF5EB" stroke-width="1"/>
    <path d="M120,30 Q160,40 180,70 Q170,100 130,110 Q100,90 120,30 Z" fill="#2A6B3D" opacity=".7" stroke="#FFF5EB" stroke-width="1"/>
    <path d="M210,50 Q250,60 260,90 Q230,120 210,100 Z" fill="#1F4D2E" opacity=".7" stroke="#FFF5EB" stroke-width="1"/>
    <g><circle cx="50" cy="65" r="6" fill="#E84F1A" stroke="#1F1A14" stroke-width="1.5"/><circle cx="50" cy="65" r="2" fill="#FFF5EB"/></g>
    <g><circle cx="140" cy="80" r="6" fill="#F5C518" stroke="#1F1A14" stroke-width="1.5"/><circle cx="140" cy="80" r="2" fill="#1F1A14"/></g>
    <g><circle cx="225" cy="78" r="6" fill="#E84F1A" stroke="#1F1A14" stroke-width="1.5"/><circle cx="225" cy="78" r="2" fill="#FFF5EB"/></g>
    <g><circle cx="80" cy="92" r="6" fill="#E84F1A" stroke="#1F1A14" stroke-width="1.5"/><circle cx="80" cy="92" r="2" fill="#FFF5EB"/></g>
    <g><circle cx="165" cy="55" r="6" fill="#F5C518" stroke="#1F1A14" stroke-width="1.5"/><circle cx="165" cy="55" r="2" fill="#1F1A14"/></g>
  `;
  wrap.appendChild(svg);
  return wrap;
}

function atlasStat(value, label) {
  return el('div', {},
    el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:22px;line-height:1;color:var(--marigold)' }, value),
    el('div', { style: 'font-family:var(--font-body);font-weight:700;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.7;margin-top:4px' }, label)
  );
}

// Legacy renderHome below — replaced by renderMagazineHome above. Kept for reference only.
function renderHome_legacy(main) {
  main.innerHTML = '';
  const page = el('div', { class: 'discover-page' });
  main.appendChild(page);

  const today = new Date();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const drink = DAILY_DRINKS[dayOfYear(today) % DAILY_DRINKS.length];

  /* 1. Today's brew hero */
  const heroWheel = buildVibeWheelSvg({
    size: 380,
    onWedgeClick: () => openBaristaWheel(),
    isWedgeSelected: () => false
  });
  heroWheel.svg.classList.add('today-hero-wheel');
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'today-hero' },
        el('div', { class: 'today-hero-text' },
          el('p', { class: 'today-eyebrow' }, 'Today’s brew · ' + weekday),
          el('h1', { class: 'today-title' }, drink.name),
          el('p', { class: 'today-desc' }, drink.desc),
          el('button', { class: 'btn-discover-cta', onclick: () => navigate(drink.recipeId ? 'recipe/' + drink.recipeId : 'recipes') }, 'Try this brew')
        ),
        el('div', { class: 'today-hero-divider', 'aria-hidden': 'true' },
          el('span', { class: 'today-hero-or' }, 'OR')
        ),
        el('div', { class: 'today-hero-right' },
          el('p', { class: 'today-hero-vibe-prompt' }, 'Pick your vibes'),
          el('p', { class: 'today-hero-vibe-prompt-sub' }, 'Tap as many as you like'),
          el('div', { class: 'today-hero-wheel-shell', onclick: () => openBaristaWheel() },
            heroWheel.svg,
            el('div', { class: 'bw-hub bw-hub-hero' },
              el('img', {
                src: BARISTA_CLIPART_URL,
                class: 'bw-hub-img',
                alt: ''
              })
            )
          )
        )
      )
    )
  ));

  /* 2. Featured cafe story */
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'cafe-story' },
        el('div', {
          class: 'cafe-story-thumb',
          role: 'button',
          tabindex: '0',
          onclick: () => toast('Story playback coming soon'),
          onkeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toast('Story playback coming soon');
            }
          },
          'aria-label': 'Play Dirt Cowboy story'
        },
          el('div', { class: 'cafe-story-play', 'aria-hidden': 'true' }),
          el('span', { class: 'cafe-story-duration' }, '3:42')
        ),
        el('div', { class: 'cafe-story-body' },
          el('p', { class: 'cafe-story-eyebrow' }, 'Cafe story'),
          el('h2', { class: 'cafe-story-title' }, 'Dirt Cowboy on the art of the slow pour'),
          el('p', { class: 'cafe-story-sub' }, 'Hanover, New Hampshire · 20 years of single-origin pour-over and a roaster they grew up with.')
        )
      )
    )
  ));

  /* 3. Two discovery cards */
  const picks = [
    { eyebrow: 'Bean spotlight', title: 'Counter Culture Apollo', sub: 'Stone fruit, cocoa, brown sugar', glyph: '🫘', tone: 'cream' },
    { eyebrow: 'Technique',      title: 'Master the bloom',       sub: 'Why 30 seconds matters',          glyph: '💧', tone: 'green' }
  ];
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'discover-picks' },
        picks.map(p => el('a', { href: '#/learn', class: 'pick-card' },
          el('div', { class: 'pick-card-img pick-tone-' + p.tone },
            el('span', { class: 'pick-card-glyph' }, p.glyph)
          ),
          el('div', { class: 'pick-card-body' },
            el('p', { class: 'pick-card-eyebrow' }, p.eyebrow),
            el('h3', { class: 'pick-card-title' }, p.title),
            el('p', { class: 'pick-card-sub' }, p.sub)
          )
        ))
      )
    )
  ));

  /* 3b. Compete & win — pulled from real DATA.challenges + DATA.giveaways */
  const homeChallenge = (DATA.challenges || []).find(c => c.featured) || (DATA.challenges || [])[0];
  const homeGiveaway  = (DATA.giveaways || [])[0];
  const contests = [];
  if (homeChallenge) contests.push({
    kind: 'challenge', id: homeChallenge.id, title: homeChallenge.icon + ' ' + homeChallenge.name,
    body: homeChallenge.desc, daysLeft: homeChallenge.duration + ' · ' + homeChallenge.participants.toLocaleString() + ' brewing along',
    cta: 'Join challenge →', tone: 'cream'
  });
  if (homeGiveaway) contests.push({
    kind: 'giveaway', id: homeGiveaway.id, title: homeGiveaway.icon + ' ' + homeGiveaway.name,
    body: homeGiveaway.desc, daysLeft: homeGiveaway.status, cta: 'Enter →', tone: 'gold'
  });
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'compete-band' },
        el('p', { class: 'compete-eyebrow' }, 'Compete & win'),
        el('h2', { class: 'compete-headline' }, 'Win things. Brew better.'),
        el('div', { class: 'compete-row' },
          contests.map(co => el('a', {
            href: '#/community#' + co.kind + '-' + co.id,
            class: 'compete-card',
            onclick: (e) => {
              // After navigation, scroll to and highlight the matching item
              setTimeout(() => {
                const target = document.getElementById(co.kind + '-' + co.id);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  target.style.transition = 'box-shadow 0.4s';
                  target.style.boxShadow = '0 0 0 3px var(--caramel)';
                  setTimeout(() => { target.style.boxShadow = ''; }, 1800);
                }
              }, 250);
            }
          },
            el('div', { class: 'compete-card-img pick-tone-' + co.tone }),
            el('div', { class: 'compete-card-body' },
              el('h3', { class: 'compete-card-title' }, co.title),
              el('p', { class: 'compete-card-text' }, co.body),
              el('div', { class: 'compete-card-foot' },
                el('span', { class: 'compete-card-days' }, co.daysLeft),
                el('span', { class: 'compete-card-cta' }, co.cta)
              )
            )
          ))
        )
      )
    )
  ));

  /* 4. Discover near you — map + horizontally scrollable cafe row */
  const cafes = DATA.cafes;
  const mapEl = el('div', { id: 'discover-map', class: 'nearby-map' });
  const legend = el('div', { class: 'nearby-legend' },
    el('div', { class: 'nearby-legend-item' },
      el('span', { class: 'nearby-legend-dot nearby-legend-dot-active' }),
      el('span', {}, 'Story')
    ),
    el('div', { class: 'nearby-legend-item' },
      el('span', { class: 'nearby-legend-dot nearby-legend-dot-soon' }),
      el('span', {}, 'Coming soon')
    )
  );
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'discover-section-head' },
        el('div', {},
          el('p', { class: 'discover-eyebrow' }, 'Discover'),
          el('h2', { class: 'discover-h2' }, 'Places & beans worth a trip')
        )
      ),
      el('div', { class: 'nearby-map-wrap' }, mapEl, legend),
      el('div', { class: 'cafe-row' },
        cafes.map(s => el('a', {
          href: '#/discover',
          class: 'cafe-card',
          onclick: (e) => {
            e.preventDefault();
            if (s.status === 'soon') toast(s.short + ' story coming soon');
            else toast('Story playback coming soon');
          }
        },
          el('div', {
            class: 'cafe-card-img',
            style: 'background-image:url(\'' + s.photoUrl + '\')',
            role: 'img',
            'aria-label': s.name
          }),
          el('div', { class: 'cafe-card-body' },
            el('h3', { class: 'cafe-card-name' }, s.name),
            el('p', { class: 'cafe-card-sub' }, s.hood),
            s.status === 'active'
              ? el('p', { class: 'cafe-card-status is-active' }, 'Watch their story →')
              : el('p', { class: 'cafe-card-status is-soon' }, 'Story coming soon')
          )
        ))
      )
    )
  ));

  requestAnimationFrame(() => {
    if (!window.L || !document.body.contains(mapEl)) return;

    // Continental United States bounds. maxBoundsViscosity:1.0 makes drag snap back.
    const usBounds = [[24.396308, -125.0], [49.384358, -66.93457]];
    const map = L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      maxBounds: usBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 4,
      maxZoom: 16
    }).setView([39.8283, -98.5795], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; Carto',
      subdomains: 'abcd'
    }).addTo(map);

    const activeIcon = L.divIcon({
      className: 'discover-marker',
      html: '<span class="discover-marker-active"></span>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });
    const soonIcon = L.divIcon({
      className: 'discover-marker',
      html: '<span class="discover-marker-soon"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14]
    });

    cafes.forEach(s => {
      const pills = s.drinks.map(d =>
        '<span class="discover-popup-pill">' + d + '</span>'
      ).join('');
      const html =
        '<div class="discover-popup">' +
          '<div class="discover-popup-photo" style="background-image:url(\'' + s.photoUrl + '\')"></div>' +
          '<div class="discover-popup-body">' +
            '<div class="discover-popup-name">' + s.name + '</div>' +
            '<div class="discover-popup-hood">' + s.hood + '</div>' +
            '<div class="discover-popup-drinks-label">Signature drinks</div>' +
            '<div class="discover-popup-drinks">' + pills + '</div>' +
          '</div>' +
        '</div>';
      L.marker(s.coords, { icon: s.status === 'active' ? activeIcon : soonIcon })
        .addTo(map)
        .bindPopup(html, { closeButton: false, offset: [0, -4], minWidth: 220 });
    });

    setTimeout(() => map.invalidateSize(), 0);
  });

}

/* ----- Devices — connected Cuisinart products (preview) ----- */
const ELIGIBLE_DEVICES = [
  { name: 'Cuisinart Smart Brew 14-Cup Coffee Maker',     photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80' },
  { name: 'Cuisinart EM-200 Programmable Espresso Maker', photoUrl: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=400&q=80' },
  { name: 'Cuisinart Cold Brew Coffee Maker',             photoUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80' },
  { name: 'Cuisinart Burr Grind & Brew',                  photoUrl: 'https://images.unsplash.com/photo-1518057111178-44a106bad636?w=400&q=80' },
  { name: 'Cuisinart AirFryer Toaster Oven',              photoUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80' },
  { name: 'Cuisinart Hurricane Pro Blender',              photoUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&q=80' }
];

function renderDevices(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container', style: 'padding-top:32px;padding-bottom:56px' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'devices-head' },
    el('p', { class: 'devices-eyebrow' }, 'Your kitchen'),
    el('h1', { class: 'devices-title' }, 'Products'),
    el('p', { class: 'devices-sub' }, 'Cuisinart appliances, partner beans and pods, and the specialty equipment we recommend. Mark what you own to get tailored recipes.')
  ));

  // Smart Appliances Coming Soon hero
  c.appendChild(el('div', {
    style: 'background:linear-gradient(135deg, #1F352A 0%, #0F1F18 60%, #2A1A14 100%);color:#FAF6F0;border-radius:24px;padding:40px;margin-bottom:32px;position:relative;overflow:hidden'
  },
    el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:14px' },
      el('span', { style: 'background:#C5962B;color:#1F352A;padding:4px 12px;border-radius:999px;font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase' }, 'Coming soon'),
      el('span', { style: 'font-size:0.78rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(232,200,150,0.7);font-weight:600' }, 'Smart appliances')
    ),
    el('h2', { style: 'font-family:var(--font-display);font-size:clamp(1.8rem, 4vw, 2.4rem);font-weight:600;letter-spacing:-0.02em;line-height:1.1;margin-bottom:12px;max-width:520px' },
      'Personalize and elevate your drink experience.'
    ),
    el('p', { style: 'color:rgba(250,246,240,0.78);font-size:1rem;line-height:1.55;max-width:480px;margin-bottom:18px' },
      'Connected Cuisinart appliances will brew recipes from this app on tap. Voice-activated brewing, taste-profile-tuned dialing, and remote calibration from creators. Phase 2 of the Brew Lab roadmap.'
    ),
    el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
      el('button', {
        style: 'background:#C5962B;color:#1F352A;padding:11px 20px;border-radius:999px;font-weight:700;font-size:0.92rem;border:0;cursor:pointer',
        onclick: () => toast('You will be the first to know')
      }, 'Notify me at launch'),
      el('button', {
        style: 'background:transparent;color:rgba(232,200,150,0.85);padding:11px 20px;border-radius:999px;font-weight:600;font-size:0.92rem;border:1px solid rgba(232,200,150,0.3);cursor:pointer',
        onclick: () => toast('Early access list joined')
      }, 'Join early access')
    )
  ));

  // Primary CTA card
  c.appendChild(el('div', { class: 'devices-cta' },
    el('div', { class: 'devices-cta-text' },
      el('h2', { class: 'devices-cta-title' }, 'Add a device'),
      el('p', { class: 'devices-cta-body' }, 'Pair over Wi-Fi in 60 seconds.')
    ),
    el('button', { class: 'devices-cta-btn', onclick: openAddDeviceModal }, 'Add device')
  ));

  // Eligible products grid
  c.appendChild(el('h2', { class: 'devices-section-h' }, 'Eligible products'));
  c.appendChild(el('div', { class: 'devices-grid' },
    ELIGIBLE_DEVICES.map(d => el('div', { class: 'device-card' },
      el('div', {
        class: 'device-card-img',
        style: 'background-image:url(\'' + d.photoUrl + '\')',
        role: 'img',
        'aria-label': d.name
      }),
      el('div', { class: 'device-card-body' },
        el('h3', { class: 'device-card-name' }, d.name),
        el('span', { class: 'device-status-pill' }, 'Not connected')
      )
    ))
  ));

  // ---------- Beans (partner roasters) ----------
  c.appendChild(el('h2', { class: 'devices-section-h', style: 'margin-top:48px' }, 'Beans from partner roasters'));
  c.appendChild(el('p', { style: 'color:var(--ink-soft);font-size:0.95rem;margin-bottom:16px;max-width:580px' }, 'A curated set of bags from world-class roasters. Each pairs with a specific brew method.'));
  c.appendChild(el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:32px' },
    DATA.beans.slice(0, 6).map(b => productMiniCard(b, 'beans'))
  ));

  // ---------- Pods (single-serve compatible) ----------
  c.appendChild(el('h2', { class: 'devices-section-h', style: 'margin-top:32px' }, 'Pods for single-serve brewers'));
  c.appendChild(el('p', { style: 'color:var(--ink-soft);font-size:0.95rem;margin-bottom:16px;max-width:580px' }, 'Compatible with the SS-15P1 and SS-10P1. Specialty pods that taste like fresh brew.'));
  c.appendChild(el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:32px' },
    [
      { id: 'onyx-pods', name: 'Onyx Coffee Lab Pods', icon: '🍫', desc: 'Onyx Monarch Blend in compostable pods. Medium roast.', tag: 'K-Cup compatible' },
      { id: 'cc-pods', name: 'Counter Culture Pods', icon: '✨', desc: 'Hologram blend in recyclable pods. Medium-light.', tag: 'K-Cup compatible' },
      { id: 'illy-pods', name: 'illy Espresso Capsules', icon: '☕', desc: 'Italian roast capsules. Designed for Cuisinart espresso lines.', tag: 'iperEspresso' },
      { id: 'lavazza-pods', name: 'Lavazza A Modo Mio Capsules', icon: '🇮🇹', desc: 'Single-serve espresso pods, classic Italian roast.', tag: 'A Modo Mio' }
    ].map(p => productMiniCard(p, 'pods'))
  ));

  // ---------- Specialty equipment ----------
  c.appendChild(el('h2', { class: 'devices-section-h', style: 'margin-top:32px' }, 'Specialty equipment'));
  c.appendChild(el('p', { style: 'color:var(--ink-soft);font-size:0.95rem;margin-bottom:16px;max-width:580px' }, 'Third-party gear our community uses alongside their Cuisinart machines.'));
  c.appendChild(el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:32px' },
    [
      { id: 'hario-v60', name: 'Hario V60 Dripper', icon: '🌊', desc: 'The classic conical pour-over. Glass or ceramic.', tag: 'Pour over' },
      { id: 'fellow-stagg', name: 'Fellow Stagg EKG Kettle', icon: '🫖', desc: 'Variable temperature gooseneck kettle. The barista standard.', tag: 'Kettle' },
      { id: 'acaia-pearl', name: 'Acaia Pearl S Coffee Scale', icon: '⚖️', desc: 'Precision brewing scale with built-in timer. App-connected.', tag: 'Scale' },
      { id: 'aeropress', name: 'AeroPress Original', icon: '🎯', desc: 'Pressure-immersion brewer. Travel-friendly. Forgiving.', tag: 'Brewer' },
      { id: 'comandante-c40', name: 'Comandante C40 Hand Grinder', icon: '⚙️', desc: 'Precision burr grinder. The gold standard for manual grinding.', tag: 'Grinder' },
      { id: 'fellow-pitcher', name: 'Fellow Eddy Milk Pitcher', icon: '🥛', desc: '12oz tapered spout pitcher. Sharp latte art lines.', tag: 'Latte art' }
    ].map(p => productMiniCard(p, 'equipment'))
  ));

  // How it works
  c.appendChild(el('h2', { class: 'devices-section-h', style: 'margin-top:32px' }, 'How device pairing works'));
  c.appendChild(el('div', { class: 'devices-steps' },
    [
      { n: '1', text: 'Plug in your Cuisinart appliance.' },
      { n: '2', text: 'Tap Add device and follow the in-app pairing.' },
      { n: '3', text: 'Get personalized recipes that work for your model.' }
    ].map(s => el('div', { class: 'devices-step' },
      el('div', { class: 'devices-step-num' }, s.n),
      el('p', { class: 'devices-step-text' }, s.text)
    ))
  ));
}

// Compact product card used for beans / pods / equipment sections
function productMiniCard(p, kind) {
  const photo = p.photo || ('https://loremflickr.com/600/400/coffee,' + (kind || 'product') + '?lock=' + (p.id?.length || 7) * 13);
  return el('div', { class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:14px;transition:transform 0.15s, border-color 0.15s', onclick: () => toast(p.name + ' details (demo)') },
    el('div', { style: 'aspect-ratio:5/3;background:linear-gradient(135deg, var(--bg-subtle) 0%, var(--caramel-soft) 100%);display:flex;align-items:center;justify-content:center;font-size:3rem;position:relative;overflow:hidden' },
      photo ? el('img', { src: photo, alt: p.name, style: 'width:100%;height:100%;object-fit:cover' }) : el('span', {}, p.icon || '☕'),
      p.tag ? el('span', { style: 'position:absolute;top:10px;left:10px;background:rgba(255,255,255,0.95);color:var(--ink);padding:3px 10px;border-radius:999px;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase' }, p.tag) : null,
      p.roast ? el('span', { style: 'position:absolute;top:10px;left:10px;background:rgba(255,255,255,0.95);color:var(--ink);padding:3px 10px;border-radius:999px;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase' }, p.roast) : null
    ),
    el('div', { style: 'padding:14px 16px' },
      el('div', { style: 'font-weight:600;font-size:0.95rem;margin-bottom:4px' }, p.name),
      el('div', { style: 'font-size:0.82rem;color:var(--ink-soft);line-height:1.4' }, p.notes || p.desc || (p.roaster ? p.roaster : ''))
    )
  );
}

function openAddDeviceModal() {
  if (document.getElementById('add-device-backdrop')) return;

  const card = el('div', { class: 'add-device-card', onclick: (e) => e.stopPropagation() },
    el('button', { type: 'button', class: 'bw-close', onclick: close, 'aria-label': 'Close', style: 'position:absolute;top:14px;right:14px' }, '×'),
    el('div', { class: 'add-device-icon' }, '📡'),
    el('h2', { class: 'add-device-title' }, 'Coming soon: device pairing'),
    el('p', { class: 'add-device-body' }, 'This is a preview of what Cuisinart’s connected platform would feel like. Wi-Fi pairing, firmware updates, and per-appliance recipes will land here in a future build.'),
    el('button', { type: 'button', class: 'bw-btn-primary', onclick: close, style: 'margin-top:18px' }, 'Got it')
  );

  const backdrop = el('div', { id: 'add-device-backdrop', class: 'bw-backdrop', onclick: close }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  setTimeout(() => backdrop.classList.add('open'), 10);
  document.addEventListener('keydown', onKey);

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 180);
  }
}

/* ----- Products ----- */
function renderProducts(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('a', { href: '#/discover', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← Discover'));

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Gear'),
    el('h1', { class: 'h1' }, 'Brewing equipment.'),
    el('p', { style: 'max-width:580px' }, 'Coffee makers, espresso machines, grinders, and accessories from Cuisinart. Mark what you own to get tailored recipes.')
  ));

  const grid = el('div', { class: 'grid grid-3' });
  DATA.products.forEach(p => grid.appendChild(productTile(p)));
  c.appendChild(grid);
}

function productTile(p) {
  const owned = (state.ownedProducts || []).includes(p.id);
  const thumb = el('div', { style: 'aspect-ratio:4/3;background:' + p.bg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:4rem;position:relative;overflow:hidden' });
  if (p.photo) {
    thumb.appendChild(el('img', { src: p.photo, alt: p.name, style: 'width:100%;height:100%;object-fit:cover;display:block' }));
  } else {
    thumb.appendChild(el('span', {}, p.icon));
  }
  if (owned) thumb.appendChild(el('span', { style: 'position:absolute;top:12px;right:12px;background:var(--success);color:white;padding:4px 10px;border-radius:999px;font-size:0.72rem;font-weight:600' }, '✓ Owned'));
  thumb.appendChild(el('span', { style: 'position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.95);color:var(--ink);padding:4px 10px;border-radius:4px;font-size:0.72rem;font-weight:600;letter-spacing:0.04em' }, p.model));

  return el('div', { class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer', onclick: () => navigate('product/' + p.id) },
    thumb,
    el('div', { style: 'padding:18px' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:4px' }, p.category),
      el('div', { class: 'h4' }, p.name),
      el('p', { style: 'margin-top:6px;color:var(--ink-soft);font-size:0.9rem;line-height:1.5' }, p.tagline)
    )
  );
}

function renderProductDetail(main, id) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const p = DATA.products.find(x => x.id === id);
  if (!p) { c.appendChild(el('p', {}, 'Product not found.')); return; }

  c.appendChild(el('a', { href: '#/products', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← All gear'));

  c.appendChild(el('div', { class: 'card', style: 'padding:0;overflow:hidden;margin-bottom:24px' },
    el('div', { style: 'aspect-ratio:16/7;background:' + p.bg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:7rem;flex-direction:column' },
      el('span', {}, p.icon),
      el('div', { style: 'font-family:var(--font-display);font-size:1.4rem;margin-top:14px' }, p.model)
    )
  ));

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, p.category + ' · ' + p.model),
    el('h1', { class: 'h1' }, p.name),
    el('p', { style: 'max-width:680px' }, p.desc)
  ));

  // Owned toggle + tags
  const owned = (state.ownedProducts || []).includes(p.id);
  c.appendChild(el('div', { style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:32px' },
    el('button', {
      class: 'btn ' + (owned ? 'btn-secondary' : 'btn-accent'),
      onclick: () => {
        state.ownedProducts = state.ownedProducts || [];
        if (owned) {
          state.ownedProducts = state.ownedProducts.filter(x => x !== p.id);
          toast('Removed from your gear');
        } else {
          state.ownedProducts.push(p.id);
          state.points += 25;
          toast('Added to your gear. +25 pts');
        }
        save();
        render();
      }
    }, owned ? '✓ Owned' : '+ Add to my gear'),
    el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, p.tags.map(t => el('span', { class: 'pill' }, t))),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted);margin-left:auto' }, p.owners.toLocaleString() + ' members own this')
  ));

  // Recipes that work with this product
  const matchedRecipes = DATA.recipes.filter(r => r.machineCompat && r.machineCompat.some(m => DATA.machines.find(mc => mc.id === m && mc.kind && p.category && (mc.kind === p.category || (p.category === 'Espresso' && mc.kind === 'Espresso') || (p.category === 'Coffee maker' && mc.kind === 'Drip')))));
  if (matchedRecipes.length) {
    c.appendChild(el('h3', { class: 'h3 mb' }, 'Recipes for this'));
    c.appendChild(el('div', { style: 'height:8px' }));
    const recipeGrid = el('div', { class: 'grid grid-3' });
    matchedRecipes.slice(0, 6).forEach(r => recipeGrid.appendChild(recipeTile(r)));
    c.appendChild(recipeGrid);
  }
}

/* ----- Learn (skill tree + classes + sommelier) ----- */
function renderLearn(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const tier = computeTier();
  const next = nextTier();
  const completed = state.completedClasses || [];

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Learn'),
    el('h1', { class: 'h1' }, 'Become a Coffee Sommelier.'),
    el('p', { style: 'max-width:620px' }, 'Short classes from working professionals. Each class moves you along the path. Reach the top tier and earn a real Sommelier certification.')
  ));

  // Skill tree visual
  c.appendChild(el('div', { class: 'card', style: 'padding:32px;margin-bottom:32px;background:linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, 'Your skill tree'),
      el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, completed.length + ' / ' + DATA.classes.length + ' unlocked')
    ),
    skillTreeVisual()
  ));

  // Sommelier track CTA
  c.appendChild(el('div', { class: 'card card-dark', style: 'margin-bottom:32px;padding:28px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;cursor:pointer', onclick: () => navigate('sommelier') },
    el('div', { style: 'font-size:2.4rem' }, tier.icon),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { class: 'eyebrow', style: 'color:var(--crema);margin-bottom:4px' }, 'Sommelier track'),
      el('div', { style: 'font-family:var(--font-display);font-size:1.3rem;font-weight:500;color:var(--bg)' }, 'You are: ' + tier.name),
      el('div', { style: 'font-size:0.9rem;color:rgba(250,246,241,0.7);margin-top:4px' }, next ? 'Next: ' + next.name : 'Top tier reached')
    ),
    el('button', { class: 'btn btn-accent btn-sm', onclick: (e) => { e.stopPropagation(); navigate('sommelier'); } }, 'See path →')
  ));

  // All classes
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'All classes'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, 'Free for everyone')
  ));
  const grid = el('div', { class: 'grid grid-3' });
  DATA.classes.forEach(cls => {
    const isCompleted = completed.includes(cls.id);
    const requiredFor = DATA.sommelierTiers.find(t => t.requirements.some(r => r.type === 'class' && r.value === cls.id));
    const tile = el('div', {
      class: 'tile',
      onclick: () => navigate('class/' + cls.id),
      style: isCompleted ? 'border-color:var(--success)' : ''
    },
      el('div', { class: cls.thumbClass || 'tile-thumb', style: 'position:relative' },
        el('span', { style: 'font-size:3.5rem' }, cls.icon),
        el('span', { class: 'tile-thumb-tag' }, cls.level),
        isCompleted ? el('span', { style: 'position:absolute;top:12px;right:12px;background:var(--success);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.95rem' }, '✓') : null
      ),
      el('div', { class: 'tile-body' },
        el('div', { class: 'tile-title' }, cls.name),
        el('div', { class: 'tile-meta' },
          el('span', {}, cls.instructorIcon + ' ' + cls.instructor),
          el('span', {}, '•'),
          el('span', {}, cls.duration)
        )
      )
    );
    grid.appendChild(tile);
  });
  c.appendChild(grid);
}

// Renders a curved row of paw-print footprints between two skill tree nodes
function footprintTrail(fromStagger, toStagger) {
  // Map stagger position to horizontal offset (-1, 0, +1)
  const offset = { left: -1, center: 0, right: 1 };
  const start = offset[fromStagger] ?? 0;
  const end = offset[toStagger] ?? 0;
  const steps = 4;

  const wrap = el('div', { style: 'position:relative;height:48px;margin:0 auto;width:100%;max-width:600px;pointer-events:none' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 600 48');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '48');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('style', 'display:block');

  // Draw N footprint pairs along an arc from start to end
  const startX = 300 + start * 200;
  const endX = 300 + end * 200;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const x = startX + (endX - startX) * t;
    // Slight vertical wave to simulate stepping motion
    const y = 24 + (i % 2 === 0 ? -6 : 6);
    // Alternate left/right paw, tilt slightly
    const tilt = i % 2 === 0 ? -12 : 12;

    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + tilt + ')');
    g.setAttribute('opacity', '0.42');

    // Pad (main shape)
    const pad = document.createElementNS(svgNS, 'ellipse');
    pad.setAttribute('cx', '0'); pad.setAttribute('cy', '2');
    pad.setAttribute('rx', '5'); pad.setAttribute('ry', '4');
    pad.setAttribute('fill', '#9C7A56');
    g.appendChild(pad);

    // Three toes
    [[-3.5, -3.5], [0, -5], [3.5, -3.5]].forEach(([tx, ty]) => {
      const toe = document.createElementNS(svgNS, 'circle');
      toe.setAttribute('cx', String(tx)); toe.setAttribute('cy', String(ty));
      toe.setAttribute('r', '1.6');
      toe.setAttribute('fill', '#9C7A56');
      g.appendChild(toe);
    });

    svg.appendChild(g);
  }
  wrap.appendChild(svg);
  return wrap;
}

function skillTreeVisual() {
  const wrap = el('div', { style: 'margin-top:24px;position:relative;padding:8px 0 32px' });
  const completed = state.completedClasses || [];

  // Per-node color palette — each class gets a distinct hue for visual variety
  const NODE_COLORS = {
    'milk-steaming':         { bg: '#FFE0B5', border: '#D49856', emoji: '🥛' },
    'espresso-fundamentals': { bg: '#3D2418', border: '#7A4828', emoji: '☕', dark: true },
    'latte-art-101':         { bg: '#FCE3E3', border: '#D26C6C', emoji: '🎨' },
    'pour-over-mastery':     { bg: '#DCE6DF', border: '#5C8770', emoji: '🌊' },
    'cupping':               { bg: '#E3D7F0', border: '#8D6FB5', emoji: '👃' },
    'latte-art-201':         { bg: '#FFE7C2', border: '#D49856', emoji: '🌷' }
  };

  // Stagger pattern — alternating left/center/right for zigzag visual
  const STAGGER = ['left', 'center', 'right', 'left', 'center', 'right'];

  // Flatten all nodes in branch order so we can stagger across branches
  const allNodes = [];
  DATA.skillTree.branches.forEach((branch, branchIdx) => {
    branch.nodes.forEach(nodeId => {
      const cls = DATA.classes.find(c => c.id === nodeId);
      if (cls) allNodes.push({ cls, branch, branchIdx });
    });
  });

  // Branch label rendered at the start of each branch's section
  let lastBranchIdx = -1;
  allNodes.forEach((entry, idx) => {
    const { cls, branch, branchIdx } = entry;
    const isDone = completed.includes(cls.id);
    const colors = NODE_COLORS[cls.id] || { bg: 'var(--surface)', border: 'var(--line)', emoji: cls.icon };
    const stagger = STAGGER[idx % STAGGER.length];

    // Branch header (only once per branch)
    if (branchIdx !== lastBranchIdx) {
      lastBranchIdx = branchIdx;
      wrap.appendChild(el('div', { style: 'display:flex;justify-content:center;margin:' + (idx === 0 ? '0' : '20px') + ' 0 16px' },
        el('span', {
          style: 'background:' + (branch.color === 'gold' ? '#F5E6B8' : branch.color === 'green' ? '#DCE6DF' : '#FAEAD9') +
            ';color:' + (branch.color === 'gold' ? '#806017' : branch.color === 'green' ? '#27500A' : '#A85F1F') +
            ';padding:6px 16px;border-radius:999px;font-weight:600;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase'
        }, branch.name)
      ));
    }

    // Footprint trail between nodes (skip for first node)
    if (idx > 0) {
      const prevStagger = STAGGER[(idx - 1) % STAGGER.length];
      wrap.appendChild(footprintTrail(prevStagger, stagger));
    }

    // Node row with staggered placement (3-col grid)
    const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const row = el('div', { style: 'display:flex;justify-content:' + justifyMap[stagger] + ';padding:0 4%' });
    const nodeStyle = isDone
      ? 'background:linear-gradient(135deg, ' + colors.bg + ' 0%, ' + colors.border + '22 100%);border:3px solid ' + colors.border + ';color:' + (colors.dark ? '#FAF6F0' : 'var(--ink')
      : 'background:' + colors.bg + ';border:3px solid ' + colors.border + ';color:' + (colors.dark ? '#FAF6F0' : 'var(--ink)');

    const node = el('div', {
      style: nodeStyle + ';border-radius:20px;padding:18px 20px;cursor:pointer;width:240px;text-align:center;position:relative;transition:transform 0.18s ease, box-shadow 0.18s ease;box-shadow:0 4px 0 ' + colors.border + ';display:flex;flex-direction:column;align-items:center;gap:6px',
      onmouseenter: (e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 7px 0 ' + colors.border; },
      onmouseleave: (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 0 ' + colors.border; },
      onclick: () => navigate('class/' + cls.id)
    },
      // Emoji badge
      el('div', { style: 'width:60px;height:60px;border-radius:50%;background:' + (colors.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)') + ';display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin-top:-2px' }, colors.emoji),
      el('div', { style: 'font-weight:700;font-size:0.95rem;line-height:1.2' }, cls.name),
      el('div', { style: 'font-size:0.74rem;opacity:0.75' }, cls.duration + ' · ' + cls.lessons + ' lessons'),
      // Done check
      isDone ? el('div', { style: 'position:absolute;top:-8px;right:-8px;width:30px;height:30px;border-radius:50%;background:#5BAA64;color:white;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;box-shadow:0 2px 0 #2F7A3A' }, '✓') : null
    );
    row.appendChild(node);
    wrap.appendChild(row);
  });

  // Footprint trail leading to the trophy
  wrap.appendChild(footprintTrail(STAGGER[(allNodes.length - 1) % STAGGER.length], 'center'));
  const tier = computeTier();
  const isSommelier = tier.id === 'sommelier';
  wrap.appendChild(el('div', { style: 'display:flex;justify-content:center;margin-top:6px' },
    el('div', {
      style: (isSommelier
        ? 'background:linear-gradient(135deg, #F5C84A 0%, #C5962B 100%);border:3px solid #806017;color:white;'
        : 'background:#FAEAD9;border:3px dashed #C5962B;color:#806017;') +
        'border-radius:24px;padding:24px 32px;cursor:pointer;width:300px;text-align:center;box-shadow:0 4px 0 ' + (isSommelier ? '#806017' : '#C5962B') + ';transition:transform 0.18s ease',
      onmouseenter: (e) => { e.currentTarget.style.transform = 'translateY(-3px)'; },
      onmouseleave: (e) => { e.currentTarget.style.transform = ''; },
      onclick: () => navigate('sommelier')
    },
      el('div', { style: 'font-size:2.6rem;margin-bottom:6px' }, '🏆'),
      el('div', { style: 'font-family:var(--font-display);font-size:1.3rem;font-weight:600;letter-spacing:-0.01em' }, 'Coffee Sommelier'),
      el('div', { style: 'font-size:0.78rem;opacity:0.85;margin-top:4px' }, isSommelier ? 'You earned this' : 'The final certification')
    )
  ));

  return wrap;
}

/* ----- You (profile + passport + leaderboard + awards) ----- */
function renderYou(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const tier = computeTier();
  const next = nextTier();
  const progress = next ? tierProgress(next) : null;
  const personality = brewPersonality();
  const streak = state.streak;
  const origins = uniqueOriginsTried();
  const completedCount = (state.completedClasses || []).length;
  const passportCount = passportStampCount();

  // Profile header card
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px;padding:0;overflow:hidden' },
    el('div', { style: 'height:120px;background:linear-gradient(135deg, var(--espresso) 0%, #3D2418 50%, var(--caramel-deep) 100%);position:relative' },
      el('div', { style: 'position:absolute;bottom:-44px;left:32px' },
        el('div', { style: 'width:104px;height:104px;border-radius:50%;background:linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%);display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:600;color:white;border:5px solid var(--bg);box-shadow:var(--shadow)' }, initials(state.user?.name))
      )
    ),
    el('div', { style: 'padding:56px 32px 28px' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap' },
        el('div', {},
          el('h1', { class: 'h1', style: 'font-size:2rem' }, state.user?.name || 'Guest'),
          el('div', { class: 'muted', style: 'margin-top:4px;font-size:0.92rem' }, state.user?.isGuest ? 'Browsing as guest' : (state.user?.joined ? 'Member since ' + fmtDate(state.user.joined) : '')),
          el('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' },
            el('span', { class: 'pill ' + (tier.color === 'gold' ? 'pill-gold' : tier.color === 'green' ? 'pill-green' : 'pill-accent') }, tier.icon + ' ' + tier.name),
            personality ? el('span', { class: 'pill' }, personality.icon + ' ' + personality.name) : null
          )
        ),
        state.user?.isGuest ? el('button', { class: 'btn btn-accent btn-sm', onclick: () => openSignupModal({ mode: 'signup' }) }, 'Sign up free') : null
      )
    )
  ));

  // Stat row
  c.appendChild(el('div', { class: 'grid grid-4', style: 'margin-bottom:32px' },
    statCard('🔥', streak, 'Day streak'),
    statCard('☕', state.journal.length, 'Brews'),
    statCard('🌍', passportCount + ' / ' + DATA.passportRegions.length, 'Passport'),
    statCard('⭐', state.points.toLocaleString(), 'Points')
  ));

  // Coffee Passport preview
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px;padding:24px' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '🌍 Coffee Passport'),
      el('a', { href: '#/passport' }, 'See all stamps →')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:16px' }, 'Try a bean from each origin to collect every stamp.'),
    passportPreview()
  ));

  // Sommelier track preview
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px;padding:24px' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '🏆 Sommelier track'),
      el('a', { href: '#/sommelier' }, 'See full path →')
    ),
    el('div', { style: 'display:flex;align-items:center;gap:18px;margin-top:12px;flex-wrap:wrap' },
      el('div', { style: 'width:64px;height:64px;border-radius:50%;background:' + (tier.color === 'gold' ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : tier.color === 'green' ? 'linear-gradient(135deg, var(--green) 0%, #1d3327 100%)' : 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)') + ';display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:white;flex-shrink:0' }, tier.icon),
      el('div', { style: 'flex:1;min-width:200px' },
        el('div', { style: 'font-family:var(--font-display);font-size:1.2rem;font-weight:500' }, tier.name),
        next ? el('div', { class: 'mt-sm' },
          el('div', { style: 'display:flex;justify-content:space-between;font-size:0.82rem;color:var(--ink-muted);margin-bottom:6px' },
            el('span', {}, 'Next: ' + next.name),
            el('span', { class: 'mono' }, progress.met + ' / ' + progress.total)
          ),
          el('div', { class: 'progress' },
            el('div', { class: 'progress-bar', style: 'width:' + progress.pct + '%' })
          )
        ) : null
      )
    )
  ));

  // AI Drink Recommender card (renders inside the page)
  c.appendChild(aiRecommenderCard());

  // Taste tracker — flavor pinwheel built from journal entries
  c.appendChild(tasteTrackerCard());

  // Brew journal — recent log with shortcut to add a new one
  c.appendChild(brewJournalCard());

  // Leaderboard with tabs (Global / Friends)
  const lbCard = el('div', { class: 'card', style: 'margin-bottom:32px' });
  lbCard.appendChild(el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, '📈 Leaderboard'), null));

  let lbMode = 'global';
  const lbTabs = el('div', { class: 'tabs', style: 'margin-bottom:16px' });
  ['global', 'friends'].forEach(mode => {
    lbTabs.appendChild(el('button', {
      class: 'tab' + (mode === lbMode ? ' active' : ''),
      onclick: () => { lbMode = mode; paintLb(); }
    }, mode === 'global' ? 'Global' : 'Friends (' + (state.following || []).length + ')'));
  });
  lbCard.appendChild(lbTabs);
  const lbBody = el('div', { id: 'lbBody' });
  lbCard.appendChild(lbBody);

  function paintLb() {
    document.querySelectorAll('#lbBody').forEach(b => b.innerHTML = '');
    lbBody.innerHTML = '';
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active',
      (lbMode === 'global' && t.textContent === 'Global') ||
      (lbMode === 'friends' && t.textContent.startsWith('Friends'))));

    let pool;
    if (lbMode === 'friends') {
      pool = DATA.members.filter(m => (state.following || []).includes(m.id));
      pool.push({ id: 'you', name: state.user?.name || 'You', initials: initials(state.user?.name), points: state.points + 1500, streak: state.streak, isMe: true, tierIcon: computeTier().icon, avatarBg: 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)' });
    } else {
      pool = DATA.members.slice();
      pool.push({ id: 'you', name: state.user?.name || 'You', initials: initials(state.user?.name), points: state.points + 1500, streak: state.streak, isMe: true, tierIcon: computeTier().icon, avatarBg: 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)' });
    }
    pool.sort((a, b) => b.points - a.points);

    if (pool.length === 0 || (lbMode === 'friends' && pool.length === 1)) {
      lbBody.appendChild(el('div', { class: 'empty' },
        el('div', { class: 'empty-icon' }, '👥'),
        el('p', {}, 'No friends yet. Add some below to compare progress.'),
      ));
      return;
    }

    pool.slice(0, 8).forEach((m, idx) => {
      const rank = idx + 1;
      lbBody.appendChild(el('div', {
        class: 'lb-row',
        style: m.isMe ? 'background:var(--caramel-soft);margin:0 -12px;padding:12px;border-radius:8px;border:1px solid rgba(200,118,45,0.25)' : ''
      },
        el('div', { class: 'lb-rank top-' + rank }, String(rank)),
        el('div', { style: 'width:36px;height:36px;border-radius:50%;background:' + (m.avatarBg || 'var(--bg-subtle)') + ';color:white;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:600;flex-shrink:0' }, m.initials),
        el('div', { class: 'lb-name', style: 'display:flex;align-items:center;gap:8px' },
          el('span', {}, m.name + (m.isMe ? ' (you)' : '')),
          m.tierIcon ? el('span', { style: 'font-size:1rem' }, m.tierIcon) : null
        ),
        el('div', { class: 'lb-score' }, m.points.toLocaleString() + ' pts')
      ));
    });
  }

  c.appendChild(lbCard);
  setTimeout(paintLb, 0);

  // Friends / Connections section
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '👥 Friends & connections'),
      el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, (state.following || []).length + ' following')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:16px;font-size:0.92rem' }, 'Add other members to see their progress on your friends leaderboard.'),
    (() => {
      const list = el('div', { class: 'list' });
      DATA.members.slice(0, 6).forEach(m => list.appendChild(memberRow(m)));
      return list;
    })(),
    el('button', { class: 'btn btn-secondary btn-sm mt-lg', style: 'margin-top:14px', onclick: () => toast('Opening member directory (demo)') }, 'Browse all members →')
  ));

  // Awards
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '🏅 Community awards'),
      el('span', { style: 'font-size:0.78rem;color:var(--ink-muted)' }, DATA.communityAwards[0].month)
    ),
    DATA.communityAwards.map(a => el('div', { class: 'list-item' },
      el('div', { class: 'list-item-thumb' }, a.icon),
      el('div', { class: 'list-item-body' },
        el('div', { class: 'list-item-title' }, a.title + ' · ' + a.winner),
        el('div', { class: 'list-item-meta' }, a.desc)
      )
    ))
  ));

  // Badges and Brew profile
  const split2 = el('div', { class: 'split', style: 'margin-top:32px' });

  // Badges
  const badgeCard = el('div', { class: 'card' });
  badgeCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, '🎖️ Badges'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, state.badges.length + ' / ' + DATA.badges.length)
  ));
  const wall = el('div', { class: 'badge-wall' });
  DATA.badges.slice(0, 8).forEach(b => {
    const earned = state.badges.includes(b.id);
    wall.appendChild(el('div', { class: 'badge-card' + (earned ? '' : ' locked') },
      el('div', { class: 'badge-icon ' + (b.color || 'gold') }, b.icon),
      el('div', { class: 'badge-name' }, b.name)
    ));
  });
  badgeCard.appendChild(wall);
  split2.appendChild(badgeCard);

  // Brew profile
  const p = state.profile || {};
  const machine = getMachine();
  split2.appendChild(el('div', { class: 'card' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '☕ Brew profile'),
      el('button', { onclick: () => navigate('onboard') }, 'Edit')
    ),
    el('div', { class: 'list' },
      profileRow('Method', machine?.name || '—'),
      profileRow('Roast preference', p.roast || '—'),
      profileRow('Flavors', (p.flavors || []).join(', ') || '—'),
      profileRow('Milk', p.milk || '—'),
      profileRow('Personality', personality?.name || '—')
    )
  ));
  c.appendChild(split2);
}

/* ---------------- Brew Journal card (lives on the You page) ---------------- */
function brewJournalCard() {
  const recent = state.journal.slice(0, 5);
  const card = el('div', { class: 'card', style: 'margin-bottom:32px;padding:0;overflow:hidden' });

  card.appendChild(el('div', { style: 'padding:24px 28px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px' },
    el('div', {},
      el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, '📓 Brew journal'),
      el('h3', { class: 'h3' }, 'Recent brews'),
      el('p', { style: 'color:var(--ink-soft);font-size:0.88rem;margin-top:4px' }, 'Each entry tunes your taste profile and recommendations.')
    ),
    el('button', {
      class: 'btn btn-accent btn-sm',
      onclick: () => navigate('journal')
    }, '+ Log a brew')
  ));

  if (!recent.length) {
    card.appendChild(el('div', { style: 'padding:0 28px 24px' },
      el('div', { class: 'empty', style: 'background:var(--surface-2)' },
        el('div', { class: 'empty-icon' }, '☕'),
        el('p', {}, 'No brews logged yet. Start your journal to fill in the pinwheel.')
      )
    ));
    return card;
  }

  const list = el('div', { class: 'list', style: 'padding:0 28px 24px' });
  recent.forEach(e => {
    const recipe = getRecipe(e.recipe);
    const bean = getBean(e.bean);
    const stars = '★'.repeat(e.rating || 0) + '☆'.repeat(5 - (e.rating || 0));
    list.appendChild(el('div', { class: 'list-item', style: 'padding:14px 0' },
      el('div', { class: 'list-item-thumb', style: 'background:var(--bg-subtle);font-size:1.4rem' }, recipe?.icon || '☕'),
      el('div', { class: 'list-item-body' },
        el('div', { class: 'list-item-title' }, recipe?.name || e.recipe || 'Brew'),
        el('div', { class: 'list-item-meta' }, [bean?.name, fmtDate(e.date), e.method].filter(Boolean).join(' · ')),
        e.notes ? el('div', { style: 'font-size:0.82rem;color:var(--ink-soft);margin-top:4px;font-style:italic' }, '"' + e.notes + '"') : null
      ),
      el('div', { class: 'stars', style: 'font-size:0.85rem' }, stars)
    ));
  });
  card.appendChild(list);

  if (state.journal.length > 5) {
    card.appendChild(el('div', { style: 'padding:0 28px 22px' },
      el('a', { href: '#/journal', style: 'color:var(--caramel-deep);font-weight:500;font-size:0.9rem' }, 'See all ' + state.journal.length + ' entries →')
    ));
  }
  return card;
}

// Re-derive the user's brew profile preferences from journal patterns
function updateBrewProfileFromJournal() {
  if (!state.journal.length) return;
  state.profile = state.profile || {};

  // Pick most-loved tags
  const tagFreq = {};
  state.journal.forEach(e => {
    const recipe = getRecipe(e.recipe);
    const bean = getBean(e.bean);
    const weight = (e.rating || 3) - 2; // 4-5 stars boost; 1-2 stars discount
    [].concat(recipe?.tags || [], bean?.tags || []).forEach(t => {
      tagFreq[t] = (tagFreq[t] || 0) + weight;
    });
  });

  // Find top 3 tags
  const topTags = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a]).slice(0, 3);

  // Map tags into profile fields
  const flavors = new Set(state.profile.flavors || []);
  topTags.forEach(t => {
    if (['fruity', 'berry', 'citrus'].includes(t)) flavors.add('fruity');
    if (['chocolate', 'chocolatey', 'cocoa'].includes(t)) flavors.add('chocolate');
    if (['nutty', 'caramel', 'sweet'].includes(t)) flavors.add('nutty');
    if (['floral', 'tea-like', 'jasmine'].includes(t)) flavors.add('floral');
    if (['spice', 'cinnamon', 'cardamom'].includes(t)) flavors.add('spicy');
    if (['sweet', 'honey', 'syrup'].includes(t)) flavors.add('sweet');
  });
  state.profile.flavors = Array.from(flavors).slice(0, 5);

  // Update roast preference based on most-rated bean roast
  const roastFreq = {};
  state.journal.forEach(e => {
    const bean = getBean(e.bean);
    if (bean?.roast) roastFreq[bean.roast] = (roastFreq[bean.roast] || 0) + (e.rating || 3);
  });
  const topRoast = Object.keys(roastFreq).sort((a, b) => roastFreq[b] - roastFreq[a])[0];
  if (topRoast) state.profile.roast = topRoast.toLowerCase().split(' ').join('-');

  // Re-derive milk preference based on method usage
  const methodCount = {};
  state.journal.forEach(e => methodCount[e.method] = (methodCount[e.method] || 0) + 1);
  const milkMethods = (methodCount['Espresso'] || 0);
  const blackMethods = (methodCount['Drip'] || 0) + (methodCount['Pour over'] || 0);
  if (milkMethods > blackMethods * 1.5) state.profile.milk = 'latte';
  else if (blackMethods > milkMethods * 1.5) state.profile.milk = 'black';
}

/* ---------------- Taste Tracker (flavor pinwheel) ---------------- */
// Builds a radar/pie pinwheel showing the flavor categories the user has tasted.
// Pulls from journal: each brewed bean's flavors[] feed the wheel.
function tasteTrackerCard() {
  const FAMILIES = [
    { id: 'fruity',     label: 'Fruity',     color: '#D26C6C', match: ['berry', 'fruit', 'apple', 'plum', 'citrus', 'lemon', 'strawberry', 'blackcurrant', 'cherry'] },
    { id: 'floral',     label: 'Floral',     color: '#C895C2', match: ['floral', 'jasmine', 'rose', 'tea-like', 'honeysuckle'] },
    { id: 'sweet',      label: 'Sweet',      color: '#E8B36A', match: ['caramel', 'honey', 'sugar', 'vanilla', 'syrup', 'molasses'] },
    { id: 'chocolate',  label: 'Chocolate',  color: '#7A4828', match: ['chocolate', 'cocoa', 'fudge', 'mocha'] },
    { id: 'nutty',      label: 'Nutty',      color: '#B58758', match: ['almond', 'hazelnut', 'macadamia', 'walnut', 'pecan'] },
    { id: 'spice',      label: 'Spice',      color: '#9C5C2C', match: ['cinnamon', 'cardamom', 'clove', 'pepper', 'spice'] },
    { id: 'earthy',     label: 'Earthy',     color: '#5C7A4F', match: ['earthy', 'cedar', 'tobacco', 'oak', 'wood', 'forest'] },
    { id: 'bright',     label: 'Bright',     color: '#D49856', match: ['bright', 'wine', 'tomato'] }
  ];

  const tally = {};
  FAMILIES.forEach(f => tally[f.id] = 0);
  state.journal.forEach(entry => {
    const bean = getBean(entry.bean);
    const recipe = getRecipe(entry.recipe);
    const wordPool = []
      .concat(bean?.flavors || [])
      .concat(bean?.tags || [])
      .concat(recipe?.tags || [])
      .concat(entry.flavors || [])
      .map(s => String(s).toLowerCase());
    FAMILIES.forEach(f => {
      if (f.match.some(kw => wordPool.some(w => w.includes(kw)))) tally[f.id] += 1;
    });
  });

  const totalTastes = Object.values(tally).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(tally));

  const svgNS = 'http://www.w3.org/2000/svg';
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 110;
  const rInner = 36;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('style', 'display:block;margin:0 auto');

  const sliceAngle = (Math.PI * 2) / FAMILIES.length;
  FAMILIES.forEach((f, i) => {
    const startA = -Math.PI / 2 + i * sliceAngle;
    const endA = startA + sliceAngle;
    const fill = tally[f.id] / maxCount;
    const r = rInner + (rOuter - rInner) * (totalTastes ? Math.max(0.18, fill) : 0.18);
    const x1 = cx + Math.cos(startA) * rInner, y1 = cy + Math.sin(startA) * rInner;
    const x2 = cx + Math.cos(startA) * r, y2 = cy + Math.sin(startA) * r;
    const x3 = cx + Math.cos(endA) * r, y3 = cy + Math.sin(endA) * r;
    const x4 = cx + Math.cos(endA) * rInner, y4 = cy + Math.sin(endA) * rInner;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathD = ['M', x1.toFixed(2), y1.toFixed(2), 'L', x2.toFixed(2), y2.toFixed(2),
      'A', r.toFixed(2), r.toFixed(2), 0, largeArc, 1, x3.toFixed(2), y3.toFixed(2),
      'L', x4.toFixed(2), y4.toFixed(2),
      'A', rInner.toFixed(2), rInner.toFixed(2), 0, largeArc, 0, x1.toFixed(2), y1.toFixed(2), 'Z'].join(' ');
    const slice = document.createElementNS(svgNS, 'path');
    slice.setAttribute('d', pathD);
    slice.setAttribute('fill', f.color);
    slice.setAttribute('opacity', tally[f.id] ? '0.92' : '0.2');
    slice.setAttribute('stroke', '#FFFFFF');
    slice.setAttribute('stroke-width', '2');
    svg.appendChild(slice);

    const labelA = startA + sliceAngle / 2;
    const labelR = rOuter + 14;
    const lx = cx + Math.cos(labelA) * labelR;
    const ly = cy + Math.sin(labelA) * labelR;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lx.toFixed(2));
    text.setAttribute('y', ly.toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', '600');
    text.setAttribute('fill', '#1A1614');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.textContent = f.label;
    svg.appendChild(text);

    if (tally[f.id]) {
      const cMid = startA + sliceAngle / 2;
      const cR = rInner + (r - rInner) / 2;
      const cxT = cx + Math.cos(cMid) * cR;
      const cyT = cy + Math.sin(cMid) * cR;
      const ct = document.createElementNS(svgNS, 'text');
      ct.setAttribute('x', cxT.toFixed(2));
      ct.setAttribute('y', cyT.toFixed(2));
      ct.setAttribute('text-anchor', 'middle');
      ct.setAttribute('dominant-baseline', 'middle');
      ct.setAttribute('font-size', '13');
      ct.setAttribute('font-weight', '700');
      ct.setAttribute('fill', '#FFFFFF');
      ct.setAttribute('font-family', 'Inter, sans-serif');
      ct.textContent = String(tally[f.id]);
      svg.appendChild(ct);
    }
  });

  const hub = document.createElementNS(svgNS, 'circle');
  hub.setAttribute('cx', String(cx));
  hub.setAttribute('cy', String(cy));
  hub.setAttribute('r', String(rInner - 2));
  hub.setAttribute('fill', '#1F352A');
  svg.appendChild(hub);

  const hubText = document.createElementNS(svgNS, 'text');
  hubText.setAttribute('x', String(cx));
  hubText.setAttribute('y', String(cy - 4));
  hubText.setAttribute('text-anchor', 'middle');
  hubText.setAttribute('dominant-baseline', 'middle');
  hubText.setAttribute('font-size', '20');
  hubText.setAttribute('font-weight', '600');
  hubText.setAttribute('fill', '#FAF6F0');
  hubText.setAttribute('font-family', 'Fraunces, Georgia, serif');
  hubText.setAttribute('letter-spacing', '-0.02em');
  hubText.textContent = String(state.journal.length);
  svg.appendChild(hubText);

  const hubLabel = document.createElementNS(svgNS, 'text');
  hubLabel.setAttribute('x', String(cx));
  hubLabel.setAttribute('y', String(cy + 12));
  hubLabel.setAttribute('text-anchor', 'middle');
  hubLabel.setAttribute('dominant-baseline', 'middle');
  hubLabel.setAttribute('font-size', '7');
  hubLabel.setAttribute('font-weight', '700');
  hubLabel.setAttribute('fill', '#E8C896');
  hubLabel.setAttribute('font-family', 'Inter, sans-serif');
  hubLabel.setAttribute('letter-spacing', '0.18em');
  hubLabel.textContent = 'BREWS';
  svg.appendChild(hubLabel);

  const sorted = FAMILIES.slice().sort((a, b) => tally[b.id] - tally[a.id]);
  const topFlavor = sorted[0] && tally[sorted[0].id] ? sorted[0] : null;
  const topThree = sorted.filter(f => tally[f.id] > 0).slice(0, 3);

  return el('div', { class: 'card', style: 'margin-bottom:32px;padding:0;overflow:hidden' },
    el('div', { style: 'padding:24px 28px 12px' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, '✨ Taste tracker'),
      el('h3', { class: 'h3', style: 'margin-bottom:4px' }, 'Your flavor pinwheel'),
      el('p', { style: 'color:var(--ink-soft);font-size:0.9rem' }, 'A live map of what you have been tasting. Brew more, log more, and the wheel fills in.')
    ),
    el('div', { style: 'padding:8px 28px 0;display:flex;justify-content:center' }, svg),
    topFlavor ? el('div', { style: 'padding:16px 28px 22px' },
      el('div', { style: 'background:var(--surface-2);padding:14px 16px;border-radius:12px' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Your taste signature'),
        el('div', { style: 'font-size:0.95rem;font-weight:600' },
          'You lean ',
          el('span', { style: 'color:' + topFlavor.color }, topFlavor.label.toLowerCase()),
          topThree.length > 1 ? ', then ' + topThree.slice(1).map(t => t.label.toLowerCase()).join(' and ') : '',
          '.'
        ),
        el('div', { style: 'font-size:0.85rem;color:var(--ink-soft);margin-top:4px' }, 'Based on ' + state.journal.length + ' logged brews. Each new bean fills in the wheel.')
      )
    ) : el('div', { style: 'padding:16px 28px 22px' },
      el('div', { style: 'background:var(--surface-2);padding:14px 16px;border-radius:12px;font-size:0.9rem;color:var(--ink-soft)' }, 'Log a brew to start filling your pinwheel.')
    )
  );
}

/* ---------------- AI Drink Recommender (vibe wheel) ----------------
   The previous radio-form recommender (Temperature / Strength / Milk /
   Sweet / Time + scoring against DATA.aiDrinks) has been retired in
   favor of the shared vibe wheel. The legacy aiSegmentRow / aiRecommend /
   aiResultPanel functions below are kept commented for reference only.
   ------------------------------------------------------------------ */
function aiRecommenderCard() {
  const card = el('div', { class: 'card bw-inline-card', style: 'margin-bottom:32px;padding:24px 28px;overflow:hidden;border:1px solid var(--line)' });
  card.appendChild(el('div', { class: 'bw-head bw-head-inline' },
    el('div', { class: 'bw-head-text' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, '☕ Vibe check'),
      el('h2', { class: 'bw-title' }, 'What are you craving?'),
      el('p', { class: 'bw-sub' }, 'Tap the vibes you want. We’ll suggest a drink.')
    )
  ));
  mountVibeChooser(card, {
    size: 360,
    onSubmit: (query) => sendVibeQueryToBarista(query)
  });
  return card;
}

/*
function aiSegmentRow(label, key, options) {
  const row = el('div', { style: 'margin-bottom:18px' });
  row.appendChild(el('div', { style: 'font-size:0.78rem;font-weight:600;color:var(--ink-soft);margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase' }, label));
  const grid = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
  options.forEach(opt => {
    const selected = aiPrefs[key] === opt.value;
    grid.appendChild(el('button', {
      style: 'flex:1;min-width:100px;padding:12px 14px;border-radius:12px;border:1.5px solid ' + (selected ? 'var(--caramel)' : 'var(--line)') + ';background:' + (selected ? 'var(--caramel-soft)' : 'var(--surface)') + ';font-size:0.92rem;font-weight:' + (selected ? '600' : '500') + ';color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:8px;justify-content:center;transition:border-color 0.15s, background 0.15s',
      onclick: () => {
        aiPrefs[key] = opt.value;
        render();
      }
    },
      el('span', { style: 'font-size:1.1rem' }, opt.icon),
      el('span', {}, opt.label)
    ));
  });
  row.appendChild(grid);
  return row;
}

function aiRecommend() {
  // Score every drink against user preferences. Higher score = better match.
  const scored = DATA.aiDrinks.map(d => {
    let score = 0;
    let reasons = [];
    if (aiPrefs.temp && d.temp === aiPrefs.temp) { score += 25; reasons.push(aiPrefs.temp === 'hot' ? 'served hot' : 'served cold'); }
    else if (aiPrefs.temp && d.temp !== aiPrefs.temp) score -= 30;
    if (aiPrefs.strength && d.strength === aiPrefs.strength) { score += 20; reasons.push(aiPrefs.strength + ' strength'); }
    else if (aiPrefs.strength === 'strong' && d.strength === 'light') score -= 10;
    if (aiPrefs.milk === 'yes' && d.milk) { score += 18; reasons.push('with milk'); }
    if (aiPrefs.milk === 'no' && !d.milk) { score += 18; reasons.push('black, no milk'); }
    if (aiPrefs.milk === 'no' && d.milk) score -= 20;
    if (aiPrefs.sweet === 'yes' && d.sweet) { score += 15; reasons.push('sweet'); }
    if (aiPrefs.sweet === 'no' && !d.sweet) { score += 8; }
    if (aiPrefs.sweet === 'no' && d.sweet) score -= 12;
    if (aiPrefs.time && d.time === aiPrefs.time) { score += 12; }
    if (aiPrefs.time === 'quick' && d.time === 'slow') score -= 15;
    return { drink: d, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const second = scored[1];
  return {
    drink: best.drink,
    reasons: best.reasons,
    runnerUp: second && second.score > 20 ? second.drink : null
  };
}

function aiResultPanel(result) {
  const d = result.drink;
  return el('div', { style: 'padding:24px 28px;background:linear-gradient(135deg, #1F352A 0%, #0F1F18 100%);color:white;border-top:1px solid var(--line)' },
    el('div', { style: 'font-size:0.7rem;letter-spacing:0.14em;color:rgba(232,200,150,0.7);text-transform:uppercase;margin-bottom:8px' }, '✨ Your match'),
    el('div', { style: 'display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:14px' },
      el('div', { style: 'font-size:3rem;line-height:1;flex-shrink:0' }, d.icon),
      el('div', { style: 'flex:1;min-width:200px' },
        el('div', { style: 'font-family:var(--font-display);font-size:1.6rem;font-weight:500;letter-spacing:-0.015em;margin-bottom:6px' }, d.name),
        el('p', { style: 'color:rgba(255,255,255,0.85);font-size:0.93rem;line-height:1.5;margin-bottom:10px' }, d.desc),
        result.reasons.length ? el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' },
          result.reasons.map(r => el('span', { style: 'background:rgba(255,255,255,0.12);color:rgba(232,200,150,0.95);padding:3px 10px;border-radius:999px;font-size:0.74rem;font-weight:500' }, '✓ ' + r))
        ) : null
      )
    ),
    el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:8px' },
      d.recipeId ? el('button', {
        style: 'background:var(--caramel);color:white;padding:10px 20px;border-radius:999px;font-size:0.9rem;font-weight:600;border:0;cursor:pointer',
        onclick: () => navigate('recipe/' + d.recipeId)
      }, 'Open recipe →') : null,
      result.runnerUp ? el('button', {
        style: 'background:transparent;color:rgba(232,200,150,0.85);padding:10px 16px;border-radius:999px;font-size:0.85rem;font-weight:500;border:1px solid rgba(232,200,150,0.3);cursor:pointer',
        onclick: () => toast('Or try ' + result.runnerUp.name)
      }, 'Or: ' + result.runnerUp.name) : null
    )
  );
}
*/

function memberRow(m) {
  const following = (state.following || []).includes(m.id);
  return el('div', { class: 'list-item' },
    el('div', { style: 'width:48px;height:48px;border-radius:50%;background:' + m.avatarBg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:0.95rem;font-weight:600;flex-shrink:0' }, m.initials),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title', style: 'display:flex;align-items:center;gap:8px' },
        el('span', {}, m.name),
        el('span', { class: 'pill', style: 'font-size:0.7rem' }, m.tierIcon + ' ' + m.tier.charAt(0).toUpperCase() + m.tier.slice(1).replace('-', ' '))
      ),
      el('div', { class: 'list-item-meta' }, m.bio + ' · ' + m.location)
    ),
    el('button', {
      class: 'btn btn-sm ' + (following ? 'btn-secondary' : 'btn-accent'),
      style: 'flex-shrink:0',
      onclick: () => {
        state.following = state.following || [];
        if (following) {
          state.following = state.following.filter(x => x !== m.id);
          toast('Unfollowed ' + m.name);
        } else {
          state.following.push(m.id);
          state.points += 5;
          toast('Following ' + m.name + '. +5 pts');
        }
        save();
        render();
      }
    }, following ? '✓ Following' : '+ Follow')
  );
}

/* ----- Coffee Passport (full view) ----- */
function passportStampCount() {
  return uniqueOriginsTried() + (state.passportStamps || []).length;
}

function passportPreview() {
  const stamps = collectedStamps();
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(6, 1fr);gap:10px' });
  DATA.passportRegions.forEach(r => {
    const collected = stamps.includes(r.id);
    grid.appendChild(el('div', {
      style: 'aspect-ratio:1;background:' + (collected ? 'var(--green-soft)' : 'var(--surface-2)') + ';border:2px ' + (collected ? 'solid var(--success)' : 'dashed var(--line)') + ';border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;opacity:' + (collected ? '1' : '0.55'),
      title: r.name
    },
      el('div', {
        style: 'font-family:var(--font-display);font-weight:700;font-size:12px;line-height:1.1;color:var(--ink);letter-spacing:-0.01em'
      }, r.name),
      collected ? el('div', { style: 'font-size:9px;color:var(--success);font-weight:700;margin-top:3px;font-family:var(--font-mono);letter-spacing:0.06em' }, '✓') : null
    ));
  });
  return grid;
}

// Friendly robot barista SVG — simple, crisp, on-brand
function robotBaristaSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('style', 'width:80%;max-width:120px;height:auto');
  svg.innerHTML = `
    <defs>
      <linearGradient id="rb-body" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#FFFEFB"/>
        <stop offset="100%" stop-color="#D9C2A4"/>
      </linearGradient>
      <radialGradient id="rb-eye" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#F5C518"/>
        <stop offset="100%" stop-color="#C28F0E"/>
      </radialGradient>
    </defs>
    <!-- Antenna -->
    <line x1="60" y1="22" x2="60" y2="10" stroke="#F5C518" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="60" cy="8" r="3.5" fill="#E84F1A" stroke="#FFF5EB" stroke-width="1"/>

    <!-- Head -->
    <rect x="32" y="22" width="56" height="42" rx="14" fill="url(#rb-body)" stroke="#FFF5EB" stroke-width="2"/>

    <!-- Eyes (round, friendly, marigold) -->
    <circle cx="48" cy="40" r="6" fill="url(#rb-eye)" stroke="#1F1A14" stroke-width="1.5"/>
    <circle cx="72" cy="40" r="6" fill="url(#rb-eye)" stroke="#1F1A14" stroke-width="1.5"/>
    <!-- Eye highlights -->
    <circle cx="46" cy="38" r="1.5" fill="#FFF5EB"/>
    <circle cx="70" cy="38" r="1.5" fill="#FFF5EB"/>

    <!-- Smile -->
    <path d="M48,52 Q60,58 72,52" stroke="#1F1A14" stroke-width="2" stroke-linecap="round" fill="none"/>

    <!-- Side ears / speakers -->
    <rect x="26" y="34" width="6" height="14" rx="3" fill="#F5C518" stroke="#FFF5EB" stroke-width="1"/>
    <rect x="88" y="34" width="6" height="14" rx="3" fill="#F5C518" stroke="#FFF5EB" stroke-width="1"/>

    <!-- Body / apron -->
    <rect x="38" y="64" width="44" height="28" rx="6" fill="url(#rb-body)" stroke="#FFF5EB" stroke-width="2"/>
    <!-- Apron tomato stripe -->
    <rect x="38" y="72" width="44" height="6" fill="#E84F1A"/>
    <!-- Bow tie -->
    <path d="M55,66 L65,66 L62,70 L65,74 L55,74 L58,70 Z" fill="#E84F1A" stroke="#1F1A14" stroke-width="0.8"/>

    <!-- Coffee cup the bot is holding -->
    <ellipse cx="60" cy="98" rx="14" ry="3" fill="#1F1A14" opacity="0.3"/>
    <path d="M48,84 Q47,94 52,98 L68,98 Q73,94 72,84 Z" fill="#FFF5EB" stroke="#1F1A14" stroke-width="1.5"/>
    <ellipse cx="60" cy="84" rx="12" ry="2.5" fill="#3C2110"/>
    <ellipse cx="60" cy="83" rx="10" ry="1.8" fill="#7A4F2A"/>
  `;
  return svg;
}

function collectedStamps() {
  const fromBeans = new Set();
  state.journal.forEach(e => {
    const bean = getBean(e.bean);
    if (bean && bean.originRef) fromBeans.add(bean.originRef);
  });
  return Array.from(fromBeans);
}

function renderPassport(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('a', { href: '#/you', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← You'));

  const stamps = collectedStamps();

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, '🌍 Coffee Passport'),
    el('h1', { class: 'h1' }, stamps.length + ' / ' + DATA.passportRegions.length + ' stamps collected'),
    el('p', { style: 'max-width:580px' }, 'Every time you log a brew with a bean from a new origin, you collect that origin\'s stamp. Try them all to complete your passport.')
  ));

  // Group by region
  const byRegion = {};
  DATA.passportRegions.forEach(r => {
    byRegion[r.region] = byRegion[r.region] || [];
    byRegion[r.region].push(r);
  });

  Object.keys(byRegion).forEach(regionName => {
    c.appendChild(el('h3', { class: 'h3 mb', style: 'margin-top:32px;margin-bottom:16px' }, regionName));
    const grid = el('div', { class: 'grid grid-4' });
    byRegion[regionName].forEach(r => {
      const collected = stamps.includes(r.id);
      const origin = getOrigin(r.id);
      grid.appendChild(el('div', {
        class: 'card',
        style: 'padding:20px;text-align:center;cursor:' + (origin ? 'pointer' : 'default') + ';' + (collected ? 'border-color:var(--success);background:var(--green-soft)' : 'opacity:0.6'),
        onclick: () => origin && navigate('origin/' + origin.id)
      },
        el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:1.4rem;margin-bottom:6px;letter-spacing:-0.01em;color:var(--ink)' + (collected ? '' : ';opacity:0.55') }, r.name),
        el('div', { style: 'font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:6px' }, r.region),
        el('div', { style: 'font-size:0.78rem;margin-top:4px' }, collected ? el('span', { style: 'color:var(--success);font-weight:700;font-family:var(--font-mono);letter-spacing:0.08em' }, '✓ STAMPED') : el('span', { style: 'color:var(--ink-muted);font-family:var(--font-mono);letter-spacing:0.08em' }, 'NOT YET'))
      ));
    });
    c.appendChild(grid);
  });
}

/* ----- Tiles / rows ----- */

/* mediaThumb: returns an <img> if item.photo is set, else a styled emoji block.
   Add a photo by setting `photo: 'images/your-file.jpg'` on the data item.
   Place the file in the images/ folder of the repo. */
function mediaThumb(item, opts = {}) {
  const cls = opts.class || item.thumbClass || 'tile-thumb';
  const tag = opts.tag;
  const wrap = el('div', { class: cls, style: 'position:relative' });
  if (item.photo) {
    wrap.appendChild(el('img', {
      src: item.photo,
      alt: item.name || '',
      style: 'width:100%;height:100%;object-fit:cover;display:block'
    }));
  } else {
    wrap.appendChild(el('span', {}, item.icon || '☕'));
  }
  if (tag) wrap.appendChild(el('span', { class: 'tile-thumb-tag' }, tag));
  return wrap;
}

function recipeTile(r) {
  return el('div', {
    class: 'tile',
    onclick: () => navigate('recipe/' + r.id)
  },
    mediaThumb(r, { tag: r.method }),
    el('div', { class: 'tile-body' },
      el('div', { class: 'tile-title' }, r.name),
      el('div', { class: 'tile-meta' },
        el('span', {}, r.time),
        el('span', {}, '•'),
        el('span', {}, r.difficulty)
      )
    )
  );
}

function beanTile(b) {
  return el('div', {
    class: 'tile',
    onclick: () => navigate('beans')
  },
    mediaThumb(b),
    el('div', { class: 'tile-body' },
      el('div', { class: 'tile-title' }, b.name),
      el('div', { class: 'tile-meta' },
        el('span', {}, b.roaster),
        el('span', {}, '•'),
        el('span', {}, b.roast)
      )
    )
  );
}

function journalRow(e) {
  const recipe = getRecipe(e.recipe);
  const bean = getBean(e.bean);
  const stars = '★'.repeat(e.rating) + '☆'.repeat(5 - e.rating);
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-thumb' }, recipe?.icon || '☕'),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title' }, recipe?.name || e.recipe),
      el('div', { class: 'list-item-meta' }, [
        bean?.name || e.bean,
        '•',
        fmtDate(e.date),
        '•',
        e.method
      ].join(' '))
    ),
    el('div', { class: 'list-item-action stars' }, stars)
  );
}

function feedRow(f) {
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-thumb' }, f.authorIcon),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title' }, f.title),
      el('div', { class: 'list-item-meta' }, [f.author, '•', f.kind, f.duration ? '• ' + f.duration : '', '•', f.time].filter(Boolean).join(' '))
    ),
    el('div', { class: 'list-item-action' },
      el('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => toast('Opening ' + f.title + ' (demo)')
      }, f.kind === 'Video' ? '▶ Watch' : 'Read')
    )
  );
}

/* ----- Recipes ----- */
function renderRecipes(main) {
  main.innerHTML = '';
  const today = new Date();
  const issueNum = ((dayOfYear(today) % 99) + 1).toString().padStart(2, '0');
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  const c = el('div', { class: 'container' });
  main.appendChild(c);

  // Newspaper-style masthead bar (matches home)
  c.appendChild(el('div', {
    style: 'display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--ink);border-bottom:1px solid var(--ink);padding:10px 0;margin:32px 0 28px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink)'
  },
    el('span', { style: 'font-weight:700' }, 'Vol. III · No. ' + issueNum),
    el('span', { style: 'opacity:0.7' }, dateStr),
    el('span', { style: 'font-weight:700' }, 'The Recipe Desk')
  ));

  // Big editorial headline + dek
  c.appendChild(el('div', { style: 'margin-bottom:28px' },
    el('div', { style: 'font-family:var(--font-mono);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--tomato);font-weight:700;margin-bottom:12px' }, '◆ The Recipe Desk · Section C'),
    el('h1', {
      style: 'font-family:var(--font-display);font-weight:800;font-size:clamp(44px, 6.5vw, 84px);line-height:0.94;letter-spacing:-0.025em;margin:0 0 16px;max-width:880px'
    },
      'The brews ',
      el('em', { style: 'font-style:italic;color:var(--tomato)' }, 'every'),
      ' home barista should know.'
    ),
    el('p', {
      style: 'font-family:var(--font-display);font-size:19px;line-height:1.45;color:var(--ink-soft);max-width:680px;font-style:italic;border-left:3px solid var(--ink);padding-left:16px;margin:0'
    }, 'Calibrated to the equipment you own. Tested by the Brew Lab desk. From the morning drip to the slow-pour ritual, here is the canon.')
  ));

  // Section divider with byline-style label
  c.appendChild(el('div', {
    style: 'display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:10px;margin:36px 0 24px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;text-transform:uppercase'
  },
    el('span', { style: 'font-weight:700;color:var(--ink)' }, '☕ Filed by Method'),
    el('span', { style: 'opacity:0.6' }, 'Tap any tab to filter')
  ));

  // Tabs by method
  const methods = ['All', 'Drip', 'Espresso', 'Cold brew', 'Pour over'];
  let active = 'All';
  const tabs = el('div', { class: 'tabs', style: 'margin-bottom:24px' });
  methods.forEach(m => {
    const t = el('button', { class: 'tab' + (m === active ? ' active' : ''), onclick: () => { active = m; paint(); } }, m);
    tabs.appendChild(t);
  });
  c.appendChild(tabs);

  // Column-rule grid (newspaper feel)
  const grid = el('div', { class: 'grid grid-3 newsroom-grid', id: 'recipeGrid' });
  c.appendChild(grid);

  function paint() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent === active));
    grid.innerHTML = '';
    let list = DATA.recipes.slice();
    if (active !== 'All') list = list.filter(r => r.method === active);
    // Surface user's machine first
    const m = getMachine();
    if (m) list.sort((a, b) => (b.machineCompat.includes(m.id) ? 1 : 0) - (a.machineCompat.includes(m.id) ? 1 : 0));
    list.forEach(r => grid.appendChild(recipeTile(r)));
  }
  paint();
}

function renderRecipeDetail(main, id) {
  main.innerHTML = '';
  const today = new Date();
  const issueNum = ((dayOfYear(today) % 99) + 1).toString().padStart(2, '0');
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  const c = el('div', { class: 'container' });
  main.appendChild(c);
  const r = getRecipe(id);
  if (!r) {
    c.appendChild(el('p', {}, 'Recipe not found.'));
    return;
  }
  const machine = getMachine();
  const isCalibrated = machine && r.machineCompat.includes(machine.id);

  // Newspaper masthead
  c.appendChild(el('div', {
    style: 'display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--ink);border-bottom:1px solid var(--ink);padding:10px 0;margin:32px 0 24px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink)'
  },
    el('span', { style: 'font-weight:700' }, 'Vol. III · No. ' + issueNum),
    el('span', { style: 'opacity:0.7' }, dateStr),
    el('span', { style: 'font-weight:700' }, 'The Recipe Desk')
  ));

  c.appendChild(el('a', { href: '#/recipes', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:20px;display:inline-flex' }, '← All recipes'));

  // Editorial headline block
  c.appendChild(el('div', { style: 'margin-bottom:28px;border-bottom:1px solid var(--ink);padding-bottom:24px' },
    el('div', { style: 'font-family:var(--font-mono);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--tomato);font-weight:700;margin-bottom:12px' },
      '◆ Method · ', r.method
    ),
    el('h1', {
      style: 'font-family:var(--font-display);font-weight:800;font-size:clamp(40px, 5.5vw, 72px);line-height:0.94;letter-spacing:-0.025em;margin:0 0 14px'
    },
      (() => {
        const parts = (r.name || '').split(' ');
        return [parts.slice(0, -1).join(' '), ' ', el('em', { style: 'font-style:italic;color:var(--tomato)' }, parts.slice(-1)[0])];
      })()
    ),
    el('p', {
      style: 'font-family:var(--font-display);font-size:19px;line-height:1.45;color:var(--ink-soft);max-width:680px;font-style:italic;margin:0'
    }, r.desc)
  ));

  // Top row: meta + actions
  const meta = el('div', { class: 'card', style: 'margin-bottom:24px' },
    el('div', { class: 'grid grid-4', style: 'gap:24px' },
      el('div', {},
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Ratio'),
        el('div', { class: 'h4' }, r.ratio || '—')
      ),
      el('div', {},
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Dose'),
        el('div', { class: 'h4' }, r.dose || '—')
      ),
      el('div', {},
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Grind'),
        el('div', { class: 'h4' }, r.grind || '—')
      ),
      el('div', {},
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Water'),
        el('div', { class: 'h4' }, r.water || '—')
      )
    )
  );
  c.appendChild(meta);

  if (isCalibrated) {
    c.appendChild(el('div', { class: 'insight-row mb-lg', style: 'margin-bottom:24px' },
      el('span', { class: 'icon' }, '✓'),
      el('div', {},
        el('div', { style: 'font-weight:600' }, 'Recommended for your brew method'),
        el('div', { style: 'font-size:0.85rem;color:var(--ink-soft)' }, 'This recipe matches the equipment in your taste profile.')
      )
    ));
  }

  // Steps
  const steps = el('div', {});
  r.steps.forEach(s => {
    steps.appendChild(el('div', { class: 'step' },
      el('div', { class: 'step-title' }, s.title),
      el('div', { class: 'step-body' }, s.body),
      s.time ? el('div', { class: 'step-time' }, s.time) : null
    ));
  });
  c.appendChild(steps);

  // Actions
  c.appendChild(el('div', { class: 'mt-lg', style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:32px' },
    el('button', {
      class: 'btn btn-accent btn-lg',
      onclick: () => {
        navigate('journal');
        setTimeout(() => {
          const sel = document.getElementById('newRecipe');
          if (sel) sel.value = r.id;
        }, 100);
      }
    }, '✓ Log this brew'),
    el('button', {
      class: 'btn btn-secondary',
      onclick: () => {
        if (state.favorites.includes(r.id)) {
          state.favorites = state.favorites.filter(x => x !== r.id);
          toast('Removed from favorites');
        } else {
          state.favorites.push(r.id);
          toast('Saved to favorites');
        }
        save();
      }
    }, state.favorites.includes(r.id) ? '★ Saved' : '☆ Save recipe'),
    el('button', {
      class: 'btn btn-secondary',
      onclick: () => navigate('barista')
    }, '💬 Ask Barista about this')
  ));
}

/* ----- Journal ----- */
function renderJournal(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Brew Journal'),
    el('h1', { class: 'h1' }, 'Your taste, tracked'),
    el('p', {}, 'Log every brew. We learn your patterns over time and tune your recommendations. No one else can give you this.')
  ));

  // Stats
  const stats = el('div', { class: 'grid grid-4 mb-lg' });
  const total = state.journal.length;
  const avgRating = total ? (state.journal.reduce((s, e) => s + e.rating, 0) / total).toFixed(1) : '—';
  const uniqueBeans = new Set(state.journal.map(e => e.bean)).size;
  const streak = computeStreak(state.journal);
  [
    ['Brews logged', total],
    ['Avg rating', avgRating + (avgRating !== '—' ? ' / 5' : '')],
    ['Beans tried', uniqueBeans],
    ['Day streak', streak]
  ].forEach(([label, value]) => {
    stats.appendChild(el('div', { class: 'card' },
      el('div', { class: 'stat-num' }, String(value)),
      el('div', { class: 'stat-label' }, label)
    ));
  });
  c.appendChild(stats);

  // Insight
  if (total >= 2) {
    const insight = generateInsight();
    if (insight) {
      c.appendChild(el('div', { class: 'insight-row mb-lg', style: 'margin-bottom:24px' },
        el('span', { class: 'icon' }, '💡'),
        el('div', {}, el('div', { style: 'font-weight:600' }, 'Pattern detected'), el('div', { style: 'font-size:0.9rem;color:var(--ink-soft)' }, insight))
      ));
    }
  }

  // Two columns: form + list
  const split = el('div', { class: 'split' });

  // List of entries
  const listCard = el('div', { class: 'card' });
  listCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'All entries')
  ));
  if (state.journal.length) {
    const list = el('div', { class: 'list' });
    state.journal.forEach(e => list.appendChild(journalRow(e)));
    listCard.appendChild(list);
  } else {
    listCard.appendChild(el('div', { class: 'empty' },
      el('div', { class: 'empty-icon' }, '☕'),
      el('p', {}, 'No entries yet. Log your first brew on the right.')
    ));
  }
  split.appendChild(listCard);

  // Form
  const formCard = el('div', { class: 'card' });
  formCard.appendChild(el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'Log a brew')));

  const recipeOpts = el('select', { class: 'select', id: 'newRecipe' });
  DATA.recipes.forEach(r => recipeOpts.appendChild(el('option', { value: r.id }, r.name)));
  const beanOpts = el('select', { class: 'select', id: 'newBean' });
  DATA.beans.forEach(b => beanOpts.appendChild(el('option', { value: b.id }, b.name)));

  let rating = 5;
  const starsRow = el('div', { class: 'stars-input', id: 'newStars' });
  for (let i = 1; i <= 5; i++) {
    starsRow.appendChild(el('span', {
      class: i <= rating ? 'on' : '',
      onclick: () => {
        rating = i;
        Array.from(starsRow.children).forEach((s, idx) => s.classList.toggle('on', idx < rating));
      }
    }, '★'));
  }

  const notes = el('textarea', { class: 'textarea', id: 'newNotes', placeholder: 'Tasting notes, what worked, what to change next time...' });

  const form = el('div', { class: 'stack', style: '--stack-gap:14px' },
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Recipe'),
      recipeOpts
    ),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Bean'),
      beanOpts
    ),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Rating'),
      starsRow
    ),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Notes'),
      notes
    ),
    el('button', {
      class: 'btn btn-accent btn-block',
      onclick: () => {
        const recipeId = document.getElementById('newRecipe').value;
        const beanId = document.getElementById('newBean').value;
        const notesV = document.getElementById('newNotes').value;
        const r = getRecipe(recipeId);
        const today = new Date();
        const entry = {
          date: today.toISOString().slice(0, 10),
          time: today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          recipe: recipeId,
          bean: beanId,
          method: r.method,
          rating: rating,
          notes: notesV || ''
        };
        state.journal.unshift(entry);
        // Award badges
        if (state.journal.length === 1 && !state.badges.includes('first-brew')) state.badges.push('first-brew');
        const newStreak = computeStreak(state.journal);
        if (newStreak >= 7 && !state.badges.includes('streak-7')) state.badges.push('streak-7');
        const beans = new Set(state.journal.map(e => e.bean)).size;
        if (beans >= 5 && !state.badges.includes('explorer')) state.badges.push('explorer');
        if (state.journal.length >= 25 && !state.badges.includes('critic')) state.badges.push('critic');
        state.points += 10;
        // Auto-update brew profile based on journal patterns
        updateBrewProfileFromJournal();
        save();
        // Sync to Supabase if signed in
        if (state.user && !state.user.isGuest) {
          DB.addBrew(state.user.id, entry).then(saved => {
            if (saved) entry.id = saved.id;
          }).catch(e => console.warn('Sync brew failed', e));
          syncProfile();
        }
        toast('Brew logged. +10 pts');
        render();
      }
    }, 'Save entry')
  );
  formCard.appendChild(form);
  split.appendChild(formCard);
  c.appendChild(split);
}

function computeStreak(journal) {
  if (!journal.length) return 0;
  const dates = [...new Set(journal.map(e => e.date))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  // accept today or yesterday as start
  const today = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor.getTime() - 86400000).toISOString().slice(0, 10);
  let i = 0;
  if (dates[0] === today) {
    streak = 1; i = 1; cursor = new Date(today);
  } else if (dates[0] === yesterday) {
    streak = 1; i = 1; cursor = new Date(yesterday);
  } else {
    return 0;
  }
  while (i < dates.length) {
    const expected = new Date(cursor.getTime() - 86400000).toISOString().slice(0, 10);
    if (dates[i] === expected) { streak++; cursor = new Date(expected); i++; }
    else break;
  }
  return streak;
}

function generateInsight() {
  const j = state.journal;
  if (j.length < 2) return null;
  // pattern: rating by bean
  const byBean = {};
  j.forEach(e => {
    byBean[e.bean] = byBean[e.bean] || { sum: 0, n: 0 };
    byBean[e.bean].sum += e.rating;
    byBean[e.bean].n += 1;
  });
  let best = null;
  for (const id in byBean) {
    const avg = byBean[id].sum / byBean[id].n;
    if (!best || avg > best.avg) best = { id, avg, n: byBean[id].n };
  }
  if (best && best.n >= 2) {
    const bean = getBean(best.id);
    if (bean) return `You consistently rate ${bean.name} highest. We will surface more ${bean.tags.slice(0, 2).join(' / ')} beans in your recommendations.`;
  }
  return null;
}

/* ----- Beans / discovery ----- */
function renderBeans(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Beans'),
    el('h1', { class: 'h1' }, 'Discover beans you would not pick yourself.'),
    el('p', { style: 'max-width:620px' }, 'A small, curated set of beans from world-class roasters. Each one comes with the story of where it was grown and who grew it.')
  ));

  // Origin map shortcut
  c.appendChild(el('div', {
    class: 'card', style: 'margin-bottom:48px;display:flex;align-items:center;gap:20px;padding:24px;cursor:pointer;flex-wrap:wrap',
    onclick: () => navigate('origins')
  },
    el('div', { style: 'font-size:2.4rem' }, '🌍'),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { style: 'font-weight:600;font-size:1.05rem;margin-bottom:2px' }, 'Bean origins map'),
      el('div', { style: 'font-size:0.9rem;color:var(--ink-soft)' }, 'See where every bean is grown. Meet the farmer behind the cup.')
    ),
    el('span', { style: 'color:var(--ink-muted)' }, '→')
  ));

  // Bean grid
  const recommended = recommendBeans(99);
  const grid = el('div', { class: 'grid grid-2', style: 'gap:20px' });
  recommended.forEach(b => grid.appendChild(beanRow(b)));
  c.appendChild(grid);
}

function beanRow(b) {
  const origin = getOrigin(b.originRef);

  const card = el('div', { class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer' });
  card.appendChild(el('div', { class: 'tile-thumb', style: 'aspect-ratio:5/2' },
    el('span', { style: 'font-size:4rem' }, b.icon)
  ));
  card.appendChild(el('div', { style: 'padding:24px' },
    el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, b.roaster),
    el('h3', { class: 'h3', style: 'margin-bottom:6px' }, b.name),
    el('div', { class: 'muted', style: 'font-size:0.9rem;margin-bottom:14px' }, b.origin + ' · ' + b.roast),
    el('p', { style: 'color:var(--ink-soft);line-height:1.6;font-size:0.95rem;margin-bottom:14px' }, b.notes || ''),
    el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px' },
      b.flavors.map(f => el('span', { class: 'pill' }, f))
    ),
    origin ? el('button', {
      class: 'btn btn-secondary btn-sm',
      onclick: (e) => { e.stopPropagation(); navigate('origin/' + origin.id); }
    }, '🌍 Meet the farmer at ' + origin.region) : null
  ));
  return card;
}

/* ----- Origins map ----- */
function renderOrigins(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Bean Origins'),
    el('h1', { class: 'h1' }, 'Meet the farmers behind your cup'),
    el('p', {}, 'Click a pin to meet the farmer or roaster, hear their story, and see exactly where your beans are grown. Every origin includes a 4-7 minute video filmed at the source.')
  ));

  const mapWrap = el('div', { class: 'card', style: 'padding:24px;background:linear-gradient(180deg, #E8F0F5 0%, #F0E8DC 100%)' });
  // SVG world map - simplified silhouette
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 50');
  svg.setAttribute('style', 'width:100%;height:auto;max-height:480px;display:block');

  // Simplified continents (very rough) — these are decorative shapes for the demo.
  const continents = [
    // Americas
    'M 15 18 L 19 14 L 22 16 L 24 22 L 22 28 L 24 34 L 22 42 L 26 46 L 30 44 L 30 36 L 32 28 L 30 22 L 28 18 L 24 14 L 18 14 Z',
    // Europe
    'M 44 18 L 50 14 L 55 16 L 56 20 L 53 24 L 50 24 L 46 22 Z',
    // Africa
    'M 48 26 L 56 24 L 60 28 L 58 38 L 54 44 L 50 42 L 46 32 Z',
    // Asia
    'M 56 12 L 70 10 L 82 14 L 86 22 L 82 28 L 76 30 L 70 26 L 64 24 L 60 20 Z',
    // SE Asia / Oceania
    'M 80 32 L 86 32 L 88 36 L 84 40 L 80 38 Z',
    // Australia
    'M 82 40 L 88 40 L 90 44 L 86 46 L 82 44 Z'
  ];
  continents.forEach(d => {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#D5C7B5');
    path.setAttribute('stroke', '#B8A78F');
    path.setAttribute('stroke-width', '0.2');
    svg.appendChild(path);
  });

  // Pins
  DATA.origins.forEach(o => {
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('style', 'cursor:pointer');
    g.addEventListener('click', () => navigate('origin/' + o.id));

    const ring = document.createElementNS(svgNS, 'circle');
    ring.setAttribute('cx', o.x); ring.setAttribute('cy', o.y);
    ring.setAttribute('r', '2.2');
    ring.setAttribute('fill', '#C8762D');
    ring.setAttribute('opacity', '0.25');

    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', o.x); dot.setAttribute('cy', o.y);
    dot.setAttribute('r', '0.9');
    dot.setAttribute('fill', '#A85F1F');
    dot.setAttribute('stroke', 'white');
    dot.setAttribute('stroke-width', '0.2');

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', o.x);
    label.setAttribute('y', o.y - 3);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '1.6');
    label.setAttribute('font-family', 'Inter, sans-serif');
    label.setAttribute('font-weight', '600');
    label.setAttribute('fill', '#2A1A14');
    label.textContent = o.country;

    g.appendChild(ring);
    g.appendChild(dot);
    g.appendChild(label);
    svg.appendChild(g);
  });
  mapWrap.appendChild(svg);
  c.appendChild(mapWrap);

  c.appendChild(el('div', { style: 'height: 32px' }));
  c.appendChild(el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'All origins'), null));

  const grid = el('div', { class: 'grid grid-3' });
  DATA.origins.forEach(o => {
    grid.appendChild(el('div', { class: 'tile', onclick: () => navigate('origin/' + o.id) },
      el('div', { class: 'tile-thumb tile-thumb-green' },
        el('span', { style: 'font-size:3rem' }, o.photoIcon)
      ),
      el('div', { class: 'tile-body' },
        el('div', { class: 'tile-title' }, o.region + ', ' + o.country),
        el('div', { class: 'tile-meta' },
          el('span', {}, o.farmer),
          el('span', {}, '•'),
          el('span', {}, '▶ ' + o.videoDuration)
        )
      )
    ));
  });
  c.appendChild(grid);
}

function renderOriginDetail(main, id) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);
  const o = getOrigin(id);
  if (!o) { c.appendChild(el('p', {}, 'Origin not found.')); return; }

  c.appendChild(el('a', { href: '#/origins', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← All origins'));

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, o.country + ' · ' + o.region),
    el('h1', { class: 'h1' }, o.farmer),
    el('p', {}, o.farmName + ' · ' + o.altitude + ' · ' + o.varietal)
  ));

  // Video card
  const video = el('div', { class: 'card', style: 'padding:0;overflow:hidden;margin-bottom:24px' },
    el('div', { style: 'aspect-ratio:16/7;background:linear-gradient(135deg, var(--green) 0%, #1d3327 100%);display:flex;align-items:center;justify-content:center;color:var(--bg);position:relative;cursor:pointer', onclick: () => toast('Playing video (demo)') },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font-size:5rem;line-height:1' }, '▶'),
        el('div', { style: 'margin-top:12px;font-family:var(--font-display);font-size:1.4rem' }, o.videoTitle),
        el('div', { style: 'margin-top:4px;font-size:0.9rem;opacity:0.8' }, o.videoDuration + ' · Filmed at ' + o.farmName)
      )
    )
  );
  c.appendChild(video);

  c.appendChild(el('div', { class: 'split' },
    el('div', { class: 'card' },
      el('h3', { class: 'h3 mb' }, 'About ' + o.farmer.split(' ')[0]),
      el('p', { style: 'margin-top:12px;color:var(--ink-soft);line-height:1.65' }, o.bio),
      el('div', { class: 'mt-lg' },
        el('h4', { class: 'h4 mb' }, 'Why we sourced from here'),
        el('p', { style: 'margin-top:8px;color:var(--ink-soft);line-height:1.65' }, o.story)
      )
    ),
    el('div', { class: 'card card-soft' },
      el('h3', { class: 'h3 mb' }, 'Origin spec'),
      el('div', { class: 'list' },
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '🏔️'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-title' }, 'Altitude'),
            el('div', { class: 'list-item-meta' }, o.altitude)
          )
        ),
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '🌱'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-title' }, 'Varietal'),
            el('div', { class: 'list-item-meta' }, o.varietal)
          )
        ),
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '💧'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-title' }, 'Processing'),
            el('div', { class: 'list-item-meta' }, o.processing)
          )
        )
      ),
      el('div', { class: 'mt-lg' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:8px' }, 'Roaster partners'),
        el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' },
          o.partners.map(p => el('span', { class: 'pill pill-green' }, p))
        )
      )
    )
  ));

  // Beans from this origin
  const fromHere = DATA.beans.filter(b => b.originRef === o.id);
  if (fromHere.length) {
    c.appendChild(el('div', { style: 'height:32px' }));
    c.appendChild(el('h3', { class: 'h3 mb' }, 'Beans from this origin'));
    const grid = el('div', { class: 'grid grid-3', style: 'margin-top:16px' });
    fromHere.forEach(b => grid.appendChild(beanTile(b)));
    c.appendChild(grid);
  }
}

/* ----- Virtual Barista ----- */
function renderBarista(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container-narrow', style: 'max-width:780px' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, '☕ Virtual Barista'),
    el('h1', { class: 'h1' }, 'Ask anything coffee'),
    el('p', {}, 'Trained on your machine, your taste profile, and your last 30 brews. Better answers than a Google search, kinder than r/espresso.')
  ));

  // Chat container
  const chat = el('div', { class: 'card', style: 'padding:24px;min-height:400px;display:flex;flex-direction:column;gap:16px' }, );
  const log = el('div', { id: 'baristaLog', style: 'display:flex;flex-direction:column;gap:14px;flex:1' });
  chat.appendChild(log);
  c.appendChild(chat);

  // Initial greeting
  const machine = getMachine();
  const greet = `Hey ${state.user?.name?.split(' ')[0] || 'there'}. I see you brew with a ${machine?.name?.toLowerCase() || 'home setup'} and lean toward ${state.profile?.flavors?.[0] || 'balanced'} flavors. What can I help with?`;
  appendBaristaMsg('barista', greet);

  // Suggested prompts
  const suggestions = el('div', { class: 'mt', style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:16px' });
  DATA.baristaPrompts.forEach(p => {
    suggestions.appendChild(el('button', {
      class: 'pill pill-outline',
      style: 'cursor:pointer;background:var(--surface);border-color:var(--line)',
      onclick: () => sendBaristaMsg(p)
    }, p));
  });
  c.appendChild(suggestions);

  // Input
  c.appendChild(el('div', { class: 'mt-lg', style: 'margin-top:24px;display:flex;gap:8px' },
    el('input', {
      class: 'input', id: 'baristaInput', placeholder: 'Ask the barista anything...',
      onkeydown: (e) => { if (e.key === 'Enter') sendBaristaMsg(); }
    }),
    el('button', { class: 'btn btn-accent', onclick: () => sendBaristaMsg() }, 'Send')
  ));

  // If the wheel modal handed off a query, send it once the chat is mounted
  if (window._pendingBaristaQuery) {
    const pending = window._pendingBaristaQuery;
    delete window._pendingBaristaQuery;
    setTimeout(() => sendBaristaMsg(pending), 350);
  }
}

function appendBaristaMsg(who, text) {
  const log = document.getElementById('baristaLog');
  if (!log) return;
  const isUser = who === 'user';
  const wrap = el('div', { style: 'display:flex;gap:12px;align-items:flex-start' + (isUser ? ';flex-direction:row-reverse' : '') },
    el('div', { class: 'avatar' + (isUser ? '' : ''), style: isUser ? 'background:var(--espresso);color:var(--bg)' : '' }, isUser ? initials(state.user?.name) : '☕'),
    el('div', {
      style: 'background:' + (isUser ? 'var(--caramel-soft)' : 'var(--surface-2)') + ';padding:12px 16px;border-radius:14px;max-width:70%;line-height:1.55;font-size:0.95rem;border:1px solid ' + (isUser ? 'rgba(200,118,45,0.2)' : 'var(--line))')
    }, text)
  );
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

function sendBaristaMsg(text) {
  const input = document.getElementById('baristaInput');
  const msg = text || (input ? input.value.trim() : '');
  if (!msg) return;
  if (input) input.value = '';
  appendBaristaMsg('user', msg);
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let key = 'default';
    if (lower.includes('sour')) key = 'sour';
    else if (lower.includes('milk') || lower.includes('latte') || lower.includes('cappucc')) key = 'milky';
    else if (lower.includes('grind') || lower.includes('em-15') || lower.includes('em15') || lower.includes('espresso')) key = 'grind';
    else if (lower.includes('cold')) key = 'cold brew';
    else if (lower.includes('recommend') || lower.includes('try') || lower.includes('different') || lower.includes('new')) key = 'recommend';
    else if (lower.includes('cafe') || lower.includes('café') || lower.includes('order') || lower.includes('shop')) key = 'cafe';
    appendBaristaMsg('barista', DATA.baristaResponses[key]);
  }, 700);
}

/* ----- Community ----- */
// Mock feed of community activity — likes, recommendations, recipe posts
// Composer card — lets users post to the community feed
function communityComposer() {
  const KINDS = [
    { id: 'brew',   label: 'Share a brew', icon: '☕' },
    { id: 'tip',    label: 'Drop a tip',   icon: '💬' },
    { id: 'ask',    label: 'Ask a question', icon: '❓' }
  ];
  let activeKind = 'brew';

  const card = el('div', {
    class: 'card',
    style: 'padding:18px 20px;border:2px solid var(--ink);border-radius:14px;box-shadow:4px 4px 0 0 var(--ink);background:var(--cream)'
  });

  const header = el('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:12px' },
    el('div', {
      style: 'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--tomato) 0%, #A32C0A 100%);color:var(--cream);display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--font-display);font-size:0.95rem;flex-shrink:0'
    }, initials(state.user && state.user.name ? state.user.name : 'You')),
    el('div', {},
      el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:1.05rem' }, 'Post to the feed'),
      el('div', { style: 'font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-soft);margin-top:2px' }, '◆ Section A · Letters to the editor')
    )
  );

  const textarea = el('textarea', {
    placeholder: "What are you brewing? Drop a tip, share a recipe, or ask the community a question...",
    style: 'width:100%;min-height:90px;padding:12px;border:1.5px solid var(--ink);border-radius:10px;font-family:var(--font-display);font-size:15px;line-height:1.5;background:#FFFEFB;color:var(--ink);resize:vertical;outline:none;box-sizing:border-box'
  });
  textarea.addEventListener('focus', () => textarea.style.borderColor = 'var(--tomato)');
  textarea.addEventListener('blur', () => textarea.style.borderColor = 'var(--ink)');

  const kindRow = el('div', { style: 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap' });
  const kindButtons = {};
  KINDS.forEach(k => {
    const btn = el('button', {
      type: 'button',
      style: 'padding:8px 14px;border-radius:999px;border:1.5px solid var(--ink);background:' + (k.id === activeKind ? 'var(--marigold)' : 'transparent') + ';color:var(--ink);font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:background 0.15s',
      onclick: () => {
        activeKind = k.id;
        Object.keys(kindButtons).forEach(id => {
          kindButtons[id].style.background = id === activeKind ? 'var(--marigold)' : 'transparent';
        });
      }
    }, k.icon + ' ' + k.label);
    kindButtons[k.id] = btn;
    kindRow.appendChild(btn);
  });

  const postBtn = el('button', {
    type: 'button',
    style: 'background:var(--ink);color:var(--cream);border:2px solid var(--ink);border-radius:999px;padding:10px 22px;font-family:var(--font-body);font-weight:700;font-size:14px;letter-spacing:0.04em;cursor:pointer;box-shadow:3px 3px 0 0 var(--marigold);transition:transform 0.15s, box-shadow 0.15s',
    onmouseenter: function() { this.style.transform = 'translate(-1px,-1px)'; this.style.boxShadow = '4px 4px 0 0 var(--marigold)'; },
    onmouseleave: function() { this.style.transform = 'translate(0,0)'; this.style.boxShadow = '3px 3px 0 0 var(--marigold)'; },
    onclick: async (e) => {
      const text = textarea.value.trim();
      if (!text) {
        textarea.style.borderColor = 'var(--tomato)';
        textarea.placeholder = 'Add some text first.';
        return;
      }
      const btn = e.target.closest('button') || e.target;
      btn.disabled = true;
      const prevLabel = btn.textContent;
      btn.textContent = 'Posting...';

      const kindMeta = KINDS.find(k => k.id === activeKind);
      const authorName = (state.user && state.user.name) ? state.user.name : 'You';
      const authorHandle = '@' + authorName.toLowerCase().split(' ')[0];

      const local = {
        id: 'post-' + Date.now(),
        text: text,
        kind: activeKind,
        icon: kindMeta.icon,
        verb: activeKind === 'brew' ? 'shared a brew' : activeKind === 'tip' ? 'dropped a tip' : 'asked the community',
        when: 'just now',
        timestamp: Date.now()
      };

      try {
        if (typeof DB !== 'undefined' && DB && DB.createPost) {
          const userId = state.user && state.user.id ? state.user.id : null;
          const saved = await DB.createPost({
            user_id: userId,
            author_name: authorName,
            author_handle: authorHandle,
            text: text,
            kind: activeKind
          });
          if (saved && saved.id) local.id = saved.id;
        }
      } catch (err) {
        console.warn('createPost backend failed, saving locally', err);
      }

      state.communityPosts = state.communityPosts || [];
      state.communityPosts.unshift(local);
      save();
      textarea.value = '';
      btn.disabled = false;
      btn.textContent = prevLabel;
      toast('Posted to the feed.');
      render();
    }
  }, 'Post');

  const actionsRow = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap' },
    kindRow,
    postBtn
  );

  card.appendChild(header);
  card.appendChild(textarea);
  card.appendChild(actionsRow);
  return card;
}

function communityFeedList() {
  const wrap = el('div', { class: 'card', style: 'padding:8px 0;overflow:hidden' });

  // User + community posts (most recent first). Posts pulled from Supabase
  // are tagged with their original author; locally-composed posts get the
  // current user's name.
  const userPosts = (state.communityPosts || []).map(p => {
    const who = p.author || (state.user && state.user.name ? state.user.name : 'You');
    const handle = p.handle || ('@' + (who.toLowerCase().split(' ')[0]));
    return {
      who: who,
      handle: handle,
      avatarBg: 'linear-gradient(135deg, var(--tomato) 0%, #A32C0A 100%)',
      verb: p.verb,
      target: p.text.length > 60 ? p.text.slice(0, 60) + '...' : p.text,
      kind: p.kind,
      icon: p.icon,
      when: p.when,
      detail: p.text.length > 60 ? p.text : null,
      isOwn: !p.fromServer,
      postId: p.id
    };
  });

  const FEED = [
    { who: 'Catherine', handle: '@catherine.brews', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #A85F1F 100%)', verb: 'shared a brew', target: 'Ethiopian Yirgacheffe V60', kind: 'recipe', icon: '☕', when: '6m ago', detail: 'Bloom for 45 sec. The lemon notes finally come out.', linkTo: 'recipe/pour-over-light' },
    { who: 'Aleks',     handle: '@aleks.pulls',     avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #1d3327 100%)', verb: 'recommended', target: 'Klatch Belle Espresso', kind: 'bean', icon: '💬', when: '24m ago', detail: 'Mid-dark, low acid. Pulls a syrupy shot every time.', linkTo: 'devices' },
    { who: 'Andrew',    handle: '@andrew.brewer',   avatarBg: 'linear-gradient(135deg, #5476A6 0%, #2c4869 100%)', verb: 'liked', target: 'Cinnamon Honey Latte', kind: 'recipe', icon: '❤️', when: '1h ago', linkTo: 'recipe/sat-morning-latte' },
    { who: 'Zach',      handle: '@zach.cup',        avatarBg: 'linear-gradient(135deg, #6B5D54 0%, #3D2418 100%)', verb: 'completed', target: 'Espresso Fundamentals', kind: 'class', icon: '📚', when: '2h ago', linkTo: 'class/espresso-fundamentals' },
    { who: 'Dan',       handle: '@dan.dripper',     avatarBg: 'linear-gradient(135deg, #C5962B 0%, #806017 100%)', verb: 'recommended', target: 'Daterra Bourbon Santos', kind: 'bean', icon: '💬', when: '4h ago', detail: 'Best cold brew base I have used. Sweet, low acid, no bitter finish.', linkTo: 'devices' },
    { who: 'Catherine', handle: '@catherine.brews', avatarBg: 'linear-gradient(135deg, #C8762D 0%, #A85F1F 100%)', verb: 'collected', target: 'Yemen passport stamp', kind: 'passport', icon: '🌍', when: '5h ago' },
    { who: 'Aleks',     handle: '@aleks.pulls',     avatarBg: 'linear-gradient(135deg, #2D4A3A 0%, #1d3327 100%)', verb: 'liked', target: 'Vanilla Maple Cold Brew', kind: 'recipe', icon: '❤️', when: '7h ago', linkTo: 'recipe/cold-brew-classic' },
    { who: 'Andrew',    handle: '@andrew.brewer',   avatarBg: 'linear-gradient(135deg, #5476A6 0%, #2c4869 100%)', verb: 'shared a brew', target: 'Iced Brown Sugar Oat Latte', kind: 'recipe', icon: '☕', when: '9h ago', detail: 'Use cinnamon, not vanilla. Trust me.', linkTo: 'recipe/iced-vanilla-latte' }
  ];
  // User posts go on top
  const COMBINED = userPosts.concat(FEED);
  COMBINED.forEach(item => {
    wrap.appendChild(el('div', {
      style: 'padding:14px 22px;display:flex;gap:14px;align-items:flex-start;border-bottom:1px solid var(--line-soft);cursor:' + (item.linkTo ? 'pointer' : 'default'),
      onclick: () => item.linkTo && navigate(item.linkTo)
    },
      el('div', { style: 'width:40px;height:40px;border-radius:50%;background:' + item.avatarBg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:0.82rem;font-weight:600;flex-shrink:0' }, item.who.split(' ').map(s => s[0]).join('').slice(0, 2)),
      el('div', { style: 'flex:1;min-width:0' },
        el('div', { style: 'font-size:0.93rem' },
          el('strong', {}, item.who),
          el('span', { style: 'color:var(--ink-muted);font-size:0.82rem;margin-left:6px' }, item.handle),
          el('span', { style: 'color:var(--ink-soft);margin:0 4px' }, ' · '),
          el('span', { style: 'color:var(--ink-soft)' }, item.icon + ' ' + item.verb + ' '),
          el('strong', { style: 'color:var(--ink)' }, item.target)
        ),
        item.detail ? el('p', { style: 'font-size:0.88rem;color:var(--ink-soft);margin-top:4px;font-style:italic;line-height:1.45' }, '"' + item.detail + '"') : null,
        el('div', { style: 'font-size:0.78rem;color:var(--ink-muted);margin-top:6px' }, item.when)
      )
    ));
  });
  return wrap;
}

function renderCommunity(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Community'),
    el('h1', { class: 'h1' }, 'Brew with people who care'),
    el('p', {}, 'Challenges, giveaways, and the feed. See what other members are loving, recommending, and making this week.')
  ));

  // ========== Composer: post to the feed ==========
  c.appendChild(communityComposer());
  c.appendChild(el('div', { style: 'height:32px' }));

  // ========== Feed of liked coffees, recommendations, recipes ==========
  c.appendChild(el('h3', { class: 'h3 mb' }, 'The feed'));
  c.appendChild(el('div', { style: 'height:8px' }));
  const feedHolder = el('div', {});
  feedHolder.appendChild(communityFeedList());
  c.appendChild(feedHolder);

  // Pull fresh server posts in the background and re-render the feed when they arrive
  if (typeof DB !== 'undefined' && DB && DB.listPosts) {
    DB.listPosts(30).then(rows => {
      if (!Array.isArray(rows) || !rows.length) return;
      // Map server rows to the same shape as local posts and merge by id
      const serverPosts = rows.map(r => ({
        id: r.id,
        text: r.text || '',
        kind: r.kind || 'tip',
        icon: r.kind === 'brew' ? '☕' : r.kind === 'ask' ? '❓' : '💬',
        verb: r.kind === 'brew' ? 'shared a brew' : r.kind === 'ask' ? 'asked the community' : 'dropped a tip',
        when: r.created_at ? new Date(r.created_at).toLocaleString() : '',
        timestamp: r.created_at ? new Date(r.created_at).getTime() : 0,
        author: r.author_name || 'Member',
        handle: r.author_handle || '@member',
        fromServer: true
      }));
      const localOnly = (state.communityPosts || []).filter(p => !serverPosts.find(s => s.id === p.id));
      state.communityPosts = serverPosts.concat(localOnly).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      save();
      // Swap in the refreshed feed
      feedHolder.innerHTML = '';
      feedHolder.appendChild(communityFeedList());
    }).catch(err => console.warn('listPosts failed', err));
  }
  c.appendChild(el('div', { style: 'height:48px' }));

  // ========== Active giveaways ==========
  c.appendChild(el('h3', { class: 'h3 mb' }, 'Giveaways'));
  c.appendChild(el('div', { style: 'height:8px' }));
  const giveawayGrid = el('div', { class: 'grid grid-3', style: 'margin-bottom:48px' });
  (DATA.giveaways || []).forEach(g => {
    const entered = (state.giveawayEntries || []).includes(g.id);
    giveawayGrid.appendChild(el('div', {
      id: 'giveaway-' + g.id,
      class: 'card',
      style: 'padding:0;overflow:hidden;cursor:pointer;border-radius:14px;' + (entered ? 'border-color:var(--success)' : ''),
      onclick: async () => {
        if (entered) {
          toast('You are already entered in ' + g.name);
          return;
        }
        try {
          const userId = state.user && state.user.id ? state.user.id : null;
          const email = state.user && state.user.email ? state.user.email : null;
          if (typeof DB !== 'undefined' && DB && DB.enterGiveaway) {
            await DB.enterGiveaway(userId, g.id, email);
          }
        } catch (err) {
          console.warn('enterGiveaway backend failed', err);
        }
        state.giveawayEntries = (state.giveawayEntries || []).concat([g.id]);
        save();
        toast("You're entered in " + g.name + ".");
        render();
      }
    },
      el('div', { style: 'aspect-ratio:5/3;background:' + g.bg + ';color:white;display:flex;align-items:center;justify-content:center;font-size:3.5rem' }, g.icon),
      el('div', { style: 'padding:18px 20px' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, g.kind),
        el('div', { class: 'h4' }, g.name),
        el('p', { class: 'mt-sm muted', style: 'font-size:0.88rem;line-height:1.55' }, g.desc),
        el('div', { style: 'margin-top:12px;font-size:0.82rem;color:var(--caramel-deep);font-weight:600' }, g.status)
      )
    ));
  });
  c.appendChild(giveawayGrid);

  // Challenges
  c.appendChild(el('h3', { class: 'h3 mb' }, 'Active challenges'));
  c.appendChild(el('div', { style: 'height:8px' }));
  const challengeGrid = el('div', { class: 'grid grid-2' });
  DATA.challenges.forEach(ch => {
    const joined = state.joinedChallenges.includes(ch.id);
    challengeGrid.appendChild(el('div', { id: 'challenge-' + ch.id, class: 'card' + (ch.featured ? ' card-accent' : '') },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px' },
        el('div', { style: 'font-size:2rem' }, ch.icon),
        ch.featured ? el('span', { class: 'pill pill-accent' }, 'Featured') : null
      ),
      el('h4', { class: 'h4' }, ch.name),
      el('p', { class: 'mt-sm muted', style: 'font-size:0.92rem;line-height:1.55' }, ch.desc),
      el('div', { class: 'mt' },
        el('div', { style: 'display:flex;gap:16px;font-size:0.85rem' },
          el('div', {}, el('div', { class: 'stat-label' }, 'Reward'), el('div', { style: 'font-weight:600' }, ch.reward.split('+')[0].trim())),
          el('div', {}, el('div', { class: 'stat-label' }, 'Duration'), el('div', { style: 'font-weight:600' }, ch.duration)),
          el('div', {}, el('div', { class: 'stat-label' }, 'Brewing'), el('div', { style: 'font-weight:600' }, ch.participants.toLocaleString()))
        )
      ),
      el('button', {
        class: 'btn btn-primary btn-sm mt',
        style: 'margin-top:16px',
        onclick: async (e) => {
          if (joined) return;
          const btn = e.target;
          btn.disabled = true;
          btn.textContent = 'Joining...';
          try {
            // Try to record on the backend if available
            const userId = state.user && state.user.id ? state.user.id : null;
            if (userId && typeof DB !== 'undefined' && DB && DB.joinChallenge) {
              await DB.joinChallenge(userId, ch.id);
            }
          } catch (err) {
            console.warn('joinChallenge backend failed', err);
            // Continue locally so the demo always works
          }
          state.joinedChallenges.push(ch.id);
          state.points += 25;
          save();
          toast('Joined ' + ch.name + '. +25 pts');
          render();
        }
      }, joined ? 'Joined ✓' : 'Join challenge')
    ));
  });
  c.appendChild(challengeGrid);

  c.appendChild(el('div', { style: 'height:48px' }));

  // Two columns: badges + leaderboard
  const cols = el('div', { class: 'split' });

  // Badges
  const badgeCard = el('div', { class: 'card' });
  badgeCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Your badges'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, state.badges.length + ' / ' + DATA.badges.length + ' earned')
  ));
  const wall = el('div', { class: 'badge-wall' });
  DATA.badges.forEach(b => {
    const earned = state.badges.includes(b.id);
    wall.appendChild(el('div', { class: 'badge-card' + (earned ? '' : ' locked') },
      el('div', { class: 'badge-icon ' + (b.color || 'gold') }, b.icon),
      el('div', { class: 'badge-name' }, b.name),
      el('div', { class: 'badge-desc' }, earned ? b.desc : 'Locked')
    ));
  });
  badgeCard.appendChild(wall);
  cols.appendChild(badgeCard);

  // Leaderboard
  const lbCard = el('div', { class: 'card' });
  lbCard.appendChild(el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'Weekly leaderboard'), null));
  const lbList = [
    ['1', 'Catherine', 4180],
    ['2', 'Aleks',     3640],
    ['3', 'Andrew',    3290],
    ['4', state.user?.name || 'You', state.points + 1500],
    ['5', 'Zach',      2480],
    ['6', 'Dan',       2120]
  ];
  lbList.forEach(([rank, name, score]) => {
    const isYou = name === state.user?.name || name === 'You';
    lbCard.appendChild(el('div', { class: 'lb-row', style: isYou ? 'background:var(--caramel-soft);margin:0 -12px;padding:12px;border-radius:8px' : '' },
      el('div', { class: 'lb-rank top-' + rank }, rank),
      el('div', { class: 'lb-name' }, name + (isYou ? ' (you)' : '')),
      el('div', { class: 'lb-score' }, score.toLocaleString() + ' pts')
    ));
  });
  cols.appendChild(lbCard);

  c.appendChild(cols);
  c.appendChild(el('div', { style: 'height:48px' }));

  // Latte Art Leaderboard CTA
  c.appendChild(el('div', { class: 'card card-dark', style: 'margin-bottom:32px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:28px' },
    el('div', { style: 'font-size:3rem' }, '🎨'),
    el('div', { style: 'flex:1;min-width:240px' },
      el('div', { class: 'eyebrow', style: 'color:var(--crema);margin-bottom:6px' }, 'Latte Art Leaderboard'),
      el('div', { class: 'h3', style: 'color:var(--bg);margin-bottom:6px' }, "This week's best pours"),
      el('div', { style: 'font-size:0.92rem;color:rgba(250,246,241,0.7)' }, 'Vote on member pours. Submit yours. Top 3 win a free Brew Lab milk pitcher.')
    ),
    el('button', { class: 'btn btn-accent', onclick: () => navigate('latte-art') }, 'Open leaderboard →')
  ));

  // Giveaways
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Community giveaways'),
    null
  ));
  const dropGrid = el('div', { class: 'grid grid-3' });
  DATA.giveaways.forEach(d => dropGrid.appendChild(dropCard(d)));
  c.appendChild(dropGrid);

  c.appendChild(el('div', { style: 'height:48px' }));

  // Creator feed
  c.appendChild(el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'From our creators'), null));
  const creatorGrid = el('div', { class: 'grid grid-2' });
  DATA.creators.forEach(cr => {
    creatorGrid.appendChild(el('div', { class: 'card' },
      el('div', { style: 'display:flex;gap:14px;align-items:center;margin-bottom:14px' },
        el('div', { class: 'avatar avatar-lg', style: 'background:linear-gradient(135deg, var(--espresso), #3D2418)' }, cr.icon),
        el('div', {},
          el('div', { style: 'display:flex;align-items:center;gap:8px' },
            el('div', { class: 'h4' }, cr.name),
            el('span', { class: 'pill pill-green', style: 'font-size:0.7rem' }, '✓ ' + cr.tag)
          ),
          el('div', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, cr.followers + ' followers')
        )
      ),
      el('p', { class: 'muted', style: 'font-size:0.9rem' }, cr.bio),
      el('div', { class: 'mt-lg', style: 'margin-top:16px;padding:14px;background:var(--bg-subtle);border-radius:10px' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, 'Latest'),
        el('div', { style: 'font-weight:600;font-size:0.95rem' }, cr.latestVideo),
        el('button', { class: 'btn btn-ghost btn-sm mt', style: 'padding-left:0;margin-top:8px', onclick: () => toast('Opening (demo)') }, '▶ Watch →')
      )
    ));
  });
  c.appendChild(creatorGrid);
}

function dropCard(d) {
  return el('div', { class: 'drop-card', onclick: () => toast('Entered into ' + d.name + ' (demo)') },
    el('div', { class: 'drop-thumb', style: 'background:' + d.bg + ';color:white' },
      el('div', {}, d.icon)
    ),
    el('div', { class: 'drop-body' },
      el('div', { class: 'drop-title' }, d.name),
      el('div', { class: 'drop-meta' }, d.kind + ' · ' + d.status)
    )
  );
}

/* ----- Giveaways ----- */
function renderDrops(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);
  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Community giveaways'),
    el('h1', { class: 'h1' }, 'Free entries for everyone.'),
    el('p', { style: 'max-width:580px' }, 'Free signed merch, creator chats, and milestone rewards. No purchase. No tier required.')
  ));
  const grid = el('div', { class: 'grid grid-3' });
  DATA.giveaways.forEach(d => grid.appendChild(dropCard(d)));
  c.appendChild(grid);
}

/* ----- Brew setup (maintenance reminders only, no commerce) ----- */
function renderMachine(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container-narrow', style: 'max-width:780px' });
  main.appendChild(c);

  const m = getMachine();

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Brew setup'),
    el('h1', { class: 'h1' }, 'Keep your gear in shape.'),
    el('p', { style: 'max-width:580px' }, 'Maintenance reminders for the equipment in your taste profile. Clean gear is the simplest path to better coffee.')
  ));

  if (!m) {
    c.appendChild(el('div', { class: 'card text-center', style: 'padding:48px 24px' },
      el('div', { style: 'font-size:3rem;margin-bottom:12px' }, '☕'),
      el('h3', { class: 'h3' }, 'No equipment in your profile'),
      el('p', { class: 'muted mt-sm' }, 'Add your brew method in the taste quiz.'),
      el('button', { class: 'btn btn-accent', style: 'margin-top:24px', onclick: () => navigate('onboard') }, 'Take taste quiz')
    ));
    return;
  }

  // Setup header
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:24px;padding:28px;display:flex;align-items:center;gap:20px' },
    el('div', { style: 'font-size:3rem' }, m.icon),
    el('div', {},
      el('div', { class: 'eyebrow' }, m.kind),
      el('div', { class: 'h3' }, m.name),
      el('p', { class: 'muted mt-sm', style: 'font-size:0.92rem' }, m.blurb)
    )
  ));

  // Maintenance reminders
  c.appendChild(el('div', { class: 'card' },
    el('h3', { class: 'h3 mb' }, 'Maintenance reminders'),
    el('div', { class: 'list' },
      maintenanceRow('🧂', 'Descale with citric acid solution', 'Every 90 days', 'Due in 4 days', 'warn'),
      maintenanceRow('💧', 'Replace charcoal water filter', 'Every 60 days', '23 days remaining', 'ok'),
      maintenanceRow('🧽', 'Deep clean burrs / brewer', 'Every 6 months', '4 months remaining', 'ok'),
      maintenanceRow('🔧', 'Inspect for wear', 'Once per year', '8 months remaining', 'ok')
    )
  ));
}

function maintenanceRow(icon, title, freq, due, status) {
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-thumb' }, icon),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title' }, title),
      el('div', { class: 'list-item-meta' }, freq)
    ),
    el('span', { class: 'pill ' + (status === 'warn' ? 'pill-accent' : 'pill-green') }, due)
  );
}

/* ----- Coffee Wall (community photo feed) ----- */
function renderWall(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, '☕ Coffee Wall'),
    el('h1', { class: 'h1' }, 'Show us your cup.'),
    el('p', { style: 'max-width:580px' }, 'Photos of brews, gear, drinks, anything coffee. Like and comment. Share what you made today.')
  ));

  // Post your own CTA
  c.appendChild(el('div', {
    class: 'card', style: 'margin-bottom:32px;padding:20px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;background:var(--caramel-soft);border-color:rgba(216,90,42,0.25);cursor:pointer',
    onclick: () => openWallPostModal()
  },
    el('div', { style: 'width:48px;height:48px;border-radius:50%;background:var(--caramel);color:white;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0' }, '+'),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { style: 'font-weight:600;font-size:1.05rem;margin-bottom:2px' }, 'Post a coffee photo'),
      el('div', { style: 'font-size:0.9rem;color:var(--ink-soft)' }, 'Drag in an image or pick from your library. Add a caption.')
    ),
    el('button', { class: 'btn btn-accent btn-sm', onclick: (e) => { e.stopPropagation(); openWallPostModal(); } }, 'Share →')
  ));

  // Posts grid (Pinterest-style 3-col)
  c.appendChild(el('h3', { class: 'h3 mb' }, 'Latest posts'));
  c.appendChild(el('div', { style: 'height:8px' }));

  const userPosts = state.wallPosts || [];
  const allPosts = [...userPosts, ...DATA.wallPosts];

  const grid = el('div', { class: 'grid grid-3' });
  allPosts.forEach(p => grid.appendChild(wallCard(p)));
  c.appendChild(grid);
}

function wallCard(p) {
  const liked = (state.wallLikes || []).includes(p.id);
  const likes = p.likes + (liked ? 1 : 0);
  return el('div', { class: 'card', style: 'padding:0;overflow:hidden;cursor:pointer' },
    // Photo
    el('div', { style: 'aspect-ratio:1;background:linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%);overflow:hidden;position:relative', onclick: () => toast('Opening full photo (demo)') },
      p.photo ? el('img', { src: p.photo, alt: p.caption || '', style: 'width:100%;height:100%;object-fit:cover;display:block' }) : el('div', { style: 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;color:white' }, '☕'),
      el('span', { style: 'position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.95);color:var(--ink);padding:4px 10px;border-radius:999px;font-size:0.72rem;font-weight:600' }, p.drink)
    ),
    // Body
    el('div', { style: 'padding:14px 16px' },
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px' },
        el('div', { style: 'width:32px;height:32px;border-radius:50%;background:' + p.avatarBg + ';color:white;font-size:0.78rem;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0' }, p.initials),
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { style: 'font-weight:600;font-size:0.9rem' }, p.author),
          el('div', { style: 'font-size:0.75rem;color:var(--ink-muted)' }, p.timeAgo)
        )
      ),
      p.caption ? el('p', { style: 'font-size:0.88rem;color:var(--ink-soft);line-height:1.5;margin-bottom:12px' }, p.caption) : null,
      el('div', { style: 'display:flex;gap:14px;align-items:center;font-size:0.82rem;color:var(--ink-muted)' },
        el('button', {
          class: 'btn btn-ghost btn-sm',
          style: 'padding:4px 8px;font-size:0.82rem;color:' + (liked ? 'var(--caramel-deep)' : 'var(--ink-muted)') + ';font-weight:' + (liked ? '600' : '400'),
          onclick: (e) => {
            e.stopPropagation();
            state.wallLikes = state.wallLikes || [];
            if (liked) {
              state.wallLikes = state.wallLikes.filter(x => x !== p.id);
              toast('Unliked');
            } else {
              state.wallLikes.push(p.id);
              state.points += 2;
              toast('Liked. +2 pts');
            }
            save();
            render();
          }
        }, (liked ? '♥' : '♡') + ' ' + likes),
        el('span', {}, '💬 ' + p.comments),
        el('span', { style: 'margin-left:auto;font-size:0.75rem' }, '↗ Share')
      )
    )
  );
}

function openWallPostModal() {
  const existing = document.getElementById('wallModal');
  if (existing) existing.remove();

  const backdrop = el('div', { class: 'modal-backdrop show', id: 'wallModal' });
  const modal = el('div', { class: 'modal' },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px' },
      el('h3', { class: 'h3' }, 'Post a coffee photo'),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => backdrop.remove() }, '✕')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:24px' }, 'Show the community what you brewed.'),
    // Photo upload area
    el('div', { id: 'wallDrop', style: 'aspect-ratio:5/3;background:var(--bg-subtle);border:2px dashed var(--line);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:16px;cursor:pointer;color:var(--ink-muted)', onclick: () => document.getElementById('wallFile').click() },
      el('div', { style: 'font-size:2.5rem;margin-bottom:8px' }, '📸'),
      el('div', { style: 'font-size:0.92rem;font-weight:500' }, 'Drop a photo or click to upload'),
      el('div', { style: 'font-size:0.78rem;margin-top:4px' }, 'JPG or PNG, ideally square')
    ),
    el('input', { id: 'wallFile', type: 'file', accept: 'image/*', style: 'display:none', onchange: (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const drop = document.getElementById('wallDrop');
          drop.innerHTML = '';
          drop.style.background = '#000';
          drop.style.border = 'none';
          drop.style.padding = '0';
          drop.appendChild(el('img', { src: ev.target.result, style: 'width:100%;height:100%;object-fit:cover;display:block;border-radius:12px' }));
          drop.dataset.image = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    }}),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'What are you drinking?'),
      (() => {
        const sel = el('select', { class: 'select', id: 'wallDrink' });
        ['Drip', 'Espresso', 'Latte', 'Cappuccino', 'Cortado', 'Pour over', 'Cold brew', 'French press', 'AeroPress', 'Iced latte', 'Other'].forEach(d => sel.appendChild(el('option', { value: d }, d)));
        return sel;
      })()
    ),
    el('div', { class: 'field', style: 'margin-top:14px' },
      el('label', { class: 'label' }, 'Caption (optional)'),
      el('textarea', { class: 'textarea', id: 'wallCaption', placeholder: 'Tell us about it...' })
    ),
    el('div', { style: 'display:flex;gap:8px;margin-top:24px;justify-content:flex-end' },
      el('button', { class: 'btn btn-ghost', onclick: () => backdrop.remove() }, 'Cancel'),
      el('button', {
        class: 'btn btn-accent',
        onclick: () => {
          const drink = document.getElementById('wallDrink').value;
          const caption = document.getElementById('wallCaption').value.trim();
          const drop = document.getElementById('wallDrop');
          const photo = drop.dataset.image || ('https://loremflickr.com/600/600/coffee?lock=' + Date.now());
          const post = {
            id: 'w-' + Date.now(),
            author: state.user?.name || 'You',
            initials: initials(state.user?.name),
            avatarBg: 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)',
            drink: drink,
            timeAgo: 'just now',
            caption: caption,
            photo: photo,
            likes: 0,
            comments: 0,
            isMine: true
          };
          state.wallPosts = state.wallPosts || [];
          state.wallPosts.unshift(post);
          state.points += 25;
          save();
          backdrop.remove();
          toast('Posted to the wall. +25 pts');
          render();
        }
      }, 'Post')
    )
  );
  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

/* ----- Sommelier Track ----- */
function renderSommelier(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const current = computeTier();
  const next = nextTier();

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, '🏆 Sommelier Track'),
    el('h1', { class: 'h1' }, 'From Apprentice to Sommelier.'),
    el('p', {}, 'A real certification path. Five tiers. Each unlocked by completing classes, logging brews, and exploring origins. Climb the path. Become the coffee expert in your friend group.')
  ));

  // Current rank spotlight
  c.appendChild(tierSpotlight(current, next));
  c.appendChild(el('div', { style: 'height:48px' }));

  // Track visual
  c.appendChild(el('h3', { class: 'h3 mb' }, 'The full path'));
  c.appendChild(el('div', { style: 'height:8px' }));

  DATA.sommelierTiers.forEach((tier, idx) => {
    const isCurrent = tier.id === current.id;
    const isComplete = tierComplete(tier);
    const isLocked = idx > 0 && !tierComplete(DATA.sommelierTiers[idx - 1]);

    c.appendChild(tierCard(tier, idx + 1, isCurrent, isComplete, isLocked));
  });
}

function tierSpotlight(current, next) {
  const progress = next ? tierProgress(next) : { met: current.requirements.length, total: current.requirements.length, pct: 100 };
  const sp = el('div', { class: 'spotlight' },
    el('div', { class: 'spotlight-eyebrow' }, '★ Your current rank'),
    el('div', { style: 'display:flex;align-items:center;gap:24px;margin-bottom:20px;flex-wrap:wrap' },
      el('div', { style: 'width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%);display:flex;align-items:center;justify-content:center;font-size:3.5rem;box-shadow:0 8px 24px rgba(200,118,45,0.4)' }, current.icon),
      el('div', { style: 'flex:1;min-width:200px' },
        el('h2', { class: 'h2' }, current.name),
        el('p', { style: 'margin-top:6px;color:rgba(250,246,241,0.8)' }, current.desc)
      )
    ),
    next ? el('div', {},
      el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px' },
        el('div', { style: 'font-size:0.85rem;color:rgba(250,246,241,0.7);font-weight:500' }, 'Progress to ' + next.name),
        el('div', { style: 'font-family:var(--font-mono);font-size:0.85rem;color:var(--crema)' }, progress.met + ' / ' + progress.total)
      ),
      el('div', { class: 'progress', style: 'background:rgba(255,255,255,0.15);margin-bottom:16px' },
        el('div', { class: 'progress-bar', style: 'background:var(--crema);width:' + progress.pct + '%' })
      ),
      el('button', { class: 'btn btn-accent', onclick: () => { document.querySelectorAll('.tier-' + next.id)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 'Show what I need →')
    ) : el('div', { class: 'pill pill-gold', style: 'font-size:0.95rem;padding:8px 16px' }, '🏆 Top tier reached. You are a Sommelier.')
  );
  return sp;
}

function tierCard(tier, num, isCurrent, isComplete, isLocked) {
  const progress = tierProgress(tier);
  const card = el('div', {
    class: 'card tier-' + tier.id,
    style: 'margin-bottom:16px;padding:24px;' +
      (isCurrent ? 'border-color:var(--caramel);border-width:2px;background:var(--caramel-soft);' :
       isComplete ? 'border-color:var(--success);background:var(--green-soft);' :
       isLocked ? 'opacity:0.55;' : '')
  });

  card.appendChild(el('div', { style: 'display:grid;grid-template-columns:80px 1fr auto;gap:20px;align-items:flex-start;flex-wrap:wrap' },
    // Tier icon
    el('div', { style: 'width:72px;height:72px;border-radius:50%;background:' + (tier.color === 'gold' ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : tier.color === 'green' ? 'linear-gradient(135deg, var(--green) 0%, #1d3327 100%)' : 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)') + ';display:flex;align-items:center;justify-content:center;font-size:2.4rem;color:white;box-shadow:var(--shadow-sm)' }, tier.icon),
    // Title block
    el('div', {},
      el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px' },
        el('span', { class: 'eyebrow' }, 'Tier 0' + num),
        isCurrent ? el('span', { class: 'pill pill-accent' }, '★ You are here') : null,
        isComplete && !isCurrent ? el('span', { class: 'pill pill-green' }, '✓ Completed') : null,
        isLocked ? el('span', { class: 'pill' }, '🔒 Locked') : null
      ),
      el('h3', { class: 'h3' }, tier.name),
      el('p', { class: 'mt-sm muted', style: 'font-size:0.95rem' }, tier.desc),
      el('div', { class: 'mt', style: 'font-size:0.8rem;color:var(--ink-muted)' }, tier.memberCount.toLocaleString() + ' members at this tier')
    ),
    // Progress
    el('div', { style: 'text-align:right;min-width:120px' },
      el('div', { class: 'stat-num', style: 'font-size:1.6rem' }, progress.met + '/' + progress.total),
      el('div', { class: 'stat-label' }, 'requirements met')
    )
  ));

  // Requirements + perks columns
  card.appendChild(el('div', { class: 'split', style: 'margin-top:20px;border-top:1px solid var(--line-soft);padding-top:20px' },
    el('div', {},
      el('div', { class: 'eyebrow', style: 'margin-bottom:10px' }, 'Requirements'),
      el('div', {},
        tier.requirements.map(req => {
          const met = checkRequirement(req);
          return el('div', { style: 'display:flex;align-items:center;gap:10px;padding:6px 0;font-size:0.92rem' },
            el('span', { style: 'font-size:1.1rem;color:' + (met ? 'var(--success)' : 'var(--ink-muted)') }, met ? '✓' : '○'),
            el('span', { style: 'color:' + (met ? 'var(--ink)' : 'var(--ink-soft)') + ';' + (met ? 'text-decoration:line-through;text-decoration-color:var(--success)' : '') }, req.label)
          );
        })
      )
    ),
    el('div', {},
      el('div', { class: 'eyebrow', style: 'margin-bottom:10px' }, 'Perks unlocked'),
      el('div', {},
        tier.perks.map(perk => el('div', { style: 'display:flex;align-items:center;gap:10px;padding:6px 0;font-size:0.92rem;color:var(--ink-soft)' },
          el('span', { style: 'color:var(--caramel-deep)' }, '★'),
          el('span', {}, perk)
        ))
      )
    )
  ));

  return card;
}

/* ----- Latte Art Leaderboard ----- */
function renderLatteArt(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, '🎨 Latte Art Leaderboard'),
    el('h1', { class: 'h1' }, "This week's best pours"),
    el('p', { style: 'max-width:620px' }, 'Anyone can submit a pour. The community votes. Top 3 each week get a feature spot on the home page.')
  ));

  // Voting state in localStorage
  state.lattVotes = state.lattVotes || {};

  // Tabs: This week, All time, By pattern
  const filters = ['This week', 'All time', 'Hearts', 'Tulips', 'Rosettas', 'Swans'];
  let active = 'This week';
  const tabs = el('div', { class: 'tabs' });
  filters.forEach(f => tabs.appendChild(el('button', { class: 'tab' + (f === active ? ' active' : ''), onclick: () => { active = f; paint(); } }, f)));
  c.appendChild(tabs);

  // Top 3 podium
  const podium = el('div', { id: 'lattPodium', class: 'grid grid-3', style: 'margin-bottom:32px' });
  c.appendChild(podium);

  // Rest of the leaderboard
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'All submissions'),
    el('button', { class: 'btn btn-accent btn-sm', onclick: () => openSubmitModal() }, '+ Submit your pour')
  ));
  const list = el('div', { id: 'lattList', class: 'grid grid-3' });
  c.appendChild(list);

  // Pattern legend
  c.appendChild(el('div', { style: 'height:48px' }));
  c.appendChild(el('h3', { class: 'h3 mb' }, 'Pattern guide'));
  c.appendChild(el('div', { style: 'height:8px' }));
  const legend = el('div', { class: 'grid grid-4' });
  DATA.lattePatterns.forEach(p => {
    legend.appendChild(el('div', { class: 'card text-center' },
      el('div', { style: 'font-size:2.4rem;margin-bottom:8px' }, p.icon),
      el('div', { class: 'h4' }, p.name),
      el('span', { class: 'pill ' + (p.difficulty === 'Beginner' ? 'pill-green' : p.difficulty === 'Intermediate' ? 'pill-accent' : 'pill-gold'), style: 'margin-top:8px' }, p.difficulty),
      el('p', { class: 'muted mt-sm', style: 'font-size:0.85rem' }, p.desc)
    ));
  });
  c.appendChild(legend);

  // CTA: take the class
  c.appendChild(el('div', { style: 'height:32px' }));
  c.appendChild(el('div', { class: 'card card-accent', style: 'text-align:center;padding:32px' },
    el('h3', { class: 'h3' }, 'Want to climb the leaderboard?'),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:16px' }, 'Lance Hedrick teaches Latte Art 101 and 201 in Brew School. Free for everyone.'),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('class/latte-art-101') }, 'Start Latte Art 101 →')
  ));

  function paint() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.textContent === active));

    let pours = DATA.latteArt.slice();
    if (active === 'This week') pours = pours.filter(p => p.daysAgo <= 7);
    else if (active === 'Hearts') pours = pours.filter(p => p.pattern === 'Heart');
    else if (active === 'Tulips') pours = pours.filter(p => p.pattern === 'Tulip');
    else if (active === 'Rosettas') pours = pours.filter(p => p.pattern === 'Rosetta');
    else if (active === 'Swans') pours = pours.filter(p => p.pattern === 'Swan');
    pours.sort((a, b) => b.votes - a.votes);

    podium.innerHTML = '';
    list.innerHTML = '';

    if (pours.length === 0) {
      list.appendChild(el('div', { class: 'empty', style: 'grid-column:1/-1' },
        el('div', { class: 'empty-icon' }, '🎨'),
        el('p', {}, 'No pours yet for this filter. Be the first.')
      ));
      return;
    }

    // Top 3 podium
    const top3 = pours.slice(0, 3);
    top3.forEach((p, i) => podium.appendChild(podiumCard(p, i + 1)));

    // Rest in main grid
    pours.slice(3).forEach(p => list.appendChild(latteCard(p)));
  }

  paint();
}

function podiumCard(p, rank) {
  const trophyColor = rank === 1 ? 'var(--gold)' : rank === 2 ? '#B5B5B5' : 'var(--caramel)';
  const trophyIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  return el('div', { class: 'card', style: 'padding:0;overflow:hidden;border-color:' + trophyColor + ';border-width:2px' },
    el('div', {
      style: 'aspect-ratio:1/1;background:' + p.gradient + ';position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => toast('Opening full pour image (demo)')
    },
      el('div', { style: 'position:absolute;top:14px;left:14px;background:rgba(255,255,255,0.95);padding:6px 14px;border-radius:999px;font-family:var(--font-display);font-size:1.1rem;font-weight:600' }, trophyIcon + ' #' + rank),
      el('div', { style: 'position:absolute;top:14px;right:14px;background:rgba(0,0,0,0.5);color:white;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:600' }, p.pattern),
      el('div', { style: 'font-size:5rem;color:rgba(255,255,255,0.85);text-shadow:0 2px 12px rgba(0,0,0,0.3)' }, p.accent)
    ),
    el('div', { style: 'padding:18px' },
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:10px' },
        el('div', { class: 'avatar avatar-sm', style: 'width:32px;height:32px;font-size:0.75rem' }, p.initials),
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { style: 'font-weight:600;font-size:0.95rem' }, p.member),
          el('div', { style: 'font-size:0.78rem;color:var(--ink-muted)' }, p.machine + ' · ' + p.daysAgo + 'd ago')
        )
      ),
      el('p', { style: 'font-size:0.88rem;color:var(--ink-soft);line-height:1.5;margin-bottom:14px' }, p.notes),
      voteRow(p)
    )
  );
}

function latteCard(p) {
  return el('div', { class: 'card', style: 'padding:0;overflow:hidden' },
    el('div', {
      style: 'aspect-ratio:1/1;background:' + p.gradient + ';position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer',
      onclick: () => toast('Opening full pour image (demo)')
    },
      el('div', { style: 'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;padding:4px 10px;border-radius:999px;font-size:0.72rem;font-weight:600' }, p.pattern),
      el('div', { style: 'font-size:4rem;color:rgba(255,255,255,0.85);text-shadow:0 2px 10px rgba(0,0,0,0.3)' }, p.accent)
    ),
    el('div', { style: 'padding:14px 16px' },
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px' },
        el('div', { class: 'avatar avatar-sm', style: 'width:28px;height:28px;font-size:0.7rem' }, p.initials),
        el('div', { style: 'flex:1;font-size:0.88rem;font-weight:600' }, p.member),
        el('div', { style: 'font-size:0.75rem;color:var(--ink-muted)' }, p.daysAgo + 'd')
      ),
      voteRow(p)
    )
  );
}

function voteRow(p) {
  const voted = state.lattVotes && state.lattVotes[p.id];
  const displayVotes = p.votes + (voted ? 1 : 0);
  return el('div', { style: 'display:flex;align-items:center;justify-content:space-between' },
    el('button', {
      class: 'btn btn-sm ' + (voted ? 'btn-accent' : 'btn-secondary'),
      style: 'padding:6px 12px;font-size:0.85rem',
      onclick: (e) => {
        e.stopPropagation();
        state.lattVotes = state.lattVotes || {};
        if (state.lattVotes[p.id]) {
          delete state.lattVotes[p.id];
          toast('Vote removed');
        } else {
          state.lattVotes[p.id] = true;
          state.points += 5;
          toast('Voted. +5 pts');
        }
        save();
        render();
      }
    }, (voted ? '❤️' : '🤍') + ' ' + displayVotes.toLocaleString()),
    el('button', {
      class: 'btn btn-ghost btn-sm',
      style: 'padding:6px 10px;font-size:0.8rem',
      onclick: (e) => { e.stopPropagation(); toast('Sharing pour (demo)'); }
    }, '↗ Share')
  );
}

function openSignupModal(opts) {
  // opts.mode = 'signin' | 'signup' (defaults to signin)
  const initialMode = (opts && opts.mode) || 'signin';
  const existing = document.getElementById('signupModal');
  if (existing) existing.remove();

  let mode = initialMode;
  const backdrop = el('div', { class: 'modal-backdrop show', id: 'signupModal' });

  function rebuild() {
    backdrop.innerHTML = '';
    const isSignUp = mode === 'signup';
    const modal = el('div', { class: 'modal' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px' },
        el('h3', { class: 'h3' }, isSignUp ? 'Create your Brew Lab account' : 'Sign in to Brew Lab'),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => backdrop.remove() }, '✕')
      ),
      el('p', { class: 'muted mt-sm', style: 'margin-bottom:20px' },
        isSignUp
          ? 'Set a password and your brews, badges, and friends will sync across devices.'
          : 'Welcome back. Sign in with the email and password you registered with.'
      ),
      // Tab switcher
      el('div', { style: 'display:flex;gap:6px;margin-bottom:20px;border-bottom:1px solid var(--line)' },
        el('button', {
          class: 'btn btn-ghost',
          style: 'flex:1;border-radius:0;border-bottom:2px solid ' + (!isSignUp ? 'var(--tomato)' : 'transparent') + ';font-weight:' + (!isSignUp ? '700' : '500'),
          onclick: () => { mode = 'signin'; rebuild(); }
        }, 'Sign in'),
        el('button', {
          class: 'btn btn-ghost',
          style: 'flex:1;border-radius:0;border-bottom:2px solid ' + (isSignUp ? 'var(--tomato)' : 'transparent') + ';font-weight:' + (isSignUp ? '700' : '500'),
          onclick: () => { mode = 'signup'; rebuild(); }
        }, 'Create account')
      ),
      isSignUp ? el('div', { class: 'field' },
        el('label', { class: 'label' }, 'Your name'),
        el('input', { class: 'input', id: 'suName', placeholder: 'Alex Brewer', value: state.user?.isGuest ? '' : (state.user?.name || '') })
      ) : null,
      el('div', { class: 'field', style: isSignUp ? 'margin-top:14px' : '' },
        el('label', { class: 'label' }, 'Email'),
        el('input', { class: 'input', id: 'suEmail', type: 'email', placeholder: 'alex@example.com', autocomplete: 'email' })
      ),
      el('div', { class: 'field', style: 'margin-top:14px' },
        el('label', { class: 'label' }, 'Password'),
        el('input', {
          class: 'input',
          id: 'suPassword',
          type: 'password',
          placeholder: isSignUp ? 'At least 8 characters' : 'Your password',
          autocomplete: isSignUp ? 'new-password' : 'current-password',
          minlength: '8'
        })
      ),
      !isSignUp ? el('div', { style: 'margin-top:8px;text-align:right' },
        el('a', {
          style: 'font-size:0.82rem;color:var(--tomato);cursor:pointer;text-decoration:underline',
          onclick: async () => {
            const email = document.getElementById('suEmail').value.trim();
            const status = document.getElementById('suStatus');
            if (!email) {
              status.style.color = 'var(--danger)';
              status.textContent = 'Enter your email above first.';
              return;
            }
            try {
              await DB.sendPasswordReset(email);
              status.style.color = 'var(--success)';
              status.textContent = '✓ Reset link sent. Check your email.';
            } catch (err) {
              status.style.color = 'var(--danger)';
              status.textContent = err.message || 'Could not send reset link.';
            }
          }
        }, 'Forgot password?')
      ) : null,
      el('div', { id: 'suStatus', style: 'margin-top:14px;font-size:0.88rem;color:var(--ink-muted);min-height:1em' }),
      el('div', { style: 'display:flex;gap:8px;margin-top:20px;justify-content:flex-end' },
        el('button', { class: 'btn btn-ghost', onclick: () => backdrop.remove() }, 'Cancel'),
        el('button', {
          class: 'btn btn-accent',
          id: 'suSubmit',
          onclick: async () => {
            const name = isSignUp ? document.getElementById('suName').value.trim() : '';
            const email = document.getElementById('suEmail').value.trim();
            const password = document.getElementById('suPassword').value;
            const status = document.getElementById('suStatus');
            const btn = document.getElementById('suSubmit');

            // Client-side validation
            if (isSignUp && !name) {
              status.style.color = 'var(--danger)';
              status.textContent = 'Please add your name.';
              return;
            }
            if (!email) {
              status.style.color = 'var(--danger)';
              status.textContent = 'Please enter your email.';
              return;
            }
            if (!password || password.length < (isSignUp ? 8 : 1)) {
              status.style.color = 'var(--danger)';
              status.textContent = isSignUp ? 'Password must be at least 8 characters.' : 'Please enter your password.';
              return;
            }

            btn.disabled = true;
            btn.textContent = isSignUp ? 'Creating...' : 'Signing in...';
            status.style.color = 'var(--ink-muted)';
            status.textContent = '';
            try {
              if (isSignUp) {
                const result = await DB.signUp(email, password, name);
                // If Supabase project requires email confirmation, session will be null
                if (result && result.session) {
                  status.style.color = 'var(--success)';
                  status.textContent = '✓ Account created. Welcome.';
                  setTimeout(() => backdrop.remove(), 800);
                } else {
                  status.style.color = 'var(--success)';
                  status.textContent = '✓ Account created. Check your email to confirm, then sign in.';
                  btn.textContent = 'Done';
                }
              } else {
                await DB.signInWithPassword(email, password);
                status.style.color = 'var(--success)';
                status.textContent = '✓ Signed in. Welcome back.';
                setTimeout(() => backdrop.remove(), 600);
              }
            } catch (e) {
              status.style.color = 'var(--danger)';
              status.textContent = e.message || (isSignUp ? 'Could not create account. Try again.' : 'Wrong email or password.');
              btn.disabled = false;
              btn.textContent = isSignUp ? 'Create account' : 'Sign in';
            }
          }
        }, isSignUp ? 'Create account' : 'Sign in')
      ),
      el('p', { style: 'margin-top:16px;text-align:center;font-size:0.78rem;color:var(--ink-muted)' },
        isSignUp
          ? 'Already a member? Click Sign in above.'
          : "New here? Click Create account above."
      )
    );
    backdrop.appendChild(modal);
  }

  rebuild();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

function openSubmitModal() {
  const existing = document.getElementById('submitModal');
  if (existing) existing.remove();

  const backdrop = el('div', { class: 'modal-backdrop show', id: 'submitModal' });
  const modal = el('div', { class: 'modal' },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px' },
      el('h3', { class: 'h3' }, 'Submit your pour'),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => backdrop.remove() }, '✕')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:24px' }, "Snap a top-down photo of your latte art. The community votes on the best each week. Top 3 win a free Brew Lab milk pitcher."),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Pattern'),
      (() => {
        const sel = el('select', { class: 'select', id: 'submitPattern' });
        DATA.lattePatterns.forEach(p => sel.appendChild(el('option', { value: p.name }, p.icon + ' ' + p.name)));
        return sel;
      })()
    ),
    el('div', { class: 'field', style: 'margin-top:14px' },
      el('label', { class: 'label' }, 'Notes (optional)'),
      el('textarea', { class: 'textarea', id: 'submitNotes', placeholder: 'How did it go? Milk type, pitcher, technique notes...' })
    ),
    el('div', { style: 'margin-top:14px;padding:18px;background:var(--bg-subtle);border-radius:12px;text-align:center;border:2px dashed var(--line)' },
      el('div', { style: 'font-size:2.5rem;margin-bottom:6px' }, '📸'),
      el('div', { style: 'font-size:0.9rem;color:var(--ink-muted)' }, 'In production: drag and drop your photo here'),
      el('div', { style: 'font-size:0.78rem;color:var(--ink-muted);margin-top:4px' }, 'Demo will use a placeholder image')
    ),
    el('div', { style: 'display:flex;gap:8px;margin-top:24px;justify-content:flex-end' },
      el('button', { class: 'btn btn-ghost', onclick: () => backdrop.remove() }, 'Cancel'),
      el('button', {
        class: 'btn btn-accent',
        onclick: () => {
          const pattern = document.getElementById('submitPattern').value;
          const notes = document.getElementById('submitNotes').value || 'My pour for the leaderboard';
          const newPour = {
            id: 'la' + Date.now(),
            member: state.user?.name || 'You',
            initials: initials(state.user?.name),
            pattern: pattern,
            machine: getMachine()?.name || 'Espresso machine',
            votes: 1,
            daysAgo: 0,
            gradient: 'linear-gradient(135deg, #D2B591 0%, #745330 100%)',
            accent: pattern === 'Heart' ? '❤️' : pattern === 'Tulip' ? '🌷' : pattern === 'Rosetta' ? '🌿' : '🦢',
            notes: notes,
            isMine: true
          };
          DATA.latteArt.unshift(newPour);
          state.points += 50;
          if (!state.badges.includes('latte-artist')) state.badges.push('latte-artist');
          save();
          backdrop.remove();
          toast('Pour submitted. +50 pts. Good luck!');
          render();
        }
      }, 'Submit pour')
    )
  );
  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

/* ----- Brew School / Classes ----- */
function renderClasses(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Brew School'),
    el('h1', { class: 'h1' }, 'Learn from people who actually know.'),
    el('p', {}, 'Each class counts toward the Sommelier Track. Complete the path and earn a real Coffee Sommelier certification.')
  ));

  // Sommelier Track shortcut
  const tier = computeTier();
  const next = nextTier();
  c.appendChild(el('div', { class: 'card card-dark', style: 'margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:24px;cursor:pointer', onclick: () => navigate('sommelier') },
    el('div', { style: 'font-size:2.4rem' }, tier.icon),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { class: 'eyebrow', style: 'color:var(--crema);margin-bottom:4px' }, 'Your rank: ' + tier.name),
      el('div', { style: 'font-size:0.95rem;color:rgba(250,246,241,0.8)' }, next ? 'Complete the right classes to reach ' + next.name + '. ' + (state.completedClasses || []).length + ' / ' + DATA.classes.length + ' classes done.' : 'You have completed every Brew School class.')
    ),
    el('button', { class: 'btn btn-accent btn-sm', onclick: (e) => { e.stopPropagation(); navigate('sommelier'); } }, 'View Sommelier path →')
  ));

  // Latte Art Leaderboard CTA
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:24px;padding:20px 24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap', onclick: () => navigate('latte-art'), 'data-clickable': 'true' },
    el('div', { style: 'font-size:2.4rem' }, '🎨'),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { style: 'font-weight:600;font-size:1.05rem;margin-bottom:2px' }, 'Latte Art Leaderboard'),
      el('div', { style: 'font-size:0.9rem;color:var(--ink-soft)' }, "See this week's best member pours, vote, and submit your own. Top 3 win a Brew Lab milk pitcher.")
    ),
    el('button', { class: 'btn btn-accent btn-sm', onclick: () => navigate('latte-art') }, 'Open leaderboard →')
  ));

  // Featured class (first class)
  const featured = DATA.classes[0];
  c.appendChild(el('div', { class: 'spotlight', style: 'margin-bottom:32px' },
    el('div', { class: 'spotlight-eyebrow' }, '🎨 Featured class'),
    el('h2', { class: 'h2' }, featured.name),
    el('p', {}, featured.desc),
    el('div', { class: 'spotlight-meta' },
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Instructor'), el('div', { class: 'value' }, featured.instructor)),
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Level'), el('div', { class: 'value' }, featured.level)),
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Duration'), el('div', { class: 'value' }, featured.duration)),
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Enrolled'), el('div', { class: 'value' }, featured.enrolled.toLocaleString()))
    ),
    el('button', { class: 'btn btn-accent', onclick: () => navigate('class/' + featured.id) }, 'Start class →')
  ));

  // All classes
  c.appendChild(el('h3', { class: 'h3 mb' }, 'All classes'));
  c.appendChild(el('div', { style: 'height:8px' }));

  const grid = el('div', { class: 'grid grid-3' });
  DATA.classes.forEach(cls => {
    const isCompleted = (state.completedClasses || []).includes(cls.id);
    // Find which tier requires this class
    const requiredFor = DATA.sommelierTiers.find(t => t.requirements.some(r => r.type === 'class' && r.value === cls.id));
    const tile = el('div', {
      class: 'tile',
      onclick: () => navigate('class/' + cls.id),
      style: isCompleted ? 'border-color:var(--success)' : ''
    },
      el('div', { class: cls.thumbClass || 'tile-thumb', style: 'position:relative' },
        el('span', { style: 'font-size:3.5rem' }, cls.icon),
        el('span', { class: 'tile-thumb-tag' }, cls.level),
        isCompleted ? el('span', {
          style: 'position:absolute;top:12px;right:12px;background:var(--success);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.95rem'
        }, '✓') : null
      ),
      el('div', { class: 'tile-body' },
        el('div', { class: 'tile-title' }, cls.name),
        el('div', { class: 'tile-meta' },
          el('span', {}, cls.instructorIcon + ' ' + cls.instructor),
          el('span', {}, '•'),
          el('span', {}, cls.duration),
          el('span', {}, '•'),
          el('span', {}, pluralize(cls.lessons, 'lesson'))
        ),
        requiredFor ? el('div', { class: 'mt-sm', style: 'margin-top:8px' },
          el('span', { class: 'pill ' + (requiredFor.color === 'gold' ? 'pill-gold' : requiredFor.color === 'green' ? 'pill-green' : 'pill-accent'), style: 'font-size:0.72rem' },
            requiredFor.icon + ' Required for ' + requiredFor.name
          )
        ) : null
      )
    );
    grid.appendChild(tile);
  });
  c.appendChild(grid);
}

function renderClassDetail(main, id) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);
  const cls = DATA.classes.find(x => x.id === id);
  if (!cls) {
    c.appendChild(el('p', {}, 'Class not found.'));
    return;
  }

  c.appendChild(el('a', { href: '#/classes', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← All classes'));

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Brew School · ' + cls.level),
    el('h1', { class: 'h1' }, cls.name),
    el('p', { style: 'max-width:680px' }, cls.desc)
  ));

  // Video — embed real YouTube if videoUrl present, else placeholder
  const videoCard = el('div', { class: 'card', style: 'padding:0;overflow:hidden;margin-bottom:24px' });
  if (cls.videoUrl) {
    const ytId = ytIdFromUrl(cls.videoUrl);
    if (ytId) {
      videoCard.appendChild(el('div', { style: 'position:relative;aspect-ratio:16/9;background:#000' },
        el('iframe', {
          src: 'https://www.youtube.com/embed/' + ytId + '?rel=0',
          style: 'position:absolute;inset:0;width:100%;height:100%;border:0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
          title: cls.videoTitle || cls.name
        })
      ));
      if (cls.videoTitle) {
        videoCard.appendChild(el('div', { style: 'padding:12px 16px;background:var(--surface-2);font-size:0.85rem;color:var(--ink-soft)' },
          el('span', {}, cls.videoTitle + ' · '),
          el('a', { href: cls.videoUrl, target: '_blank', rel: 'noopener', style: 'color:var(--caramel-deep);font-weight:500' }, 'Watch on YouTube ↗')
        ));
      }
    }
  } else {
    videoCard.appendChild(el('div', {
      style: 'aspect-ratio:16/8;background:linear-gradient(135deg, var(--espresso) 0%, #3D2418 100%);display:flex;align-items:center;justify-content:center;color:var(--bg);position:relative;cursor:pointer',
      onclick: () => toast('Starting class (demo)')
    },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font-size:5rem;line-height:1;color:var(--caramel)' }, cls.icon),
        el('div', { style: 'margin-top:14px;font-family:var(--font-display);font-size:1.6rem' }, cls.name),
        el('div', { style: 'margin-top:6px;font-size:0.9rem;opacity:0.7' }, '▶ Preview · ' + cls.duration + ' total')
      )
    ));
  }
  c.appendChild(videoCard);

  // Two-column: lessons + sidebar
  c.appendChild(el('div', { class: 'split' },
    el('div', { class: 'card' },
      el('h3', { class: 'h3 mb' }, pluralize(cls.lessons, 'lesson')),
      el('div', { style: 'height:12px' }),
      (() => {
        const list = el('div', {});
        cls.lessonsList.forEach((lesson, i) => {
          list.appendChild(el('div', { class: 'list-item' },
            el('div', { class: 'list-item-thumb', style: 'background:var(--bg-subtle);font-family:var(--font-display);font-size:1.1rem;color:var(--ink-muted)' }, String(i + 1).padStart(2, '0')),
            el('div', { class: 'list-item-body' },
              el('div', { class: 'list-item-title' }, lesson.title),
              el('div', { class: 'list-item-meta' }, '▶ ' + lesson.time)
            ),
            el('button', {
              class: 'btn btn-ghost btn-sm',
              onclick: () => {
                const url = lesson.videoUrl || cls.videoUrl;
                if (url) window.open(url, '_blank', 'noopener');
                else toast('Playing lesson ' + (i + 1) + ' (demo)');
              }
            }, lesson.videoUrl || cls.videoUrl ? '▶ Watch' : 'Play')
          ));
        });
        return list;
      })()
    ),
    el('div', { class: 'card card-soft' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:12px' }, 'Class details'),
      el('div', { class: 'list' },
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, cls.instructorIcon),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-meta' }, 'Instructor'),
            el('div', { class: 'list-item-title', style: 'margin-top:2px' }, cls.instructor)
          )
        ),
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '⏱'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-meta' }, 'Duration'),
            el('div', { class: 'list-item-title', style: 'margin-top:2px' }, cls.duration)
          )
        ),
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '📊'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-meta' }, 'Level'),
            el('div', { class: 'list-item-title', style: 'margin-top:2px' }, cls.level)
          )
        ),
        el('div', { class: 'list-item' },
          el('div', { class: 'list-item-thumb' }, '👥'),
          el('div', { class: 'list-item-body' },
            el('div', { class: 'list-item-meta' }, 'Members enrolled'),
            el('div', { class: 'list-item-title', style: 'margin-top:2px' }, cls.enrolled.toLocaleString())
          )
        )
      ),
      el('div', { class: 'mt-lg' },
        el('div', { class: 'eyebrow', style: 'margin-bottom:8px' }, "What you'll need"),
        el('ul', { style: 'list-style:none;font-size:0.9rem;color:var(--ink-soft);line-height:1.8' },
          cls.requires.map(req => el('li', {}, '✓ ' + req))
        )
      ),
      (() => {
        const isCompleted = (state.completedClasses || []).includes(cls.id);
        return el('div', { style: 'margin-top:24px;display:flex;flex-direction:column;gap:8px' },
          el('button', {
            class: 'btn btn-accent btn-block',
            onclick: () => toast('Starting lesson 1 (demo)')
          }, '▶ Start class'),
          el('button', {
            class: 'btn ' + (isCompleted ? 'btn-secondary' : 'btn-secondary') + ' btn-block',
            onclick: () => {
              state.completedClasses = state.completedClasses || [];
              if (isCompleted) {
                state.completedClasses = state.completedClasses.filter(x => x !== cls.id);
                toast('Class marked incomplete');
              } else {
                state.completedClasses.push(cls.id);
                state.points += 200;
                if (cls.id === 'latte-art-101' && !state.badges.includes('latte-artist')) {
                  state.badges.push('latte-artist');
                }
                // Check if this completion advances tier
                const newTier = computeTier();
                save();
                toast('Class completed. +200 pts. Current rank: ' + newTier.name);
              }
              save();
              render();
            }
          }, isCompleted ? '✓ Completed (click to undo)' : '☐ Mark as completed')
        );
      })()
    )
  ));
}

/* ----- Profile ----- */
function renderProfile(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const tier = computeTier();
  const next = nextTier();
  const progress = next ? tierProgress(next) : null;
  const streak = computeStreak(state.journal);
  const origins = uniqueOriginsTried();
  const completedCount = (state.completedClasses || []).length;

  // ---- Profile header card (the big identity block) ----
  const header = el('div', { class: 'card', style: 'margin-bottom:24px;padding:0;overflow:hidden' },
    // Banner
    el('div', { style: 'height:140px;background:linear-gradient(135deg, var(--espresso) 0%, #3D2418 50%, var(--caramel-deep) 100%);position:relative' },
      el('div', { style: 'position:absolute;bottom:-48px;left:32px' },
        el('div', { style: 'width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%);display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:600;color:white;border:5px solid var(--bg);box-shadow:var(--shadow)' }, initials(state.user?.name))
      ),
      el('div', { style: 'position:absolute;top:16px;right:16px;display:flex;gap:8px' },
        state.user?.isGuest ? el('button', { class: 'btn btn-accent btn-sm', onclick: () => openSignupModal({ mode: 'signup' }) }, 'Sign up free') : null,
        !state.user?.isGuest ? el('button', { class: 'btn btn-secondary btn-sm', style: 'background:rgba(255,255,255,0.95)', onclick: () => { if (confirm('Sign out and clear demo data?')) signOut(); } }, 'Sign out') : null
      )
    ),
    // Body
    el('div', { style: 'padding:64px 32px 28px' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap' },
        el('div', {},
          el('h1', { class: 'h1', style: 'font-size:2.2rem' }, state.user?.name || 'Guest'),
          el('div', { class: 'muted', style: 'margin-top:4px;font-size:0.95rem' },
            state.user?.isGuest ? 'Browsing as guest' : (state.user?.joined ? 'Member since ' + fmtDate(state.user.joined) : '')
          ),
          el('div', { style: 'margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
            el('span', { class: 'pill ' + (tier.color === 'gold' ? 'pill-gold' : tier.color === 'green' ? 'pill-green' : 'pill-accent'), style: 'font-size:0.88rem;padding:6px 14px;font-weight:600' },
              tier.icon + ' ' + tier.name
            ),
            getMachine() ? el('span', { class: 'pill' }, getMachine().icon + ' ' + getMachine().name) : null
          )
        ),
        el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap' },
          stat(state.points.toLocaleString(), 'pts'),
          stat(state.journal.length, 'brews'),
          stat(state.badges.length, 'badges'),
          stat(completedCount, 'classes')
        )
      )
    )
  );
  c.appendChild(header);

  // ---- Sommelier track progress ----
  const sommCard = el('div', { class: 'card', style: 'margin-bottom:24px' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, '🏆 Sommelier Track'),
      el('button', { onclick: () => navigate('sommelier') }, 'See full path →')
    ),
    el('div', { style: 'display:flex;align-items:center;gap:20px;margin-top:16px;flex-wrap:wrap' },
      el('div', { style: 'width:80px;height:80px;border-radius:50%;background:' + (tier.color === 'gold' ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : tier.color === 'green' ? 'linear-gradient(135deg, var(--green) 0%, #1d3327 100%)' : 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)') + ';display:flex;align-items:center;justify-content:center;font-size:2.4rem;color:white;flex-shrink:0' }, tier.icon),
      el('div', { style: 'flex:1;min-width:200px' },
        el('div', { style: 'font-family:var(--font-display);font-size:1.5rem;font-weight:500;letter-spacing:-0.01em' }, tier.name),
        el('div', { class: 'muted mt-sm', style: 'font-size:0.92rem' }, tier.desc),
        next ? el('div', { class: 'mt' },
          el('div', { style: 'display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px' },
            el('span', { style: 'color:var(--ink-soft);font-weight:500' }, 'Next: ' + next.name),
            el('span', { class: 'mono', style: 'color:var(--ink-muted)' }, progress.met + ' / ' + progress.total)
          ),
          el('div', { class: 'progress' },
            el('div', { class: 'progress-bar', style: 'width:' + progress.pct + '%' })
          )
        ) : el('div', { class: 'mt' },
          el('span', { class: 'pill pill-gold' }, '🏆 Top tier reached')
        )
      )
    )
  );
  // Show concrete next-step requirements
  if (next) {
    const remaining = next.requirements.filter(r => !checkRequirement(r));
    sommCard.appendChild(el('div', { class: 'mt-lg', style: 'margin-top:20px;padding:16px;background:var(--surface-2);border-radius:10px' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:10px' }, "What's left to reach " + next.name),
      el('div', {},
        remaining.map(r => el('div', { style: 'display:flex;align-items:center;gap:10px;padding:5px 0;font-size:0.92rem' },
          el('span', { style: 'color:var(--ink-muted)' }, '○'),
          el('span', {}, r.label)
        ))
      )
    ));
  }
  c.appendChild(sommCard);

  // ---- Achievement stats grid ----
  c.appendChild(el('div', { class: 'grid grid-4 mb-lg', style: 'margin-bottom:24px' },
    statCard('🔥', streak, 'Day streak'),
    statCard('🌍', origins, 'Origins tried'),
    statCard('📚', completedCount + ' / ' + DATA.classes.length, 'Classes done'),
    statCard('⭐', state.journal.length ? (state.journal.reduce((s, e) => s + e.rating, 0) / state.journal.length).toFixed(1) : '—', 'Avg rating')
  ));

  // ---- Two columns: Badges + Taste profile ----
  const split = el('div', { class: 'split' });

  // Badges
  const badgeCard = el('div', { class: 'card' });
  badgeCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Badges'),
    el('span', { style: 'font-size:0.85rem;color:var(--ink-muted)' }, state.badges.length + ' / ' + DATA.badges.length + ' earned')
  ));
  const wall = el('div', { class: 'badge-wall' });
  DATA.badges.forEach(b => {
    const earned = state.badges.includes(b.id);
    wall.appendChild(el('div', { class: 'badge-card' + (earned ? '' : ' locked') },
      el('div', { class: 'badge-icon ' + (b.color || 'gold') }, b.icon),
      el('div', { class: 'badge-name' }, b.name),
      el('div', { class: 'badge-desc' }, earned ? b.desc : 'Locked')
    ));
  });
  badgeCard.appendChild(wall);
  split.appendChild(badgeCard);

  // Taste profile
  const p = state.profile || {};
  split.appendChild(el('div', { class: 'card' },
    el('div', { class: 'section-title' },
      el('h3', { class: 'h3' }, 'Taste profile'),
      el('button', { onclick: () => navigate('onboard') }, 'Retake quiz')
    ),
    el('div', { class: 'list' },
      profileRow('Machine', getMachine()?.name || '—'),
      profileRow('Experience', p.experience || '—'),
      profileRow('Roast preference', p.roast || '—'),
      profileRow('Flavors', (p.flavors || []).join(', ') || '—'),
      profileRow('Milk', p.milk || '—'),
      profileRow('Goals', (p.goals || []).join(', ') || '—')
    )
  ));

  c.appendChild(split);
}

function stat(value, label) {
  return el('div', { style: 'text-align:center;min-width:64px' },
    el('div', { class: 'stat-num', style: 'font-size:1.5rem' }, String(value)),
    el('div', { class: 'stat-label', style: 'font-size:0.78rem' }, label)
  );
}

function statCard(icon, value, label) {
  return el('div', { class: 'card text-center', style: 'padding:20px' },
    el('div', { style: 'font-size:1.8rem;margin-bottom:6px' }, icon),
    el('div', { class: 'stat-num', style: 'font-size:1.6rem' }, String(value)),
    el('div', { class: 'stat-label' }, label)
  );
}

function profileRow(label, value) {
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-meta' }, label),
      el('div', { class: 'list-item-title', style: 'margin-top:2px' }, value)
    )
  );
}

/* ============================================================
   BOOT
   ============================================================ */

function ensureGuest() {
  // If no user, auto-create a guest session with a default profile so users
  // see content immediately. They can take the taste quiz to personalize,
  // or sign up to save progress across devices.
  if (!state.user) {
    state.user = { name: 'Bobby', email: '', joined: new Date().toISOString(), isGuest: true };
    state.points = 1280;
  }
  if (!state.profile) {
    state.profile = {
      machine: 'espresso-machine',
      experience: 'curious',
      roast: 'medium',
      flavors: ['chocolate', 'sweet', 'nutty'],
      milk: 'latte',
      goals: ['better', 'art', 'discover']
    };
  }

  // ===== Lived-in seed data for the demo =====
  // Richer journal so the home page feels populated from page one
  if (!state.journal || !state.journal.length) {
    const richJournal = [
      { date: '2026-04-29', time: '07:35', recipe: 'morning-classic',  bean: 'onyx-monarch',      method: 'Drip',     rating: 5, notes: 'Caramel and cocoa came forward today. Grind was finer by one click.', flavors: ['chocolate', 'sweet', 'nutty'] },
      { date: '2026-04-28', time: '08:12', recipe: 'sat-morning-latte',bean: 'counter-hologram',  method: 'Espresso', rating: 4, notes: 'Almost dialed. Stretching the milk one more second next time.',           flavors: ['chocolate', 'creamy'] },
      { date: '2026-04-27', time: '14:18', recipe: 'cold-brew-classic',bean: 'stumptown-hairbender',method:'Cold brew',rating:5, notes: 'Sweet, low acid, chocolatey finish. Best cold brew I have made.',           flavors: ['chocolate', 'sweet'] },
      { date: '2026-04-26', time: '07:44', recipe: 'pour-over-light',  bean: 'heart-stereo',      method: 'Pour over',rating: 4, notes: 'Lemon and bergamot up front. Forty-five second bloom is the unlock.',     flavors: ['fruity', 'citrus'] },
      { date: '2026-04-25', time: '08:55', recipe: 'morning-classic',  bean: 'verve-streetlevel', method: 'Drip',     rating: 4, notes: 'Honey-leaning. Pairs with toast and the Saturday paper.',                  flavors: ['sweet', 'nutty'] },
      { date: '2026-04-24', time: '07:20', recipe: 'sat-morning-latte',bean: 'klatch-belle',      method: 'Espresso', rating: 5, notes: 'Pulled a heart for the first time. Standard 1:2 ratio, 28-second shot.',   flavors: ['chocolate', 'creamy'] },
      { date: '2026-04-22', time: '06:48', recipe: 'morning-classic',  bean: 'kona-direct',       method: 'Drip',     rating: 4, notes: 'Buttery and smooth. Worth the price tag, just barely.',                    flavors: ['nutty', 'sweet'] },
      { date: '2026-04-20', time: '09:02', recipe: 'pour-over-light',  bean: 'onyx-monarch',      method: 'Pour over',rating: 5, notes: 'Different bean, different brewer, same magic.',                          flavors: ['chocolate', 'fruity'] }
    ];
    state.journal = richJournal;
  }
  if (!state.badges || !state.badges.length) {
    state.badges = ['beta', 'taste-profile', 'machine-master', 'first-brew', 'streak-7', 'critic', 'explorer', 'recipe-author'];
  }
  // Active 4-day streak so the personal hello shows it
  if (!state.streak || state.streak < 4) {
    state.streak = 4;
    state.lastCheckIn = '2026-04-29';
  }
  // Two completed classes so Learn page feels lived-in
  if (!state.completedClasses || !state.completedClasses.length) {
    state.completedClasses = ['latte-art-101', 'pour-over-fundamentals'];
  }
  // Joined challenges
  if (!state.joinedChallenges || !state.joinedChallenges.length) {
    state.joinedChallenges = ['pour-over-week', 'latte-art-30day'];
  }
  // Seeded community letters from the FYP team so the feed and Letters block feel real
  if (!state.communityPosts || !state.communityPosts.length) {
    state.communityPosts = [
      {
        id: 'seed-letter-1',
        text: 'The Onyx Monarch is the most consistent bean I have run through my Cuisinart in two years. Worth the four week wait list.',
        kind: 'tip',
        icon: '💬',
        verb: 'dropped a tip',
        when: '2h ago',
        timestamp: Date.now() - 2 * 3600 * 1000,
        author: 'Catherine'
      },
      {
        id: 'seed-letter-2',
        text: 'Anyone running a DGB-2 paired with a hand grinder? Trying to figure out the sweet spot for grind size before I spend on an electric.',
        kind: 'ask',
        icon: '❓',
        verb: 'asked the community',
        when: '5h ago',
        timestamp: Date.now() - 5 * 3600 * 1000,
        author: 'Andrew'
      }
    ];
  }
  save();
}

async function boot() {
  load();

  // Try to load existing Supabase session before falling back to guest.
  // If Supabase is unavailable (CDN blocked, offline, etc.) we fall back to guest mode.
  const dbReady = typeof DB !== 'undefined' && DB && typeof DB.getSession === 'function';
  if (dbReady) {
    try {
      const session = await DB.getSession();
      if (session?.user) {
        await hydrateFromSupabase(session.user);
      } else {
        ensureGuest();
      }
    } catch (e) {
      console.warn('Supabase session check failed, falling back to guest', e);
      ensureGuest();
    }

    // Listen for sign-in / sign-out events
    try {
      DB.onAuthChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await hydrateFromSupabase(session.user);
          render();
          toast('Signed in. Welcome.');
        } else if (event === 'SIGNED_OUT') {
          Object.assign(state, { user: null, profile: null, journal: [], badges: [], following: [], points: 0, streak: 0, completedClasses: [], ownedProducts: [] });
          ensureGuest();
          render();
        }
      });
    } catch (e) {
      console.warn('Auth listener failed', e);
    }
  } else {
    console.warn('Supabase SDK or db.js not loaded; running in local-only mode');
    ensureGuest();
  }

  // App shell + first render — these MUST run even if Supabase failed
  try {
    ensureDailyState();
    mountBeanApp();
  } catch (e) {
    console.error('Boot render failed', e);
    document.body.innerHTML = '<div style="padding:48px;text-align:center;font-family:Inter,sans-serif"><h1>Something went wrong loading Brew Lab.</h1><p style="color:#666">Open the developer console for details. Reload to try again.</p><pre style="text-align:left;max-width:600px;margin:24px auto;padding:16px;background:#f5f5f5;border-radius:8px;font-size:12px;overflow:auto">' + (e?.stack || e?.message || String(e)) + '</pre></div>';
  }
}

// Pull profile + brews + follows for a signed-in user from Supabase into state
async function hydrateFromSupabase(authUser) {
  state.user = {
    id: authUser.id,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0],
    email: authUser.email,
    joined: authUser.created_at,
    isGuest: false
  };
  try {
    const profile = await DB.getProfile(authUser.id);
    if (profile) {
      state.points = profile.points || 0;
      state.streak = profile.streak || 0;
      state.lastCheckIn = profile.last_check_in || null;
      state.badges = profile.badges || [];
      state.completedClasses = profile.completed_classes || [];
      state.ownedProducts = profile.owned_products || [];
      state.profile = profile.profile_data || state.profile || {
        machine: 'espresso-machine', experience: 'curious', roast: 'medium',
        flavors: ['chocolate', 'sweet'], milk: 'latte', goals: ['better']
      };
      if (profile.name && !state.user.name) state.user.name = profile.name;
    }
    state.journal = (await DB.listBrews(authUser.id)).map(b => ({
      id: b.id, date: b.date, time: b.time, recipe: b.recipe_id, bean: b.bean_id,
      method: b.method, rating: b.rating, notes: b.notes, flavors: b.flavors || []
    }));
    state.following = await DB.listFollowing(authUser.id);
  } catch (e) {
    console.warn('Hydrate from Supabase failed', e);
  }
  save();
}

// Sync key state changes to Supabase (best-effort, non-blocking)
function syncProfile() {
  if (!state.user || state.user.isGuest) return;
  DB.updateProfile(state.user.id, {
    points: state.points,
    streak: state.streak,
    last_check_in: state.lastCheckIn || null,
    badges: state.badges,
    completed_classes: state.completedClasses,
    owned_products: state.ownedProducts,
    profile_data: state.profile
  }).catch(e => console.warn('syncProfile failed', e));
}

document.addEventListener('DOMContentLoaded', boot);

/* ============================================================
   THE BEAN — redesign shell (Phase 1)
   ============================================================
   New mobile-first front-end that replaces the legacy Brew Lab shell.
   Routes: #/auth, #/you, #/feed, #/learn, #/passport.
   Localstorage user lives under 'beanapp_user' (separate from any
   legacy keys). Existing data.js arrays are untouched and reachable
   for future phases.
   ============================================================ */

const BEAN_USER_KEY = 'beanapp_user';
const BEAN_BREWS_KEY = 'beanapp_brews';
const BEAN_DEMO_SEEDED_KEY = 'beanapp_demo_seeded';
const BEAN_TABS = [
  { route: 'you',      label: 'You',      icon: 'user' },
  { route: 'feed',     label: 'Feed',     icon: 'feed' },
  { route: 'learn',    label: 'Learn',    icon: 'book' },
  { route: 'passport', label: 'Passport', icon: 'globe' }
];
const BEAN_STUBS = {
  passport: { title: 'Passport', sub: 'Phase 2 stamps the origins you have tasted.' },
  recipes:  { title: 'Recipes',  sub: 'Phase 6 builds the recipes browser.' }
};

function getBeanUser() {
  try { return JSON.parse(localStorage.getItem(BEAN_USER_KEY) || 'null'); }
  catch (_) { return null; }
}
function setBeanUser(u) {
  localStorage.setItem(BEAN_USER_KEY, JSON.stringify(u));
  // First-time demo session: seed brews + lesson state
  if (u && u.isDemo) {
    seedDemoBrewsIfNeeded();
    if (typeof seedDemoLessonsIfNeeded === 'function') seedDemoLessonsIfNeeded();
  }
}
function clearBeanUser() {
  localStorage.removeItem(BEAN_USER_KEY);
  localStorage.removeItem(BEAN_BREWS_KEY);
  localStorage.removeItem(BEAN_DEMO_SEEDED_KEY);
  localStorage.removeItem('beanapp_lessons');
  localStorage.removeItem('beanapp_lessons_in_progress');
  localStorage.removeItem('beanapp_certs');
  localStorage.removeItem('beanapp_lessons_demo_seeded');
}

function loadBeanBrews() {
  try { return JSON.parse(localStorage.getItem(BEAN_BREWS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveBeanBrews(arr) {
  localStorage.setItem(BEAN_BREWS_KEY, JSON.stringify(arr || []));
}

/* Seed 21 brews for the demo user (9-day current streak through today,
   6 unique origins, mixed methods, ratings 3-5, all with flavor tags).
   Idempotent — runs once per demo session. */
function seedDemoBrewsIfNeeded() {
  if (localStorage.getItem(BEAN_DEMO_SEEDED_KEY)) return;
  const today = new Date();
  function daysAgo(n, hour) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour || 8, 30, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  const seed = [
    // Last 9 days — active streak
    { id: 'b001', date: daysAgo(0, 7),  method: 'Pour-over',    beanOrigin: 'Ethiopia Yirgacheffe', ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 200, flavorTags: ['floral','citrus','bright'],     rating: 5, notes: 'Best cup of the week. The lemon is so vibrant.' },
    { id: 'b002', date: daysAgo(1, 8),  method: 'Espresso',     beanOrigin: 'Colombia Huila',       ratio: '1:2',  grindSize: 'Fine',        waterTempF: 200, flavorTags: ['chocolatey','caramel','sweet'], rating: 4, notes: '' },
    { id: 'b003', date: daysAgo(2, 7),  method: 'Pour-over',    beanOrigin: 'Kenya AA',             ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 202, flavorTags: ['berry','fruity','bright'],      rating: 5, notes: 'Tomato-bright and clean.' },
    { id: 'b004', date: daysAgo(3, 14), method: 'Cold brew',    beanOrigin: 'Brazil Cerrado',       ratio: '1:8',  grindSize: 'Coarse',      waterTempF: 70,  flavorTags: ['chocolatey','nutty','sweet'],   rating: 4, notes: 'Smooth.' },
    { id: 'b005', date: daysAgo(4, 8),  method: 'Pour-over',    beanOrigin: 'Guatemala Antigua',    ratio: '1:15', grindSize: 'Medium',      waterTempF: 200, flavorTags: ['caramel','chocolatey','balanced'], rating: 4, notes: '' },
    { id: 'b006', date: daysAgo(5, 7),  method: 'Drip',         beanOrigin: 'Colombia Huila',       ratio: '1:17', grindSize: 'Medium',      waterTempF: 200, flavorTags: ['nutty','chocolatey','balanced'],rating: 3, notes: 'Quick weekday brew.' },
    { id: 'b007', date: daysAgo(6, 8),  method: 'Pour-over',    beanOrigin: 'Costa Rica Tarrazu',   ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 202, flavorTags: ['citrus','sweet','balanced'],    rating: 4, notes: '' },
    { id: 'b008', date: daysAgo(7, 9),  method: 'Espresso',     beanOrigin: 'Ethiopia Yirgacheffe', ratio: '1:2',  grindSize: 'Fine',        waterTempF: 200, flavorTags: ['floral','fruity','bright'],     rating: 4, notes: 'Floral espresso surprise.' },
    { id: 'b009', date: daysAgo(8, 7),  method: 'Pour-over',    beanOrigin: 'Kenya AA',             ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 202, flavorTags: ['berry','bright'],               rating: 4, notes: '' },
    // Older brews (no streak)
    { id: 'b010', date: daysAgo(11, 8), method: 'Pour-over',    beanOrigin: 'Ethiopia Yirgacheffe', ratio: '1:17', grindSize: 'Medium-fine', waterTempF: 200, flavorTags: ['floral','citrus'],              rating: 5, notes: '' },
    { id: 'b011', date: daysAgo(13, 14),method: 'Cold brew',    beanOrigin: 'Colombia Huila',       ratio: '1:8',  grindSize: 'Coarse',      waterTempF: 70,  flavorTags: ['chocolatey','sweet'],           rating: 4, notes: '' },
    { id: 'b012', date: daysAgo(14, 7), method: 'Espresso',     beanOrigin: 'Guatemala Antigua',    ratio: '1:2',  grindSize: 'Fine',        waterTempF: 200, flavorTags: ['caramel','chocolatey'],         rating: 3, notes: '' },
    { id: 'b013', date: daysAgo(16, 8), method: 'French press', beanOrigin: 'Brazil Cerrado',       ratio: '1:15', grindSize: 'Coarse',      waterTempF: 200, flavorTags: ['nutty','chocolatey','earthy'],  rating: 3, notes: '' },
    { id: 'b014', date: daysAgo(17, 9), method: 'Pour-over',    beanOrigin: 'Kenya AA',             ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 202, flavorTags: ['berry','fruity'],               rating: 4, notes: '' },
    { id: 'b015', date: daysAgo(19, 7), method: 'Aeropress',    beanOrigin: 'Colombia Huila',       ratio: '1:14', grindSize: 'Medium',      waterTempF: 200, flavorTags: ['chocolatey','caramel'],         rating: 4, notes: '' },
    { id: 'b016', date: daysAgo(21, 8), method: 'Pour-over',    beanOrigin: 'Ethiopia Yirgacheffe', ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 200, flavorTags: ['floral','bright'],              rating: 4, notes: '' },
    { id: 'b017', date: daysAgo(22, 14),method: 'Cold brew',    beanOrigin: 'Costa Rica Tarrazu',   ratio: '1:8',  grindSize: 'Coarse',      waterTempF: 70,  flavorTags: ['sweet','balanced'],             rating: 3, notes: '' },
    { id: 'b018', date: daysAgo(24, 8), method: 'Espresso',     beanOrigin: 'Brazil Cerrado',       ratio: '1:2',  grindSize: 'Fine',        waterTempF: 200, flavorTags: ['nutty','chocolatey'],           rating: 3, notes: '' },
    { id: 'b019', date: daysAgo(25, 7), method: 'Pour-over',    beanOrigin: 'Costa Rica Tarrazu',   ratio: '1:16', grindSize: 'Medium-fine', waterTempF: 200, flavorTags: ['citrus','sweet'],               rating: 4, notes: '' },
    { id: 'b020', date: daysAgo(26, 9), method: 'Drip',         beanOrigin: 'Guatemala Antigua',    ratio: '1:17', grindSize: 'Medium',      waterTempF: 200, flavorTags: ['caramel','balanced'],           rating: 4, notes: '' },
    { id: 'b021', date: daysAgo(27, 8), method: 'Espresso',     beanOrigin: 'Colombia Huila',       ratio: '1:2',  grindSize: 'Fine',        waterTempF: 200, flavorTags: ['chocolatey','sweet'],           rating: 5, notes: '' }
  ];
  saveBeanBrews(seed);
  localStorage.setItem(BEAN_DEMO_SEEDED_KEY, '1');
}

function beanRoute() {
  const hash = (window.location.hash || '').replace(/^#\/?/, '');
  return hash;
}

/* ----- Inline SVG icon library ----- */
function beanLogoSvg(size) {
  size = size || 64;
  // Yellow rounded square with a white coffee cup + 2 steam wisps.
  const svg = '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="0" y="0" width="64" height="64" rx="12" ry="12" fill="#F5C842"/>' +
    // Steam (two wavy lines above the cup)
    '<path d="M24 18 q-3 -4 0 -8" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 20 q-3 -4 0 -8" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 18 q-3 -4 0 -8" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    // Cup body
    '<path d="M16 28 H44 V42 a6 6 0 0 1 -6 6 H22 a6 6 0 0 1 -6 -6 Z" fill="#FFFFFF"/>' +
    // Handle (loops outside the cup body)
    '<path d="M44 32 a5 5 0 0 1 0 10" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
  '</svg>';
  const wrap = document.createElement('span');
  wrap.innerHTML = svg;
  return wrap.firstElementChild;
}

const BEAN_NAV_ICONS = {
  user:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21 a8 8 0 0 1 16 0"/></svg>',
  feed:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5 h16 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H8 l-4 4 V7 a2 2 0 0 1 2 -2 Z"/></svg>',
  book:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5 a2 2 0 0 1 2 -2 h6 v17 H5 a2 2 0 0 0 -2 2 Z"/><path d="M21 5 a2 2 0 0 0 -2 -2 h-6 v17 h6 a2 2 0 0 1 2 2 Z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18"/><path d="M12 3 a13 13 0 0 1 0 18 a13 13 0 0 1 0 -18 Z"/></svg>'
};

/* ----- Mount + render ----- */
function mountBeanApp() {
  // Wipe any legacy shell elements that may have been pre-mounted.
  document.body.innerHTML = '';
  document.body.classList.add('bean-app');
  document.body.classList.remove('app-bean-removed-marker');

  const main = el('main', { id: 'bean-main', class: 'bean-main' });
  document.body.appendChild(main);
  document.body.appendChild(buildBeanNav());

  window.addEventListener('hashchange', beanRender);
  beanRender();
}

function buildBeanNav() {
  const nav = el('nav', { id: 'bean-nav', class: 'bean-nav', 'aria-label': 'Primary' });
  BEAN_TABS.forEach(t => {
    const a = el('a', {
      href: '#/' + t.route,
      class: 'bean-nav-tab',
      'data-route': t.route,
      'aria-label': t.label
    });
    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = BEAN_NAV_ICONS[t.icon];
    a.appendChild(iconWrap.firstElementChild);
    a.appendChild(el('span', { class: 'bean-nav-label' }, t.label));
    nav.appendChild(a);
  });
  return nav;
}

function beanRender() {
  const route = beanRoute();
  const user = getBeanUser();

  // Routing rules: no user → force /auth. User on no/unknown route → /you.
  if (!user && route !== 'auth') {
    if (window.location.hash !== '#/auth') { window.location.hash = '#/auth'; return; }
  }
  if (user && (route === '' || route === 'auth')) {
    if (window.location.hash !== '#/you') { window.location.hash = '#/you'; return; }
  }
  if (!user && route === '') { window.location.hash = '#/auth'; return; }

  const main = document.getElementById('bean-main');
  if (!main) return;
  main.innerHTML = '';

  if (route === 'auth') {
    renderBeanAuth(main);
  } else if (route === 'you' && typeof renderYou === 'function') {
    renderYou(main);
  } else if (route === 'feed' && typeof renderFeed === 'function') {
    renderFeed(main);
  } else if (route === 'learn' && typeof renderLearn === 'function') {
    renderLearn(main);
  } else if (BEAN_STUBS[route]) {
    renderBeanStub(main, BEAN_STUBS[route]);
  } else {
    // Unknown route — bounce back to /you (or /auth)
    window.location.hash = user ? '#/you' : '#/auth';
    return;
  }

  // Hide nav on auth + recipes detour, show + highlight on tab routes
  const nav = document.getElementById('bean-nav');
  if (nav) {
    nav.style.display = route === 'auth' ? 'none' : 'flex';
    nav.querySelectorAll('.bean-nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-route') === route);
    });
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ----- Auth / landing ----- */
function renderBeanAuth(main) {
  let mode = 'signin'; // 'signin' | 'signup'

  const screen = el('div', { class: 'auth-screen' });
  screen.appendChild(beanLogoSvg(64));

  screen.appendChild(el('h1', { class: 'auth-headline' },
    'The coffee community ',
    el('em', {}, 'in your cup')
  ));
  screen.appendChild(el('p', { class: 'auth-subhead' },
    'Log your brews, level up your palate, and trade recipes with people who care about coffee as much as you do.'
  ));

  const card = el('div', { class: 'auth-card' });

  // Toggle (Sign In / Create Account)
  const toggle = el('div', { class: 'auth-toggle', role: 'tablist' });
  const signinBtn = el('button', {
    type: 'button',
    class: 'auth-toggle-pill active',
    'data-mode': 'signin',
    onclick: () => setMode('signin')
  }, 'Sign In');
  const signupBtn = el('button', {
    type: 'button',
    class: 'auth-toggle-pill',
    'data-mode': 'signup',
    onclick: () => setMode('signup')
  }, 'Create Account');
  toggle.appendChild(signinBtn);
  toggle.appendChild(signupBtn);
  card.appendChild(toggle);

  // Inputs
  const emailInput = el('input', {
    type: 'email',
    class: 'auth-input',
    placeholder: 'you@brew.coffee',
    name: 'email',
    autocomplete: 'email'
  });
  const passInput = el('input', {
    type: 'password',
    class: 'auth-input',
    placeholder: 'your secret blend',
    name: 'password',
    autocomplete: 'current-password'
  });
  card.appendChild(emailInput);
  card.appendChild(passInput);

  // Primary submit
  const submitBtn = el('button', {
    type: 'button',
    class: 'btn-primary full',
    onclick: () => submit()
  }, 'Sign in');
  card.appendChild(submitBtn);

  // Divider
  card.appendChild(el('div', { class: 'auth-divider' }, 'or'));

  // Demo button
  card.appendChild(el('button', {
    type: 'button',
    class: 'btn-ghost full',
    onclick: () => {
      setBeanUser({ email: 'demo@brew.coffee', name: 'Demo Bobby', isDemo: true, createdAt: Date.now() });
      window.location.hash = '#/you';
    }
  }, 'Explore as demo user'));

  // Disclaimer
  card.appendChild(el('p', { class: 'auth-disclaimer' },
    'Brew responsibly. We’re not liable for the espresso you make at 11pm.'
  ));

  // Submit on Enter inside either input
  [emailInput, passInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  });

  screen.appendChild(card);
  main.appendChild(screen);

  function setMode(m) {
    mode = m;
    signinBtn.classList.toggle('active', m === 'signin');
    signupBtn.classList.toggle('active', m === 'signup');
    submitBtn.textContent = m === 'signin' ? 'Sign in' : 'Create account';
    passInput.setAttribute('autocomplete', m === 'signin' ? 'current-password' : 'new-password');
  }

  function submit() {
    const email = (emailInput.value || '').trim();
    const password = (passInput.value || '').trim();
    if (!email || !password) {
      // Lightweight inline validation: flash the empty input borders red briefly
      [emailInput, passInput].forEach(inp => {
        if (!inp.value.trim()) {
          inp.style.borderColor = '#C9352F';
          setTimeout(() => { inp.style.borderColor = ''; }, 900);
        }
      });
      return;
    }
    const localPart = email.includes('@') ? email.split('@')[0] : email;
    setBeanUser({ email: email, name: localPart, createdAt: Date.now() });
    window.location.hash = '#/you';
  }
}

/* ----- Tab stubs ----- */
function renderBeanStub(main, stub) {
  const page = el('div', { class: 'bean-page' });
  page.appendChild(el('h1', { class: 'bean-page-h' }, stub.title));
  page.appendChild(el('p', { class: 'bean-page-sub' }, stub.sub));
  main.appendChild(page);
}

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
  following: ['maya-r', 'diego-p', 'tessa-l'], // [memberId] - seeded with 3 friends so leaderboard is populated
  streak: 0,          // current daily streak
  lastCheckIn: null,  // YYYY-MM-DD of last check-in
  todayQuestId: null, // id of today's quest
  todayQuestDone: false,
  freezesAvailable: 1,
  isMember: true,
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
  '': renderDashboard,
  'home': renderDashboard,
  'brew': renderBrew,
  'discover': renderDiscover,
  'learn': renderLearn,
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
  const fn = ROUTES[route] || renderDashboard;

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
    { route: 'home',    label: 'Home',    href: '#/home' },
    { route: 'learn',   label: 'Learn',   href: '#/learn' },
    { route: 'recipes', label: 'Recipes', href: '#/recipes' },
    { route: 'profile', label: 'Profile', href: '#/profile' }
  ];

  const header = el('header', { class: 'bl-header' },
    el('div', { class: 'bl-header-inner' },
      el('a', { href: '#/home', class: 'bl-brand' },
        el('span', { class: 'bl-brand-mark' }, '◐'),
        el('span', { class: 'bl-brand-name' }, 'Brew Lab')
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
        el('a', { href: '#/profile', class: 'bl-avatar', title: state.user?.name || 'You' },
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
    onclick: () => navigate('barista')
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

  const card = el('div', { class: 'bl-modal-card', onclick: (e) => e.stopPropagation() },
    el('div', { class: 'bl-modal-head' },
      el('div', {},
        el('div', { class: 'bl-modal-eyebrow' }, 'Log brew'),
        el('h2', { class: 'bl-modal-title' }, 'How was it?')
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

/* ----- Home (The Grind-inspired narrative + Cuisinart-influenced specs) ----- */
function renderDashboard(main) {
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

/* ----- Discover tab — Today's brew, picks, places, trending ----- */
const DAILY_DRINKS = [
  { name: 'Spanish latte',         desc: 'Espresso, sweetened condensed milk, and steamed milk. Rich, sweet, dessert in a cup.',    glyph: '🥛' },
  { name: 'Espresso tonic',        desc: 'A double shot poured over ice and tonic water. Bitter, bright, surprisingly refreshing.', glyph: '🫧' },
  { name: 'Japanese iced V60',     desc: 'Brewed hot directly onto ice. Locks in floral aromatics that flash-cooling preserves.',   glyph: '🧊' },
  { name: 'Dirty horchata',        desc: 'Cinnamon-rice horchata with a shot pulled straight through. Cool, creamy, caffeinated.',  glyph: '🥤' },
  { name: 'Cortado',               desc: 'Equal parts espresso and warm milk. Smooth, balanced, no foam to hide behind.',           glyph: '☕' },
  { name: 'Cold brew old fashioned', desc: 'Cold brew concentrate, demerara, orange peel, a dash of bitters. Stirred, not shaken.', glyph: '🥃' },
  { name: 'Cardamom latte',        desc: 'Espresso steamed with green cardamom milk. Warm spice, lingering finish.',                glyph: '✨' }
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function renderDiscover(main) {
  main.innerHTML = '';
  const page = el('div', { class: 'discover-page' });
  main.appendChild(page);

  const today = new Date();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const drink = DAILY_DRINKS[dayOfYear(today) % DAILY_DRINKS.length];

  /* 1. Today's brew hero */
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'today-hero' },
        el('div', { class: 'today-hero-text' },
          el('p', { class: 'today-eyebrow' }, 'Today’s brew · ' + weekday),
          el('h1', { class: 'today-title' }, drink.name),
          el('p', { class: 'today-desc' }, drink.desc),
          el('button', { class: 'btn-discover-cta', onclick: openBrewLogModal }, 'Try this brew')
        ),
        el('div', { class: 'today-hero-img', 'aria-hidden': 'true' },
          el('span', { class: 'today-hero-glyph' }, drink.glyph)
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
          'aria-label': 'Play Dirt Cowboy story'
        },
          el('div', { class: 'cafe-story-play', 'aria-hidden': 'true' }),
          el('span', { class: 'cafe-story-duration' }, '3:42')
        ),
        el('div', { class: 'cafe-story-body' },
          el('p', { class: 'cafe-story-eyebrow' }, 'Cafe story'),
          el('h2', { class: 'cafe-story-title' }, 'Dirt Cowboy on the art of the slow pour'),
          el('p', { class: 'cafe-story-sub' }, 'Hanover, NH · 20 years of single-origin pour-over and a roaster they grew up with.')
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

  /* 4. Discover near you — map + cafe row */
  const shops = [
    { name: 'Dirt Cowboy Cafe',         short: 'Dirt Cowboy',     hood: 'Hanover, NH', coords: [43.7022, -72.2896], roaster: 'Counter Culture',   featured: 'Counter Culture Apollo',         status: 'active', tone: 'cream' },
    { name: 'The Works Bakery Cafe',    short: 'The Works',       hood: 'Hanover, NH', coords: [43.7018, -72.2898], roaster: 'Green Mountain',    featured: 'Green Mountain Vermont Country', status: 'soon',   tone: 'green' },
    { name: "Umpleby's Bakery & Cafe",  short: "Umpleby's",       hood: 'Norwich, VT', coords: [43.7155, -72.3057], roaster: 'Vermont Coffee Co.', featured: 'Vermont Coffee Mocha Java',     status: 'soon',   tone: 'gold'  }
  ];
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
        shops.map(s => el('a', {
          href: '#/discover',
          class: 'cafe-card',
          onclick: (e) => {
            e.preventDefault();
            if (s.status === 'soon') toast(s.short + ' story coming soon');
            else toast('Story playback coming soon');
          }
        },
          el('div', { class: 'cafe-card-img pick-tone-' + s.tone },
            el('span', { class: 'cafe-card-glyph' }, '☕')
          ),
          el('div', { class: 'cafe-card-body' },
            el('h3', { class: 'cafe-card-name' }, s.name),
            el('p', { class: 'cafe-card-sub' }, s.hood + ' · pours ' + s.roaster),
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
    const map = L.map(mapEl, { zoomControl: true, attributionControl: true })
      .setView([43.708, -72.297], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; Carto',
      subdomains: 'abcd',
      maxZoom: 19
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

    shops.forEach(s => {
      const html =
        '<div class="discover-popup">' +
          '<div class="discover-popup-name">' + s.name + '</div>' +
          '<div class="discover-popup-hood">' + s.hood + '</div>' +
          '<div class="discover-popup-feat">' +
            '<span class="discover-popup-feat-label">Featured this week</span>' +
            s.featured +
          '</div>' +
        '</div>';
      L.marker(s.coords, { icon: s.status === 'active' ? activeIcon : soonIcon })
        .addTo(map)
        .bindPopup(html, { closeButton: false, offset: [0, -4] });
    });

    setTimeout(() => map.invalidateSize(), 0);
  });

  /* 4. Trending this week */
  const trending = [
    { name: 'Espresso tonic',     meta: '3 min · Easy',   glyph: '🫧', tone: 'cream' },
    { name: 'Japanese iced V60',  meta: '5 min · Medium', glyph: '🧊', tone: 'green' },
    { name: 'Cortado three ways', meta: '4 min · Easy',   glyph: '☕', tone: 'gold'  }
  ];
  page.appendChild(el('section', { class: 'discover-section' },
    el('div', { class: 'container' },
      el('div', { class: 'discover-section-head' },
        el('div', {},
          el('p', { class: 'discover-eyebrow' }, 'Trending this week'),
          el('h2', { class: 'discover-h2' }, 'What members are brewing')
        ),
        el('a', { href: '#/recipes', class: 'discover-link' }, 'See all →')
      ),
      el('div', { class: 'trending-row' },
        trending.map(t => el('a', { href: '#/recipes', class: 'trending-card' },
          el('div', { class: 'trending-card-thumb pick-tone-' + t.tone },
            el('span', {}, t.glyph)
          ),
          el('div', { class: 'trending-card-body' },
            el('h4', { class: 'trending-card-name' }, t.name),
            el('p', { class: 'trending-card-meta' }, t.meta)
          )
        ))
      )
    )
  ));
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

function skillTreeVisual() {
  const wrap = el('div', { style: 'margin-top:24px' });
  const completed = state.completedClasses || [];

  DATA.skillTree.branches.forEach((branch, i) => {
    const isFirstBranch = i === 0;
    // Connector arrow between branches
    if (!isFirstBranch) {
      wrap.appendChild(el('div', { style: 'text-align:center;color:var(--ink-muted);font-size:1.5rem;margin:8px 0' }, '↓'));
    }

    const branchEl = el('div', { style: 'margin-bottom:12px' },
      el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:12px' },
        el('span', { class: 'pill ' + (branch.color === 'gold' ? 'pill-gold' : branch.color === 'green' ? 'pill-green' : 'pill-accent'), style: 'padding:6px 14px;font-weight:600' }, branch.name)
      ),
      (() => {
        const nodes = el('div', { style: 'display:grid;grid-template-columns:repeat(' + branch.nodes.length + ', 1fr);gap:14px' });
        branch.nodes.forEach(nodeId => {
          const cls = DATA.classes.find(c => c.id === nodeId);
          if (!cls) return;
          const isDone = completed.includes(cls.id);
          nodes.appendChild(el('div', {
            style: 'background:' + (isDone ? 'var(--green-soft)' : 'var(--surface)') + ';border:2px solid ' + (isDone ? 'var(--success)' : 'var(--line)') + ';border-radius:14px;padding:18px;text-align:center;cursor:pointer;transition:transform 0.15s',
            onclick: () => navigate('class/' + cls.id)
          },
            el('div', { style: 'font-size:2.4rem;margin-bottom:8px' }, isDone ? '✓' : cls.icon),
            el('div', { style: 'font-weight:600;font-size:0.92rem;margin-bottom:4px' }, cls.name),
            el('div', { style: 'font-size:0.78rem;color:var(--ink-muted)' }, cls.duration + ' · ' + cls.lessons + ' lessons')
          ));
        });
        return nodes;
      })()
    );
    wrap.appendChild(branchEl);
  });

  // Final node: Sommelier
  wrap.appendChild(el('div', { style: 'text-align:center;color:var(--ink-muted);font-size:1.5rem;margin:8px 0' }, '↓'));
  const tier = computeTier();
  const isSommelier = tier.id === 'sommelier';
  wrap.appendChild(el('div', {
    style: 'background:' + (isSommelier ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : 'var(--surface)') + ';border:2px solid ' + (isSommelier ? 'var(--gold)' : 'var(--line)') + ';border-radius:14px;padding:24px;text-align:center;cursor:pointer;color:' + (isSommelier ? 'white' : 'var(--ink)'),
    onclick: () => navigate('sommelier')
  },
    el('div', { style: 'font-size:3rem;margin-bottom:8px' }, '🏆'),
    el('div', { style: 'font-family:var(--font-display);font-size:1.4rem;font-weight:500' }, 'Coffee Sommelier'),
    el('div', { style: 'font-size:0.85rem;opacity:0.7;margin-top:4px' }, 'The final certification')
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
        state.user?.isGuest ? el('button', { class: 'btn btn-accent btn-sm', onclick: () => openSignupModal() }, 'Sign up free') : null
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

  // Virtual Barista card
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:32px;padding:24px;background:linear-gradient(135deg, var(--caramel-soft) 0%, #FAEDD7 100%);border-color:rgba(200,118,45,0.25)' },
    el('div', { style: 'display:flex;align-items:flex-start;gap:18px;margin-bottom:16px;flex-wrap:wrap' },
      el('div', { style: 'width:64px;height:64px;border-radius:50%;background:var(--espresso);color:var(--crema);display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0' }, '☕'),
      el('div', { style: 'flex:1;min-width:200px' },
        el('div', { class: 'eyebrow', style: 'color:var(--caramel-deep);margin-bottom:4px' }, '💬 Virtual Barista'),
        el('div', { style: 'font-family:var(--font-display);font-size:1.4rem;font-weight:500;letter-spacing:-0.01em' }, 'Ask anything coffee'),
        el('div', { style: 'font-size:0.9rem;color:var(--ink-soft);margin-top:4px' }, 'Trained on your machine, your taste profile, and your last 30 brews.')
      )
    ),
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px' },
      DATA.baristaPrompts.slice(0, 4).map(p => el('button', {
        class: 'pill',
        style: 'cursor:pointer;background:var(--surface);border-color:var(--line);font-size:0.82rem',
        onclick: () => { navigate('barista'); setTimeout(() => sendBaristaMsg(p), 200); }
      }, p))
    ),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('barista') }, 'Open full chat →')
  ));

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

/* ---------------- AI Drink Recommender ---------------- */
// In-memory state for the form so re-renders don't lose user selections
let aiPrefs = { temp: null, strength: null, milk: null, sweet: null, time: null };
let aiResult = null;

function aiRecommenderCard() {
  const card = el('div', { class: 'card', style: 'margin-bottom:32px;padding:0;overflow:hidden;border:1px solid var(--line)' });

  // Header
  card.appendChild(el('div', { style: 'padding:24px 28px 20px' },
    el('div', { class: 'eyebrow', style: 'margin-bottom:6px' }, '🤖 AI Drink Recommender'),
    el('h3', { class: 'h3', style: 'margin-bottom:4px' }, 'What should you drink right now?'),
    el('p', { style: 'color:var(--ink-soft);font-size:0.9rem' }, 'Tell us what you feel like. We pick the drink that matches.')
  ));

  // Form body
  const body = el('div', { style: 'padding:0 28px 24px;border-top:1px solid var(--line);padding-top:20px' });
  body.appendChild(aiSegmentRow('Temperature', 'temp', [
    { value: 'hot', label: 'Hot', icon: '☀️' },
    { value: 'cold', label: 'Cold', icon: '🧊' }
  ]));
  body.appendChild(aiSegmentRow('Strength', 'strength', [
    { value: 'strong', label: 'Strong', icon: '💪' },
    { value: 'medium', label: 'Medium', icon: '👌' },
    { value: 'light', label: 'Light', icon: '🪶' }
  ]));
  body.appendChild(aiSegmentRow('Milk?', 'milk', [
    { value: 'yes', label: 'With milk', icon: '🥛' },
    { value: 'no', label: 'Black', icon: '⚫' }
  ]));
  body.appendChild(aiSegmentRow('Sweet?', 'sweet', [
    { value: 'yes', label: 'Sweet', icon: '🍯' },
    { value: 'no', label: 'Plain', icon: '🌿' }
  ]));
  body.appendChild(aiSegmentRow('Time you have', 'time', [
    { value: 'quick', label: 'Quick (<5 min)', icon: '⚡' },
    { value: 'slow', label: 'I have time', icon: '🕰️' }
  ]));

  // Submit button
  body.appendChild(el('button', {
    class: 'btn btn-accent btn-block btn-lg',
    style: 'margin-top:8px',
    onclick: () => {
      aiResult = aiRecommend();
      render();
    }
  }, '✨ Recommend my drink'));

  // Optional reset
  if (Object.values(aiPrefs).some(v => v !== null) || aiResult) {
    body.appendChild(el('button', {
      class: 'btn btn-ghost btn-sm',
      style: 'margin-top:10px;display:block;margin-left:auto;margin-right:auto',
      onclick: () => {
        aiPrefs = { temp: null, strength: null, milk: null, sweet: null, time: null };
        aiResult = null;
        render();
      }
    }, 'Clear answers'));
  }

  card.appendChild(body);

  // Result
  if (aiResult) {
    card.appendChild(aiResultPanel(aiResult));
  }

  return card;
}

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
      style: 'aspect-ratio:1;background:' + (collected ? 'var(--green-soft)' : 'var(--surface-2)') + ';border:2px ' + (collected ? 'solid var(--success)' : 'dashed var(--line)') + ';border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;opacity:' + (collected ? '1' : '0.4'),
      title: r.name
    }, r.flag));
  });
  return grid;
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
        el('div', { style: 'font-size:3rem;margin-bottom:8px;' + (collected ? '' : 'filter:grayscale(0.6);opacity:0.5') }, r.flag),
        el('div', { style: 'font-weight:600;font-size:0.95rem' }, r.name),
        el('div', { style: 'font-size:0.78rem;margin-top:4px' }, collected ? el('span', { style: 'color:var(--success);font-weight:600' }, '✓ Collected') : el('span', { style: 'color:var(--ink-muted)' }, 'Not yet'))
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
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Recipes'),
    el('h1', { class: 'h1' }, 'Calibrated to your machine'),
    el('p', { style: 'max-width:620px' }, 'Recipes for every brew method. Calibrated to the equipment you actually own. The everyday techniques every home brewer should know.')
  ));

  // Tabs by method
  const methods = ['All', 'Drip', 'Espresso', 'Cold brew', 'Pour over'];
  let active = 'All';
  const tabs = el('div', { class: 'tabs' });
  methods.forEach(m => {
    const t = el('button', { class: 'tab' + (m === active ? ' active' : ''), onclick: () => { active = m; paint(); } }, m);
    tabs.appendChild(t);
  });
  c.appendChild(tabs);
  const grid = el('div', { class: 'grid grid-3', id: 'recipeGrid' });
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
  const c = el('div', { class: 'container' });
  main.appendChild(c);
  const r = getRecipe(id);
  if (!r) {
    c.appendChild(el('p', {}, 'Recipe not found.'));
    return;
  }
  const machine = getMachine();
  const isCalibrated = machine && r.machineCompat.includes(machine.id);

  c.appendChild(el('a', { href: '#/recipes', class: 'btn btn-ghost btn-sm', style: 'margin-bottom:16px;display:inline-flex' }, '← All recipes'));

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, r.method),
    el('h1', { class: 'h1' }, r.name),
    el('p', { style: 'max-width:680px' }, r.desc)
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
function renderCommunity(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Community'),
    el('h1', { class: 'h1' }, 'Brew with people who care'),
    el('p', {}, 'Weekly challenges, taste-along events, and creator content. Earn badges, win drops, learn from people who know more than you.')
  ));

  // Challenges
  c.appendChild(el('h3', { class: 'h3 mb' }, 'Active challenges'));
  c.appendChild(el('div', { style: 'height:8px' }));
  const challengeGrid = el('div', { class: 'grid grid-2' });
  DATA.challenges.forEach(ch => {
    const joined = state.joinedChallenges.includes(ch.id);
    challengeGrid.appendChild(el('div', { class: 'card' + (ch.featured ? ' card-accent' : '') },
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
        onclick: () => {
          if (!joined) {
            state.joinedChallenges.push(ch.id);
            state.points += 25;
            save();
            toast('Joined ' + ch.name + '. +25 pts');
            render();
          }
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
    ['1', 'Maya R.', 4830],
    ['2', 'Diego P.', 4210],
    ['3', 'Priya S.', 3905],
    ['4', state.user?.name || 'You', state.points + 3000],
    ['5', 'Alex T.', 3120],
    ['6', 'Sam K.', 2890],
    ['7', 'Jordan W.', 2540]
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

function openSignupModal() {
  const existing = document.getElementById('signupModal');
  if (existing) existing.remove();

  const backdrop = el('div', { class: 'modal-backdrop show', id: 'signupModal' });
  const modal = el('div', { class: 'modal' },
    el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px' },
      el('h3', { class: 'h3' }, 'Sign in to Brew Lab'),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => backdrop.remove() }, '✕')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:24px' }, 'No password needed. We email you a one-click sign-in link. Your brews, badges, and friends sync across devices.'),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Your name'),
      el('input', { class: 'input', id: 'suName', placeholder: 'Alex Brewer', value: state.user?.isGuest ? '' : (state.user?.name || '') })
    ),
    el('div', { class: 'field', style: 'margin-top:14px' },
      el('label', { class: 'label' }, 'Email'),
      el('input', { class: 'input', id: 'suEmail', type: 'email', placeholder: 'alex@example.com' })
    ),
    el('div', { id: 'suStatus', style: 'margin-top:14px;font-size:0.88rem;color:var(--ink-muted)' }),
    el('div', { style: 'display:flex;gap:8px;margin-top:20px;justify-content:flex-end' },
      el('button', { class: 'btn btn-ghost', onclick: () => backdrop.remove() }, 'Cancel'),
      el('button', {
        class: 'btn btn-accent',
        id: 'suSubmit',
        onclick: async () => {
          const name = document.getElementById('suName').value.trim();
          const email = document.getElementById('suEmail').value.trim();
          const status = document.getElementById('suStatus');
          const btn = document.getElementById('suSubmit');
          if (!name || !email) {
            status.textContent = 'Please add your name and email.';
            status.style.color = 'var(--danger)';
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Sending...';
          status.style.color = 'var(--ink-muted)';
          status.textContent = '';
          try {
            await DB.signInWithEmail(email, name);
            status.style.color = 'var(--success)';
            status.textContent = '✓ Check your email. Click the link to sign in.';
            btn.textContent = 'Sent';
          } catch (e) {
            status.style.color = 'var(--danger)';
            status.textContent = e.message || 'Could not send link. Try again.';
            btn.disabled = false;
            btn.textContent = 'Send link';
          }
        }
      }, 'Send link')
    ),
    el('p', { style: 'margin-top:16px;text-align:center;font-size:0.78rem;color:var(--ink-muted)' }, 'No spam. Just the magic-link email.')
  );
  backdrop.appendChild(modal);
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

  // Video preview card
  const video = el('div', { class: 'card', style: 'padding:0;overflow:hidden;margin-bottom:24px' },
    el('div', {
      style: 'aspect-ratio:16/8;background:linear-gradient(135deg, var(--espresso) 0%, #3D2418 100%);display:flex;align-items:center;justify-content:center;color:var(--bg);position:relative;cursor:pointer',
      onclick: () => toast('Starting class (demo)')
    },
      el('div', { style: 'text-align:center' },
        el('div', { style: 'font-size:5rem;line-height:1;color:var(--caramel)' }, cls.icon),
        el('div', { style: 'margin-top:14px;font-family:var(--font-display);font-size:1.6rem' }, cls.name),
        el('div', { style: 'margin-top:6px;font-size:0.9rem;opacity:0.7' }, '▶ Preview · ' + cls.duration + ' total')
      )
    )
  );
  c.appendChild(video);

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
              onclick: () => toast('Playing lesson ' + (i + 1) + ' (demo)')
            }, 'Play')
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
        state.user?.isGuest ? el('button', { class: 'btn btn-accent btn-sm', onclick: () => openSignupModal() }, 'Sign up free') : null,
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
    state.user = { name: 'Guest', email: '', joined: new Date().toISOString(), isGuest: true };
    state.points = 100;
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
  if (!state.journal || !state.journal.length) {
    state.journal = JSON.parse(JSON.stringify(DATA.seedJournal));
  }
  if (!state.badges || !state.badges.length) {
    state.badges = ['beta', 'taste-profile', 'machine-master', 'first-brew'];
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
    mountAppShell();
    render();
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

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
  isMember: true,     // demo: every signed-in user is a member
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
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
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
function signOut() {
  state.user = null;
  state.profile = null;
  state.journal = [];
  state.badges = [];
  state.favorites = [];
  state.points = 0;
  state.joinedChallenges = [];
  localStorage.removeItem(STORE_KEY);
  window.location.href = 'index.html';
}

/* ---------------- Router ---------------- */
const ROUTES = {
  '': renderDashboard,
  'home': renderDashboard,
  'recipes': renderRecipes,
  'recipe': renderRecipeDetail,
  'journal': renderJournal,
  'beans': renderBeans,
  'origins': renderOrigins,
  'origin': renderOriginDetail,
  'community': renderCommunity,
  'machine': renderMachine,
  'barista': renderBarista,
  'drops': renderDrops,
  'classes': renderClasses,
  'class': renderClassDetail,
  'latte-art': renderLatteArt,
  'sommelier': renderSommelier,
  'profile': renderProfile,
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

  // Update active nav state
  document.querySelectorAll('.nav-link').forEach(l => {
    const to = l.getAttribute('data-route');
    l.classList.toggle('active', to === route || (to === 'home' && route === ''));
  });

  fn(main, param);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', render);

/* ============================================================
   APP SHELL: header + nav
   ============================================================ */

function mountAppShell() {
  // Header
  const header = el('header', { class: 'site-header' },
    el('div', { class: 'site-header-inner' },
      el('a', { href: '#/home', class: 'brand' },
        el('span', { class: 'brand-mark' }, '◐'),
        el('span', {}, 'Brew Lab'),
        el('span', { class: 'brand-tag' }, 'by Cuisinart')
      ),
      el('nav', {},
        (() => {
          const links = el('ul', { class: 'nav-links' });
          [
            ['home', 'Home'],
            ['recipes', 'Recipes'],
            ['classes', 'Classes'],
            ['journal', 'Journal'],
            ['beans', 'Beans'],
            ['origins', 'Origins'],
            ['community', 'Community'],
            ['machine', 'Machine']
          ].forEach(([slug, label]) => {
            const a = el('a', {
              href: '#/' + slug,
              class: 'nav-link',
              'data-route': slug
            }, label);
            links.appendChild(el('li', {}, a));
          });
          return links;
        })()
      ),
      el('div', { class: 'user-menu' },
        el('button', {
          class: 'btn btn-ghost btn-sm',
          title: 'Ask the Virtual Barista',
          onclick: () => navigate('barista')
        }, '💬 Ask Barista'),
        (() => {
          const tier = computeTier();
          const wrap = el('a', { href: '#/profile', style: 'position:relative;display:inline-block', title: (state.user?.name || 'You') + ' · ' + tier.name });
          wrap.appendChild(el('span', { class: 'avatar' }, initials(state.user?.name)));
          wrap.appendChild(el('span', {
            style: 'position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:' + (tier.color === 'gold' ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : tier.color === 'green' ? 'linear-gradient(135deg, var(--green) 0%, #1d3327 100%)' : 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)') + ';display:flex;align-items:center;justify-content:center;font-size:0.78rem;border:2px solid var(--bg)'
          }, tier.icon));
          return wrap;
        })()
      )
    )
  );

  // Main container
  const main = el('main', { id: 'main', class: 'app-main' });
  const containerWrapper = el('div', { class: 'container' });
  main.appendChild(containerWrapper);

  document.body.appendChild(header);
  document.body.appendChild(main);
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

/* ----- Dashboard ----- */
function renderDashboard(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const machine = getMachine();
  const top = topRecipe();
  const featuredChallenge = DATA.challenges.find(c => c.featured);
  const recBeans = recommendBeans(3);
  const recRecipes = recommendRecipes(3);
  const recentEntries = state.journal.slice(0, 3);
  const memberSince = state.user?.joined ? fmtDate(state.user.joined) : 'today';

  // Guest banner
  if (state.user?.isGuest) {
    c.appendChild(el('div', { style: 'display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--caramel-soft);border:1px solid rgba(200,118,45,0.25);border-radius:12px;margin-bottom:24px;flex-wrap:wrap' },
      el('span', { style: 'font-size:1.4rem' }, '👋'),
      el('div', { style: 'flex:1;min-width:200px;font-size:0.92rem' },
        el('strong', {}, "You're browsing as a guest. "),
        el('span', { style: 'color:var(--ink-soft)' }, 'Sign up free to save your brews, badges, and points across devices.')
      ),
      el('button', {
        class: 'btn btn-accent btn-sm',
        onclick: () => openSignupModal()
      }, 'Sign up free'),
      el('button', {
        class: 'btn btn-ghost btn-sm',
        onclick: () => navigate('onboard')
      }, 'Take taste quiz')
    ));
  }

  // Greeting
  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, `Welcome${state.user?.isGuest ? '' : ' back'}${state.user && !state.user.isGuest ? ', ' + state.user.name.split(' ')[0] : ''}`),
    el('h1', { class: 'h1' }, "Today's brew"),
    el('p', {}, state.user?.isGuest ? 'Try the demo. Take the taste quiz any time to personalize.' : `Member since ${memberSince}. ${state.points.toLocaleString()} brew points.`)
  ));

  // Spotlight
  const spotlight = el('div', { class: 'spotlight' },
    el('div', { class: 'spotlight-eyebrow' }, '★ Picked for you'),
    el('h2', { class: 'h2' }, top.name),
    el('p', {}, top.desc),
    el('div', { class: 'spotlight-meta' },
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Method'), el('div', { class: 'value' }, top.method)),
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Time'), el('div', { class: 'value' }, top.time)),
      el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Difficulty'), el('div', { class: 'value' }, top.difficulty)),
      machine ? el('div', { class: 'meta-item' }, el('div', { class: 'label' }, 'Calibrated for'), el('div', { class: 'value' }, machine.name)) : null
    ),
    el('button', { class: 'btn btn-accent', onclick: () => navigate('recipe/' + top.id) }, 'Brew it →')
  );
  c.appendChild(spotlight);
  c.appendChild(el('div', { style: 'height: 32px' }));

  // Sommelier rank card
  const tier = computeTier();
  const next = nextTier();
  const tProgress = next ? tierProgress(next) : null;
  const rankCard = el('div', { class: 'card', style: 'margin-bottom:32px;padding:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;cursor:pointer', onclick: () => navigate('sommelier') },
    el('div', { style: 'width:72px;height:72px;border-radius:50%;background:' + (tier.color === 'gold' ? 'linear-gradient(135deg, var(--gold) 0%, #806017 100%)' : tier.color === 'green' ? 'linear-gradient(135deg, var(--green) 0%, #1d3327 100%)' : 'linear-gradient(135deg, var(--caramel) 0%, var(--caramel-deep) 100%)') + ';display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:white;flex-shrink:0;box-shadow:var(--shadow-sm)' }, tier.icon),
    el('div', { style: 'flex:1;min-width:200px' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:4px' }, 'Your rank'),
      el('div', { style: 'font-family:var(--font-display);font-size:1.4rem;font-weight:500;letter-spacing:-0.01em;margin-bottom:8px' }, tier.name),
      next ? el('div', {},
        el('div', { style: 'display:flex;justify-content:space-between;font-size:0.8rem;color:var(--ink-muted);margin-bottom:6px' },
          el('span', {}, 'Next: ' + next.name),
          el('span', { class: 'mono' }, tProgress.met + '/' + tProgress.total)
        ),
        el('div', { class: 'progress' },
          el('div', { class: 'progress-bar', style: 'width:' + tProgress.pct + '%' })
        )
      ) : el('span', { class: 'pill pill-gold' }, '🏆 Top tier reached')
    ),
    el('button', { class: 'btn btn-secondary', onclick: (e) => { e.stopPropagation(); navigate('sommelier'); } }, 'See path →')
  );
  c.appendChild(rankCard);

  // Three column row: Featured challenge | Machine | Member perks
  const row = el('div', { class: 'grid grid-3' });

  if (featuredChallenge) {
    row.appendChild(el('div', { class: 'card card-accent' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:8px' }, 'This week'),
      el('h3', { class: 'h3' }, featuredChallenge.icon + ' ' + featuredChallenge.name),
      el('p', { class: 'mt-sm muted', style: 'font-size: 0.9rem' }, featuredChallenge.desc),
      el('div', { class: 'mt' },
        el('span', { class: 'pill pill-accent' }, '🏆 ' + featuredChallenge.reward.split('+')[0].trim()),
        el('span', { style: 'margin-left:8px;font-size:0.8rem;color:var(--ink-muted)' }, featuredChallenge.participants.toLocaleString() + ' brewing')
      ),
      el('button', {
        class: 'btn btn-primary btn-sm mt',
        style: 'margin-top: 16px',
        onclick: () => {
          if (!state.joinedChallenges.includes(featuredChallenge.id)) {
            state.joinedChallenges.push(featuredChallenge.id);
            state.points += 25;
            save();
            toast('Joined ' + featuredChallenge.name + '. +25 pts');
            render();
          }
        }
      }, state.joinedChallenges.includes(featuredChallenge.id) ? 'Joined ✓' : 'Join challenge')
    ));
  }

  if (machine) {
    row.appendChild(el('div', { class: 'card' },
      el('div', { class: 'eyebrow', style: 'margin-bottom:8px' }, 'Your machine'),
      el('h3', { class: 'h3' }, machine.icon + ' ' + machine.name.replace('Cuisinart ', '')),
      el('p', { class: 'mt-sm muted', style: 'font-size: 0.9rem' }, machine.blurb),
      el('div', { class: 'insight-row mt' },
        el('span', { class: 'icon' }, '✓'),
        el('div', {},
          el('div', { style: 'font-weight:600' }, 'Warranty active'),
          el('div', { style: 'font-size:0.8rem;color:var(--ink-soft)' }, '2 years remaining')
        )
      ),
      el('button', { class: 'btn btn-secondary btn-sm mt', style: 'margin-top:16px', onclick: () => navigate('machine') }, 'Open machine center →')
    ));
  } else {
    row.appendChild(el('div', { class: 'card' },
      el('h3', { class: 'h3' }, 'Register your Cuisinart'),
      el('p', { class: 'mt-sm muted', style: 'font-size: 0.9rem' }, 'Get personalized recipes and unlock your warranty in one step.'),
      el('button', { class: 'btn btn-primary btn-sm mt', style: 'margin-top:16px', onclick: () => navigate('machine') }, 'Add machine →')
    ));
  }

  row.appendChild(el('div', { class: 'card card-dark' },
    el('div', { class: 'eyebrow', style: 'margin-bottom:8px;color:var(--crema)' }, 'Member perk'),
    el('h3', { class: 'h3' }, 'Up to 18% off beans'),
    el('p', { class: 'mt-sm', style: 'font-size: 0.9rem;color:rgba(250,246,241,0.7)' }, 'Brew Lab members pay below MSRP at our partner roasters. Onyx, Counter Culture, Trade, Atlas.'),
    el('button', { class: 'btn btn-accent btn-sm mt', style: 'margin-top:16px', onclick: () => navigate('beans') }, 'See member prices →')
  ));

  c.appendChild(row);
  c.appendChild(el('div', { style: 'height: 48px' }));

  // Recommended beans
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Beans matched to your taste'),
    el('a', { href: '#/beans' }, 'See all →')
  ));
  const beanGrid = el('div', { class: 'grid grid-3' });
  recBeans.forEach(b => beanGrid.appendChild(beanTile(b)));
  c.appendChild(beanGrid);
  c.appendChild(el('div', { style: 'height: 48px' }));

  // Recommended recipes
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'More recipes for you'),
    el('a', { href: '#/recipes' }, 'See all →')
  ));
  const recGrid = el('div', { class: 'grid grid-3' });
  recRecipes.forEach(r => recGrid.appendChild(recipeTile(r)));
  c.appendChild(recGrid);
  c.appendChild(el('div', { style: 'height: 48px' }));

  // Recent journal + creator content
  const dual = el('div', { class: 'split' });
  // Journal
  const journalCard = el('div', { class: 'card' });
  journalCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Recent brews'),
    el('a', { href: '#/journal' }, 'Open journal →')
  ));
  if (recentEntries.length) {
    const list = el('div', { class: 'list' });
    recentEntries.forEach(e => list.appendChild(journalRow(e)));
    journalCard.appendChild(list);
  } else {
    journalCard.appendChild(el('div', { class: 'empty' },
      el('div', { class: 'empty-icon' }, '☕'),
      el('p', {}, 'No brews logged yet. Brew something and log it.'),
      el('button', { class: 'btn btn-accent btn-sm', onclick: () => navigate('journal') }, 'Log a brew')
    ));
  }
  dual.appendChild(journalCard);

  // Creator feed
  const feedCard = el('div', { class: 'card' });
  feedCard.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Latest from creators'),
    el('a', { href: '#/community' }, 'Discover →')
  ));
  const feedList = el('div', { class: 'list' });
  DATA.feed.forEach(f => feedList.appendChild(feedRow(f)));
  feedCard.appendChild(feedList);
  dual.appendChild(feedCard);
  c.appendChild(dual);
}

/* ----- Tiles / rows ----- */
function recipeTile(r) {
  return el('div', {
    class: 'tile',
    onclick: () => navigate('recipe/' + r.id)
  },
    el('div', { class: r.thumbClass || 'tile-thumb' },
      el('span', {}, r.icon),
      el('span', { class: 'tile-thumb-tag' }, r.method)
    ),
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
  const lowest = [...b.prices].filter(p => !p.memberOnly).sort((a, c) => a.price - c.price)[0];
  const memberPrice = b.prices.find(p => p.memberOnly);
  return el('div', {
    class: 'tile',
    onclick: () => navigate('beans')
  },
    el('div', { class: 'tile-thumb' },
      el('span', {}, b.icon)
    ),
    el('div', { class: 'tile-body' },
      el('div', { class: 'tile-title' }, b.name),
      el('div', { class: 'tile-meta' },
        el('span', {}, b.roaster),
        el('span', {}, '•'),
        el('span', {}, b.roast)
      ),
      el('div', { class: 'mt-sm', style: 'display:flex;justify-content:space-between;align-items:center;margin-top:10px' },
        el('div', {},
          el('span', { class: 'pill pill-accent' }, '$' + memberPrice.price.toFixed(2) + ' member'),
          el('span', { style: 'font-size:0.78rem;color:var(--ink-muted);margin-left:8px;text-decoration:line-through' }, '$' + lowest.price.toFixed(2))
        )
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
    el('p', {}, 'Every recipe in Brew Lab is dialed in for the specific Cuisinart you own. No more guessing what setting 4 means on someone elses Bonavita.')
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
      el('span', { class: 'icon' }, '⚙️'),
      el('div', {},
        el('div', { style: 'font-weight:600' }, 'Calibrated for your ' + machine.name),
        el('div', { style: 'font-size:0.85rem;color:var(--ink-soft)' }, 'Times, settings, and grind references are dialed in for the exact machine you own.')
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

/* ----- Beans / marketplace ----- */
function renderBeans(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Bean marketplace'),
    el('h1', { class: 'h1' }, 'Your taste. Best price. One place.'),
    el('p', {}, 'We compare prices across roaster sites, Amazon, and grocery so you stop overpaying. Members pay below the lowest public price.')
  ));

  const recommended = recommendBeans(99);

  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Picked for your taste profile'),
    null
  ));

  recommended.forEach(b => c.appendChild(beanRow(b)));
}

function beanRow(b) {
  const sorted = [...b.prices].sort((a, c) => a.price - c.price);
  const lowestPublic = sorted.find(p => !p.memberOnly);
  const memberPrice = sorted.find(p => p.memberOnly);
  const youSave = lowestPublic && memberPrice ? (lowestPublic.price - memberPrice.price) : 0;
  const origin = getOrigin(b.originRef);

  const card = el('div', { class: 'card mb-lg', style: 'margin-bottom:20px;padding:0;overflow:hidden' });
  const head = el('div', { style: 'display:grid;grid-template-columns:120px 1fr;gap:0;align-items:stretch' },
    el('div', { class: 'tile-thumb', style: 'aspect-ratio:auto' },
      el('span', { style: 'font-size:3.5rem' }, b.icon)
    ),
    el('div', { style: 'padding:20px 24px' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap' },
        el('div', {},
          el('div', { class: 'h4' }, b.name),
          el('div', { class: 'muted', style: 'font-size:0.9rem' }, b.roaster + ' • ' + b.origin + ' • ' + b.roast),
          el('div', { class: 'mt-sm' }, b.tags.map(t => el('span', { class: 'pill', style: 'margin-right:6px' }, t)))
        ),
        el('div', { style: 'text-align:right' },
          el('div', { class: 'eyebrow' }, 'Member price'),
          el('div', { class: 'h2', style: 'font-size:1.75rem' }, '$' + memberPrice.price.toFixed(2)),
          el('div', { style: 'font-size:0.85rem;color:var(--success);font-weight:600' }, 'You save $' + youSave.toFixed(2))
        )
      ),
      el('div', { class: 'mt' },
        el('strong', { style: 'font-size:0.85rem' }, 'Tasting:'),
        el('span', { style: 'font-size:0.9rem;margin-left:6px;color:var(--ink-soft)' }, b.flavors.join(', '))
      )
    )
  );
  card.appendChild(head);

  // Price comparison table
  const prices = el('div', { style: 'border-top:1px solid var(--line);padding:18px 24px;background:var(--surface-2)' });
  prices.appendChild(el('div', { class: 'eyebrow', style: 'margin-bottom:12px' }, 'Price comparison · ' + b.sizeOz + 'oz'));
  const priceList = el('div', { style: 'display:grid;gap:8px' });
  sorted.forEach(p => {
    const isLowestPublic = p === lowestPublic;
    const isMember = p.memberOnly;
    priceList.appendChild(el('div', {
      style: 'display:grid;grid-template-columns:1fr 1fr 100px 110px;gap:12px;padding:10px 12px;background:' + (isMember ? 'var(--caramel-soft)' : 'var(--surface)') + ';border-radius:8px;border:1px solid ' + (isMember ? 'rgba(200,118,45,0.3)' : 'var(--line))') + ';align-items:center;font-size:0.92rem'
    },
      el('div', { style: 'font-weight:600' }, p.retailer + (isMember ? ' ⭐' : '')),
      el('div', { style: 'color:var(--ink-muted);font-size:0.85rem' }, p.kind + ' · ' + p.shipping),
      el('div', { style: 'font-family:var(--font-display);font-size:1.15rem' + (isLowestPublic && !isMember ? ';color:var(--success);font-weight:600' : '') + (isMember ? ';color:var(--caramel-deep);font-weight:600' : '') }, '$' + p.price.toFixed(2)),
      el('button', {
        class: 'btn btn-sm ' + (isMember ? 'btn-accent' : 'btn-secondary'),
        onclick: () => toast(isMember ? 'Adding to your member cart (demo)' : 'Opening ' + p.retailer + ' (demo)')
      }, isMember ? 'Add to cart' : 'Visit')
    ));
  });
  prices.appendChild(priceList);
  if (origin) {
    prices.appendChild(el('div', { class: 'mt', style: 'margin-top:14px;font-size:0.85rem;color:var(--ink-muted)' },
      '🌍 Sourced from ',
      el('a', { href: '#/origin/' + origin.id, style: 'color:var(--caramel-deep);font-weight:500' }, origin.region + ', ' + origin.country),
      ' — meet the farmer'
    ));
  }
  card.appendChild(prices);
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
  const greet = `Hey ${state.user?.name?.split(' ')[0] || 'there'}. I see you brew on a ${machine?.name?.replace('Cuisinart ', '') || 'Cuisinart machine'} and lean toward ${state.profile?.flavors?.[0] || 'balanced'} flavors. What can I help with?`;
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

  // Drops shortcut
  c.appendChild(el('div', { class: 'section-title' },
    el('h3', { class: 'h3' }, 'Members-only drops & giveaways'),
    el('a', { href: '#/drops' }, 'See all →')
  ));
  const dropGrid = el('div', { class: 'grid grid-4' });
  DATA.drops.forEach(d => dropGrid.appendChild(dropCard(d)));
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
  return el('div', { class: 'drop-card', onclick: () => navigate('drops') },
    el('div', { class: 'drop-thumb', style: 'background:' + d.bg + ';color:white' },
      el('div', {}, d.icon),
      el('span', { class: 'drop-flag ' + d.flag }, d.flagText)
    ),
    el('div', { class: 'drop-body' },
      el('div', { class: 'drop-title' }, d.name),
      el('div', { class: 'drop-meta' }, d.kind + ' · ' + d.status),
      el('div', { class: 'drop-row' },
        el('span', { class: 'drop-price' }, d.price),
        d.flag === 'live' ? el('span', { class: 'drop-countdown' }, '● Live') : null
      )
    )
  );
}

/* ----- Drops ----- */
function renderDrops(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);
  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Drops & Giveaways'),
    el('h1', { class: 'h1' }, 'Members get the good stuff'),
    el('p', {}, 'Limited drops. Free giveaways. Pre-orders before the public site. The reason your account login is worth keeping.')
  ));
  const grid = el('div', { class: 'grid grid-3' });
  DATA.drops.forEach(d => grid.appendChild(dropCard(d)));
  c.appendChild(grid);
}

/* ----- Machine health ----- */
function renderMachine(main) {
  main.innerHTML = '';
  const c = el('div', { class: 'container' });
  main.appendChild(c);

  const m = getMachine();

  c.appendChild(el('div', { class: 'page-head' },
    el('div', { class: 'eyebrow' }, 'Machine center'),
    el('h1', { class: 'h1' }, 'Keep your Cuisinart happy'),
    el('p', {}, 'Warranty, maintenance reminders, and parts in one place. We notify you before something breaks.')
  ));

  if (!m) {
    c.appendChild(el('div', { class: 'card card-padded text-center' },
      el('div', { style: 'font-size:3rem;margin-bottom:12px' }, '⚙️'),
      el('h3', { class: 'h3' }, 'No machine registered'),
      el('p', { class: 'muted mt-sm' }, 'Add your Cuisinart to unlock warranty tracking and personalized recipes.'),
      el('button', { class: 'btn btn-accent mt-lg', style: 'margin-top:24px', onclick: () => navigate('onboard') }, 'Add machine')
    ));
    return;
  }

  // Header card
  c.appendChild(el('div', { class: 'card', style: 'margin-bottom:24px' },
    el('div', { style: 'display:grid;grid-template-columns:80px 1fr;gap:20px;align-items:center' },
      el('div', { class: 'tile-thumb', style: 'aspect-ratio:1;border-radius:14px;font-size:2.5rem' }, m.icon),
      el('div', {},
        el('div', { class: 'eyebrow', style: 'margin-bottom:4px' }, m.kind),
        el('h2', { class: 'h2' }, m.name),
        el('p', { class: 'muted mt-sm' }, m.blurb)
      )
    )
  ));

  // Status grid
  const grid = el('div', { class: 'grid grid-2 mb-lg' });

  // Warranty
  grid.appendChild(el('div', { class: 'card' },
    el('div', { class: 'eyebrow' }, 'Warranty'),
    el('div', { class: 'h3 mt-sm' }, '✓ Active'),
    el('div', { class: 'mt' },
      el('div', { class: 'progress', style: 'margin-bottom:8px' },
        el('div', { class: 'progress-bar progress-bar-green', style: 'width:67%' })
      ),
      el('div', { style: 'display:flex;justify-content:space-between;font-size:0.85rem;color:var(--ink-soft)' },
        el('span', {}, 'Registered Jan 2025'),
        el('span', {}, '2 yr 1 mo remaining')
      )
    ),
    el('button', { class: 'btn btn-secondary btn-sm mt', style: 'margin-top:16px', onclick: () => toast('Filing service request (demo)') }, 'File a service request')
  ));

  // Descaling
  grid.appendChild(el('div', { class: 'card' },
    el('div', { class: 'eyebrow' }, 'Maintenance'),
    el('div', { class: 'h3 mt-sm' }, '⚠ Descaling due'),
    el('div', { class: 'mt' },
      el('div', { class: 'progress', style: 'margin-bottom:8px' },
        el('div', { class: 'progress-bar', style: 'width:88%;background:var(--warning)' })
      ),
      el('div', { style: 'display:flex;justify-content:space-between;font-size:0.85rem;color:var(--ink-soft)' },
        el('span', {}, 'Last descaled 11 weeks ago'),
        el('span', {}, 'Due in 4 days')
      )
    ),
    el('button', { class: 'btn btn-accent btn-sm mt', style: 'margin-top:16px', onclick: () => toast('Marked descaled. Next due in 90 days.') }, 'Mark descaled')
  ));

  c.appendChild(grid);

  // Maintenance log + parts
  const split = el('div', { class: 'split' });

  // Maintenance schedule
  split.appendChild(el('div', { class: 'card' },
    el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'Maintenance schedule'), null),
    el('div', { class: 'list' },
      maintenanceRow('🧂', 'Descale with citric acid solution', 'Every 90 days', 'Due in 4 days', 'warn'),
      maintenanceRow('💧', 'Replace charcoal water filter', 'Every 60 days', '23 days remaining', 'ok'),
      maintenanceRow('🧽', 'Deep clean grinder burrs', 'Every 6 months', '4 months remaining', 'ok'),
      maintenanceRow('🔧', 'Annual service check-in', 'Once per year', '8 months remaining', 'ok')
    )
  ));

  // Parts & accessories
  split.appendChild(el('div', { class: 'card' },
    el('div', { class: 'section-title' }, el('h3', { class: 'h3' }, 'Parts & accessories'), null),
    el('div', { class: 'list' },
      partRow('🥄', 'Replacement portafilter (54mm)', '$24.95', m.id === 'em-15'),
      partRow('💧', 'Charcoal water filter (3-pack)', '$12.50', true),
      partRow('🫧', 'Steam wand cleaning kit', '$8.95', m.id === 'em-15'),
      partRow('☕', 'Replacement carafe', '$32.00', ['dgb-2', 'dcc-1200'].includes(m.id))
    )
  ));
  c.appendChild(split);
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

function partRow(icon, name, price, recommended) {
  return el('div', { class: 'list-item' },
    el('div', { class: 'list-item-thumb' }, icon),
    el('div', { class: 'list-item-body' },
      el('div', { class: 'list-item-title' }, name + (recommended ? ' ⭐' : '')),
      el('div', { class: 'list-item-meta' }, price + (recommended ? ' · Recommended for your machine' : ''))
    ),
    el('button', { class: 'btn btn-secondary btn-sm', onclick: () => toast('Added to cart (demo)') }, 'Add')
  );
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
    el('p', {}, 'Members submit their best pour. Community votes. Top 3 each week win a free Brew Lab milk pitcher and a feature on our Instagram.')
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
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:16px' }, 'Lance Hedrick teaches Latte Art 101 and 201 in Brew School. Free for members.'),
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
      el('h3', { class: 'h3' }, 'Sign up free'),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => backdrop.remove() }, '✕')
    ),
    el('p', { class: 'muted mt-sm', style: 'margin-bottom:24px' }, 'Save your brews, badges, and points across devices. No credit card. No spam.'),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Your name'),
      el('input', { class: 'input', id: 'suName', placeholder: 'Alex Brewer' })
    ),
    el('div', { class: 'field', style: 'margin-top:14px' },
      el('label', { class: 'label' }, 'Email'),
      el('input', { class: 'input', id: 'suEmail', type: 'email', placeholder: 'alex@example.com' })
    ),
    el('div', { style: 'display:flex;gap:8px;margin-top:24px;justify-content:flex-end' },
      el('button', { class: 'btn btn-ghost', onclick: () => backdrop.remove() }, 'Cancel'),
      el('button', {
        class: 'btn btn-accent',
        onclick: () => {
          const name = document.getElementById('suName').value.trim();
          const email = document.getElementById('suEmail').value.trim();
          if (!name || !email) {
            toast('Please add your name and email');
            return;
          }
          state.user = { name, email, joined: new Date().toISOString(), isGuest: false };
          save();
          backdrop.remove();
          toast('Welcome to Brew Lab, ' + name.split(' ')[0]);
          render();
        }
      }, 'Create account')
    ),
    el('p', { style: 'margin-top:16px;text-align:center;font-size:0.78rem;color:var(--ink-muted)' }, 'Demo only. Your data stays in this browser.')
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
            machine: getMachine()?.name?.replace('Cuisinart ', '') || 'EM-15',
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
            state.user?.email || 'Browsing as guest',
            state.user?.joined && !state.user?.isGuest ? ' · Member since ' + fmtDate(state.user.joined) : ''
          ),
          el('div', { style: 'margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
            el('span', { class: 'pill ' + (tier.color === 'gold' ? 'pill-gold' : tier.color === 'green' ? 'pill-green' : 'pill-accent'), style: 'font-size:0.88rem;padding:6px 14px;font-weight:600' },
              tier.icon + ' ' + tier.name
            ),
            getMachine() ? el('span', { class: 'pill' }, getMachine().icon + ' ' + getMachine().name.replace('Cuisinart ', '')) : null
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
      machine: 'em-15',
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

function boot() {
  load();
  ensureGuest();
  mountAppShell();
  render();
}

document.addEventListener('DOMContentLoaded', boot);

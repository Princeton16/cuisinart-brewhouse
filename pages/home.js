/* pages/home.js — the Home tab (discovery + flavor quiz hook).
   Entry tab for every user, whether or not they own a connected machine.
   Built so a brand-new visitor sees:
     1. A bold "Find your perfect coffee" flavor quiz CTA
     2. Today's pick recipe
     3. Recommended brews carousel
     4. Community pulse (top this week)
     5. Latte art marquee (existing)
   Loaded after helpers/posts.js and pages/you.js (re-uses recCard et al). */

const HOME_PALATE_KEY = 'beanapp_palate_match_v1';

/* ---------- Top-level render ---------- */
function renderBeanHome(main) {
  const user = (typeof getBeanUser === 'function' ? getBeanUser() : null) || { name: 'friend' };
  const firstName = (user.name || 'friend').split(/\s+/)[0];
  const match = loadPalateMatch();
  const recommendations = (typeof pickRecommendedBrews === 'function') ? pickRecommendedBrews(5) : [];

  const page = el('div', { class: 'bean-page bean-home' });

  // Friendly hello — keeps the entry tab personal even without a device.
  page.appendChild(el('div', { class: 'home-hello' },
    el('div', { class: 'home-hello-greeting' }, 'Welcome to Brew Lab, ', el('strong', {}, firstName), '.'),
    el('div', { class: 'home-hello-sub' }, match
      ? 'Your palate match is dialed in. Here’s what to brew next.'
      : 'Tell us how you take your coffee — we’ll do the rest.')
  ));

  // Flavor quiz CTA card — the gamified front door
  page.appendChild(buildHomeQuizCard(match));

  // Today's pick — the featured rec (first item in the rotation)
  if (recommendations.length) {
    page.appendChild(buildHomeTodayCard(recommendations[0]));
  }

  // Recommended carousel
  if (recommendations.length > 1) {
    page.appendChild(youRecommendedRow(recommendations));
  }

  // Community pulse — top-this-week posts in a slim rail
  page.appendChild(buildHomeCommunityCard());

  // Latte art marquee — pre-existing
  if (typeof homeLatteMarquee === 'function') {
    page.appendChild(homeLatteMarquee());
  }

  // Connected device hint — funnels owners to Profile, no pressure for non-owners
  page.appendChild(buildHomeDeviceHint());

  main.appendChild(page);
  if (typeof enableHorizontalWheelScroll === 'function') enableHorizontalWheelScroll(page);
}

/* ---------- Flavor quiz CTA card ---------- */
function buildHomeQuizCard(match) {
  // If the user has already completed the quiz, show their palate match in
  // a refined "calibrated" card with a Retake CTA. Otherwise show the bold
  // gradient invitation to start.
  if (match) {
    const card = el('div', { class: 'home-quiz home-quiz-done' });
    card.appendChild(el('div', { class: 'home-quiz-eyebrow' }, '◆ YOUR PALATE MATCH'));
    card.appendChild(el('div', { class: 'home-quiz-vibe' },
      el('div', { class: 'home-quiz-vibe-emoji' }, match.emoji),
      el('div', {},
        el('div', { class: 'home-quiz-vibe-label' }, match.vibe),
        el('div', { class: 'home-quiz-vibe-sub' }, match.sub)
      )
    ));
    card.appendChild(el('div', { class: 'home-quiz-picks' },
      buildPickRow(match.unique,     'SPECIALTY PICK', 'home-quiz-pick-specialty'),
      buildPickRow(match.accessible, 'EVERYDAY PICK', 'home-quiz-pick-everyday')
    ));
    card.appendChild(el('button', {
      type: 'button',
      class: 'home-quiz-retake',
      onclick: () => openFlavorQuiz()
    }, 'Retake the flavor quiz'));
    return card;
  }
  const card = el('button', {
    type: 'button',
    class: 'home-quiz home-quiz-cta',
    onclick: () => openFlavorQuiz({ firstTime: true })
  });
  card.appendChild(el('div', { class: 'home-quiz-cta-eyebrow' }, '◆ FIND YOUR PERFECT COFFEE · 30 SECONDS'));
  card.appendChild(el('div', { class: 'home-quiz-cta-title' },
    'What flavors do ',
    el('em', {}, 'you'),
    ' love?'
  ));
  card.appendChild(el('div', { class: 'home-quiz-cta-sub' }, 'Pick a few notes and we’ll match you with a specialty bean, an everyday bean, and a brew profile for your Cuisinart.'));
  card.appendChild(el('div', { class: 'home-quiz-cta-row' },
    el('span', { class: 'home-quiz-cta-pill' }, '☕ Start the quiz'),
    el('span', { class: 'home-quiz-cta-mini' }, '4 quick questions')
  ));
  return card;
}

function buildPickRow(pick, label, cls) {
  const row = el('a', {
    class: 'home-quiz-pick ' + cls,
    href: pick.url || '#/shop',
    target: pick.url ? '_blank' : '',
    rel: pick.url ? 'noopener noreferrer' : ''
  });
  row.appendChild(el('div', {
    class: 'home-quiz-pick-photo',
    style: 'background-image:url(\'' + pick.photoUrl + '\')'
  }));
  row.appendChild(el('div', { class: 'home-quiz-pick-body' },
    el('div', { class: 'home-quiz-pick-label' }, label),
    el('div', { class: 'home-quiz-pick-name' }, pick.name),
    el('div', { class: 'home-quiz-pick-roaster' }, pick.roaster + ' · ' + pick.notes),
    el('div', { class: 'home-quiz-pick-price' }, pick.price)
  ));
  return row;
}

/* ---------- Today's pick card ---------- */
function buildHomeTodayCard(rec) {
  const card = el('a', {
    class: 'home-today',
    onclick: () => (typeof openRecipeDetailModal === 'function' ? openRecipeDetailModal(rec) : null)
  });
  card.appendChild(el('div', {
    class: 'home-today-photo',
    style: 'background-image:url(\'' + rec.photoUrl + '\')'
  }, el('span', { class: 'home-today-flag' }, '★ TODAY’S PICK')));
  card.appendChild(el('div', { class: 'home-today-body' },
    el('h3', { class: 'home-today-name' }, rec.name),
    el('p', { class: 'home-today-desc' }, rec.description),
    el('div', { class: 'home-today-meta' },
      el('span', {}, rec.method),
      el('span', { class: 'home-today-dot' }),
      el('span', {}, rec.ratio),
      el('span', { class: 'home-today-dot' }),
      el('span', {}, rec.grindSize)
    )
  ));
  return card;
}

/* ---------- Community pulse ---------- */
function buildHomeCommunityCard() {
  const card = el('div', { class: 'you-card home-community' });
  card.appendChild(el('div', { class: 'home-community-head' },
    el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'COMMUNITY PULSE'),
    el('a', { class: 'home-community-link', href: '#/passport' }, 'See more →')
  ));
  // Pull from posts seed if available, otherwise fall back to a curated set.
  let posts = [];
  if (typeof seedBeanPostsIfNeeded === 'function') seedBeanPostsIfNeeded();
  if (typeof loadBeanPosts === 'function') posts = loadBeanPosts().slice(0, 3);
  if (!posts.length) {
    card.appendChild(el('p', { class: 'home-community-empty' }, 'Be the first to post in the community.'));
    return card;
  }
  const list = el('div', { class: 'home-community-list' });
  posts.forEach(p => list.appendChild(buildPulseItem(p)));
  card.appendChild(list);
  return card;
}

function buildPulseItem(p) {
  const initials = (p.authorName || p.authorHandle || '?').split(/[\s@]+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return el('div', { class: 'home-pulse' },
    el('div', { class: 'home-pulse-avatar', style: 'background:' + (p.authorAvatarColor || '#8B4F2A') }, initials),
    el('div', { class: 'home-pulse-body' },
      el('div', { class: 'home-pulse-author' }, p.authorName || p.authorHandle),
      el('div', { class: 'home-pulse-content' }, (p.title || p.content || '').slice(0, 90).trim() + ((p.title || p.content || '').length > 90 ? '…' : ''))
    ),
    el('div', { class: 'home-pulse-kudos' }, '☕ ' + (p.kudosCount || 0))
  );
}

/* ---------- Connected device hint ---------- */
function buildHomeDeviceHint() {
  const device = (typeof loadPairedDevice === 'function') ? loadPairedDevice() : null;
  if (device) {
    return el('a', {
      class: 'home-device-hint home-device-hint-paired',
      href: '#/profile'
    },
      el('div', { class: 'home-device-hint-dot' }),
      el('div', { class: 'home-device-hint-text' },
        el('div', { class: 'home-device-hint-title' }, 'Your Cuisinart is online'),
        el('div', { class: 'home-device-hint-sub' }, 'Brew remotely, schedule, or run self-clean from Profile →')
      )
    );
  }
  return el('a', {
    class: 'home-device-hint home-device-hint-unpaired',
    href: '#/profile'
  },
    el('div', { class: 'home-device-hint-text' },
      el('div', { class: 'home-device-hint-title' }, 'Have a Cuisinart smart machine?'),
      el('div', { class: 'home-device-hint-sub' }, 'Pair it once for remote brew + cleaning + per-drinker profiles.')
    ),
    el('div', { class: 'home-device-hint-arrow' }, '→')
  );
}

/* ============================================================
   FLAVOR QUIZ — the gamified palate matcher.
   Inputs: notes you love, milk preference, hot vs iced, weekday vs weekend.
   Output: a palate vibe (label + emoji), a specialty pick (unique single-
   origin), an everyday pick (mass-market accessible), and a suggested
   profile (roast / strength / temp / size). Saves to localStorage and
   triggers a Home re-render so the result card replaces the CTA.
   ============================================================ */
const QUIZ_NOTES = [
  { key: 'bright',    label: 'Bright',     emoji: '🍋', sub: 'Lemon, jasmine' },
  { key: 'fruity',    label: 'Fruity',     emoji: '🫐', sub: 'Berry, stone fruit' },
  { key: 'chocolaty', label: 'Chocolaty',  emoji: '🍫', sub: 'Cocoa, rich' },
  { key: 'caramel',   label: 'Caramel',    emoji: '🧈', sub: 'Toffee, brown sugar' },
  { key: 'nutty',     label: 'Nutty',      emoji: '🌰', sub: 'Almond, hazelnut' },
  { key: 'smoky',     label: 'Smoky',      emoji: '🔥', sub: 'Dark roast, intense' },
  { key: 'floral',    label: 'Floral',     emoji: '🌸', sub: 'Lavender, rose' },
  { key: 'spiced',    label: 'Spiced',     emoji: '🌶️', sub: 'Cardamom, cinnamon' }
];
const QUIZ_MILK = [
  { key: 'black',    label: 'Black',          sub: 'No milk, no sugar' },
  { key: 'milky',    label: 'With milk',      sub: 'Latte, cortado' },
  { key: 'sweet',    label: 'Sweet & creamy', sub: 'Syrups, honey' },
  { key: 'varies',   label: 'It varies',      sub: 'Mood-driven' }
];
const QUIZ_TEMP = [
  { key: 'hot',  label: 'Hot',  emoji: '☕' },
  { key: 'iced', label: 'Iced', emoji: '🧊' },
  { key: 'both', label: 'Both', emoji: '🌗' }
];
const QUIZ_RHYTHM = [
  { key: 'weekday', label: 'Weekday speed',  sub: 'Make it fast' },
  { key: 'weekend', label: 'Weekend ritual', sub: 'Take my time' },
  { key: 'either',  label: 'Either',         sub: 'Depends on the day' }
];

const QUIZ_MATCHES = [
  {
    triggers: ['bright', 'fruity', 'floral', 'citrus'],
    vibe: 'The Bright Explorer',
    emoji: '🍋',
    sub: 'Citrus, jasmine, tea-like cups',
    profile: { roast: 'Light',       strength: 'Regular',  temp: '205°F', size: '10 oz' },
    unique:     { name: 'Yirgacheffe Aricha',   roaster: 'Onyx Coffee Lab',  price: '$24', notes: 'Lemon · jasmine · honey', photoUrl: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80', url: 'https://onyxcoffeelab.com/' },
    accessible: { name: 'Light & Lively',       roaster: 'Trade Coffee',     price: '$18', notes: 'Citrus · clean · everyday', photoUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80', url: 'https://www.drinktrade.com/' }
  },
  {
    triggers: ['chocolaty', 'caramel', 'nutty', 'sweet'],
    vibe: 'The Chocolate Loyalist',
    emoji: '🍫',
    sub: 'Cocoa, caramel, comfort',
    profile: { roast: 'Medium-dark', strength: 'Bold',     temp: '200°F', size: '10 oz' },
    unique:     { name: 'Black Cat',             roaster: 'Intelligentsia',   price: '$22', notes: 'Cocoa · caramel · structured', photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', url: 'https://www.intelligentsia.com/' },
    accessible: { name: 'House Blend',           roaster: 'Counter Culture',  price: '$17', notes: 'Chocolatey · low acid · classic', photoUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80', url: 'https://counterculturecoffee.com/' }
  },
  {
    triggers: ['smoky', 'earthy', 'bold'],
    vibe: 'The Roasted Soul',
    emoji: '🔥',
    sub: 'Dark, smoky, deep bottoms',
    profile: { roast: 'Dark',        strength: 'Extra bold', temp: '195°F', size: '8 oz' },
    unique:     { name: 'Espresso Forte',        roaster: 'Verve Coffee',     price: '$23', notes: 'Smoky · syrupy · espresso-forward', photoUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80', url: 'https://www.vervecoffee.com/' },
    accessible: { name: 'French Roast',          roaster: 'Peet’s Coffee',    price: '$15', notes: 'Dark · bold · widely available', photoUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.peets.com/' }
  },
  {
    triggers: ['spiced', 'creamy'],
    vibe: 'The Spiced Latte Lover',
    emoji: '🌸',
    sub: 'Cardamom, cinnamon, warm milk',
    profile: { roast: 'Medium',      strength: 'Regular',   temp: '200°F', size: '12 oz' },
    unique:     { name: 'Chai-Spiced Blend',     roaster: 'Blue Bottle',      price: '$22', notes: 'Cinnamon · cardamom · creamy', photoUrl: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&q=80', url: 'https://bluebottlecoffee.com/' },
    accessible: { name: 'Holiday Blend',         roaster: 'Starbucks Reserve', price: '$14', notes: 'Spiced · sweet · easy to find', photoUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80', url: 'https://www.starbucks.com/' }
  },
  {
    triggers: [],
    vibe: 'The Balanced Brewer',
    emoji: '⚖️',
    sub: 'No extremes. Every cup tuned.',
    profile: { roast: 'Medium',      strength: 'Regular',  temp: '200°F', size: '10 oz' },
    unique:     { name: 'Hologram Blend',        roaster: 'Counter Culture',  price: '$20', notes: 'Balanced · sweet · syrupy', photoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80', url: 'https://counterculturecoffee.com/' },
    accessible: { name: 'Pike Place Roast',      roaster: 'Starbucks',        price: '$13', notes: 'Smooth · balanced · everywhere', photoUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80', url: 'https://www.starbucks.com/' }
  }
];

function loadPalateMatch() {
  try { return JSON.parse(localStorage.getItem(HOME_PALATE_KEY) || 'null'); }
  catch (_) { return null; }
}
function savePalateMatch(m) { localStorage.setItem(HOME_PALATE_KEY, JSON.stringify(m)); }

/* Score notes against each match's triggers; first match wins ties.
   Empty triggers = catch-all balanced match. */
function pickQuizMatch(selectedNotes) {
  let best = QUIZ_MATCHES[QUIZ_MATCHES.length - 1];
  let bestScore = 0;
  QUIZ_MATCHES.forEach(m => {
    const score = (m.triggers || []).reduce((acc, t) => acc + (selectedNotes.indexOf(t) >= 0 ? 1 : 0), 0);
    if (score > bestScore) { best = m; bestScore = score; }
  });
  return best;
}

function openFlavorQuiz(opts) {
  if (document.getElementById('flavor-quiz-backdrop')) return;
  const firstTime = !!(opts && opts.firstTime);
  const answers = { notes: [], milk: null, temp: null, rhythm: null };
  let step = 0;

  const card = el('div', { class: 'flavor-quiz-card', onclick: (e) => e.stopPropagation() });
  card.appendChild(el('button', {
    type: 'button',
    class: 'brewlog-close flavor-quiz-close',
    'aria-label': 'Close',
    onclick: close
  }, _svgEl(YOU_ICONS.close)));

  const progress = el('div', { class: 'flavor-quiz-progress' },
    el('div', { class: 'flavor-quiz-progress-fill', id: 'flavor-quiz-progress' })
  );
  card.appendChild(progress);

  const body = el('div', { class: 'flavor-quiz-body' });
  card.appendChild(body);

  renderStep();

  const backdrop = el('div', { id: 'flavor-quiz-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

  function setProgress(pct) {
    const fill = document.getElementById('flavor-quiz-progress');
    if (fill) fill.style.width = pct + '%';
  }

  function renderStep() {
    body.innerHTML = '';
    if (step === 0) {
      setProgress(20);
      body.appendChild(el('div', { class: 'flavor-quiz-eyebrow' }, firstTime ? '◆ WELCOME TO BREW LAB' : '◆ FLAVOR QUIZ · STEP 1 OF 4'));
      body.appendChild(el('h2', { class: 'flavor-quiz-title' }, 'Which notes do you love?'));
      body.appendChild(el('p', { class: 'flavor-quiz-sub' }, 'Pick up to three. We’ll match you to a coffee that tastes like that.'));
      const grid = el('div', { class: 'flavor-quiz-grid' });
      QUIZ_NOTES.forEach(n => {
        const btn = el('button', {
          type: 'button',
          class: 'flavor-quiz-tile' + (answers.notes.indexOf(n.key) >= 0 ? ' on' : ''),
          'data-key': n.key,
          onclick: () => {
            const i = answers.notes.indexOf(n.key);
            if (i >= 0) { answers.notes.splice(i, 1); btn.classList.remove('on'); }
            else if (answers.notes.length < 3) { answers.notes.push(n.key); btn.classList.add('on'); }
          }
        },
          el('span', { class: 'flavor-quiz-tile-emoji' }, n.emoji),
          el('span', { class: 'flavor-quiz-tile-label' }, n.label),
          el('span', { class: 'flavor-quiz-tile-sub' }, n.sub)
        );
        grid.appendChild(btn);
      });
      body.appendChild(grid);
      body.appendChild(buildFooter());
    }
    else if (step === 1) {
      setProgress(45);
      body.appendChild(el('div', { class: 'flavor-quiz-eyebrow' }, '◆ STEP 2 OF 4'));
      body.appendChild(el('h2', { class: 'flavor-quiz-title' }, 'How do you take it?'));
      body.appendChild(el('p', { class: 'flavor-quiz-sub' }, 'Some people skip the milk. Some live in it.'));
      const grid = el('div', { class: 'flavor-quiz-grid flavor-quiz-grid-2' });
      QUIZ_MILK.forEach(m => grid.appendChild(buildSingleTile(m, 'milk')));
      body.appendChild(grid);
      body.appendChild(buildFooter());
    }
    else if (step === 2) {
      setProgress(70);
      body.appendChild(el('div', { class: 'flavor-quiz-eyebrow' }, '◆ STEP 3 OF 4'));
      body.appendChild(el('h2', { class: 'flavor-quiz-title' }, 'Hot or iced?'));
      const grid = el('div', { class: 'flavor-quiz-grid flavor-quiz-grid-3' });
      QUIZ_TEMP.forEach(t => grid.appendChild(buildSingleTile(t, 'temp')));
      body.appendChild(grid);
      body.appendChild(buildFooter());
    }
    else if (step === 3) {
      setProgress(95);
      body.appendChild(el('div', { class: 'flavor-quiz-eyebrow' }, '◆ STEP 4 OF 4'));
      body.appendChild(el('h2', { class: 'flavor-quiz-title' }, 'Mornings or weekends?'));
      body.appendChild(el('p', { class: 'flavor-quiz-sub' }, 'Helps us tune the brew speed and ritual.'));
      const grid = el('div', { class: 'flavor-quiz-grid flavor-quiz-grid-3' });
      QUIZ_RHYTHM.forEach(r => grid.appendChild(buildSingleTile(r, 'rhythm')));
      body.appendChild(grid);
      body.appendChild(buildFooter(true));
    }
    else if (step === 4) {
      setProgress(100);
      // Compute the match
      const match = Object.assign({}, pickQuizMatch(answers.notes), { answers: answers, ts: Date.now() });
      savePalateMatch(match);

      // If a device is paired and has an active profile, sync the suggested settings.
      try {
        const device = (typeof loadPairedDevice === 'function') ? loadPairedDevice() : null;
        if (device && device.profiles && device.activeProfileName) {
          const active = device.profiles.find(p => p.name === device.activeProfileName);
          if (active) {
            active.roast    = match.profile.roast;
            active.strength = match.profile.strength;
            active.temp     = match.profile.temp;
            active.size     = match.profile.size;
            savePairedDevice(device);
          }
        }
      } catch (_) {}

      body.appendChild(el('div', { class: 'flavor-quiz-eyebrow' }, '◆ YOUR PALATE MATCH'));
      body.appendChild(el('div', { class: 'flavor-quiz-result' },
        el('div', { class: 'flavor-quiz-result-emoji' }, match.emoji),
        el('div', { class: 'flavor-quiz-result-vibe' }, match.vibe),
        el('div', { class: 'flavor-quiz-result-sub' }, match.sub)
      ));
      body.appendChild(el('div', { class: 'flavor-quiz-profile' },
        el('div', { class: 'flavor-quiz-profile-label' }, 'SUGGESTED BREW PROFILE'),
        el('div', { class: 'flavor-quiz-profile-row' },
          el('div', { class: 'flavor-quiz-profile-tile' }, el('div', {}, 'ROAST'), el('strong', {}, match.profile.roast)),
          el('div', { class: 'flavor-quiz-profile-tile' }, el('div', {}, 'STRENGTH'), el('strong', {}, match.profile.strength)),
          el('div', { class: 'flavor-quiz-profile-tile' }, el('div', {}, 'TEMP'), el('strong', {}, match.profile.temp)),
          el('div', { class: 'flavor-quiz-profile-tile' }, el('div', {}, 'SIZE'), el('strong', {}, match.profile.size))
        )
      ));
      body.appendChild(el('div', { class: 'flavor-quiz-picks' },
        buildPickRow(match.unique,     'SPECIALTY PICK', 'home-quiz-pick-specialty'),
        buildPickRow(match.accessible, 'EVERYDAY PICK', 'home-quiz-pick-everyday')
      ));
      body.appendChild(el('button', {
        type: 'button',
        class: 'flavor-quiz-done',
        onclick: () => {
          close();
          if (typeof toast === 'function') toast('Palate match saved · ' + match.vibe);
          if (typeof beanRender === 'function') beanRender();
        }
      }, 'Save my palate match'));
    }
  }

  function buildSingleTile(opt, key) {
    return el('button', {
      type: 'button',
      class: 'flavor-quiz-tile flavor-quiz-tile-wide' + (answers[key] === opt.key ? ' on' : ''),
      onclick: () => {
        answers[key] = opt.key;
        renderStep();
      }
    },
      opt.emoji ? el('span', { class: 'flavor-quiz-tile-emoji' }, opt.emoji) : null,
      el('span', { class: 'flavor-quiz-tile-label' }, opt.label),
      opt.sub ? el('span', { class: 'flavor-quiz-tile-sub' }, opt.sub) : null
    );
  }

  function buildFooter(isLast) {
    const wrap = el('div', { class: 'flavor-quiz-foot' });
    if (step > 0) {
      wrap.appendChild(el('button', {
        type: 'button',
        class: 'flavor-quiz-back',
        onclick: () => { step = Math.max(0, step - 1); renderStep(); }
      }, '← Back'));
    } else {
      wrap.appendChild(el('span', {}));
    }
    wrap.appendChild(el('button', {
      type: 'button',
      class: 'flavor-quiz-next',
      onclick: () => { step = step + 1; renderStep(); },
      disabled: stepIsBlocked() ? '' : null
    }, isLast ? 'See my match →' : 'Next →'));
    return wrap;
  }

  function stepIsBlocked() {
    if (step === 0) return answers.notes.length === 0;
    if (step === 1) return !answers.milk;
    if (step === 2) return !answers.temp;
    if (step === 3) return !answers.rhythm;
    return false;
  }
}

/* pages/you.js — the You tab dashboard.
   Loaded after app.js and helpers/*. Uses the global el() helper.
   Exports renderYou(main) on the global scope. */

const BEAN_BREW_METHODS = ['Pour-over', 'Espresso', 'French press', 'Cold brew', 'Drip', 'Aeropress', 'Moka pot'];
const BEAN_BREW_GRINDS = ['Extra fine', 'Fine', 'Medium-fine', 'Medium', 'Medium-coarse', 'Coarse'];
const BEAN_FLAVOR_TAGS = ['bright', 'floral', 'fruity', 'chocolatey', 'nutty', 'caramel', 'smoky', 'earthy', 'citrus', 'berry', 'sweet', 'balanced'];

/* Tone color per method (used for past-brews row icons) */
const METHOD_TONE = {
  'Pour-over':    '#F0997B',
  'Espresso':     '#8A6D4C',
  'French press': '#B68FBE',
  'Cold brew':    '#85B7EB',
  'Drip':         '#F5C842',
  'Aeropress':    '#97C459',
  'Moka pot':     '#5C5651'
};

/* Inline SVG icons (small, 24px) used across the You tab */
const YOU_ICONS = {
  share:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 L15.4 17.5 M15.4 6.5 L8.6 10.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15 a1.7 1.7 0 0 0 .3 1.8 l.1 .1 a2 2 0 1 1 -2.8 2.8 l-.1 -.1 a1.7 1.7 0 0 0 -1.8 -.3 a1.7 1.7 0 0 0 -1 1.5 V21 a2 2 0 1 1 -4 0 v-.1 a1.7 1.7 0 0 0 -1 -1.5 a1.7 1.7 0 0 0 -1.8 .3 l-.1 .1 a2 2 0 1 1 -2.8 -2.8 l.1 -.1 a1.7 1.7 0 0 0 .3 -1.8 a1.7 1.7 0 0 0 -1.5 -1 H3 a2 2 0 1 1 0 -4 h.1 a1.7 1.7 0 0 0 1.5 -1 a1.7 1.7 0 0 0 -.3 -1.8 l-.1 -.1 a2 2 0 1 1 2.8 -2.8 l.1 .1 a1.7 1.7 0 0 0 1.8 .3 a1.7 1.7 0 0 0 1 -1.5 V3 a2 2 0 1 1 4 0 v.1 a1.7 1.7 0 0 0 1 1.5 a1.7 1.7 0 0 0 1.8 -.3 l.1 -.1 a2 2 0 1 1 2.8 2.8 l-.1 .1 a1.7 1.7 0 0 0 -.3 1.8 a1.7 1.7 0 0 0 1.5 1 H21 a2 2 0 1 1 0 4 h-.1 a1.7 1.7 0 0 0 -1.5 1 Z"/></svg>',
  trophy:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4 h10 v3 a5 5 0 0 1 -10 0 Z"/><path d="M5 5 H3 v2 a3 3 0 0 0 3 3 V8 Z M19 5 h2 v2 a3 3 0 0 1 -3 3 V8 Z"/><path d="M9 13 h6 v2 H9 Z M8 16 h8 v3 H8 Z M7 19 h10 v2 H7 Z"/></svg>',
  flame:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 Q 18 9 17 14 a5 5 0 0 1 -10 0 Q 7 11 9 9 Q 9 11 11 11 Q 11 7 12 3 Z"/></svg>',
  plus:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5 v14 M5 12 h14"/></svg>',
  arrow:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 h14 M13 6 l6 6 -6 6"/></svg>',
  sync:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12 a9 9 0 0 1 -15 6.7 L3 16"/><path d="M3 12 a9 9 0 0 1 15 -6.7 L21 8"/></svg>',
  history:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7 v5 l4 2"/></svg>',
  close:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>',
  star:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 16 L7 19 L9 13 L4 9 L10 9 Z"/></svg>',
  starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4 L14 9.5 L20 10 L15.5 13.5 L17 19 L12 16 L7 19 L8.5 13.5 L4 10 L10 9.5 Z"/></svg>',
  lock:     '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11 V8 a3 3 0 0 1 6 0 V11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
};

/* ---------- Helpers ---------- */
function _initials(name) {
  if (!name) return '☕';
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map(p => p[0].toUpperCase()).join('') || '☕';
}

function _relativeDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return diffDays + ' days ago';
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function _formatJoined(ts) {
  const d = new Date(ts || Date.now());
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function _svgEl(html) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.innerHTML = html;
  return wrap;
}

function _star(filled) {
  return _svgEl(filled ? YOU_ICONS.star : YOU_ICONS.starOutline);
}

/* ---------- Demo device seed ---------- */
const DEMO_DEVICES = [
  { name: 'Cuisinart PerfecTemp 14-Cup',  status: 'Synced 2 hours ago',    photoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=200&q=80' },
  { name: 'Cuisinart Grind & Brew Smart', status: 'Synced 14 minutes ago', photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80' }
];

/* ---------- Top-level render ---------- */
function renderYou(main) {
  const user = getBeanUser() || { name: 'You', email: '', createdAt: Date.now() };
  const isDemo = !!user.isDemo;
  const brews = loadBeanBrews();
  const recommended = pickRecommendedBrew();

  const cs = currentStreak(brews);
  const bs = bestStreak(brews);
  const palate = computePalate(brews);
  const origins = uniqueBeanOrigins(brews);
  const userPosts = (typeof userPostCount === 'function') ? userPostCount() : 0;
  const kudosGiven = (typeof loadBeanKudos === 'function') ? loadBeanKudos().length : 0;
  const xp = (typeof getXP === 'function') ? getXP() : 0;
  const achievements = computeAchievements(brews, cs, palate.coverage, origins, userPosts, kudosGiven, xp);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const devices = isDemo ? DEMO_DEVICES : [];

  const page = el('div', { class: 'bean-page you-page' });
  page.appendChild(youProfileHeader(user));
  page.appendChild(youStreakCard(cs, bs, brews));
  page.appendChild(youLogCta());
  page.appendChild(youRecommendedCard(recommended));
  page.appendChild(youPalateCardCompact(palate, brews));
  page.appendChild(youPastBrewsCard(brews));
  page.appendChild(youDevicesCard(devices));
  page.appendChild(youBadgesLinkCard(achievements, unlockedCount));
  main.appendChild(page);
}

/* ---------- 1. Profile header ---------- */
function youProfileHeader(user) {
  const card = el('div', { class: 'you-card you-profile' });
  card.appendChild(el('div', { class: 'you-profile-actions' },
    el('button', { type: 'button', class: 'you-icon-btn', 'aria-label': 'Share', onclick: () => alert('Share — coming soon') }, _svgEl(YOU_ICONS.share)),
    el('button', { type: 'button', class: 'you-icon-btn', 'aria-label': 'Settings', onclick: () => openYouSettings() }, _svgEl(YOU_ICONS.settings))
  ));
  const tier = (typeof getTier === 'function') ? getTier() : { name: 'Bean Curious' };
  card.appendChild(el('div', { class: 'you-profile-row' },
    el('div', { class: 'you-avatar' }, _initials(user.name)),
    el('div', { class: 'you-profile-meta' },
      el('div', { class: 'you-name' }, user.name || 'You'),
      el('div', { class: 'you-profile-line' },
        el('span', { class: 'you-pill-trophy' }, _svgEl(YOU_ICONS.trophy), tier.name),
        el('span', { class: 'you-joined' }, 'Joined ' + _formatJoined(user.createdAt))
      )
    )
  ));
  card.appendChild(el('p', { class: 'you-bio' }, 'Daily brewer. Always one ratio away from perfect.'));
  return card;
}

function openYouSettings() {
  if (!confirm('Sign out of The Bean?')) return;
  clearBeanUser();
  window.location.hash = '#/auth';
}

/* ---------- 2. Streak card ---------- */
function youStreakCard(cs, bs, brews) {
  const card = el('div', { class: 'you-card you-card-dark you-streak' });
  card.appendChild(el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'YOUR BREWS'));
  card.appendChild(el('div', { class: 'you-streak-row' },
    el('div', { class: 'you-streak-num' },
      _svgEl(YOU_ICONS.flame),
      el('span', { class: 'you-streak-value' }, String(cs)),
      el('span', { class: 'you-streak-label' }, cs === 1 ? 'day streak' : 'day streak')
    ),
    el('div', { class: 'you-streak-best' }, 'Best: ' + bs + ' day' + (bs === 1 ? '' : 's'))
  ));
  const grid = el('div', { class: 'you-streak-grid' });
  last7DayCells(brews).forEach(c => {
    grid.appendChild(el('div', { class: 'you-streak-cell' + (c.isToday ? ' is-today' : '') },
      el('span', { class: 'you-streak-letter' }, c.letter),
      c.brewed
        ? el('span', { class: 'you-streak-tick' }, '✓')
        : el('span', { class: 'you-streak-empty' })
    ));
  });
  card.appendChild(grid);
  return card;
}

/* ---------- 3. Log today's brew CTA ---------- */
function youLogCta() {
  return el('button', { class: 'you-log-cta', type: 'button', onclick: () => openBrewLogModal() },
    el('span', {}, 'Log Today’s Brew'),
    _svgEl(YOU_ICONS.plus)
  );
}

/* ---------- 4. Recommended for you ---------- */
function youRecommendedCard(rec) {
  const card = el('div', { class: 'you-card you-recommended' });
  card.appendChild(el('div', { class: 'you-eyebrow' }, 'RECOMMENDED FOR YOU'));
  if (rec.photoUrl) {
    card.appendChild(el('div', { class: 'you-rec-photo', style: 'background-image:url(\'' + rec.photoUrl + '\')' }));
  }
  card.appendChild(el('h3', { class: 'you-rec-name' }, rec.name));
  card.appendChild(el('p', { class: 'you-rec-desc' }, rec.description));
  card.appendChild(el('div', { class: 'you-rec-stats' },
    statTile('Method', rec.method),
    statTile('Ratio', rec.ratio),
    statTile('Water', rec.waterTempF + '°F'),
    statTile('Grind', rec.grindSize)
  ));
  card.appendChild(el('div', { class: 'you-rec-tags' },
    (rec.flavorTags || []).map(t => el('span', { class: 'you-tag' }, t))
  ));
  card.appendChild(el('button', {
    class: 'you-rec-cta',
    type: 'button',
    onclick: () => openBrewLogModal({
      method: rec.method,
      ratio: rec.ratio,
      grindSize: rec.grindSize,
      waterTempF: rec.waterTempF,
      flavorTags: rec.flavorTags || [],
      beanOrigin: ''
    })
  }, 'Try This Brew'));
  return card;
}

function statTile(label, value) {
  return el('div', { class: 'you-stat' },
    el('div', { class: 'you-stat-label' }, label),
    el('div', { class: 'you-stat-value' }, value || '—')
  );
}

/* ---------- 5. Palate snapshot (compact) ---------- */
function youPalateCardCompact(palate, brews) {
  const card = el('div', { class: 'you-card you-card-dark you-palate-compact' });
  card.appendChild(el('div', { class: 'you-palate-compact-head' },
    el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'PALATE SNAPSHOT'),
    el('a', {
      href: '#/palate',
      class: 'you-palate-link'
    }, 'View full palate →')
  ));
  if (!brews || !brews.length || palate.coverage === 0) {
    card.appendChild(el('p', { class: 'you-empty you-palate-empty' }, 'Log a few brews to build your palate.'));
    return card;
  }
  // Top flavor: the dimension with the highest count
  const topFlavor = palate.dimensions.slice().sort((a, b) => b.count - a.count)[0];
  const flavorSub = topFlavor && topFlavor.count
    ? 'logged ' + topFlavor.count + ' time' + (topFlavor.count === 1 ? '' : 's')
    : '';

  // Top method percentage
  const methodCount = palate.topMethod
    ? brews.filter(b => b.method === palate.topMethod).length
    : 0;
  const methodPct = brews.length ? Math.round((methodCount / brews.length) * 100) : 0;
  const methodSub = palate.topMethod ? methodPct + '% of your brews' : '';

  card.appendChild(el('div', { class: 'you-palate-compact-row' },
    el('div', { class: 'you-palate-compact-tile' },
      el('div', { class: 'you-palate-compact-label' }, 'TOP FLAVOR'),
      el('div', { class: 'you-palate-compact-value' }, topFlavor && topFlavor.count ? topFlavor.label : '—'),
      el('div', { class: 'you-palate-compact-sub' }, flavorSub)
    ),
    el('div', { class: 'you-palate-compact-tile' },
      el('div', { class: 'you-palate-compact-label' }, 'TOP METHOD'),
      el('div', { class: 'you-palate-compact-value' }, palate.topMethod || '—'),
      el('div', { class: 'you-palate-compact-sub' }, methodSub)
    )
  ));
  return card;
}

/* ---------- 6. Past brews ---------- */
function youPastBrewsCard(brews) {
  const card = el('div', { class: 'you-card you-past' });
  card.appendChild(el('div', { class: 'you-eyebrow' }, 'PAST BREWS'));
  card.appendChild(el('h3', { class: 'you-card-h-light' }, 'Recent log entries'));
  if (!brews.length) {
    card.appendChild(el('p', { class: 'you-empty' }, 'No brews logged yet. Log one to start your streak.'));
    return card;
  }
  const sorted = brews.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const list = el('div', { class: 'you-past-list' });
  sorted.slice(0, 8).forEach(b => list.appendChild(pastBrewRow(b)));
  card.appendChild(list);
  card.appendChild(el('a', {
    href: '#',
    class: 'you-view-all',
    onclick: (e) => { e.preventDefault(); alert('Full brew history — coming soon'); }
  }, 'View all'));
  return card;
}

function pastBrewRow(b) {
  const tone = METHOD_TONE[b.method] || '#8A6D4C';
  const stars = el('div', { class: 'you-past-stars' });
  for (let i = 1; i <= 5; i++) {
    const s = _star(i <= (b.rating || 0));
    s.style.color = i <= (b.rating || 0) ? '#F5C842' : 'rgba(0,0,0,0.18)';
    stars.appendChild(s);
  }
  return el('div', { class: 'you-past-row' },
    el('div', { class: 'you-past-icon', style: 'background:' + tone }, (b.method || '?').slice(0, 2).toUpperCase()),
    el('div', { class: 'you-past-meta' },
      el('div', { class: 'you-past-title' }, b.beanOrigin || b.method || 'Brew'),
      el('div', { class: 'you-past-sub' }, b.method + ' · ' + _relativeDate(b.date))
    ),
    stars
  );
}

/* ---------- 7. My Cuisinart Devices ---------- */
function youDevicesCard(devices) {
  const card = el('div', { class: 'you-card you-devices' });
  card.appendChild(el('div', { class: 'you-eyebrow' }, 'MY CUISINART DEVICES'));
  card.appendChild(el('h3', { class: 'you-card-h-light' }, 'Connected appliances'));

  if (!devices.length) {
    card.appendChild(el('p', { class: 'you-empty' }, 'No devices paired yet. Add a Cuisinart appliance to unlock guided brews.'));
  } else {
    const list = el('div', { class: 'you-device-list' });
    devices.forEach(d => list.appendChild(deviceRow(d)));
    card.appendChild(list);
  }

  card.appendChild(el('button', {
    class: 'you-pair-cta',
    type: 'button',
    onclick: () => openPairDeviceModal()
  }, '+ Pair a device'));
  return card;
}

function deviceRow(d) {
  return el('div', { class: 'you-device-row' },
    el('div', {
      class: 'you-device-photo',
      style: d.photoUrl ? 'background-image:url(\'' + d.photoUrl + '\')' : ''
    }),
    el('div', { class: 'you-device-meta' },
      el('div', { class: 'you-device-name' }, d.name),
      el('div', { class: 'you-device-status' },
        el('span', { class: 'you-device-dot' }),
        el('span', {}, d.status)
      ),
      el('div', { class: 'you-device-actions' },
        el('button', { class: 'you-ghost-btn', type: 'button', onclick: () => alert('Sync — coming soon') },
          _svgEl(YOU_ICONS.sync), el('span', {}, 'Sync now')
        ),
        el('button', { class: 'you-ghost-btn', type: 'button', onclick: () => alert('Brew history — coming soon') },
          _svgEl(YOU_ICONS.history), el('span', {}, 'View brew history')
        )
      )
    )
  );
}

/* ---------- 8. Badges link card (compact) ---------- */
function youBadgesLinkCard(achievements, unlockedCount) {
  const card = el('div', {
    class: 'you-card you-card-dark you-badges-link',
    role: 'button',
    tabindex: '0',
    onclick: () => { window.location.hash = '#/badges'; },
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/badges'; } }
  });
  card.appendChild(el('div', { class: 'you-badges-link-row' },
    el('div', { class: 'you-badges-link-icon' }, _svgEl(YOU_ICONS.trophy)),
    el('div', { class: 'you-badges-link-meta' },
      el('h3', { class: 'you-card-h' }, 'Your badges'),
      el('p', { class: 'you-achievements-sub' }, unlockedCount + ' of ' + achievements.length + ' earned')
    ),
    el('div', { class: 'you-badges-link-arrow' }, _svgEl(YOU_ICONS.arrow))
  ));

  // Below: 4-slot strip of recently-unlocked badges; if fewer than 4
  // unlocked, fill the remaining slots with next locked badges teasing.
  const strip = el('div', { class: 'you-badges-strip' });
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const fillers = [].concat(unlocked.slice(0, 4));
  while (fillers.length < 4 && locked.length) fillers.push(locked.shift());
  fillers.slice(0, 4).forEach(a => strip.appendChild(badgeStripTile(a)));
  card.appendChild(strip);

  return card;
}

function badgeStripTile(a) {
  const iconHtml = a.unlocked ? (ACHIEVEMENT_ICONS[a.icon] || ACHIEVEMENT_ICONS.cup) : YOU_ICONS.lock;
  return el('div', {
    class: 'you-badge-strip-tile' + (a.unlocked ? ' unlocked' : ' locked'),
    title: a.name
  }, _svgEl(iconHtml));
}

function badgeTile(a) {
  const iconHtml = a.unlocked ? (ACHIEVEMENT_ICONS[a.icon] || ACHIEVEMENT_ICONS.cup) : YOU_ICONS.lock;
  return el('button', {
    type: 'button',
    class: 'you-badge' + (a.unlocked ? ' unlocked' : ' locked'),
    onclick: () => alert(a.name + '\n\n' + a.desc + (a.locked ? '\n(Locked — coming in a future phase.)' : (a.unlocked ? '\nUnlocked.' : '\nNot yet unlocked.')))
  },
    el('div', { class: 'you-badge-icon' }, _svgEl(iconHtml)),
    el('div', { class: 'you-badge-label' }, a.name)
  );
}

/* ---------- Sub-route: #/badges ---------- */
function renderBadges(main) {
  const brews = loadBeanBrews();
  const cs = currentStreak(brews);
  const palate = computePalate(brews);
  const origins = uniqueBeanOrigins(brews);
  const userPosts = (typeof userPostCount === 'function') ? userPostCount() : 0;
  const kudosGiven = (typeof loadBeanKudos === 'function') ? loadBeanKudos().length : 0;
  const xp = (typeof getXP === 'function') ? getXP() : 0;
  const achievements = computeAchievements(brews, cs, palate.coverage, origins, userPosts, kudosGiven, xp);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const page = el('div', { class: 'bean-page badges-page' });
  page.appendChild(el('a', {
    href: '#/you',
    class: 'badges-back',
    'aria-label': 'Back to You'
  }, '← Back'));
  page.appendChild(el('h1', { class: 'badges-title' }, 'Badges'));
  page.appendChild(el('p', { class: 'badges-sub' }, unlockedCount + ' of ' + achievements.length + ' earned'));

  const grid = el('div', { class: 'you-badge-grid badges-page-grid' });
  achievements.forEach(a => grid.appendChild(badgeTile(a)));
  page.appendChild(grid);
  main.appendChild(page);
}

/* ---------- Brew log modal ---------- */
function openBrewLogModal(prefill) {
  if (document.getElementById('brewlog-backdrop')) return;
  prefill = prefill || {};
  let method = prefill.method || 'Pour-over';
  let grindSize = prefill.grindSize || 'Medium-fine';
  const flavorSet = new Set(prefill.flavorTags || []);
  let rating = 0;

  const card = el('div', { class: 'brewlog-card', onclick: (e) => e.stopPropagation() });
  card.appendChild(el('div', { class: 'brewlog-head' },
    el('h2', { class: 'brewlog-title' }, 'Log a brew'),
    el('button', { type: 'button', class: 'brewlog-close', 'aria-label': 'Close', onclick: close }, _svgEl(YOU_ICONS.close))
  ));

  card.appendChild(_label('METHOD'));
  const methodRow = el('div', { class: 'brewlog-pills' });
  BEAN_BREW_METHODS.forEach(m => {
    const pill = el('button', { type: 'button', class: 'brewlog-pill' + (m === method ? ' active' : ''), onclick: () => {
      method = m;
      methodRow.querySelectorAll('.brewlog-pill').forEach(p => p.classList.toggle('active', p.dataset.m === m));
    }}, m);
    pill.dataset.m = m;
    methodRow.appendChild(pill);
  });
  card.appendChild(methodRow);

  card.appendChild(_label('BEAN ORIGIN'));
  const beanInput = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'e.g., Ethiopia Yirgacheffe', value: prefill.beanOrigin || '' });
  card.appendChild(beanInput);

  card.appendChild(_label('RATIO'));
  const ratioInput = el('input', { type: 'text', class: 'brewlog-input', placeholder: '1:16', value: prefill.ratio || '' });
  card.appendChild(ratioInput);

  card.appendChild(_label('GRIND SIZE'));
  const grindRow = el('div', { class: 'brewlog-pills' });
  BEAN_BREW_GRINDS.forEach(g => {
    const pill = el('button', { type: 'button', class: 'brewlog-pill' + (g === grindSize ? ' active' : ''), onclick: () => {
      grindSize = g;
      grindRow.querySelectorAll('.brewlog-pill').forEach(p => p.classList.toggle('active', p.dataset.g === g));
    }}, g);
    pill.dataset.g = g;
    grindRow.appendChild(pill);
  });
  card.appendChild(grindRow);

  card.appendChild(_label('WATER TEMP (°F)'));
  const tempInput = el('input', { type: 'number', class: 'brewlog-input', value: String(prefill.waterTempF || 200), min: '60', max: '212' });
  card.appendChild(tempInput);

  card.appendChild(_label('FLAVOR TAGS'));
  const tagsRow = el('div', { class: 'brewlog-pills' });
  BEAN_FLAVOR_TAGS.forEach(t => {
    const pill = el('button', { type: 'button', class: 'brewlog-pill' + (flavorSet.has(t) ? ' active' : ''), onclick: () => {
      if (flavorSet.has(t)) flavorSet.delete(t); else flavorSet.add(t);
      pill.classList.toggle('active', flavorSet.has(t));
    }}, t);
    tagsRow.appendChild(pill);
  });
  card.appendChild(tagsRow);

  card.appendChild(_label('RATING'));
  const ratingRow = el('div', { class: 'brewlog-rating' });
  for (let i = 1; i <= 5; i++) {
    const s = el('button', { type: 'button', class: 'brewlog-star', 'data-i': String(i), onclick: () => {
      rating = i;
      ratingRow.querySelectorAll('.brewlog-star').forEach((node, idx) => node.classList.toggle('on', idx + 1 <= rating));
    }});
    s.appendChild(_svgEl(YOU_ICONS.star));
    ratingRow.appendChild(s);
  }
  card.appendChild(ratingRow);

  card.appendChild(_label('NOTES'));
  const notesInput = el('textarea', { class: 'brewlog-textarea', rows: '3', placeholder: 'Tasting notes, what worked, what to try next…' });
  card.appendChild(notesInput);

  card.appendChild(el('button', {
    class: 'brewlog-save',
    type: 'button',
    onclick: () => {
      const entry = {
        id: 'b' + Date.now(),
        date: new Date().toISOString(),
        method: method,
        beanOrigin: beanInput.value.trim(),
        ratio: ratioInput.value.trim(),
        grindSize: grindSize,
        waterTempF: parseInt(tempInput.value, 10) || 200,
        flavorTags: Array.from(flavorSet),
        rating: rating || 0,
        notes: notesInput.value.trim()
      };
      const all = loadBeanBrews();
      all.unshift(entry);
      saveBeanBrews(all);
      close();
      // Re-render You so streak / palate / past brews refresh
      if (typeof beanRender === 'function') beanRender();
    }
  }, 'Save brew'));

  const backdrop = el('div', { id: 'brewlog-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

function _label(text) {
  return el('div', { class: 'brewlog-label' }, text);
}

/* ---------- Pair-device stub modal ---------- */
function openPairDeviceModal() {
  if (document.getElementById('pair-backdrop')) return;
  const card = el('div', { class: 'brewlog-card pair-card', onclick: (e) => e.stopPropagation() },
    el('button', { type: 'button', class: 'brewlog-close', 'aria-label': 'Close', onclick: close, style: 'position:absolute;top:14px;right:14px' }, _svgEl(YOU_ICONS.close)),
    el('div', { class: 'pair-icon' }, '📡'),
    el('h2', { class: 'brewlog-title' }, 'Coming soon: device pairing'),
    el('p', { class: 'pair-body' }, 'Wi-Fi pairing for your Cuisinart appliances will land here in a future build. For now, this is a preview.'),
    el('button', { class: 'brewlog-save', type: 'button', onclick: close }, 'Got it')
  );
  const backdrop = el('div', { id: 'pair-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

/* ---------- Recommended brew picker ---------- */
function pickRecommendedBrew() {
  const list = (typeof DATA !== 'undefined' && Array.isArray(DATA.recommendedBrews) && DATA.recommendedBrews.length)
    ? DATA.recommendedBrews
    : [{
        name: 'Today\'s pick',
        method: 'Pour-over',
        ratio: '1:16',
        waterTempF: 200,
        grindSize: 'Medium-fine',
        flavorTags: ['floral', 'citrus'],
        description: 'A bright, balanced cup to ease into the morning.',
        photoUrl: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80'
      }];
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - start) / 86400000);
  return list[dayOfYear % list.length];
}

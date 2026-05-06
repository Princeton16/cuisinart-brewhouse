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

/* ---------- Top-level renders ---------- */
/* Home tab — the user's daily activity hub. Holds streak, log brew CTA,
   recommended brews, past brews, and badges link. Profile header, palate,
   and connected devices live on the new Profile tab now. */
function renderHome(main) {
  const user = getBeanUser() || { name: 'You', email: '', createdAt: Date.now() };
  const brews = loadBeanBrews();
  const recommendations = pickRecommendedBrews(5);

  const cs = currentStreak(brews);
  const bs = bestStreak(brews);
  const palate = computePalate(brews);
  const origins = uniqueBeanOrigins(brews);
  const userPosts = (typeof userPostCount === 'function') ? userPostCount() : 0;
  const kudosGiven = (typeof loadBeanKudos === 'function') ? loadBeanKudos().length : 0;
  const xp = (typeof getXP === 'function') ? getXP() : 0;
  const achievements = computeAchievements(brews, cs, palate.coverage, origins, userPosts, kudosGiven, xp);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const page = el('div', { class: 'bean-page you-page home-page' });
  // A small welcome line at the top of the home hub
  const firstName = (user.name || 'friend').split(/\s+/)[0];
  page.appendChild(el('div', { class: 'home-hello' },
    el('div', { class: 'home-hello-greeting' }, 'Welcome back, ', el('strong', {}, firstName), '.'),
    el('div', { class: 'home-hello-sub' }, 'Here is your brew ritual today.')
  ));
  page.appendChild(youStreakCard(cs, bs, brews));
  page.appendChild(youLogCta(cs));
  page.appendChild(youRecommendedRow(recommendations));
  page.appendChild(youPastBrewsCard(brews));
  page.appendChild(youBadgesLinkCard(achievements, unlockedCount));
  main.appendChild(page);

  requestAnimationFrame(() => animateStreakValue(cs));
  enableHorizontalWheelScroll(page);
  if (typeof revealNewAchievements === 'function') revealNewAchievements(achievements);
}

/* Profile tab — identity surface. Profile header (avatar, name, tier, bio,
   stats), palate analysis, connected devices, and sign-out. */
function renderProfile(main) {
  const user = getBeanUser() || { name: 'You', email: '', createdAt: Date.now() };
  const isDemo = !!user.isDemo;
  const brews = loadBeanBrews();

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

  const page = el('div', { class: 'bean-page you-page profile-page' });
  page.appendChild(youProfileHeader(user, brews, bs, unlockedCount));
  page.appendChild(youPalateCardCompact(palate, brews));
  page.appendChild(youDevicesCard(devices));
  main.appendChild(page);
}

/* Backwards-compat alias — older internal links may still reference renderYou. */
function renderYou(main) { return renderHome(main); }

/* Find every horizontal scroll container in the subtree and let a vertical
   mouse wheel translate to horizontal scroll. Without this, desktop users
   without a trackpad have no way to swipe through recommendation cards. */
function enableHorizontalWheelScroll(root) {
  const scrollers = root.querySelectorAll('.you-recs-scroll, .feed-top-scroll, .pp-rail-scroll');
  scrollers.forEach(s => {
    s.addEventListener('wheel', (e) => {
      // If the user is scrolling primarily horizontally already, don't fight it.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Let the page scroll vertically if the row is already scrolled to its end
      // in the wheel direction — this avoids "trapping" vertical scroll.
      const max = s.scrollWidth - s.clientWidth;
      const atStart = s.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = s.scrollLeft >= max - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      s.scrollLeft += e.deltaY;
    }, { passive: false });
  });
}

/* ---------- 1. Profile header ----------
   Beli-style stats strip below the bio surfaces total brews / best streak /
   badges so the user feels their progress at a glance. */
function youProfileHeader(user, brews, bestStreakDays, badgesEarned) {
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

  // Quick-stat strip — three at-a-glance metrics
  const totalBrews = (brews && brews.length) || 0;
  const stats = el('div', { class: 'you-profile-stats' },
    el('div', { class: 'you-pstat' },
      el('div', { class: 'you-pstat-value' }, String(totalBrews)),
      el('div', { class: 'you-pstat-label' }, totalBrews === 1 ? 'Brew' : 'Brews')
    ),
    el('div', { class: 'you-pstat' },
      el('div', { class: 'you-pstat-value' }, String(bestStreakDays || 0)),
      el('div', { class: 'you-pstat-label' }, 'Best streak')
    ),
    el('div', { class: 'you-pstat' },
      el('div', { class: 'you-pstat-value' }, String(badgesEarned || 0)),
      el('div', { class: 'you-pstat-label' }, badgesEarned === 1 ? 'Badge' : 'Badges')
    )
  );
  card.appendChild(stats);
  return card;
}

function openYouSettings() {
  if (!confirm('Sign out of The Bean?')) return;
  clearBeanUser();
  window.location.hash = '#/auth';
}

/* ---------- 2. Streak card ----------
   Beli-style streak with momentum: the headline number is animated on first
   paint, and a small momentum line below the 7-day grid tells the user how
   close they are to the next milestone (3 / 7 / 14 / 30 / 60 / 100 day
   anchors) so the streak always has a "next thing to chase". */
function youStreakCard(cs, bs, brews) {
  const card = el('div', { class: 'you-card you-card-dark you-streak' });

  // First-time user — friendlier empty state instead of "0 day streak"
  if (!brews || !brews.length) {
    card.appendChild(el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'YOUR BREWS'));
    card.appendChild(el('div', { class: 'you-streak-empty-state' },
      el('div', { class: 'you-streak-empty-flame' }, _svgEl(YOU_ICONS.flame)),
      el('div', { class: 'you-streak-empty-h' }, 'Start your streak today.'),
      el('div', { class: 'you-streak-empty-sub' }, 'Log your first brew to begin your coffee journey. Most members hit 7 days in their first week.')
    ));
    return card;
  }

  card.appendChild(el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'YOUR BREWS'));
  card.appendChild(el('div', { class: 'you-streak-row' },
    el('div', { class: 'you-streak-num' },
      _svgEl(YOU_ICONS.flame),
      el('span', { class: 'you-streak-value', 'data-target': String(cs) }, String(cs)),
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

  // Momentum line — what milestone they're chasing next
  const milestones = [3, 7, 14, 30, 60, 100, 365];
  const next = milestones.find(m => m > cs) || (cs + 30);
  const prev = [...milestones].reverse().find(m => m <= cs) || 0;
  const span = next - prev || 1;
  const progress = Math.max(0, Math.min(1, (cs - prev) / span));
  const remaining = next - cs;
  const momentumCopy = cs === 0
    ? 'Log a brew today to start a streak.'
    : remaining === 1
      ? '1 day to your next milestone.'
      : remaining + ' days to ' + next + '-day milestone.';

  card.appendChild(el('div', { class: 'you-streak-momentum' },
    el('div', { class: 'you-streak-track' },
      el('div', { class: 'you-streak-fill', style: 'width:' + (progress * 100).toFixed(0) + '%' })
    ),
    el('div', { class: 'you-streak-momentum-text' }, momentumCopy)
  ));
  return card;
}

/* Animate the streak number from 0 to its current value on first render.
   ~600ms ease-out gives the page a small "alive" feeling without delaying
   readability. Skipped if the user prefers reduced motion. */
function animateStreakValue(target) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const node = document.querySelector('.you-streak-value');
  if (!node || !target) return;
  const start = performance.now();
  const duration = Math.min(900, 250 + target * 28);
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = String(Math.round(eased * target));
    if (t < 1) requestAnimationFrame(tick);
    else node.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

/* ---------- 3. Log today's brew CTA ----------
   Sleek pill with a deterministic-but-believable social-proof line below it
   (Beli/DoorDash both use this — "1,284 people brewed this today" — to build
   habit-loop pressure without being pushy). */
function youLogCta(cs) {
  const wrap = el('div', { class: 'you-log-wrap' });
  wrap.appendChild(el('button', {
    class: 'you-log-cta',
    type: 'button',
    onclick: () => openBrewLogModal()
  },
    el('span', {}, 'Log Today’s Brew'),
    _svgEl(YOU_ICONS.plus)
  ));

  // Subtle social proof — pseudo-random but stable per day so it doesn't flicker.
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const proofCount = 1100 + (seed % 740);
  const copy = cs > 0
    ? proofCount.toLocaleString() + ' brewers logged today. Keep your streak.'
    : proofCount.toLocaleString() + ' brewers logged today. Join them.';
  wrap.appendChild(el('div', { class: 'you-log-proof' },
    el('span', { class: 'you-log-proof-dot' }),
    el('span', {}, copy)
  ));
  return wrap;
}

/* ---------- 4. Recommended for you ----------
   DoorDash-style horizontal scroll. The first card stays at full visibility
   width so it reads as the headline pick, with neighboring cards just edged
   into view to telegraph "scroll for more". Each card is a complete swipe-and-
   try unit: photo, name, method, ratio, tags, primary CTA. */
function youRecommendedRow(recs) {
  const card = el('div', { class: 'you-card you-recs-card' });
  card.appendChild(el('div', { class: 'you-recs-head' },
    el('div', { class: 'you-eyebrow' }, 'RECOMMENDED FOR YOU'),
    el('span', { class: 'you-recs-meta' }, 'Tuned to your last brews')
  ));
  const scroller = el('div', { class: 'you-recs-scroll' });
  recs.forEach((rec, i) => scroller.appendChild(recCard(rec, i === 0)));
  card.appendChild(scroller);
  return card;
}

function recCard(rec, isFeatured) {
  const card = el('div', { class: 'you-rec-tile' + (isFeatured ? ' is-featured' : '') });
  if (rec.photoUrl) {
    card.appendChild(el('div', {
      class: 'you-rec-tile-photo',
      style: 'background-image:url(\'' + rec.photoUrl + '\')'
    },
      isFeatured ? el('div', { class: 'you-rec-tile-flag' }, '★ TODAY’S PICK') : null
    ));
  }
  card.appendChild(el('div', { class: 'you-rec-tile-body' },
    el('h3', { class: 'you-rec-tile-name' }, rec.name),
    el('div', { class: 'you-rec-tile-meta' },
      el('span', {}, rec.method),
      el('span', { class: 'you-rec-tile-dot' }),
      el('span', {}, rec.ratio),
      el('span', { class: 'you-rec-tile-dot' }),
      el('span', {}, rec.grindSize)
    ),
    el('div', { class: 'you-rec-tile-tags' },
      (rec.flavorTags || []).slice(0, 3).map(t => el('span', { class: 'you-tag' }, t))
    ),
    el('button', {
      class: 'you-rec-tile-cta',
      type: 'button',
      // Open the recipe detail modal first; the Log this brew button inside
      // pre-fills the brew log so the user can save what they actually made.
      onclick: () => openRecipeDetailModal(rec)
    }, 'Try this brew')
  ));
  return card;
}

/* ---------- Recipe detail modal ----------
   Opened from any "Try this brew" CTA. Shows the recipe full-bleed: hero
   photo, name, description, every parameter, flavor tags, and a primary
   "Log this brew" CTA that hands off to the existing brew-log flow with
   the recipe's parameters pre-filled. */
function openRecipeDetailModal(rec) {
  if (document.getElementById('rec-detail-backdrop')) return;
  const card = el('div', { class: 'rec-detail-card', onclick: (e) => e.stopPropagation() });

  card.appendChild(el('button', {
    type: 'button',
    class: 'rec-detail-close',
    'aria-label': 'Close',
    onclick: close
  }, _svgEl(YOU_ICONS.close)));

  if (rec.photoUrl) {
    card.appendChild(el('div', {
      class: 'rec-detail-hero',
      style: 'background-image:url(\'' + rec.photoUrl + '\')'
    }));
  }

  const body = el('div', { class: 'rec-detail-body' });
  body.appendChild(el('div', { class: 'rec-detail-eyebrow' }, '◆ RECOMMENDED RECIPE'));
  body.appendChild(el('h2', { class: 'rec-detail-name' }, rec.name));
  if (rec.description) body.appendChild(el('p', { class: 'rec-detail-desc' }, rec.description));

  // Parameters grid — all four knobs, easy to scan
  body.appendChild(el('div', { class: 'rec-detail-grid' },
    statTile('Method', rec.method),
    statTile('Ratio', rec.ratio),
    statTile('Water', rec.waterTempF + '°F'),
    statTile('Grind', rec.grindSize)
  ));

  // Tags — flavor profile to expect
  if (rec.flavorTags && rec.flavorTags.length) {
    body.appendChild(el('div', { class: 'rec-detail-section-label' }, 'FLAVOR NOTES'));
    body.appendChild(el('div', { class: 'rec-detail-tags' },
      rec.flavorTags.map(t => el('span', { class: 'you-tag' }, t))
    ));
  }

  // Primary CTA — hand off to the brew log with the recipe pre-filled
  body.appendChild(el('button', {
    type: 'button',
    class: 'rec-detail-cta',
    onclick: () => {
      close();
      openBrewLogModal({
        method: rec.method,
        ratio: rec.ratio,
        grindSize: rec.grindSize,
        waterTempF: rec.waterTempF,
        flavorTags: rec.flavorTags || [],
        beanOrigin: ''
      });
    }
  }, 'Log this brew'));

  card.appendChild(body);

  const backdrop = el('div', { id: 'rec-detail-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

function statTile(label, value) {
  return el('div', { class: 'you-stat' },
    el('div', { class: 'you-stat-label' }, label),
    el('div', { class: 'you-stat-value' }, value || '—')
  );
}

/* ---------- 5. Palate snapshot ----------
   Refreshed: a "palate vibe" personality tag at the top, a horizontal bar
   chart of top-4 flavors, and a small method breakdown row. Reads quickly
   without overloading the card. */
const PALATE_VIBES = {
  bright:      { label: 'The Bright Explorer', emoji: '🍋', sub: 'Citrus, floral, sunny cups.' },
  fruity:      { label: 'The Berry Hunter',    emoji: '🫐', sub: 'Always chasing berry-fruit notes.' },
  floral:      { label: 'The Garden Brewer',   emoji: '🌸', sub: 'Jasmine and stone-fruit kind of mornings.' },
  citrus:      { label: 'The Bright Explorer', emoji: '🍋', sub: 'Citrus and sunshine in the cup.' },
  chocolatey:  { label: 'The Chocolate Loyalist', emoji: '🍫', sub: 'Cocoa, caramel, comfort.' },
  caramel:     { label: 'The Sweet Caramel Fan', emoji: '🧈', sub: 'Sugar-browning notes win every time.' },
  nutty:       { label: 'The Nut & Roast Seeker', emoji: '🌰', sub: 'Almond, walnut, roasted depth.' },
  smoky:       { label: 'The Roasted Soul',    emoji: '🔥', sub: 'Dark roast and smoky bottoms.' },
  earthy:      { label: 'The Old-School Brewer', emoji: '🌍', sub: 'Earthy, full-body, deep-roast comfort.' },
  berry:       { label: 'The Berry Hunter',    emoji: '🫐', sub: 'Always chasing berry-fruit notes.' },
  sweet:       { label: 'The Sweet Tooth',     emoji: '🍬', sub: 'Honey, caramel, dessert-y finishes.' },
  balanced:    { label: 'The Balanced Drinker', emoji: '⚖️', sub: 'No extremes. Every cup tuned.' }
};

function youPalateCardCompact(palate, brews) {
  const card = el('div', { class: 'you-card you-card-dark you-palate-card' });
  card.appendChild(el('div', { class: 'you-palate-compact-head' },
    el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'PALATE SNAPSHOT'),
    el('a', { href: '#/palate', class: 'you-palate-link' }, 'View full →')
  ));

  if (!brews || !brews.length || palate.coverage === 0) {
    card.appendChild(el('p', { class: 'you-empty you-palate-empty' }, 'Log a few brews to build your palate.'));
    return card;
  }

  // Sort dimensions by count
  const ranked = palate.dimensions.slice().sort((a, b) => b.count - a.count);
  const top = ranked[0];
  const totalFlavorTags = ranked.reduce((acc, d) => acc + d.count, 0);
  const vibe = (top && PALATE_VIBES[String(top.label).toLowerCase()]) || {
    label: 'The Coffee Curious', emoji: '☕', sub: 'Just getting started.'
  };

  // Vibe tag — playful "personality" reading, single-line
  card.appendChild(el('div', { class: 'palate-vibe' },
    el('div', { class: 'palate-vibe-emoji' }, vibe.emoji),
    el('div', { class: 'palate-vibe-text' },
      el('div', { class: 'palate-vibe-label' }, vibe.label),
      el('div', { class: 'palate-vibe-sub' }, vibe.sub)
    )
  ));

  // Bar chart — top 4 flavors as horizontal bars relative to the leader
  const top4 = ranked.filter(d => d.count > 0).slice(0, 4);
  if (top4.length) {
    const max = top4[0].count || 1;
    const bars = el('div', { class: 'palate-bars' });
    top4.forEach((d, i) => {
      const pct = Math.round((d.count / max) * 100);
      bars.appendChild(el('div', { class: 'palate-bar-row' },
        el('div', { class: 'palate-bar-label' }, d.label),
        el('div', { class: 'palate-bar-track' },
          el('div', {
            class: 'palate-bar-fill' + (i === 0 ? ' is-top' : ''),
            style: 'width:' + pct + '%'
          })
        ),
        el('div', { class: 'palate-bar-count' }, String(d.count))
      ));
    });
    card.appendChild(bars);
  }

  // Foot row — method breakdown + origin diversity in a 2-up
  const methodCount = palate.topMethod ? brews.filter(b => b.method === palate.topMethod).length : 0;
  const methodPct = brews.length ? Math.round((methodCount / brews.length) * 100) : 0;
  const uniqueOrigins = (typeof uniqueBeanOrigins === 'function') ? uniqueBeanOrigins(brews).length : 0;
  card.appendChild(el('div', { class: 'palate-foot' },
    el('div', { class: 'palate-foot-tile' },
      el('div', { class: 'palate-foot-num' }, palate.topMethod || '—'),
      el('div', { class: 'palate-foot-sub' }, methodPct + '% of your brews')
    ),
    el('div', { class: 'palate-foot-tile' },
      el('div', { class: 'palate-foot-num' }, String(uniqueOrigins)),
      el('div', { class: 'palate-foot-sub' }, 'origin' + (uniqueOrigins === 1 ? '' : 's') + ' explored')
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
    card.appendChild(el('div', { class: 'you-empty-illus' },
      el('div', { class: 'you-empty-cup' }, '☕'),
      el('div', { class: 'you-empty-h' }, 'Your brew journal is empty.'),
      el('p', { class: 'you-empty-sub' }, 'Every brew you log will live here with stars, notes, and timing. Tap “Log Today’s Brew” above to add your first.')
    ));
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
function _recommendedBrewPool() {
  if (typeof DATA !== 'undefined' && Array.isArray(DATA.recommendedBrews) && DATA.recommendedBrews.length) {
    return DATA.recommendedBrews;
  }
  // Local fallback so the horizontal scroll always has variety even if
  // DATA.recommendedBrews is missing or short. Photos are stable Unsplash
  // URLs already used elsewhere in the app.
  return [
    {
      name: 'Bright Yirgacheffe pour-over',
      method: 'Pour-over', ratio: '1:16', waterTempF: 200, grindSize: 'Medium-fine',
      flavorTags: ['floral', 'citrus', 'tea-like'],
      description: 'A bright, balanced cup to ease into the morning.',
      photoUrl: 'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80'
    },
    {
      name: 'Maple bourbon cold brew',
      method: 'Cold brew', ratio: '1:8', waterTempF: 70, grindSize: 'Coarse',
      flavorTags: ['caramel', 'sweet', 'smooth'],
      description: 'Cold brew concentrate kissed with maple syrup. Grown-up summer drink.',
      photoUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80'
    },
    {
      name: 'Honey lavender latte',
      method: 'Espresso', ratio: '1:2', waterTempF: 200, grindSize: 'Fine',
      flavorTags: ['floral', 'sweet', 'creamy'],
      description: 'Steamed milk infused with dried lavender, finished with a double shot.',
      photoUrl: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=600&q=80'
    },
    {
      name: 'French press deep dive',
      method: 'French press', ratio: '1:15', waterTempF: 200, grindSize: 'Coarse',
      flavorTags: ['chocolatey', 'full body', 'earthy'],
      description: 'Heavy body, full extraction. Strong without being bitter.',
      photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'
    },
    {
      name: 'Iced cardamom cortado',
      method: 'Espresso', ratio: '1:2', waterTempF: 200, grindSize: 'Fine',
      flavorTags: ['spiced', 'sweet', 'creamy'],
      description: 'Equal parts espresso and cardamom milk. Small drink, big finish.',
      photoUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80'
    }
  ];
}

function pickRecommendedBrew() {
  const list = _recommendedBrewPool();
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - start) / 86400000);
  return list[dayOfYear % list.length];
}

function pickRecommendedBrews(n) {
  const pool = _recommendedBrewPool();
  if (!pool.length) return [];
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - start) / 86400000);
  const ordered = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    ordered.push(pool[(dayOfYear + i) % pool.length]);
  }
  return ordered;
}

/* pages/learn.js — Coffee IQ tracks, lessons, certs.
   Loaded after helpers/learn.js. Uses global el(). */

const LEARN_ICONS = {
  bean:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="12" rx="6" ry="9" transform="rotate(20 12 12)"/><path d="M12 4 Q9 12 12 20" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" fill="none" transform="rotate(20 12 12)"/></svg>',
  drop:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 C8 9 5 13 5 17 a7 7 0 0 0 14 0 C19 13 16 9 12 3 Z"/></svg>',
  leaf:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 19 C 5 9 14 4 20 4 C 20 12 15 19 5 19 Z"/><path d="M5 19 L 14 10" stroke="rgba(255,255,255,0.45)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 12 L11 16 L17 9" stroke="#FFFFFF"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4 H17 V8 L13 12 L17 16 V20 H7 V16 L11 12 L7 8 Z"/></svg>',
  lock:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11 V8 a3 3 0 0 1 6 0 V11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  play:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 8 L16 12 L10 16 Z" fill="#FFFFFF"/></svg>',
  trophy:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4 h10 v3 a5 5 0 0 1 -10 0 Z"/><path d="M5 5 H3 v2 a3 3 0 0 0 3 3 V8 Z M19 5 h2 v2 a3 3 0 0 1 -3 3 V8 Z"/><path d="M9 13 h6 v2 H9 Z M8 16 h8 v3 H8 Z M7 19 h10 v2 H7 Z"/></svg>',
  close:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>',
  // Footprint — top-down view of a right foot, toes pointing UP. Rotated +90°
   // in the path to face right (toward the next module). Mirror via
   // transform:scaleY(-1) for alternating left foot.
  footprint: '<svg viewBox="0 0 18 24" fill="currentColor" aria-hidden="true"><ellipse cx="9" cy="9" rx="5" ry="7"/><circle cx="6.2" cy="3" r="1.6"/><circle cx="9.5" cy="2" r="1.4"/><circle cx="12.6" cy="3" r="1.4"/><circle cx="14.4" cy="5.5" r="1.2"/><circle cx="9" cy="20.5" r="2.6"/></svg>'
};

function _learnSvg(html) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.innerHTML = html;
  return wrap;
}

function renderLearn(main) {
  const tracks = (typeof DATA !== 'undefined' && Array.isArray(DATA.beanTracks)) ? DATA.beanTracks : [];
  const totalLessons = tracks.reduce((acc, t) => acc + (t.lessons || []).length, 0);
  const completedCount = loadCompletedLessons().length;
  const tierProg = getTierProgress();

  const page = el('div', { class: 'bean-page learn-page' });

  /* 1. Header card — Coffee IQ + tier + bar */
  const header = el('div', { class: 'learn-header-card' });
  header.appendChild(el('div', { class: 'you-eyebrow you-eyebrow-yellow' }, 'COFFEE IQ'));
  header.appendChild(el('h1', { class: 'learn-tier-name' }, tierProg.currentTier.name));
  if (tierProg.nextTier) {
    header.appendChild(el('p', { class: 'learn-tier-sub' },
      tierProg.xpInTier + ' / ' + tierProg.xpForNextTier + ' XP to ' + tierProg.nextTier.name
    ));
  } else {
    header.appendChild(el('p', { class: 'learn-tier-sub' }, 'Top tier reached. ' + tierProg.xp + ' XP earned.'));
  }
  const bar = el('div', { class: 'learn-tier-bar' },
    el('div', { class: 'learn-tier-fill', style: 'width:' + tierProg.percent + '%' })
  );
  header.appendChild(bar);
  header.appendChild(el('p', { class: 'learn-tier-foot' },
    completedCount + ' of ' + totalLessons + ' lessons completed'
  ));
  page.appendChild(header);

  /* 1b. "Pick up where you left off" — DoorDash-style featured continue card.
     Surfaces the most recent in-progress lesson if one exists, otherwise the
     first not-yet-started lesson. Big photo-forward CTA above the tracks
     grid creates a clear next action and drives engagement. */
  const continueCard = buildContinueCard(tracks);
  if (continueCard) page.appendChild(continueCard);

  /* 2. Tracks */
  const tracksSection = el('div', { class: 'learn-tracks' });
  tracks.forEach(t => tracksSection.appendChild(buildTrackBlock(t)));
  page.appendChild(tracksSection);

  /* 3. Certifications */
  page.appendChild(buildCertSection());

  main.appendChild(page);
}

/* "Pick up where you left off" featured card. Walks the tracks looking for
   an in-progress lesson; falls back to the first not-yet-started lesson.
   Returns null if everything is completed (we don't want a stale featured
   card if the user is done). */
function buildContinueCard(tracks) {
  if (!tracks || !tracks.length) return null;
  let target = null;
  let targetTrack = null;
  for (const t of tracks) {
    for (const l of (t.lessons || [])) {
      const s = getLessonState(l.id);
      if (s === 'in-progress') { target = l; targetTrack = t; break; }
    }
    if (target) break;
  }
  if (!target) {
    for (const t of tracks) {
      for (const l of (t.lessons || [])) {
        if (getLessonState(l.id) === 'unlocked') {
          target = l; targetTrack = t; break;
        }
      }
      if (target) break;
    }
  }
  if (!target || !targetTrack) return null;
  const state = getLessonState(target.id);
  const card = el('button', {
    type: 'button',
    class: 'learn-continue',
    onclick: () => openLessonModal(targetTrack, target)
  });
  // Color block / icon side
  card.appendChild(el('div', {
    class: 'learn-continue-icon',
    style: 'background:' + (targetTrack.iconColor || '#8B4F2A')
  }, _learnSvg(LEARN_ICONS[targetTrack.icon] || LEARN_ICONS.bean)));
  // Body
  const eyebrow = state === 'in-progress' ? '◆ PICK UP WHERE YOU LEFT OFF' : '◆ NEXT LESSON';
  card.appendChild(el('div', { class: 'learn-continue-body' },
    el('div', { class: 'learn-continue-eyebrow' }, eyebrow),
    el('div', { class: 'learn-continue-title' }, target.title),
    el('div', { class: 'learn-continue-meta' },
      el('span', {}, targetTrack.title),
      el('span', { class: 'learn-continue-dot' }),
      el('span', {}, '+' + target.xp + ' XP')
    )
  ));
  card.appendChild(el('div', { class: 'learn-continue-arrow' },
    _learnSvg(LEARN_ICONS.play)
  ));
  return card;
}

function buildTrackBlock(track) {
  const block = el('div', { class: 'learn-track' });

  // Header
  const tp = getTrackProgress(track.id);
  const head = el('div', { class: 'learn-track-head' });
  head.appendChild(el('div', {
    class: 'learn-track-icon',
    style: 'background:' + (track.iconColor || '#8B4F2A')
  }, _learnSvg(LEARN_ICONS[track.icon] || LEARN_ICONS.bean)));
  const meta = el('div', { class: 'learn-track-meta' },
    el('h3', { class: 'learn-track-title' }, track.title),
    el('p', { class: 'learn-track-sub' }, tp.completed + '/' + tp.total + ' lessons')
  );
  head.appendChild(meta);
  const mini = el('div', { class: 'learn-track-mini-bar' },
    el('div', { class: 'learn-track-mini-fill', style: 'width:' + tp.percent + '%; background:' + (track.iconColor || '#F5C842') })
  );
  head.appendChild(mini);
  block.appendChild(head);

  // Lessons "path" — horizontally scrollable trail. Lesson cards line up
  // left-to-right with footprints walking between each pair (right edge of
  // card N → left edge of card N+1). Long tracks scroll sideways inside the
  // track block.
  const path = el('div', { class: 'learn-path' });
  const pathInner = el('div', { class: 'learn-path-inner' });
  const lessons = track.lessons || [];
  lessons.forEach((lesson, i) => {
    pathInner.appendChild(buildPathNode(track, lesson, i + 1));
    if (i < lessons.length - 1) {
      pathInner.appendChild(buildPathSteps());
    }
  });
  path.appendChild(pathInner);
  block.appendChild(path);

  // Allow vertical mouse-wheel to scroll the path horizontally on desktop.
  if (typeof enableHorizontalWheelScroll === 'function') enableHorizontalWheelScroll(block);

  return block;
}

/* A single lesson card on the path. Tapping the card (anywhere) opens the
   lesson video modal. Locked cards shake instead. */
function buildPathNode(track, lesson, index) {
  const state = getLessonState(lesson.id);
  const node = el('button', {
    type: 'button',
    class: 'learn-path-node learn-state-' + state,
    'aria-label': lesson.title,
    onclick: () => {
      if (state === 'locked') {
        node.classList.remove('shake');
        void node.offsetWidth;
        node.classList.add('shake');
        return;
      }
      openLessonModal(track, lesson);
    }
  });

  // Circular status badge
  let statusHtml = LEARN_ICONS.play;
  if (state === 'completed') statusHtml = LEARN_ICONS.check;
  else if (state === 'in-progress') statusHtml = LEARN_ICONS.hourglass;
  else if (state === 'locked') statusHtml = LEARN_ICONS.lock;

  const badge = el('div', {
    class: 'learn-path-badge',
    style: state === 'locked' ? '' : 'background:' + (track.iconColor || '#8B4F2A')
  }, _learnSvg(statusHtml));
  node.appendChild(badge);

  // Body
  let stateLabel = '+' + lesson.xp + ' XP';
  if (state === 'completed') stateLabel = 'Completed · +' + lesson.xp + ' XP';
  else if (state === 'in-progress') stateLabel = 'Continue · +' + lesson.xp + ' XP';
  else if (state === 'locked') stateLabel = 'Locked';

  node.appendChild(el('div', { class: 'learn-path-info' },
    el('div', { class: 'learn-path-step' }, 'STEP ' + index),
    el('div', { class: 'learn-path-title' }, lesson.title),
    el('div', { class: 'learn-path-state' }, stateLabel)
  ));
  return node;
}

/* Footprints between two adjacent lesson cards. Four small feet walking
   left-to-right, all toes pointing toward the NEXT card. Alternating L/R
   feet are mirrored vertically (scaleY -1) and offset up/down to mimic a
   real walking gait. Each foot fades in slightly to the right of the last
   to suggest forward motion. */
function buildPathSteps() {
  const steps = el('div', { class: 'learn-path-steps' });
  // 4 feet: right (down), left (up), right (down), left (up).
  // The "lean" in degrees gives each foot a tiny forward tilt.
  const gait = [
    { side: 'right', lean: 12 },
    { side: 'left',  lean: 8 },
    { side: 'right', lean: 12 },
    { side: 'left',  lean: 8 }
  ];
  gait.forEach((step, i) => {
    const foot = _learnSvg(LEARN_ICONS.footprint);
    foot.classList.add('learn-path-foot', 'learn-path-foot-' + step.side);
    // Toes face right (rotate 90° from the upright SVG); mirror Y for left foot;
    // add a small forward lean.
    const yScale = step.side === 'left' ? -1 : 1;
    foot.style.transform = 'rotate(' + (90 + step.lean) + 'deg) scaleY(' + yScale + ')';
    // Vertical offset puts right feet slightly below the centerline, left feet above.
    foot.style.marginTop = step.side === 'right' ? '8px' : '-8px';
    foot.style.opacity = String(0.40 + (i / gait.length) * 0.45);
    steps.appendChild(foot);
  });
  return steps;
}

function buildCertSection() {
  const section = el('div', { class: 'learn-certs' });
  section.appendChild(el('h2', { class: 'learn-certs-h' }, 'Certifications'));
  (DATA.beanCerts || []).forEach(cert => {
    section.appendChild(buildCertCard(cert));
  });
  return section;
}

function buildCertCard(cert) {
  const cp = getCertProgress(cert.id);
  const card = el('div', { class: 'learn-cert-card' + (cp.locked ? ' is-locked' : '') });

  card.appendChild(el('div', { class: 'learn-cert-eyebrow' }, cert.name.toUpperCase()));
  card.appendChild(el('h3', { class: 'learn-cert-title' }, cert.name));
  card.appendChild(el('p', { class: 'learn-cert-sub' }, cert.sub));

  // Progress
  const progRow = el('div', { class: 'learn-cert-prog-row' });
  progRow.appendChild(el('div', { class: 'learn-cert-bar' },
    el('div', { class: 'learn-cert-fill', style: 'width:' + cp.percent + '%' })
  ));
  progRow.appendChild(el('div', { class: 'learn-cert-count' }, cp.completed + ' of ' + cp.required));
  card.appendChild(progRow);

  // Action / earned state
  if (cp.earned) {
    card.appendChild(el('div', { class: 'learn-cert-earned' },
      _learnSvg(LEARN_ICONS.trophy),
      el('span', {}, 'Earned')
    ));
  } else if (cp.eligible) {
    card.appendChild(el('button', {
      class: 'learn-cert-cta',
      type: 'button',
      onclick: () => {
        if (earnCert(cert.id)) {
          if (typeof toast === 'function') toast('Certificate earned!');
          else alert('Certificate earned!');
          if (typeof beanRender === 'function') beanRender();
        }
      }
    }, 'Earn certificate'));
  }

  // Lock overlay (covers card if prereq unmet)
  if (cp.locked) {
    card.appendChild(el('div', { class: 'learn-cert-lock' },
      _learnSvg(LEARN_ICONS.lock),
      el('span', {}, cert.requiresCert ? 'Earn the prerequisite certificate first' : 'Locked')
    ));
  }

  return card;
}

/* ----- Lesson modal ----- */
function openLessonModal(track, lesson) {
  if (document.getElementById('learn-modal-backdrop')) return;
  const startState = getLessonState(lesson.id);

  // If lesson is unlocked-but-not-started, mark in-progress on open
  if (startState === 'unlocked') markLessonInProgress(lesson.id);

  const card = el('div', { class: 'brewlog-card learn-modal-card', onclick: (e) => e.stopPropagation() });
  card.appendChild(el('button', {
    type: 'button',
    class: 'brewlog-close',
    'aria-label': 'Close',
    onclick: close,
    style: 'position:absolute;top:14px;right:14px'
  }, _learnSvg(LEARN_ICONS.close)));

  card.appendChild(el('div', { class: 'learn-modal-eyebrow' }, track.title.toUpperCase()));
  card.appendChild(el('h2', { class: 'learn-modal-title' }, lesson.title));

  // YouTube video — embedded at top of body. Curated per lesson in data.js
  // (lesson.youtubeId). The iframe loads with privacy-enhanced nocookie.
  if (lesson.youtubeId) {
    const videoWrap = el('div', { class: 'learn-modal-video' });
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + lesson.youtubeId + '?rel=0&modestbranding=1';
    iframe.title = lesson.title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    videoWrap.appendChild(iframe);
    card.appendChild(videoWrap);
  }

  const body = el('div', { class: 'learn-modal-body' });
  String(lesson.body || '').split(/\n\n+/).forEach(para => {
    body.appendChild(el('p', {}, para));
  });
  card.appendChild(body);

  const isComplete = getLessonState(lesson.id) === 'completed';
  if (isComplete) {
    card.appendChild(el('button', {
      class: 'brewlog-save learn-modal-cta is-done',
      type: 'button',
      disabled: '',
      onclick: close
    }, 'Already complete · Review'));
    card.appendChild(el('button', {
      class: 'learn-modal-close-text',
      type: 'button',
      onclick: close
    }, 'Close'));
  } else {
    card.appendChild(el('button', {
      class: 'brewlog-save learn-modal-cta',
      type: 'button',
      onclick: () => {
        if (markLessonComplete(lesson.id)) {
          const tier = getTier();
          if (typeof toast === 'function') toast('+' + lesson.xp + ' XP earned. Tier: ' + tier.name);
        }
        close();
        if (typeof beanRender === 'function') beanRender();
      }
    }, 'Mark complete (+' + lesson.xp + ' XP)'));
  }

  const backdrop = el('div', { id: 'learn-modal-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

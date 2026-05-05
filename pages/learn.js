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
  close:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>'
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

  /* 2. Tracks */
  const tracksSection = el('div', { class: 'learn-tracks' });
  tracks.forEach(t => tracksSection.appendChild(buildTrackBlock(t)));
  page.appendChild(tracksSection);

  /* 3. Certifications */
  page.appendChild(buildCertSection());

  main.appendChild(page);
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

  // Lessons grid
  const grid = el('div', { class: 'learn-lesson-grid' });
  (track.lessons || []).forEach(lesson => grid.appendChild(buildLessonCard(track, lesson)));
  block.appendChild(grid);

  return block;
}

function buildLessonCard(track, lesson) {
  const state = getLessonState(lesson.id);
  const card = el('button', {
    type: 'button',
    class: 'learn-lesson-card learn-state-' + state,
    onclick: () => {
      if (state === 'locked') {
        // Subtle horizontal shake
        card.classList.remove('shake');
        // Force reflow so the animation re-triggers on rapid taps
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      openLessonModal(track, lesson);
    }
  });

  // Status icon
  let statusHtml = LEARN_ICONS.play;
  let statusColor = 'var(--accent-yellow-deep)';
  if (state === 'completed') { statusHtml = LEARN_ICONS.check; statusColor = '#5DAA6E'; }
  else if (state === 'in-progress') { statusHtml = LEARN_ICONS.hourglass; statusColor = '#F5C842'; }
  else if (state === 'locked') { statusHtml = LEARN_ICONS.lock; statusColor = '#A89F8E'; }
  const status = _learnSvg(statusHtml);
  status.classList.add('learn-lesson-status');
  status.style.color = statusColor;
  card.appendChild(status);

  card.appendChild(el('div', { class: 'learn-lesson-title' }, lesson.title));

  // Bottom row
  let label = '+' + lesson.xp + ' XP';
  if (state === 'completed') label = 'Completed';
  else if (state === 'in-progress') label = 'Pick up where you left off';
  else if (state === 'locked') label = 'Locked';
  const foot = el('div', { class: 'learn-lesson-foot' },
    el('span', { class: 'learn-lesson-state' }, label),
    el('span', { class: 'learn-lesson-xp' }, '+' + lesson.xp + ' XP')
  );
  card.appendChild(foot);

  return card;
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

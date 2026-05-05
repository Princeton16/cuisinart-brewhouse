/* pages/passport.js — coffee Passport: map + list of cafes you've visited.
   Loaded after helpers/passport.js. Uses global el(), Leaflet (window.L). */

const PP_FILTERS = [
  { key: 'all',           label: 'All' },
  { key: 'visited',       label: 'Visited' },
  { key: 'not-visited',   label: 'Not Visited' },
  { key: 'top-matches',   label: 'Top Matches' },
  { key: 'friends-picks', label: "Friends' Picks" }
];

const PP_ICONS = {
  search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 L21 21"/></svg>',
  cup:       '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 9 h12 v6 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z"/><path d="M17 11 a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  globe:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18"/><path d="M12 3 a13 13 0 0 1 0 18 a13 13 0 0 1 0 -18 Z"/></svg>',
  star:      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 16 L7 19 L9 13 L4 9 L10 9 Z"/></svg>',
  starOutline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4 L14 9.5 L20 10 L15.5 13.5 L17 19 L12 16 L7 19 L8.5 13.5 L4 10 L10 9.5 Z"/></svg>',
  near:      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 12 L21 4 L13 22 L11 14 Z"/></svg>',
  check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 L10 17 L19 7"/></svg>',
  close:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>'
};

let _ppState = { view: 'map', filter: 'all', query: '' };
let _ppMap = null;
let _ppMarkerById = {};
let _ppClusterMarker = null;
let _ppPolyline = null;

/* The 3 cafes within ~30 miles of each other that cluster at low zoom.
   They're the Hanover/Norwich (NH/VT) trio. */
const PP_CLUSTER_IDS = ['dirt-cowboy', 'the-works', 'umplebys'];
const PP_CLUSTER_ZOOM_THRESHOLD = 8; // < threshold = clustered, >= = individual

const PP_STAR_ICON = '<svg viewBox="0 0 24 24" fill="#1A1F14" aria-hidden="true"><path d="M12 3 L14.2 9 L20 9.4 L15.4 13.2 L17 19 L12 16 L7 19 L8.6 13.2 L4 9.4 L9.8 9 Z"/></svg>';

function _ppSvg(html) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.innerHTML = html;
  return wrap;
}

function _ppRelativeDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return diffDays + ' days ago';
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
  if (diffDays < 60) return '1 month ago';
  return Math.floor(diffDays / 30) + ' months ago';
}

function renderPassport(main) {
  // Rebuild a fresh map each visit (Leaflet keeps internal state otherwise).
  _ppMap = null;
  _ppMarkerById = {};
  _ppClusterMarker = null;
  _ppPolyline = null;

  const page = el('div', { class: 'bean-page passport-page' });

  /* 1. Sticky header */
  const header = el('div', { class: 'pp-header' });
  header.appendChild(el('h1', { class: 'pp-title' }, 'Passport'));
  header.appendChild(buildStatsRow());
  header.appendChild(buildViewToggle());
  page.appendChild(header);

  /* 2. Controls (search + Near Me + filters) */
  const controls = el('div', { class: 'pp-controls' });
  controls.appendChild(buildSearchAndNearMe());
  controls.appendChild(buildFilterPills());
  page.appendChild(controls);

  /* 3 + 4. Map view OR list view */
  const stage = el('div', { class: 'pp-stage', id: 'pp-stage' });
  page.appendChild(stage);

  main.appendChild(page);
  paintStage();
}

function paintStage() {
  const stage = document.getElementById('pp-stage');
  if (!stage) return;
  stage.innerHTML = '';
  if (_ppState.view === 'map') {
    stage.appendChild(buildMapView());
  } else {
    stage.appendChild(buildListView());
  }
}

/* ----- Stats row ----- */
function buildStatsRow() {
  const stats = getCafeStats();
  const row = el('div', { class: 'pp-stats' });
  row.appendChild(_statTilePassport('VISITED', String(stats.visited), 'cup'));
  row.appendChild(_statTilePassport('CITIES', String(stats.cities), 'globe'));
  row.appendChild(_statTilePassport(
    'AVG RATING',
    stats.avgRating ? stats.avgRating.toFixed(1) : '—',
    'star'
  ));
  return row;
}
function _statTilePassport(label, value, iconKey) {
  return el('div', { class: 'pp-stat' },
    el('div', { class: 'pp-stat-icon' }, _ppSvg(PP_ICONS[iconKey])),
    el('div', { class: 'pp-stat-label' }, label),
    el('div', { class: 'pp-stat-value' }, value)
  );
}

/* ----- View toggle ----- */
function buildViewToggle() {
  const wrap = el('div', { class: 'pp-view-toggle', role: 'tablist' });
  ['map', 'list'].forEach(v => {
    const pill = el('button', {
      type: 'button',
      class: 'pp-view-pill' + (v === _ppState.view ? ' active' : ''),
      'data-v': v,
      onclick: () => {
        _ppState.view = v;
        wrap.querySelectorAll('.pp-view-pill').forEach(p => p.classList.toggle('active', p.dataset.v === v));
        paintStage();
      }
    }, v.charAt(0).toUpperCase() + v.slice(1));
    wrap.appendChild(pill);
  });
  return wrap;
}

/* ----- Search + Near Me ----- */
function buildSearchAndNearMe() {
  const row = el('div', { class: 'pp-search-row' });

  const searchWrap = el('div', { class: 'pp-search' });
  searchWrap.appendChild(_ppSvg(PP_ICONS.search));
  const input = el('input', {
    class: 'pp-search-input',
    type: 'search',
    placeholder: 'Search a city or neighborhood…',
    value: _ppState.query
  });
  input.addEventListener('input', () => {
    _ppState.query = input.value;
    paintStage();
  });
  searchWrap.appendChild(input);
  row.appendChild(searchWrap);

  row.appendChild(el('button', {
    type: 'button',
    class: 'pp-near-pill',
    'aria-label': 'Find me',
    onclick: () => requestNearMe()
  },
    _ppSvg(PP_ICONS.near),
    el('span', {}, 'Near Me')
  ));

  return row;
}

function requestNearMe() {
  if (!navigator.geolocation) {
    if (typeof toast === 'function') toast('Location unavailable.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (_ppState.view !== 'map') {
        _ppState.view = 'map';
        document.querySelectorAll('.pp-view-pill').forEach(p => p.classList.toggle('active', p.dataset.v === 'map'));
        paintStage();
      }
      // Wait for map to mount before panning
      setTimeout(() => {
        if (_ppMap) _ppMap.setView([lat, lng], 11);
      }, 60);
    },
    () => {
      if (typeof toast === 'function') toast('Location unavailable.');
    }
  );
}

/* ----- Filter pills ----- */
function buildFilterPills() {
  const row = el('div', { class: 'pp-filter-pills' });
  PP_FILTERS.forEach(f => {
    row.appendChild(el('button', {
      type: 'button',
      class: 'pp-filter-pill' + (f.key === _ppState.filter ? ' active' : ''),
      'data-key': f.key,
      onclick: () => {
        _ppState.filter = f.key;
        row.querySelectorAll('.pp-filter-pill').forEach(p => p.classList.toggle('active', p.dataset.key === f.key));
        paintStage();
      }
    }, f.label));
  });
  return row;
}

/* ----- Map view ----- */
function buildMapView() {
  const wrap = el('div', { class: 'pp-map-wrap' });
  const mapEl = el('div', { id: 'pp-map', class: 'pp-map' });
  wrap.appendChild(mapEl);

  // Legend (4 rows for the photo-marker design)
  const legend = el('div', { class: 'pp-legend' });
  legend.appendChild(el('div', { class: 'pp-legend-row' },
    el('span', { class: 'pp-legend-swatch pp-legend-visited' }),
    el('span', {}, 'Visited')
  ));
  legend.appendChild(el('div', { class: 'pp-legend-row' },
    el('span', { class: 'pp-legend-swatch pp-legend-not-visited' }),
    el('span', {}, 'Not visited')
  ));
  legend.appendChild(el('div', { class: 'pp-legend-row' },
    el('span', { class: 'pp-legend-swatch pp-legend-star' }),
    el('span', {}, 'Top match')
  ));
  legend.appendChild(el('div', { class: 'pp-legend-row' },
    el('span', { class: 'pp-legend-swatch pp-legend-line' }),
    el('span', {}, 'Your journey')
  ));
  wrap.appendChild(legend);

  // Defer map init until after the element is in the DOM
  requestAnimationFrame(() => initMap());
  return wrap;
}

function initMap() {
  const mapEl = document.getElementById('pp-map');
  if (!mapEl || !window.L) return;

  const usBounds = [[24.396308, -125.0], [49.384358, -66.93457]];
  _ppMap = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true,
    maxBounds: usBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 4,
    maxZoom: 16
  }).setView([39.8283, -98.5795], 4);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap &copy; Carto',
    subdomains: 'abcd'
  }).addTo(_ppMap);

  // Re-paint markers + cluster on zoom change so the Hanover/Norwich
  // trio collapses to a single marker below zoom 8.
  _ppMap.on('zoomend', () => paintMarkers());

  paintMarkers();
  setTimeout(() => { if (_ppMap) _ppMap.invalidateSize(); }, 0);
}

function paintMarkers() {
  if (!_ppMap || !window.L) return;
  // Tear down everything we manage (markers, cluster, polyline)
  Object.values(_ppMarkerById).forEach(m => { try { _ppMap.removeLayer(m); } catch (_) {} });
  _ppMarkerById = {};
  if (_ppClusterMarker) { try { _ppMap.removeLayer(_ppClusterMarker); } catch (_) {} _ppClusterMarker = null; }
  if (_ppPolyline) { try { _ppMap.removeLayer(_ppPolyline); } catch (_) {} _ppPolyline = null; }

  const cafes = getFilteredCafes(_ppState.filter, _ppState.query);
  const zoom = _ppMap.getZoom();
  const inCluster = cafes.filter(c => PP_CLUSTER_IDS.indexOf(c.id) !== -1);
  const shouldCluster = (zoom < PP_CLUSTER_ZOOM_THRESHOLD) && (inCluster.length === PP_CLUSTER_IDS.length);

  // Polyline first so markers paint on top
  drawJourneyPolyline(cafes);

  cafes.forEach(cafe => {
    if (shouldCluster && PP_CLUSTER_IDS.indexOf(cafe.id) !== -1) return;
    addPhotoMarker(cafe);
  });

  if (shouldCluster) drawCluster(inCluster);
}

function addPhotoMarker(cafe) {
  const visited = isVisited(cafe.id);
  const top = isTopMatch(cafe);
  const photo = cafe.photoUrl || '';
  const classes = ['cafe-marker'];
  if (visited) classes.push('visited');
  if (top) classes.push('top-match');
  const star = top ? '<div class="cafe-marker-star">' + PP_STAR_ICON + '</div>' : '';
  const html =
    '<div class="' + classes.join(' ') + '">' +
      '<div class="cafe-marker-photo" style="background-image:url(\'' + photo + '\')"></div>' +
      star +
    '</div>';
  const icon = L.divIcon({
    className: 'cafe-marker-wrap',
    html: html,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });
  const marker = L.marker(cafe.coords, { icon: icon }).addTo(_ppMap);
  marker.on('click', () => openCafeDetail(cafe));
  _ppMarkerById[cafe.id] = marker;
}

function drawCluster(inCluster) {
  if (!_ppMap || !window.L) return;
  const lats = inCluster.map(c => c.coords[0]);
  const lngs = inCluster.map(c => c.coords[1]);
  const center = [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lngs.reduce((a, b) => a + b, 0) / lngs.length
  ];
  const html = '<div class="cafe-cluster">' + inCluster.length + '</div>';
  const icon = L.divIcon({
    className: 'cafe-cluster-wrap',
    html: html,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });
  _ppClusterMarker = L.marker(center, { icon: icon }).addTo(_ppMap);
  _ppClusterMarker.on('click', () => {
    const bounds = L.latLngBounds(inCluster.map(c => c.coords));
    _ppMap.fitBounds(bounds, { padding: [40, 40] });
  });
}

/* Polyline connecting visited cafes oldest -> newest. */
function drawJourneyPolyline(filteredCafes) {
  if (!_ppMap || !window.L) return;
  const visits = loadBeanVisits().slice().sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  // Only draw for cafes that pass the current filter so the line matches what's on screen
  const filteredIds = new Set(filteredCafes.map(c => c.id));
  const points = [];
  visits.forEach(v => {
    if (!filteredIds.has(v.cafeId)) return;
    const cafe = getCafeById(v.cafeId);
    if (cafe && cafe.coords) points.push(cafe.coords);
  });
  if (points.length < 2) return;
  _ppPolyline = L.polyline(points, {
    color: '#F5C842',
    weight: 2,
    opacity: 0.7,
    dashArray: '6, 8'
  }).addTo(_ppMap);
  _ppPolyline.bringToBack();
}

/* ----- List view ----- */
function buildListView() {
  const cafes = getFilteredCafes(_ppState.filter, _ppState.query);
  const wrap = el('div', { class: 'pp-list-wrap' });
  if (!cafes.length) {
    wrap.appendChild(el('div', { class: 'pp-empty' }, 'No cafes match your search.'));
    return wrap;
  }
  cafes.forEach(c => wrap.appendChild(buildListCard(c)));
  return wrap;
}

function buildListCard(cafe) {
  const visit = getVisitForCafe(cafe.id);
  const visited = !!visit;

  const card = el('button', {
    type: 'button',
    class: 'pp-list-card',
    onclick: () => openCafeDetail(cafe)
  });

  card.appendChild(el('div', {
    class: 'pp-list-photo',
    style: 'background-image:url(\'' + (cafe.photoUrl || '') + '\')'
  }));

  const body = el('div', { class: 'pp-list-body' });
  body.appendChild(el('div', { class: 'pp-list-name' }, cafe.name));
  body.appendChild(el('div', { class: 'pp-list-loc' }, (cafe.city || '') + ', ' + (cafe.state || '')));
  // Drink pills (max 3, then "+N")
  const drinks = (cafe.drinks || []).slice();
  const visibleDrinks = drinks.slice(0, 3);
  const overflow = drinks.length - visibleDrinks.length;
  const drinkRow = el('div', { class: 'pp-list-drinks' });
  visibleDrinks.forEach(d => drinkRow.appendChild(el('span', { class: 'pp-list-drink' }, d)));
  if (overflow > 0) drinkRow.appendChild(el('span', { class: 'pp-list-drink pp-list-drink-more' }, '+' + overflow));
  body.appendChild(drinkRow);
  card.appendChild(body);

  // Right side: visited check + stars
  if (visited) {
    const right = el('div', { class: 'pp-list-right' });
    right.appendChild(el('span', { class: 'pp-list-visited-pill' },
      _ppSvg(PP_ICONS.check),
      el('span', {}, 'Visited')
    ));
    if (visit.rating) {
      const stars = el('div', { class: 'pp-list-stars' });
      for (let i = 1; i <= 5; i++) {
        const s = _ppSvg(i <= visit.rating ? PP_ICONS.star : PP_ICONS.starOutline);
        s.style.color = i <= visit.rating ? '#F5C842' : 'rgba(0,0,0,0.18)';
        stars.appendChild(s);
      }
      right.appendChild(stars);
    }
    card.appendChild(right);
  }

  return card;
}

/* ----- Cafe detail modal (bottom sheet within the 480px frame) ----- */
function openCafeDetail(cafe) {
  if (document.getElementById('pp-detail-backdrop')) return;
  let editingRating = null;
  let editingNotes = null;
  let dirty = false;
  const initialVisit = getVisitForCafe(cafe.id);

  const card = el('div', { class: 'pp-detail-card', onclick: (e) => e.stopPropagation() });
  card.appendChild(el('button', {
    type: 'button',
    class: 'brewlog-close pp-detail-close',
    'aria-label': 'Close',
    onclick: close
  }, _ppSvg(PP_ICONS.close)));

  // Hero
  card.appendChild(el('div', {
    class: 'pp-detail-hero',
    style: 'background-image:url(\'' + (cafe.photoUrl || '') + '\')'
  }));

  // Name + location
  card.appendChild(el('h2', { class: 'pp-detail-name' }, cafe.name));
  card.appendChild(el('p', { class: 'pp-detail-loc' }, (cafe.city || '') + ', ' + (cafe.state || '')));
  if (cafe.topMatch) {
    card.appendChild(el('span', { class: 'pp-detail-topmatch' },
      _ppSvg(PP_ICONS.star), el('span', {}, 'Top Match')
    ));
  }

  // Featured roaster
  if (cafe.roaster) {
    card.appendChild(el('div', { class: 'pp-detail-rlabel' }, 'Featured Roaster'));
    card.appendChild(el('div', { class: 'pp-detail-rname' }, cafe.roaster));
  }

  // Signature drinks
  card.appendChild(el('div', { class: 'pp-detail-rlabel' }, 'Signature Drinks'));
  const drinkRow = el('div', { class: 'pp-detail-drinks' });
  (cafe.drinks || []).forEach(d => drinkRow.appendChild(el('span', { class: 'pp-detail-drink' }, d)));
  card.appendChild(drinkRow);

  // Story link for Dirt Cowboy
  if (cafe.id === 'dirt-cowboy') {
    card.appendChild(el('a', {
      href: '#',
      class: 'pp-detail-story',
      onclick: (e) => { e.preventDefault(); if (typeof toast === 'function') toast('Story playback coming soon'); }
    }, 'Watch their story →'));
  }

  // Visit section
  const visitSection = el('div', { class: 'pp-detail-visit' });
  card.appendChild(visitSection);

  renderVisitSection();

  const backdrop = el('div', {
    id: 'pp-detail-backdrop',
    class: 'pp-detail-backdrop',
    onclick: close
  }, card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  setTimeout(() => backdrop.classList.add('open'), 10);
  document.addEventListener('keydown', onKey);

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 220);
  }

  /* The visit section has multiple states it cycles through. Re-render
     it locally on every state change. */
  function renderVisitSection() {
    visitSection.innerHTML = '';
    const v = getVisitForCafe(cafe.id);

    if (!v) {
      // Not visited yet
      visitSection.appendChild(el('button', {
        class: 'pp-detail-cta',
        type: 'button',
        onclick: () => {
          editingRating = 0;
          editingNotes = '';
          dirty = false;
          renderRatingForm('Save visit', () => {
            markVisited(cafe.id, editingRating || null, editingNotes || '');
            close();
            if (typeof beanRender === 'function') beanRender();
          });
        }
      }, 'Mark as visited'));
      return;
    }

    // Visited — show summary + editable controls
    editingRating = v.rating || 0;
    editingNotes = v.notes || '';
    dirty = false;

    visitSection.appendChild(el('div', { class: 'pp-detail-visited-line' },
      _ppSvg(PP_ICONS.check),
      el('span', {}, 'Visited ' + _ppRelativeDate(v.dateISO))
    ));
    renderRatingForm('Save changes', () => {
      markVisited(cafe.id, editingRating || null, editingNotes || '');
      if (typeof toast === 'function') toast('Visit updated');
      // Refresh local UI in case user keeps the modal open
      dirty = false;
      saveBtn.style.display = 'none';
      // also refresh the rest of the app on close
      if (typeof beanRender === 'function') beanRender();
      close();
    });

    // Remove visit
    const removeLink = el('a', {
      href: '#',
      class: 'pp-detail-remove',
      onclick: (e) => {
        e.preventDefault();
        if (!confirm('Remove your visit to ' + cafe.name + '?')) return;
        removeVisit(cafe.id);
        close();
        if (typeof beanRender === 'function') beanRender();
      }
    }, 'Remove visit');
    visitSection.appendChild(removeLink);
  }

  /* Saved-button reference so we can hide it on save (visited-mode reuse) */
  let saveBtn = null;

  function renderRatingForm(saveLabel, onSave) {
    // Stars
    const stars = el('div', { class: 'pp-detail-stars' });
    for (let i = 1; i <= 5; i++) {
      const btn = el('button', {
        type: 'button',
        class: 'pp-detail-star' + (i <= editingRating ? ' on' : ''),
        'data-i': String(i),
        onclick: () => {
          editingRating = i;
          stars.querySelectorAll('.pp-detail-star').forEach((s, idx) => s.classList.toggle('on', idx + 1 <= editingRating));
          markDirty();
        }
      }, _ppSvg(PP_ICONS.star));
      stars.appendChild(btn);
    }
    visitSection.appendChild(el('div', { class: 'pp-detail-rlabel' }, 'Your rating'));
    visitSection.appendChild(stars);

    // Notes
    visitSection.appendChild(el('div', { class: 'pp-detail-rlabel' }, 'Notes'));
    const notes = el('textarea', {
      class: 'brewlog-textarea',
      rows: '3',
      placeholder: 'How was it?'
    });
    notes.value = editingNotes || '';
    notes.addEventListener('input', () => {
      editingNotes = notes.value;
      markDirty();
    });
    visitSection.appendChild(notes);

    // Save button — always visible for the new-visit flow, conditionally for edit flow
    saveBtn = el('button', {
      class: 'pp-detail-cta',
      type: 'button',
      onclick: onSave
    }, saveLabel);
    if (saveLabel === 'Save changes') saveBtn.style.display = 'none';
    visitSection.appendChild(saveBtn);
  }

  function markDirty() {
    dirty = true;
    if (saveBtn) saveBtn.style.display = '';
  }
}

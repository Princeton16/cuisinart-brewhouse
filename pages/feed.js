/* pages/feed.js — community Feed tab.
   Loaded after app.js + helpers/posts.js. Uses global el(), getBeanUser, etc. */

const FEED_FILTERS = [
  { key: 'trending', label: 'Trending' },
  { key: 'new',      label: 'New' },
  { key: 'recipes',  label: 'Recipes' },
  { key: 'shops',    label: 'Shops' }
];

const FEED_TYPE_PILLS = [
  { key: 'general', label: 'General' },
  { key: 'recipe',  label: 'Recipe' },
  { key: 'shop',    label: 'Shop' }
];

const FEED_METHODS = ['Pour-over', 'Espresso', 'French press', 'Cold brew', 'Drip', 'Aeropress', 'Moka pot'];
const FEED_GRINDS = ['Extra fine', 'Fine', 'Medium-fine', 'Medium', 'Medium-coarse', 'Coarse'];

const FEED_ICONS = {
  search:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 L21 21"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4 h12 v17 l-6 -4 -6 4 Z"/></svg>',
  bookmarkOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 4 h12 v17 l-6 -4 -6 4 Z"/></svg>',
  cup:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 9 h12 v6 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z"/><path d="M17 11 a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  cupOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 9 h12 v6 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z"/><path d="M17 11 a3 3 0 0 1 0 4" stroke-linecap="round"/></svg>',
  speech:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5 h16 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H8 l-4 4 V7 a2 2 0 0 1 2 -2 Z"/></svg>',
  arrowUp:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5 v14 M5 12 l7 -7 7 7"/></svg>',
  pin:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 a7 7 0 0 1 7 7 c0 5 -7 13 -7 13 S 5 14 5 9 a7 7 0 0 1 7 -7 Z M12 11 a2 2 0 1 0 0 -4 a2 2 0 0 0 0 4 Z" fill-rule="evenodd"/></svg>',
  plus:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5 v14 M5 12 h14"/></svg>',
  close:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>'
};

let _feedState = { filter: 'new', query: '' };

function _initials2(name) {
  if (!name) return '☕';
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(p => p[0].toUpperCase()).join('') || '☕';
}

function _svgEl2(html) {
  const wrap = document.createElement('span');
  wrap.style.display = 'inline-flex';
  wrap.innerHTML = html;
  return wrap;
}

function renderFeed(main) {
  // Lazy seed on first visit so real users also see the curated feed
  if (typeof seedBeanPostsIfNeeded === 'function') seedBeanPostsIfNeeded();

  const root = el('div', { class: 'feed-page' });

  // 1. Sticky header
  const header = el('div', { class: 'feed-header' });
  header.appendChild(el('h1', { class: 'feed-title' }, 'Feed'));

  const searchWrap = el('div', { class: 'feed-search' });
  searchWrap.appendChild(_svgEl2(FEED_ICONS.search));
  const searchInput = el('input', {
    class: 'feed-search-input',
    type: 'search',
    placeholder: 'Search posts, beans, tags…',
    value: _feedState.query
  });
  searchInput.addEventListener('input', () => {
    _feedState.query = searchInput.value;
    paintList();
  });
  searchWrap.appendChild(searchInput);
  header.appendChild(searchWrap);

  const pills = el('div', { class: 'feed-filter-pills' });
  FEED_FILTERS.forEach(f => {
    const pill = el('button', {
      type: 'button',
      class: 'feed-filter-pill' + (f.key === _feedState.filter ? ' active' : ''),
      'data-key': f.key,
      onclick: () => {
        _feedState.filter = f.key;
        pills.querySelectorAll('.feed-filter-pill').forEach(p => p.classList.toggle('active', p.dataset.key === f.key));
        paintList();
      }
    }, f.label);
    pills.appendChild(pill);
  });
  header.appendChild(pills);
  root.appendChild(header);

  // 2. Posts list
  const list = el('div', { class: 'feed-list' });
  root.appendChild(list);

  // 3. Create FAB
  const fab = el('button', {
    type: 'button',
    class: 'feed-fab',
    'aria-label': 'Create post',
    onclick: () => openCreatePostModal(() => paintList())
  }, _svgEl2(FEED_ICONS.plus));
  root.appendChild(fab);

  main.appendChild(root);

  function paintList() {
    list.innerHTML = '';
    const posts = filterPosts(loadBeanPosts(), _feedState.filter, _feedState.query);
    if (!posts.length) {
      list.appendChild(el('div', { class: 'feed-empty' }, 'No posts found'));
      return;
    }
    const kudos = new Set(loadBeanKudos());
    const bookmarks = new Set(loadBeanBookmarks());
    posts.forEach(p => list.appendChild(buildPostCard(p, kudos, bookmarks, paintList)));
  }
  paintList();
}

function buildPostCard(post, kudosSet, bookmarkSet, repaint) {
  const card = el('div', { class: 'feed-post' });

  // Top row: avatar + handle/tier/time + bookmark
  const top = el('div', { class: 'feed-post-top' });
  top.appendChild(el('div', {
    class: 'feed-avatar',
    style: 'background:' + (post.authorAvatarColor || '#8B4F2A')
  }, _initials2(post.authorName)));

  const meta = el('div', { class: 'feed-meta' });
  meta.appendChild(el('div', { class: 'feed-handle' }, post.authorHandle));
  const subRow = el('div', { class: 'feed-sub' });
  subRow.appendChild(el('span', { class: 'feed-tier-pill' }, post.authorTier || 'Bean Curious'));
  subRow.appendChild(el('span', { class: 'feed-dot' }, '·'));
  subRow.appendChild(el('span', { class: 'feed-time' }, relativePostDate(post.date)));
  meta.appendChild(subRow);
  top.appendChild(meta);

  const bookmarked = bookmarkSet.has(post.id);
  const bookmarkBtn = el('button', {
    type: 'button',
    class: 'feed-bookmark-btn' + (bookmarked ? ' on' : ''),
    'aria-label': bookmarked ? 'Remove bookmark' : 'Bookmark',
    onclick: () => {
      toggleBookmark(post.id);
      if (typeof repaint === 'function') repaint();
    }
  }, _svgEl2(bookmarked ? FEED_ICONS.bookmark : FEED_ICONS.bookmarkOutline));
  top.appendChild(bookmarkBtn);
  card.appendChild(top);

  // Title
  if (post.title) {
    card.appendChild(el('h3', { class: 'feed-post-title' }, post.title));
  }

  // Type-specific body
  if (post.type === 'recipe' && post.recipe) {
    const r = post.recipe;
    const stats = el('div', { class: 'feed-stat-grid' });
    stats.appendChild(_statTile('Ratio', r.ratio));
    stats.appendChild(_statTile('Method', r.method));
    stats.appendChild(_statTile('Water', typeof r.waterTempF === 'number' ? r.waterTempF + '°F' : (r.waterTempF || '—')));
    stats.appendChild(_statTile('Grind', r.grindSize));
    card.appendChild(stats);
    if (r.instructions) card.appendChild(el('p', { class: 'feed-recipe-instr' }, r.instructions));
  } else if (post.type === 'shop' && post.shop) {
    const s = post.shop;
    const visited = el('div', { class: 'feed-shop-visited' },
      _svgEl2(FEED_ICONS.pin),
      el('span', {}, 'Visited ' + (s.name || '') + ' · ' + (s.city || '') + ', ' + (s.state || ''))
    );
    card.appendChild(visited);
    if (s.featuredBean) {
      card.appendChild(el('div', { class: 'feed-shop-feat-row' },
        el('span', { class: 'feed-shop-feat-pill' }, 'Featured: ' + s.featuredBean)
      ));
    }
    if (post.content) card.appendChild(el('p', { class: 'feed-content' }, post.content));
  } else {
    if (post.content) card.appendChild(el('p', { class: 'feed-content' }, post.content));
  }

  // Photo
  if (post.photoUrl) {
    card.appendChild(el('div', {
      class: 'feed-photo',
      style: 'background-image:url(\'' + post.photoUrl + '\')',
      role: 'img',
      'aria-label': post.title || 'Post photo'
    }));
  }

  // Tags
  if (post.tags && post.tags.length) {
    const tagRow = el('div', { class: 'feed-tags' });
    post.tags.forEach(t => tagRow.appendChild(el('span', { class: 'feed-tag-pill' }, '#' + t)));
    card.appendChild(tagRow);
  }

  // Engagement row
  const liked = kudosSet.has(post.id);
  const eng = el('div', { class: 'feed-eng' });
  const kudosBtn = el('button', {
    type: 'button',
    class: 'feed-eng-btn' + (liked ? ' on' : ''),
    onclick: () => {
      toggleKudos(post.id);
      if (typeof repaint === 'function') repaint();
    }
  },
    _svgEl2(liked ? FEED_ICONS.cup : FEED_ICONS.cupOutline),
    el('span', { class: 'feed-eng-count' }, String(post.kudosCount || 0))
  );
  eng.appendChild(kudosBtn);
  eng.appendChild(el('button', {
    type: 'button', class: 'feed-eng-btn',
    onclick: () => alert('Comments coming soon')
  },
    _svgEl2(FEED_ICONS.speech),
    el('span', { class: 'feed-eng-count' }, String(post.commentsCount || 0))
  ));
  eng.appendChild(el('button', {
    type: 'button', class: 'feed-eng-btn',
    onclick: () => alert('Share coming soon')
  }, _svgEl2(FEED_ICONS.arrowUp)));
  eng.appendChild(el('button', {
    type: 'button',
    class: 'feed-eng-btn' + (bookmarked ? ' on' : ''),
    onclick: () => {
      toggleBookmark(post.id);
      if (typeof repaint === 'function') repaint();
    }
  }, _svgEl2(bookmarked ? FEED_ICONS.bookmark : FEED_ICONS.bookmarkOutline)));
  card.appendChild(eng);

  return card;
}

function _statTile(label, value) {
  return el('div', { class: 'feed-stat' },
    el('div', { class: 'feed-stat-label' }, label),
    el('div', { class: 'feed-stat-value' }, value || '—')
  );
}

/* ----- Create post modal ----- */
function openCreatePostModal(onPosted) {
  if (document.getElementById('feed-create-backdrop')) return;
  let type = 'general';

  const card = el('div', { class: 'brewlog-card', onclick: (e) => e.stopPropagation() });
  card.appendChild(el('div', { class: 'brewlog-head' },
    el('h2', { class: 'brewlog-title' }, 'Share with the community'),
    el('button', { type: 'button', class: 'brewlog-close', 'aria-label': 'Close', onclick: close }, _svgEl2(FEED_ICONS.close))
  ));

  // Type selector
  card.appendChild(el('div', { class: 'brewlog-label' }, 'TYPE'));
  const typeRow = el('div', { class: 'brewlog-pills' });
  FEED_TYPE_PILLS.forEach(t => {
    const pill = el('button', {
      type: 'button',
      class: 'brewlog-pill' + (t.key === type ? ' active' : ''),
      'data-key': t.key,
      onclick: () => {
        type = t.key;
        typeRow.querySelectorAll('.brewlog-pill').forEach(p => p.classList.toggle('active', p.dataset.key === t.key));
        recipeFields.style.display = type === 'recipe' ? 'block' : 'none';
        shopFields.style.display = type === 'shop' ? 'block' : 'none';
      }
    }, t.label);
    typeRow.appendChild(pill);
  });
  card.appendChild(typeRow);

  // Title
  card.appendChild(el('div', { class: 'brewlog-label' }, 'TITLE'));
  const titleInput = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'Give it a name…' });
  card.appendChild(titleInput);

  // Content
  card.appendChild(el('div', { class: 'brewlog-label' }, 'WHAT’S ON YOUR MIND?'));
  const contentTa = el('textarea', { class: 'brewlog-textarea', rows: '4', placeholder: 'Share the story behind your cup…' });
  card.appendChild(contentTa);

  // Recipe fields (hidden unless type=recipe)
  const recipeFields = el('div', { class: 'feed-cm-fields' });
  recipeFields.style.display = 'none';
  let recipeMethod = 'Pour-over';
  let recipeGrind = 'Medium-fine';
  recipeFields.appendChild(el('div', { class: 'brewlog-label' }, 'METHOD'));
  const rMethodRow = el('div', { class: 'brewlog-pills' });
  FEED_METHODS.forEach(m => {
    const pill = el('button', { type: 'button', class: 'brewlog-pill' + (m === recipeMethod ? ' active' : ''), 'data-m': m,
      onclick: () => {
        recipeMethod = m;
        rMethodRow.querySelectorAll('.brewlog-pill').forEach(p => p.classList.toggle('active', p.dataset.m === m));
      }}, m);
    rMethodRow.appendChild(pill);
  });
  recipeFields.appendChild(rMethodRow);
  recipeFields.appendChild(el('div', { class: 'brewlog-label' }, 'RATIO'));
  const ratioInput = el('input', { type: 'text', class: 'brewlog-input', placeholder: '1:16' });
  recipeFields.appendChild(ratioInput);
  recipeFields.appendChild(el('div', { class: 'brewlog-label' }, 'WATER TEMP (°F)'));
  const tempInput = el('input', { type: 'number', class: 'brewlog-input', value: '200', min: '60', max: '212' });
  recipeFields.appendChild(tempInput);
  recipeFields.appendChild(el('div', { class: 'brewlog-label' }, 'GRIND SIZE'));
  const rGrindRow = el('div', { class: 'brewlog-pills' });
  FEED_GRINDS.forEach(g => {
    const pill = el('button', { type: 'button', class: 'brewlog-pill' + (g === recipeGrind ? ' active' : ''), 'data-g': g,
      onclick: () => {
        recipeGrind = g;
        rGrindRow.querySelectorAll('.brewlog-pill').forEach(p => p.classList.toggle('active', p.dataset.g === g));
      }}, g);
    rGrindRow.appendChild(pill);
  });
  recipeFields.appendChild(rGrindRow);
  recipeFields.appendChild(el('div', { class: 'brewlog-label' }, 'INSTRUCTIONS'));
  const instrTa = el('textarea', { class: 'brewlog-textarea', rows: '3', placeholder: 'Bloom, pour, total time…' });
  recipeFields.appendChild(instrTa);
  card.appendChild(recipeFields);

  // Shop fields
  const shopFields = el('div', { class: 'feed-cm-fields' });
  shopFields.style.display = 'none';
  shopFields.appendChild(el('div', { class: 'brewlog-label' }, 'SHOP NAME'));
  const shopName = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'e.g., Stumptown Coffee' });
  shopFields.appendChild(shopName);
  shopFields.appendChild(el('div', { class: 'brewlog-label' }, 'CITY'));
  const shopCity = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'e.g., Portland' });
  shopFields.appendChild(shopCity);
  shopFields.appendChild(el('div', { class: 'brewlog-label' }, 'STATE'));
  const shopState = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'e.g., Oregon' });
  shopFields.appendChild(shopState);
  shopFields.appendChild(el('div', { class: 'brewlog-label' }, 'FEATURED BEAN'));
  const shopBean = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'e.g., Hair Bender' });
  shopFields.appendChild(shopBean);
  card.appendChild(shopFields);

  // Tags + photo
  card.appendChild(el('div', { class: 'brewlog-label' }, 'TAGS (comma-separated)'));
  const tagsInput = el('input', { type: 'text', class: 'brewlog-input', placeholder: 'pourover, ethiopia, fruity' });
  card.appendChild(tagsInput);
  card.appendChild(el('div', { class: 'brewlog-label' }, 'PHOTO URL (optional)'));
  const photoInput = el('input', { type: 'url', class: 'brewlog-input', placeholder: 'https://…' });
  card.appendChild(photoInput);

  // Submit
  card.appendChild(el('button', {
    class: 'brewlog-save',
    type: 'button',
    onclick: () => {
      const title = titleInput.value.trim();
      const content = contentTa.value.trim();
      if (!title && !content) {
        titleInput.style.borderColor = '#C9352F';
        setTimeout(() => { titleInput.style.borderColor = ''; }, 900);
        return;
      }
      const tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        type: type,
        title: title,
        content: content,
        tags: tags,
        photoUrl: photoInput.value.trim()
      };
      if (type === 'recipe') {
        payload.recipe = {
          method: recipeMethod,
          ratio: ratioInput.value.trim(),
          waterTempF: parseInt(tempInput.value, 10) || 200,
          grindSize: recipeGrind,
          instructions: instrTa.value.trim()
        };
      } else if (type === 'shop') {
        payload.shop = {
          name: shopName.value.trim(),
          city: shopCity.value.trim(),
          state: shopState.value.trim(),
          featuredBean: shopBean.value.trim()
        };
      }
      createBeanPost(payload);
      close();
      if (typeof onPosted === 'function') onPosted();
    }
  }, 'Post'));

  const backdrop = el('div', { id: 'feed-create-backdrop', class: 'brewlog-backdrop', onclick: close }, card);
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

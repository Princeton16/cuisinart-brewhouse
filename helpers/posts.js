/* helpers/posts.js — community feed CRUD, seeding, and filtering.
   Loaded after app.js. Plain global functions (no modules). */

const BEAN_POSTS_KEY = 'beanapp_posts';
const BEAN_KUDOS_KEY = 'beanapp_kudos';
const BEAN_BOOKMARKS_KEY = 'beanapp_bookmarks';
// Bumped to v2 — forces the new cast (Maya / Theo / Carla / etc.) to seed
// over old caches that still have JamminJeff, DataGodLeslie, etc.
const BEAN_POSTS_SEEDED_KEY = 'beanapp_posts_seeded_v2';

/* 8-color palette used to color new users' avatars when they post. */
const POST_AVATAR_PALETTE = ['#C99B1A', '#2D7A6B', '#8B4F2A', '#5B6FA5', '#3F5B8A', '#A04848', '#6B5FA8', '#4F7B5C'];

/* ----- Storage ----- */
function loadBeanPosts() {
  try { return JSON.parse(localStorage.getItem(BEAN_POSTS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveBeanPosts(arr) { localStorage.setItem(BEAN_POSTS_KEY, JSON.stringify(arr || [])); }

function loadBeanKudos() {
  try { return JSON.parse(localStorage.getItem(BEAN_KUDOS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveBeanKudos(arr) { localStorage.setItem(BEAN_KUDOS_KEY, JSON.stringify(arr || [])); }

function loadBeanBookmarks() {
  try { return JSON.parse(localStorage.getItem(BEAN_BOOKMARKS_KEY) || '[]') || []; }
  catch (_) { return []; }
}
function saveBeanBookmarks(arr) { localStorage.setItem(BEAN_BOOKMARKS_KEY, JSON.stringify(arr || [])); }

/* ----- Helpers ----- */
function deriveBeanHandle(name) {
  return '@' + String(name || 'you').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
}

function pickAvatarColor() {
  return POST_AVATAR_PALETTE[Math.floor(Math.random() * POST_AVATAR_PALETTE.length)];
}

function relativePostDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60000) return 'Just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  if (days < 30) return Math.floor(days / 7) + 'w ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ----- Seed (idempotent — only seeds when posts array is empty + flag absent) ----- */
function seedBeanPostsIfNeeded() {
  if (localStorage.getItem(BEAN_POSTS_SEEDED_KEY)) return;
  // First v2 run on a browser that already had the v1 cast cached:
  // wipe the stale posts so the new fake users overwrite cleanly.
  if (localStorage.getItem('beanapp_posts_seeded') && !localStorage.getItem(BEAN_POSTS_SEEDED_KEY)) {
    localStorage.removeItem(BEAN_POSTS_KEY);
    localStorage.removeItem('beanapp_posts_seeded');
  }
  if (loadBeanPosts().length > 0) return;
  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;
  const photo = (i) => [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80',
    'https://images.unsplash.com/photo-1516559828984-fb3b99548b21?w=600&q=80',
    'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=80',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80',
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80',
    'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&q=80'
  ][i];

  const seed = [
    {
      id: 'post001', authorHandle: '@maya.brews', authorName: 'Maya Okafor', authorTier: 'Pour Pro', authorAvatarColor: '#B68A1A',
      date: new Date(now - 1 * HOUR).toISOString(), type: 'recipe',
      title: 'Bright morning Yirgacheffe',
      content: 'Hands down my favorite weekday cup.',
      recipe: { ratio: '1:16', method: 'Pour-over', waterTempF: 202, grindSize: 'Medium-fine', instructions: '18g bloom 40g for 30s, three pours of 80g every 35s. Total time 3:15.' },
      tags: ['yirgacheffe', 'pourover', 'bright'], photoUrl: photo(2), kudosCount: 64, commentsCount: 9
    },
    {
      id: 'post002', authorHandle: '@theolin', authorName: 'Theo Lin', authorTier: 'Espresso Adept', authorAvatarColor: '#2D7A6B',
      date: new Date(now - 4 * HOUR).toISOString(), type: 'general',
      title: 'Pre-infusion is underrated',
      content: 'Four seconds at low pressure pulled out so much more sweetness from the Brazilian I had been writing off. Try it before you change anything else.',
      tags: ['espresso', 'preinfusion', 'tip'], photoUrl: photo(0), kudosCount: 38, commentsCount: 12
    },
    {
      id: 'post003', authorHandle: '@carlam', authorName: 'Carla Mendoza', authorTier: 'Cold Brew Captain', authorAvatarColor: '#3F5B8A',
      date: new Date(now - 7 * HOUR).toISOString(), type: 'recipe',
      title: 'Maple bourbon cold brew',
      content: '',
      recipe: { ratio: '1:8', method: 'Cold brew', waterTempF: 'Room temp', grindSize: 'Coarse', instructions: 'Steep 14 hours, finish with maple syrup and a tiny dash of bitters. Adult summer drink.' },
      tags: ['coldbrew', 'summer', 'sweet'], photoUrl: photo(4), kudosCount: 92, commentsCount: 18
    },
    {
      id: 'post004', authorHandle: '@devonpark', authorName: 'Devon Park', authorTier: 'Bean Scholar', authorAvatarColor: '#8B4F2A',
      date: new Date(now - 1 * DAY - 1 * HOUR).toISOString(), type: 'shop',
      title: 'Sey lived up to the hype',
      content: 'The Kenyan filter on the Mythos was something else. Tomato-bright, perfectly clean.',
      shop: { name: 'Sey Coffee', city: 'Brooklyn', state: 'New York', featuredBean: 'Karatu AA' },
      tags: ['sey', 'brooklyn', 'kenya'], photoUrl: photo(8), kudosCount: 71, commentsCount: 6
    },
    {
      id: 'post005', authorHandle: '@hanak', authorName: 'Hana Kim', authorTier: 'Latte Art Lead', authorAvatarColor: '#A04848',
      date: new Date(now - 1 * DAY - 5 * HOUR).toISOString(), type: 'general',
      title: 'Day 14 of 30-day pour challenge',
      content: 'Symmetry is finally clicking. Started 5oz pitcher week one and never looking back.',
      tags: ['latteart', 'challenge', 'tulip'], photoUrl: photo(5), kudosCount: 134, commentsCount: 22
    },
    {
      id: 'post006', authorHandle: '@arisingh', authorName: 'Ari Singh', authorTier: 'Coffee Sommelier', authorAvatarColor: '#6B5FA8',
      date: new Date(now - 2 * DAY - 1 * HOUR).toISOString(), type: 'recipe',
      title: 'Cardamom rose cortado',
      content: 'Floral, spicy, the small drink with the big finish.',
      recipe: { ratio: '1:2', method: 'Espresso', waterTempF: 200, grindSize: 'Fine', instructions: 'Steam whole milk with three crushed cardamom pods + a teaspoon of rosewater. Pour over a 36g double.' },
      tags: ['cortado', 'spiced', 'floral'], photoUrl: photo(7), kudosCount: 58, commentsCount: 11
    },
    {
      id: 'post007', authorHandle: '@skyler', authorName: 'Skyler Reyes', authorTier: 'Bean Curious', authorAvatarColor: '#5B6FA5',
      date: new Date(now - 2 * DAY - 6 * HOUR).toISOString(), type: 'general',
      title: 'First espresso that tasted like coffee',
      content: 'Week 2 of practice. Two months ago this was bitter sludge. Today: caramel and cherry. Keep going if you’re new.',
      tags: ['beginner', 'espresso', 'progress'], photoUrl: photo(1), kudosCount: 89, commentsCount: 17
    },
    {
      id: 'post008', authorHandle: '@quinnmoss', authorName: 'Quinn Moss', authorTier: 'Extraction Nerd', authorAvatarColor: '#2D4A3A',
      date: new Date(now - 3 * DAY).toISOString(), type: 'recipe',
      title: 'Aeropress inverted, light roast',
      content: '',
      recipe: { ratio: '1:14', method: 'Aeropress', waterTempF: 195, grindSize: 'Medium-fine', instructions: 'Bloom 30s with 50g, stir, top up to 240g, brew 75s, slow press over 30s.' },
      tags: ['aeropress', 'lightroast'], photoUrl: photo(6), kudosCount: 47, commentsCount: 5
    },
    {
      id: 'post009', authorHandle: '@raea', authorName: 'Rae Anderson', authorTier: 'Bean Scholar', authorAvatarColor: '#C99B1A',
      date: new Date(now - 3 * DAY - 5 * HOUR).toISOString(), type: 'shop',
      title: 'Devoción in Williamsburg',
      content: 'Bean-to-cup in fewer than 10 days from Colombia. You can taste the freshness.',
      shop: { name: 'Devoción', city: 'Brooklyn', state: 'New York', featuredBean: 'Madremonte' },
      tags: ['devocion', 'colombia', 'fresh'], photoUrl: photo(3), kudosCount: 33, commentsCount: 4
    },
    {
      id: 'post010', authorHandle: '@jbell', authorName: 'Jordan Bell', authorTier: 'Pour Pro', authorAvatarColor: '#5B6FA5',
      date: new Date(now - 4 * DAY).toISOString(), type: 'general',
      title: 'Grind size cheat sheet',
      content: 'If your brew tastes harsh and bitter, grind coarser. If it tastes sour and weak, grind finer. The right answer is in the cup, not the manual.',
      tags: ['grind', 'tip', 'beginner'], photoUrl: photo(9), kudosCount: 152, commentsCount: 31
    },
    {
      id: 'post011', authorHandle: '@miac', authorName: 'Mia Choi', authorTier: 'Cafe Hopper', authorAvatarColor: '#A04848',
      date: new Date(now - 5 * DAY).toISOString(), type: 'shop',
      title: 'Verve LA — Streetlevel never misses',
      content: 'Pulled twice. The second was even better. Crema for days.',
      shop: { name: 'Verve Coffee', city: 'Los Angeles', state: 'California', featuredBean: 'Streetlevel' },
      tags: ['verve', 'la', 'espresso'], photoUrl: photo(7), kudosCount: 44, commentsCount: 7
    },
    {
      id: 'post012', authorHandle: '@samvega', authorName: 'Sam Vega', authorTier: 'Bean Curious', authorAvatarColor: '#3F5B8A',
      date: new Date(now - 6 * DAY).toISOString(), type: 'recipe',
      title: 'Honey lavender latte',
      content: 'A garden in a glass.',
      recipe: { ratio: '1:2', method: 'Espresso', waterTempF: 200, grindSize: 'Fine', instructions: 'Infuse milk with a teaspoon of dried lavender for 10 minutes, strain, steam to 140°F. Drizzle of raw honey, double shot poured slow.' },
      tags: ['latte', 'lavender', 'sweet'], photoUrl: photo(5), kudosCount: 76, commentsCount: 14
    }
  ];
  saveBeanPosts(seed);
  localStorage.setItem(BEAN_POSTS_SEEDED_KEY, '1');
}

/* ----- Filter + search ----- */
function filterPosts(posts, filter, query) {
  let out = (posts || []).slice();
  if (filter === 'recipes') out = out.filter(p => p.type === 'recipe');
  else if (filter === 'shops') out = out.filter(p => p.type === 'shop');
  if (filter === 'trending') out.sort((a, b) => (b.kudosCount || 0) - (a.kudosCount || 0));
  else out.sort((a, b) => new Date(b.date) - new Date(a.date)); // 'new', 'recipes', 'shops' all sort by date desc
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    out = out.filter(p => {
      const haystack = [
        p.title || '',
        p.content || '',
        (p.tags || []).join(' '),
        p.shop ? p.shop.featuredBean || '' : '',
        p.shop ? p.shop.name || '' : '',
        p.authorName || '',
        p.authorHandle || ''
      ].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }
  return out;
}

/* ----- Mutations ----- */
function toggleKudos(postId) {
  const kudos = loadBeanKudos();
  const posts = loadBeanPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return false;
  const idx = kudos.indexOf(postId);
  let liked;
  if (idx >= 0) {
    kudos.splice(idx, 1);
    post.kudosCount = Math.max(0, (post.kudosCount || 0) - 1);
    liked = false;
  } else {
    kudos.push(postId);
    post.kudosCount = (post.kudosCount || 0) + 1;
    liked = true;
  }
  saveBeanKudos(kudos);
  saveBeanPosts(posts);
  // Mirror to Supabase so kudos counts are real across devices/users.
  if (window.BeanBackend && window.BeanBackend.ready() && window.BeanBackend.userId()) {
    window.BeanBackend.pushKudos(postId, liked).catch(() => {});
  }
  return liked;
}

function toggleBookmark(postId) {
  const arr = loadBeanBookmarks();
  const idx = arr.indexOf(postId);
  let bookmarked;
  if (idx >= 0) { arr.splice(idx, 1); bookmarked = false; }
  else { arr.push(postId); bookmarked = true; }
  saveBeanBookmarks(arr);
  if (window.BeanBackend && window.BeanBackend.ready() && window.BeanBackend.userId()) {
    window.BeanBackend.pushBookmark(postId, bookmarked).catch(() => {});
  }
  return bookmarked;
}

function createBeanPost(payload) {
  const user = (typeof getBeanUser === 'function') ? (getBeanUser() || { name: 'You' }) : { name: 'You' };
  const post = {
    id: 'post_' + Date.now(),
    authorHandle: deriveBeanHandle(user.name),
    authorName: user.name || 'You',
    authorTier: 'Bean Curious',
    authorAvatarColor: pickAvatarColor(),
    date: new Date().toISOString(),
    type: payload.type || 'general',
    title: payload.title || '',
    content: payload.content || '',
    tags: payload.tags || [],
    photoUrl: payload.photoUrl || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    kudosCount: 0,
    commentsCount: 0
  };
  if (payload.type === 'recipe') post.recipe = payload.recipe || {};
  if (payload.type === 'shop') post.shop = payload.shop || {};
  const posts = loadBeanPosts();
  posts.unshift(post);
  saveBeanPosts(posts);
  // Write-through to Supabase so the post is visible to other members
  // (and survives a localStorage clear). Fire-and-forget; the local cache
  // is already updated, so the feed renders instantly.
  if (window.BeanBackend && window.BeanBackend.ready() && window.BeanBackend.userId()) {
    window.BeanBackend.pushPost(post).catch(() => {});
  }
  return post;
}

/* Count of current user's own posts (used for Community Starter achievement). */
function userPostCount() {
  const user = (typeof getBeanUser === 'function') ? getBeanUser() : null;
  if (!user) return 0;
  const handle = deriveBeanHandle(user.name);
  return loadBeanPosts().filter(p => p.authorHandle === handle).length;
}

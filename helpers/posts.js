/* helpers/posts.js — community feed CRUD, seeding, and filtering.
   Loaded after app.js. Plain global functions (no modules). */

const BEAN_POSTS_KEY = 'beanapp_posts';
const BEAN_KUDOS_KEY = 'beanapp_kudos';
const BEAN_BOOKMARKS_KEY = 'beanapp_bookmarks';
const BEAN_POSTS_SEEDED_KEY = 'beanapp_posts_seeded';

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
  if (localStorage.getItem(BEAN_POSTS_SEEDED_KEY) || loadBeanPosts().length > 0) return;
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
      id: 'post001', authorHandle: '@JamminJeff', authorName: 'Jammin Jeff', authorTier: 'Bean Scholar', authorAvatarColor: '#C99B1A',
      date: new Date(now - 2 * HOUR).toISOString(), type: 'recipe',
      title: 'Saturday Morning Cortado',
      content: '',
      recipe: { ratio: '1:2', method: 'Espresso', waterTempF: 200, grindSize: 'Fine', instructions: 'Pull a 36g shot, steam 60ml whole milk to 140°F, pour gently.' },
      tags: ['cortado', 'espresso', 'weekend'], photoUrl: photo(0), kudosCount: 47, commentsCount: 8
    },
    {
      id: 'post002', authorHandle: '@DataGodLeslie', authorName: 'Data God Leslie', authorTier: 'Extraction Nerd', authorAvatarColor: '#2D7A6B',
      date: new Date(now - 5 * HOUR).toISOString(), type: 'general',
      title: 'Brew log update',
      content: 'Finally hit a 22% extraction with my new Encore. Worth every penny.',
      tags: ['extraction', 'grinder'], photoUrl: photo(1), kudosCount: 23, commentsCount: 3
    },
    {
      id: 'post003', authorHandle: '@PourOverPhil', authorName: 'Pour Over Phil', authorTier: 'Coffee Sommelier', authorAvatarColor: '#8B4F2A',
      date: new Date(now - 1 * DAY - 1 * HOUR).toISOString(), type: 'recipe',
      title: 'Hario V60 with Ethiopia',
      content: '',
      recipe: { ratio: '1:16', method: 'Pour-over', waterTempF: 200, grindSize: 'Medium-fine', instructions: '30g bloom for 30s, four pours of 80g every 30s. Total brew time 3:30.' },
      tags: ['pourover', 'ethiopia', 'fruity'], photoUrl: photo(2), kudosCount: 89, commentsCount: 14
    },
    {
      id: 'post004', authorHandle: '@ShopCrawlerSam', authorName: 'Shop Crawler Sam', authorTier: 'Bean Curious', authorAvatarColor: '#5B6FA5',
      date: new Date(now - 1 * DAY - 5 * HOUR).toISOString(), type: 'shop',
      title: 'Pilgrimage',
      content: 'First time. The bar is set.',
      shop: { name: 'Stumptown Coffee', city: 'Portland', state: 'Oregon', featuredBean: 'Hair Bender' },
      tags: ['stumptown', 'portland', 'espresso'], photoUrl: photo(3), kudosCount: 31, commentsCount: 5
    },
    {
      id: 'post005', authorHandle: '@ColdBrewCarla', authorName: 'Cold Brew Carla', authorTier: 'Cold Brew Captain', authorAvatarColor: '#3F5B8A',
      date: new Date(now - 2 * DAY - 1 * HOUR).toISOString(), type: 'recipe',
      title: '12-hour cold brew',
      content: '',
      recipe: { ratio: '1:8', method: 'Cold brew', waterTempF: 'Room temp', grindSize: 'Coarse', instructions: 'Steep 12 hours in fridge, dilute 1:1 over ice.' },
      tags: ['coldbrew', 'summer'], photoUrl: photo(4), kudosCount: 56, commentsCount: 9
    },
    {
      id: 'post006', authorHandle: '@MarcoLatte', authorName: 'Marco Latte', authorTier: 'Bean Scholar', authorAvatarColor: '#A04848',
      date: new Date(now - 2 * DAY - 5 * HOUR).toISOString(), type: 'general',
      title: 'Latte art update',
      content: 'Day 90 of practicing rosettas. Still mostly look like clouds.',
      tags: ['latteart', 'practice'], photoUrl: photo(5), kudosCount: 18, commentsCount: 12
    },
    {
      id: 'post007', authorHandle: '@RoastieToastie', authorName: 'Roastie Toastie', authorTier: 'Extraction Nerd', authorAvatarColor: '#6B5FA8',
      date: new Date(now - 3 * DAY - 1 * HOUR).toISOString(), type: 'recipe',
      title: 'Aeropress inverted',
      content: '',
      recipe: { ratio: '1:14', method: 'Aeropress', waterTempF: 185, grindSize: 'Medium', instructions: 'Bloom 30s, stir, brew 90s, press slow.' },
      tags: ['aeropress', 'travel'], photoUrl: photo(6), kudosCount: 67, commentsCount: 7
    },
    {
      id: 'post008', authorHandle: '@ShopCrawlerSam', authorName: 'Shop Crawler Sam', authorTier: 'Bean Curious', authorAvatarColor: '#5B6FA5',
      date: new Date(now - 3 * DAY - 5 * HOUR).toISOString(), type: 'shop',
      title: 'Mint Plaza pilgrimage',
      content: 'Iconic. The Gibraltar lives up.',
      shop: { name: 'Blue Bottle Coffee', city: 'San Francisco', state: 'California', featuredBean: 'Bella Donovan' },
      tags: ['bluebottle', 'gibraltar'], photoUrl: photo(7), kudosCount: 22, commentsCount: 2
    },
    {
      id: 'post009', authorHandle: '@PourOverPhil', authorName: 'Pour Over Phil', authorTier: 'Coffee Sommelier', authorAvatarColor: '#8B4F2A',
      date: new Date(now - 4 * DAY).toISOString(), type: 'general',
      title: 'Tasting notes',
      content: 'Today\'s bean: Costa Rica Tarrazu. Honey, almond, surprising stone fruit on the finish.',
      tags: ['tasting', 'costarica'], photoUrl: photo(8), kudosCount: 41, commentsCount: 6
    },
    {
      id: 'post010', authorHandle: '@JamminJeff', authorName: 'Jammin Jeff', authorTier: 'Bean Scholar', authorAvatarColor: '#C99B1A',
      date: new Date(now - 5 * DAY).toISOString(), type: 'shop',
      title: 'HQ visit',
      content: 'Took the cupping class. Worth the trip.',
      shop: { name: 'Counter Culture Coffee', city: 'Durham', state: 'North Carolina', featuredBean: 'Apollo' },
      tags: ['counterculture', 'cupping'], photoUrl: photo(9), kudosCount: 38, commentsCount: 4
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
  return liked;
}

function toggleBookmark(postId) {
  const arr = loadBeanBookmarks();
  const idx = arr.indexOf(postId);
  let bookmarked;
  if (idx >= 0) { arr.splice(idx, 1); bookmarked = false; }
  else { arr.push(postId); bookmarked = true; }
  saveBeanBookmarks(arr);
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
  return post;
}

/* Count of current user's own posts (used for Community Starter achievement). */
function userPostCount() {
  const user = (typeof getBeanUser === 'function') ? getBeanUser() : null;
  if (!user) return 0;
  const handle = deriveBeanHandle(user.name);
  return loadBeanPosts().filter(p => p.authorHandle === handle).length;
}

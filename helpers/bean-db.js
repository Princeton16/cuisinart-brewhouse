/* ============================================================
   helpers/bean-db.js — Supabase backend for the bean redesign
   ------------------------------------------------------------
   Sits on top of localStorage. localStorage stays the fast read cache;
   Supabase is the source of truth. On sign-in we hydrate the cache from
   Supabase. Every write does best-effort write-through. If the network
   or table is unreachable, we keep working — no UI freeze.

   Required Supabase tables (create in dashboard, with RLS so users can
   only read/write their own rows). All have a user_id uuid FK to auth.users:

     bean_brews
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       date timestamptz not null,
       method text, ratio text, water_temp_f int, grind_size text,
       bean_origin text, flavor_tags text[], rating int, notes text,
       created_at timestamptz default now()

     bean_visits
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       cafe_id text not null,
       date_iso timestamptz not null,
       rating int, notes text,
       custom_cafe jsonb,                -- if user added a cafe outside the curated list
       created_at timestamptz default now()

     bean_posts
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       type text default 'general',     -- 'general' | 'recipe' | 'shop'
       title text, content text,
       photo_url text, tags text[],
       recipe jsonb, shop jsonb,
       kudos_count int default 0, comments_count int default 0,
       created_at timestamptz default now()

     bean_kudos
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       post_id uuid references bean_posts not null,
       unique(user_id, post_id)

     bean_bookmarks
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       post_id uuid references bean_posts not null,
       unique(user_id, post_id)

     bean_lessons
       id uuid pk default gen_random_uuid(),
       user_id uuid references auth.users not null,
       lesson_id text not null,
       status text not null,            -- 'in-progress' | 'completed'
       updated_at timestamptz default now(),
       unique(user_id, lesson_id)
   ============================================================ */

window.BeanBackend = (function() {
  // sb is the supabase-js client created in db.js
  const supabase = window.sb || null;
  // Are we online with a usable client?
  function ready() { return !!supabase; }
  // Cache the current session user id so sync calls don't have to await each time.
  let currentUserId = null;
  function setUserId(id) { currentUserId = id || null; }
  function userId() { return currentUserId; }

  /* -------- AUTH -------- */
  async function bootstrap() {
    if (!ready()) return null;
    try {
      const { data } = await supabase.auth.getSession();
      const session = data && data.session;
      if (!session) return null;
      setUserId(session.user.id);
      // Hydrate the local user cache from Supabase + then pull data
      const meta = (session.user.user_metadata || {});
      const localUser = {
        id: session.user.id,
        email: session.user.email,
        name: meta.name || (session.user.email || '').split('@')[0],
        createdAt: new Date(session.user.created_at || Date.now()).getTime()
      };
      try { localStorage.setItem('beanapp_user', JSON.stringify(localUser)); } catch (_) {}
      // Pull all bean data into the local caches in parallel
      await Promise.all([
        hydrateBrews(session.user.id),
        hydrateVisits(session.user.id),
        hydratePosts()
      ]);
      return localUser;
    } catch (e) {
      console.warn('BeanBackend.bootstrap failed', e);
      return null;
    }
  }

  async function signUp(email, password, name) {
    if (!ready()) throw new Error('Backend unavailable');
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: { data: { name: name || '' } }
    });
    if (error) throw error;
    if (data && data.user) setUserId(data.user.id);
    return data;
  }

  async function signIn(email, password) {
    if (!ready()) throw new Error('Backend unavailable');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) throw error;
    if (data && data.user) {
      setUserId(data.user.id);
      // Hydrate caches in the background so the next page render shows server data
      Promise.all([
        hydrateBrews(data.user.id),
        hydrateVisits(data.user.id),
        hydratePosts()
      ]).catch(() => {});
    }
    return data;
  }

  async function signOut() {
    if (!ready()) return;
    try { await supabase.auth.signOut(); } catch (_) {}
    setUserId(null);
  }

  /* -------- BREWS -------- */
  async function hydrateBrews(uid) {
    if (!ready()) return;
    try {
      const { data, error } = await supabase
        .from('bean_brews')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false });
      if (error) throw error;
      // Translate server rows back to the bean app's brew shape.
      const brews = (data || []).map(r => ({
        id: r.id,
        date: r.date,
        method: r.method,
        ratio: r.ratio,
        waterTempF: r.water_temp_f,
        grindSize: r.grind_size,
        beanOrigin: r.bean_origin,
        flavorTags: r.flavor_tags || [],
        rating: r.rating,
        notes: r.notes
      }));
      localStorage.setItem('beanapp_brews', JSON.stringify(brews));
    } catch (e) {
      // Table might not exist yet; quietly fall back to local cache
      console.info('bean_brews hydrate skipped:', e && e.message);
    }
  }

  async function pushBrew(brew) {
    if (!ready() || !userId()) return null;
    try {
      const row = {
        user_id: userId(),
        date: brew.date || new Date().toISOString(),
        method: brew.method || null,
        ratio: brew.ratio || null,
        water_temp_f: typeof brew.waterTempF === 'number' ? brew.waterTempF : null,
        grind_size: brew.grindSize || null,
        bean_origin: brew.beanOrigin || null,
        flavor_tags: brew.flavorTags || [],
        rating: brew.rating || null,
        notes: brew.notes || null
      };
      const { data, error } = await supabase.from('bean_brews').insert(row).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.info('bean_brews push skipped:', e && e.message);
      return null;
    }
  }

  /* -------- VISITS -------- */
  async function hydrateVisits(uid) {
    if (!ready()) return;
    try {
      const { data, error } = await supabase
        .from('bean_visits')
        .select('*')
        .eq('user_id', uid)
        .order('date_iso', { ascending: false });
      if (error) throw error;
      const visits = (data || []).map(r => ({
        cafeId: r.cafe_id,
        dateISO: r.date_iso,
        rating: r.rating,
        notes: r.notes,
        userCafe: r.custom_cafe || null
      }));
      localStorage.setItem('beanapp_visits', JSON.stringify(visits));
    } catch (e) {
      console.info('bean_visits hydrate skipped:', e && e.message);
    }
  }

  async function pushVisit(visit) {
    if (!ready() || !userId()) return null;
    try {
      const row = {
        user_id: userId(),
        cafe_id: visit.cafeId,
        date_iso: visit.dateISO || new Date().toISOString(),
        rating: visit.rating || null,
        notes: visit.notes || null,
        custom_cafe: visit.userCafe || null
      };
      const { data, error } = await supabase.from('bean_visits').insert(row).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.info('bean_visits push skipped:', e && e.message);
      return null;
    }
  }

  /* -------- POSTS (FEED) -------- */
  async function hydratePosts() {
    if (!ready()) return;
    try {
      const { data, error } = await supabase
        .from('bean_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      const posts = (data || []).map(r => ({
        id: r.id,
        date: r.created_at,
        authorName: r.author_name || 'Member',
        authorHandle: r.author_handle || '@member',
        authorTier: r.author_tier || 'Bean Curious',
        authorAvatarColor: r.author_avatar_color || '#8B4F2A',
        type: r.type || 'general',
        title: r.title || '',
        content: r.content || '',
        photoUrl: r.photo_url || '',
        tags: r.tags || [],
        recipe: r.recipe || null,
        shop: r.shop || null,
        kudosCount: r.kudos_count || 0,
        commentsCount: r.comments_count || 0
      }));
      // Merge with any seed posts already in cache so the feed never flashes empty
      const cached = JSON.parse(localStorage.getItem('beanapp_posts') || '[]');
      const combined = mergeById(posts, cached);
      localStorage.setItem('beanapp_posts', JSON.stringify(combined));
    } catch (e) {
      console.info('bean_posts hydrate skipped:', e && e.message);
    }
  }

  async function pushPost(post) {
    if (!ready() || !userId()) return null;
    try {
      const row = {
        user_id: userId(),
        author_name: post.authorName || null,
        author_handle: post.authorHandle || null,
        author_tier: post.authorTier || null,
        author_avatar_color: post.authorAvatarColor || null,
        type: post.type || 'general',
        title: post.title || null,
        content: post.content || null,
        photo_url: post.photoUrl || null,
        tags: post.tags || [],
        recipe: post.recipe || null,
        shop: post.shop || null
      };
      const { data, error } = await supabase.from('bean_posts').insert(row).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.info('bean_posts push skipped:', e && e.message);
      return null;
    }
  }

  /* -------- KUDOS / BOOKMARKS -------- */
  async function pushKudos(postId, on) {
    if (!ready() || !userId()) return;
    try {
      if (on) {
        await supabase.from('bean_kudos').insert({ user_id: userId(), post_id: postId });
      } else {
        await supabase.from('bean_kudos').delete().eq('user_id', userId()).eq('post_id', postId);
      }
    } catch (e) { /* swallow — local state already updated */ }
  }
  async function pushBookmark(postId, on) {
    if (!ready() || !userId()) return;
    try {
      if (on) {
        await supabase.from('bean_bookmarks').insert({ user_id: userId(), post_id: postId });
      } else {
        await supabase.from('bean_bookmarks').delete().eq('user_id', userId()).eq('post_id', postId);
      }
    } catch (e) { /* swallow */ }
  }

  /* -------- LESSONS -------- */
  async function pushLesson(lessonId, status) {
    if (!ready() || !userId()) return;
    try {
      await supabase.from('bean_lessons').upsert({
        user_id: userId(),
        lesson_id: lessonId,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });
    } catch (e) { /* swallow */ }
  }

  /* -------- HELPERS -------- */
  function mergeById(authoritative, fallback) {
    const seen = new Set();
    const merged = [];
    authoritative.forEach(p => { if (p.id) { merged.push(p); seen.add(String(p.id)); } });
    fallback.forEach(p => { if (p.id && !seen.has(String(p.id))) merged.push(p); });
    return merged;
  }

  return {
    ready, userId, bootstrap,
    signUp, signIn, signOut,
    pushBrew, pushVisit, pushPost,
    pushKudos, pushBookmark, pushLesson
  };
})();

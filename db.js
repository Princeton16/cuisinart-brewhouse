/* ============================================================
   db.js — Supabase wrapper
   Centralizes all calls to the database. The rest of app.js
   should call functions here instead of touching supabase directly.
   ============================================================ */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const DB = {

  /* ---------------- Auth ---------------- */

  // Returns current session (null if signed out)
  async getSession() {
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  },

  // Returns current user object (id, email, etc.) or null
  async getUser() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  },

  // Subscribe to auth state changes
  onAuthChange(callback) {
    return sb.auth.onAuthStateChange((event, session) => callback(event, session));
  },

  // Magic-link sign-in: sends an email with a one-click login link.
  // No password required. Easiest auth UX for non-technical users.
  async signInWithEmail(email, name) {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: { name }
      }
    });
    if (error) throw error;
    return { success: true };
  },

  async signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  /* ---------------- Profiles ---------------- */

  async getProfile(userId) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, patch) {
    const { error } = await sb.from('profiles').update(patch).eq('id', userId);
    if (error) throw error;
  },

  // Get all profiles (for member directory + global leaderboard)
  async listProfiles() {
    const { data, error } = await sb.from('profiles').select('*').order('points', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  },

  /* ---------------- Brews ---------------- */

  async listBrews(userId) {
    const { data, error } = await sb.from('brews').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addBrew(userId, brew) {
    const row = {
      user_id: userId,
      date: brew.date || new Date().toISOString().slice(0, 10),
      time: brew.time || null,
      recipe_id: brew.recipe || null,
      bean_id: brew.bean || null,
      method: brew.method || null,
      rating: brew.rating || null,
      notes: brew.notes || null,
      flavors: brew.flavors || []
    };
    const { data, error } = await sb.from('brews').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async deleteBrew(brewId) {
    const { error } = await sb.from('brews').delete().eq('id', brewId);
    if (error) throw error;
  },

  /* ---------------- Follows / friends ---------------- */

  async listFollowing(userId) {
    const { data, error } = await sb.from('follows').select('followed_id').eq('follower_id', userId);
    if (error) throw error;
    return (data || []).map(r => r.followed_id);
  },

  async follow(followerId, followedId) {
    const { error } = await sb.from('follows').insert({ follower_id: followerId, followed_id: followedId });
    if (error) throw error;
  },

  async unfollow(followerId, followedId) {
    const { error } = await sb.from('follows').delete().eq('follower_id', followerId).eq('followed_id', followedId);
    if (error) throw error;
  },

  /* ---------------- Pours (latte art) ---------------- */

  async listPours() {
    const { data, error } = await sb.from('pours').select('*').order('votes', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  },

  async addPour(userId, pour) {
    const { data, error } = await sb.from('pours').insert({
      user_id: userId,
      pattern: pour.pattern,
      machine: pour.machine,
      notes: pour.notes,
      image_url: pour.image_url || null
    }).select().single();
    if (error) throw error;
    return data;
  },

  async votePour(userId, pourId) {
    const { error } = await sb.from('pour_votes').insert({ user_id: userId, pour_id: pourId });
    if (error) throw error;
    // Increment count on the pour
    await sb.rpc('increment_pour_votes', { p_pour_id: pourId }).catch(() => {});
  },

  async unvotePour(userId, pourId) {
    const { error } = await sb.from('pour_votes').delete().eq('user_id', userId).eq('pour_id', pourId);
    if (error) throw error;
  },

  /* ---------------- Leaderboards ---------------- */

  async globalLeaderboard(limit = 25) {
    const { data, error } = await sb.from('profiles').select('id, name, tier, points, streak').order('points', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  async friendsLeaderboard(userId) {
    const followIds = await DB.listFollowing(userId);
    if (!followIds.length) return [];
    const { data, error } = await sb.from('profiles').select('id, name, tier, points, streak').in('id', followIds).order('points', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

/* ---------------- Virtual Barista (Claude-powered) ---------------- */
DB.askBarista = async function(vibes, profile) {
  const { data, error } = await sb.functions.invoke('barista-recommend', {
    body: { vibes: vibes || [], profile: profile || null }
  });
  if (error) throw error;
  return data;
};

window.DB = DB;
window.sb = sb;

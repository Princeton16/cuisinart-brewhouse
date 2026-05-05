/* helpers/achievements.js — 12 badges with their unlock conditions. */

const ACHIEVEMENTS = [
  { id: 'first-brew',      name: 'First Brew',         desc: 'Log your first brew.',                      icon: 'cup',     test: ctx => ctx.brews.length >= 1 },
  { id: 'streak-7',        name: '7-Day Streak',       desc: 'Brew 7 days in a row.',                     icon: 'flame',   test: ctx => ctx.currentStreak >= 7 },
  { id: 'streak-30',       name: '30-Day Streak',      desc: 'Brew 30 days in a row.',                    icon: 'fire',    test: ctx => ctx.currentStreak >= 30 },
  { id: 'recipe-week',     name: 'Recipe of the Week', desc: 'Rate a brew 5 stars.',                      icon: 'star',    test: ctx => ctx.brews.some(b => b.rating === 5) },
  { id: 'cold-brew',       name: 'Cold Brew Champion', desc: 'Log 5 cold brews.',                         icon: 'snow',    test: ctx => ctx.brews.filter(b => b.method === 'Cold brew').length >= 5 },
  { id: 'taster',          name: 'Certified Taster',   desc: 'Log 20 brews with flavor notes.',           icon: 'palate',  test: ctx => ctx.brews.filter(b => (b.flavorTags || []).length > 0).length >= 20 },
  { id: 'community',       name: 'Community Starter',  desc: 'Share your first post with the community.', icon: 'people',  test: ctx => ctx.userPosts >= 1 },
  { id: 'kudos-100',       name: '100 Kudos Given',    desc: 'Give kudos to 100 posts.',                  icon: 'heart',   test: ctx => ctx.kudosGiven >= 100 },
  { id: 'bean-explorer',   name: 'Bean Explorer',      desc: 'Try 5 unique bean origins.',                icon: 'globe',   test: ctx => ctx.uniqueOrigins >= 5 },
  { id: 'palate-refined',  name: 'Palate Refined',     desc: 'Cover 5 flavor dimensions in your brews.',  icon: 'spectrum',test: ctx => ctx.palateCoverage >= 5 },
  { id: 'espresso-expert', name: 'Espresso Expert',    desc: 'Pull 10 espresso shots.',                   icon: 'espresso',test: ctx => ctx.brews.filter(b => b.method === 'Espresso').length >= 10 },
  { id: 'sommelier',       name: 'The Sommelier',      desc: 'Reach the Coffee Sommelier tier (1500 XP).',icon: 'crown',   test: ctx => ctx.xp >= 1500 }
];

const ACHIEVEMENT_ICONS = {
  cup:      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 9 h12 v5 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 Z"/><path d="M17 11 a3 3 0 0 1 0 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  flame:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 Q 17 9 17 13 a5 5 0 0 1 -10 0 Q 7 11 9 9 Q 9 11 11 11 Q 11 7 12 3 Z"/></svg>',
  fire:     '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 Q 18 8 17 14 a5 5 0 0 1 -10 0 Q 6 9 12 2 Z"/><path d="M12 12 Q 14 14 13 17 a2 2 0 0 1 -2 0 Q 10 14 12 12 Z" fill="rgba(0,0,0,0.2)"/></svg>',
  star:     '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 16 L7 19 L9 13 L4 9 L10 9 Z"/></svg>',
  snow:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3 v18 M3 12 h18 M5 5 l14 14 M5 19 l14 -14"/></svg>',
  palate:   '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="9" r="3"/><circle cx="15" cy="14" r="2.5" opacity="0.7"/><circle cx="8" cy="16" r="1.8" opacity="0.5"/></svg>',
  people:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20 a6 6 0 0 1 12 0"/><path d="M14 20 a4 4 0 0 1 7 0"/></svg>',
  heart:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20 L4 12 a4 4 0 0 1 8 -3 a4 4 0 0 1 8 3 Z"/></svg>',
  globe:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12 h18"/><path d="M12 3 a13 13 0 0 1 0 18 a13 13 0 0 1 0 -18 Z"/></svg>',
  spectrum: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="11" width="3" height="9" rx="1"/><rect x="7.5" y="8" width="3" height="12" rx="1" opacity="0.85"/><rect x="12" y="5" width="3" height="15" rx="1" opacity="0.7"/><rect x="16.5" y="9" width="3" height="11" rx="1" opacity="0.55"/></svg>',
  espresso: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 9 h11 v6 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 Z"/><path d="M11 4 q-2 2 0 4 m4 -4 q-2 2 0 4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
  crown:    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8 L7 14 L12 6 L17 14 L21 8 L20 18 H4 Z"/></svg>'
};

function computeAchievements(brews, currentStreakVal, palateCoverageVal, uniqueOriginsVal, userPostsVal, kudosGivenVal, xpVal) {
  const ctx = {
    brews: brews || [],
    currentStreak: currentStreakVal || 0,
    palateCoverage: palateCoverageVal || 0,
    uniqueOrigins: uniqueOriginsVal || 0,
    userPosts: userPostsVal || 0,
    kudosGiven: kudosGivenVal || 0,
    xp: xpVal || 0
  };
  return ACHIEVEMENTS.map(a => ({
    id: a.id,
    name: a.name,
    desc: a.desc,
    icon: a.icon,
    locked: !!a.locked,
    unlocked: a.locked ? false : !!a.test(ctx)
  }));
}

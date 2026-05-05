/* helpers/palate.js — flavor-tag aggregation for the Palate Snapshot card. */

const PALATE_DIMENSIONS = ['sweet', 'chocolatey', 'nutty', 'fruity', 'floral'];

function computePalate(brews) {
  // Returns:
  //   { dimensions: [{ key, label, count, pct }, ...],
  //     topMethod: 'Pour-over' | null,
  //     favoriteBean: 'Ethiopia Yirgacheffe' | null,
  //     coverage: number-of-dimensions-with-any-tags }
  if (!brews || !brews.length) {
    return {
      dimensions: PALATE_DIMENSIONS.map(k => ({ key: k, label: k, count: 0, pct: 0 })),
      topMethod: null,
      favoriteBean: null,
      coverage: 0
    };
  }

  // Tag counts (across all flavorTags)
  const tagCounts = {};
  PALATE_DIMENSIONS.forEach(d => { tagCounts[d] = 0; });
  brews.forEach(b => {
    (b.flavorTags || []).forEach(t => {
      const k = String(t).toLowerCase();
      if (k in tagCounts) tagCounts[k] += 1;
    });
  });

  const max = Math.max(1, ...PALATE_DIMENSIONS.map(d => tagCounts[d]));
  const dimensions = PALATE_DIMENSIONS.map(d => ({
    key: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
    count: tagCounts[d],
    pct: Math.round((tagCounts[d] / max) * 100)
  }));
  const coverage = dimensions.filter(d => d.count > 0).length;

  // Top method
  const methodCounts = {};
  brews.forEach(b => {
    if (!b.method) return;
    methodCounts[b.method] = (methodCounts[b.method] || 0) + 1;
  });
  const topMethod = Object.keys(methodCounts).sort((a, b) => methodCounts[b] - methodCounts[a])[0] || null;

  // Favorite bean: highest avg rating, tiebreak by count
  const beanGroups = {};
  brews.forEach(b => {
    if (!b.beanOrigin) return;
    const g = beanGroups[b.beanOrigin] || (beanGroups[b.beanOrigin] = { sum: 0, count: 0 });
    g.sum += (b.rating || 0);
    g.count += 1;
  });
  const beanList = Object.keys(beanGroups).map(name => ({
    name,
    avg: beanGroups[name].sum / beanGroups[name].count,
    count: beanGroups[name].count
  })).sort((a, b) => (b.avg - a.avg) || (b.count - a.count));
  const favoriteBean = beanList.length ? beanList[0].name : null;

  return { dimensions, topMethod, favoriteBean, coverage };
}

function uniqueBeanOrigins(brews) {
  const set = new Set();
  (brews || []).forEach(b => { if (b.beanOrigin) set.add(b.beanOrigin); });
  return set.size;
}

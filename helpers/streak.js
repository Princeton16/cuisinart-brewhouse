/* helpers/streak.js — streak math for the Bean redesign.
   Loaded after app.js and data.js. Plain global functions (no modules). */

function _ymd(d) {
  // Local-time YYYY-MM-DD (so "today" matches the user's calendar day)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _brewDayKeys(brews) {
  const set = new Set();
  (brews || []).forEach(b => {
    if (!b || !b.date) return;
    const d = new Date(b.date);
    if (isNaN(d)) return;
    set.add(_ymd(d));
  });
  return set;
}

function currentStreak(brews) {
  const days = _brewDayKeys(brews);
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 366; i++) {
    if (days.has(_ymd(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // No brew today — streak counts up to yesterday only if yesterday has one.
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(_ymd(cursor))) return 0;
    } else {
      break;
    }
  }
  return streak;
}

function bestStreak(brews) {
  const days = _brewDayKeys(brews);
  if (days.size === 0) return 0;
  // Sort ascending and walk consecutive runs
  const sorted = Array.from(days).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur - prev) / 86400000);
    if (diff === 1) { run += 1; best = Math.max(best, run); }
    else { run = 1; }
  }
  return best;
}

function last7DayCells(brews) {
  // Returns 7 cells from 6 days ago through today, with letter + brewed flag.
  const days = _brewDayKeys(brews);
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat indexed by Date#getDay
  const cells = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    cells.push({
      letter: letters[d.getDay()],
      key: _ymd(d),
      brewed: days.has(_ymd(d)),
      isToday: i === 0
    });
  }
  return cells;
}

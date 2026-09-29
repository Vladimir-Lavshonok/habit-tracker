/* ============================================================
   CORE — dates, data model, storage, deterministic calculations
   ============================================================ */
'use strict';

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nowIso = () => new Date().toISOString();
const pct = x => (x == null || !isFinite(x)) ? '—' : Math.round(x) + '%';
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? many : b === 1 ? one : (b >= 2 && b <= 4) ? few : many; };
const HEX = /^#[0-9A-Fa-f]{6}$/;
const safeColor = c => HEX.test(c || '') ? c : '#4D6B32';

/* ---------- dates (all as local 'YYYY-MM-DD' strings) ---------- */
const pad2 = n => String(n).padStart(2, '0');
const toDs = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const fromDs = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = fromDs(s); d.setDate(d.getDate() + n); return toDs(d); };
const diffDays = (a, b) => Math.round((fromDs(b) - fromDs(a)) / 86400000); // b − a
const dow = s => (fromDs(s).getDay() + 6) % 7;                             // 0 = Пн … 6 = Вс
const isValidDs = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && toDs(fromDs(s)) === s;
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DOW_S = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const DOW_L = ['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
const fmtDate = s => { const d = fromDs(s); return d.getDate() + ' ' + MONTHS_G[d.getMonth()]; };
const fmtDateLong = s => { const d = fromDs(s); const w = DOW_L[dow(s)]; return w[0].toUpperCase() + w.slice(1) + ', ' + d.getDate() + ' ' + MONTHS_G[d.getMonth()] + ' ' + d.getFullYear(); };

/* "Today" and "now" follow the active profile's timezone. */
function tzParts(tz) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  } catch (e) { const d = new Date(); return { date: toDs(d), time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }; }
}
const today = () => tzParts(activeProfile() && activeProfile().timezone).date;
const nowTime = () => tzParts(activeProfile() && activeProfile().timezone).time;
const tmin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const mint = m => pad2(Math.floor(m / 60) % 24) + ':' + pad2(Math.round(m % 60));
/* first day of the week containing `s`; weekStart 1 = Monday, 0 = Sunday */
const weekStartOf = (s, ws) => addDays(s, -((fromDs(s).getDay() - (ws === 0 ? 0 : 1) + 7) % 7));

/* ---------- reference data ---------- */
const ACCENTS = {
  forest:   { name: 'Лесной',   l: '#4D6B32', d: '#8DB765' },
  sage:     { name: 'Шалфей',   l: '#6A8A58', d: '#A3C08F' },
  indigo:   { name: 'Индиго',   l: '#4F46E5', d: '#8B85F5' },
  sky:      { name: 'Небесный', l: '#2F76B0', d: '#7FB2E0' },
  peach:    { name: 'Персик',   l: '#B8622E', d: '#E8A176' },
  rose:     { name: 'Роза',     l: '#B8445F', d: '#E78CA0' },
  lavender: { name: 'Лаванда',  l: '#6E55BD', d: '#AC98E8' }
};
const HABIT_COLORS = ['#5B9BD5', '#6E8B4E', '#E0662F', '#D9534F', '#8B78C7', '#C99A2E', '#3E9A8E', '#C0507A'];
/* Categorical order for category charts (fixed, never cycled). */
const CAT_COLORS = ['#5E8A3A', '#D9A43A', '#4F83B8', '#D9735A', '#8B78C7', '#3E9A8E', '#B35C8A', '#8C8A6E', '#A7A399'];
const DEFAULT_CATEGORIES = ['Здоровье', 'Спорт', 'Развитие', 'Осознанность', 'Питание', 'Сон', 'Работа', 'Финансы', 'Другое'];
const WIDGETS = { stats: 'Карточки показателей', today: 'Мои привычки на сегодня', week: 'Прогресс недели', goal: 'Моя цель', forecast: 'Прогноз выполнения', quote: 'Мотивационная цитата' };
const QUOTES = ['Маленькие шаги создают большие перемены', 'Сегодня лучше, чем вчера', 'Дисциплина сегодня — свобода завтра', 'Постоянство важнее скорости', 'Один пропуск не отменяет ваш прогресс', 'Лучше каждый день'];
const DIFF = { easy: { name: 'Лёгкая', k: 1.0 }, medium: { name: 'Средняя', k: 1.2 }, hard: { name: 'Сложная', k: 1.5 } };
const STATUS_NAMES = { completed: 'Выполнено', failed: 'Нарушение', skipped: 'Пропуск', excused: 'Уважительная причина' };

/* ---------- application state ---------- */
const S = {
  meta: null,           // profiles + settings
  habits: {},           // profileId -> Habit[]
  goals: {},            // profileId -> Goal[]
  logs: {},             // profileId -> { habitId -> { date -> Log } }
  storage: 'loading',   // 'local' | 'memory'
  demo: false,          // example data not yet saved
  ver: 0                // bumps on every mutation (invalidates caches)
};
function defaultSettings() {
  return {
    theme: 'system', accent: 'forest', density: 'comfortable', fontSize: 15,
    appName: 'Трекер привычек', greeting: 'Продолжаем двигаться к лучшей версии себя',
    widgets: Object.keys(WIDGETS).map(id => ({ id, visible: true })),
    remindersEnabled: true, quietEnabled: true, quietStart: '22:30', quietEnd: '07:00',
    categories: DEFAULT_CATEGORIES.slice(), quoteIndex: 0
  };
}
function newProfile(p) {
  const t = nowIso();
  let tz = 'Europe/Moscow'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
  return Object.assign({ id: uid('p'), name: '', emoji: '🌿', color: '#6E8B4E', timezone: tz, weekStart: 1, motto: 'Лучше, чем вчера!', createdAt: t, updatedAt: t }, p || {});
}
const activeProfile = () => S.meta && (S.meta.profiles.find(p => p.id === S.meta.activeProfileId) || S.meta.profiles[0]);
const pid = () => activeProfile().id;
const habitsOf = (p = pid()) => S.habits[p] || (S.habits[p] = []);
const goalsOf = (p = pid()) => S.goals[p] || (S.goals[p] = []);
const logsOf = (p = pid()) => S.logs[p] || (S.logs[p] = {});
const activeHabits = () => habitsOf().filter(h => !h.archived);
const habitById = id => habitsOf().find(h => h.id === id);
const getLog = (h, d) => { const m = logsOf()[h.id]; return m ? m[d] : undefined; };
const settings = () => S.meta.settings;

/* ---------- storage ----------
   Everything is stored on this device (browser localStorage), nothing is sent anywhere.
   Documents: "meta" · "p-<profile>" (habits, goals) · "l-<profile>-<YYYY-MM>" (logs of a month).
   The whole map is written as one JSON value; export/import moves it between devices. */
const Store = {
  dirty: new Set(), removed: new Set(), known: new Set(), timer: null, lastError: null,
  LS: 'habit-tracker:v1',
  async load() {
    let docs;
    S.storage = 'local';
    try { docs = JSON.parse(localStorage.getItem(this.LS) || 'null') || {}; } catch (e) { docs = {}; S.storage = 'memory'; }
    // ask the browser not to evict the data under storage pressure (granted silently for installed apps)
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(ok => { S.persisted = ok; }); } catch (e) {}
    this.known = new Set(Object.keys(docs));
    return docs;
  },
  /* Build document map from state. */
  docsFromState() {
    const out = { meta: JSON.parse(JSON.stringify(S.meta)) };
    for (const p of S.meta.profiles) {
      out['p-' + p.id] = { habits: habitsOf(p.id), goals: goalsOf(p.id) };
      const byMonth = {};
      const L = logsOf(p.id);
      for (const hid in L) for (const d in L[hid]) {
        const m = d.slice(0, 7), key = 'l-' + p.id + '-' + m;
        ((byMonth[key] = byMonth[key] || { logs: {} }).logs[hid] = byMonth[key].logs[hid] || {})[d] = L[hid][d];
      }
      Object.assign(out, byMonth);
    }
    return out;
  },
  mark(keys) { (Array.isArray(keys) ? keys : [keys]).forEach(k => { this.dirty.add(k); this.removed.delete(k); }); this.schedule(); },
  markAll() { this.mark(Object.keys(this.docsFromState())); },
  remove(k) { this.removed.add(k); this.dirty.delete(k); this.schedule(); },
  schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 400); },
  flush() {
    if (S.demo) return;                       // example data is never saved until the user acts
    this.dirty.clear(); this.removed.clear();
    if (S.storage !== 'local') return;
    try { localStorage.setItem(this.LS, JSON.stringify(this.docsFromState())); this.lastError = null; }
    catch (e) {
      console.error(e); this.lastError = e;
      toast(e && e.name === 'QuotaExceededError' ? 'Память браузера заполнена. Экспортируйте данные и удалите старые привычки.' : 'Не удалось сохранить изменения на этом устройстве.');
    }
  }
};
/* Parse stored docs into state; returns false when there is nothing stored yet. */
function applyDocs(docs) {
  if (!docs || !docs.meta || !Array.isArray(docs.meta.profiles) || !docs.meta.profiles.length) return false;
  S.meta = docs.meta;
  S.meta.settings = Object.assign(defaultSettings(), S.meta.settings || {});
  const ws = S.meta.settings.widgets.filter(w => WIDGETS[w.id]);
  Object.keys(WIDGETS).forEach(id => { if (!ws.find(w => w.id === id)) ws.push({ id, visible: true }); });
  S.meta.settings.widgets = ws;
  S.habits = {}; S.goals = {}; S.logs = {};
  for (const k in docs) {
    if (k.startsWith('p-')) { const p = k.slice(2); S.habits[p] = docs[k].habits || []; S.goals[p] = docs[k].goals || []; }
    else if (k.startsWith('l-')) {
      const p = k.slice(2, k.length - 8), L = S.logs[p] = S.logs[p] || {};
      const src = docs[k].logs || {};
      for (const hid in src) L[hid] = Object.assign(L[hid] || {}, src[hid]);
    }
  }
  return true;
}
/* Every mutation goes through commit(): bump version, persist the touched docs, re-render. */
function commit(keys) {
  S.ver++;
  if (S.demo || keys === 'all') { S.demo = false; Store.markAll(); }
  else Store.mark(keys || ['meta', 'p-' + pid()]);
  render();
}
const logKey = d => 'l-' + pid() + '-' + d.slice(0, 7);

/* ---------- scheduling ---------- */
/* recurrence.type: daily | weekdays (days: 0=Пн…6=Вс) | interval (every N days from start) | timesPerWeek (X times in a week) */
function isScheduled(h, d) {
  if (d < h.startDate) return false;
  const r = h.recurrence || { type: 'daily' };
  switch (r.type) {
    case 'weekdays': return (r.weekdays || []).includes(dow(d));
    case 'interval': return diffDays(h.startDate, d) % Math.max(1, r.intervalDays || 1) === 0;
    default: return true; // daily and timesPerWeek (any day is eligible)
  }
}
const isWeekly = h => h.recurrence && h.recurrence.type === 'timesPerWeek';
function recurrenceText(h) {
  const r = h.recurrence || {};
  if (r.type === 'weekdays') { const w = (r.weekdays || []).slice().sort(); return w.length === 5 && w.every((x, i) => x === i) ? 'По будням' : w.map(i => DOW_S[i]).join(', '); }
  if (r.type === 'interval') return 'Каждые ' + r.intervalDays + ' ' + plural(r.intervalDays, 'день', 'дня', 'дней');
  if (r.type === 'timesPerWeek') return r.timesPerWeek + ' ' + plural(r.timesPerWeek, 'раз', 'раза', 'раз') + ' в неделю';
  return 'Ежедневно';
}
const partOfDay = t => { const m = tmin(t); if (m == null) return ''; return m < 12 * 60 ? 'Утро' : m < 17 * 60 ? 'День' : 'Вечер'; };

/* ---------- outcome of one habit on one day ----------
   success  — build: status completed (value ≥ goal); quit: occurrences ≤ dailyTargetMax
   fail     — failed / skipped, or a past scheduled day without a mark
   excused  — excluded from the denominator and never breaks a streak
   pending  — today, not marked yet (day is not over)                                  */
function outcome(h, d, td) {
  const l = getLog(h, d);
  if (l && l.s === 'completed') return 'success';
  if (l && l.s === 'excused') return 'excused';
  if (l && (l.s === 'failed' || l.s === 'skipped')) return 'fail';
  if (d >= td) return 'pending';
  return 'fail';
}
const isSuccessLog = l => !!l && l.s === 'completed';

/* ---------- per-habit analytics (memoized per state version) ---------- */
const _cache = new Map();
function memo(key, fn) { const k = S.ver + '|' + today() + '|' + key; if (_cache.has(k)) return _cache.get(k); if (_cache.size > 4000) _cache.clear(); const v = fn(); _cache.set(k, v); return v; }

/* Streaks, points and binary series for EWMA.
   Fixed schedules: walk scheduled dates forward; success → run+1, excused → no change,
   fail → run = 0, pending today → no change. Best = max run.
   X-per-week: a week is successful when successes ≥ X; the current unfinished week never breaks the run.
   Points: 10 × difficulty multiplier + min(5, floor(run/7)) per success. Nothing is ever subtracted. */
function habitCore(h) {
  return memo('core:' + h.id, () => {
    const td = today(), k = (DIFF[h.difficulty] || DIFF.medium).k, ws = activeProfile().weekStart;
    let run = 0, best = 0, points = 0, total = 0, lastSuccess = null; const series = [];
    if (h.startDate > td) return { current: 0, best: 0, points: 0, total: 0, lastSuccess: null, series, unit: isWeekly(h) ? 'нед.' : 'дн.' };
    if (isWeekly(h)) {
      const X = h.recurrence.timesPerWeek || 1;
      let w = weekStartOf(h.startDate, ws); const cur = weekStartOf(td, ws);
      while (w <= cur) {
        let cnt = 0;
        for (let i = 0; i < 7; i++) { const d = addDays(w, i); if (d < h.startDate || d > td) continue; if (isSuccessLog(getLog(h, d))) { cnt++; total++; lastSuccess = d; } }
        const met = cnt >= X;
        if (met) { run++; series.push(1); } else if (w < cur) { run = 0; series.push(0); }
        best = Math.max(best, run);
        points += Math.min(cnt, X) * 10 * k + (met ? Math.min(5, run) : 0);
        w = addDays(w, 7);
      }
      return { current: run, best, points: Math.round(points), total, lastSuccess, series, unit: 'нед.' };
    }
    for (let d = h.startDate; d <= td; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      const o = outcome(h, d, td);
      if (o === 'success') { run++; total++; lastSuccess = d; series.push(1); points += 10 * k + Math.min(5, Math.floor(run / 7)); }
      else if (o === 'fail') { run = 0; series.push(0); }
      best = Math.max(best, run);
    }
    return { current: run, best, points: Math.round(points), total, lastSuccess, series, unit: 'дн.' };
  });
}

/* CompletionRate = completed / eligible × 100, eligible = scheduled − excused.
   Today counts only once it has a mark. X-per-week: each finished week contributes X to the
   denominator (prorated for the first week), successes are capped at X per week. */
function habitRate(h, from, to) {
  return memo('rate:' + h.id + from + to, () => {
    const td = today(); to = to > td ? td : to;
    let completed = 0, eligible = 0, excused = 0, failed = 0;
    if (from < h.startDate) from = h.startDate;
    if (from > to) return { completed, eligible, excused, failed, rate: null };
    if (isWeekly(h)) {
      const X = h.recurrence.timesPerWeek || 1, ws = activeProfile().weekStart;
      for (let w = weekStartOf(from, ws); w <= to; w = addDays(w, 7)) {
        let cnt = 0, days = 0;
        for (let i = 0; i < 7; i++) { const d = addDays(w, i); if (d < from || d > to) continue; days++; if (isSuccessLog(getLog(h, d))) cnt++; }
        const capped = Math.min(cnt, X);
        const weekOver = addDays(w, 6) < td;
        const target = weekOver ? Math.min(X, Math.ceil(X * days / 7)) : capped; // unfinished week can't lower the rate
        completed += Math.min(capped, Math.max(target, capped)); eligible += Math.max(target, capped); failed += Math.max(0, target - capped);
      }
    } else {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (!isScheduled(h, d)) continue;
        const o = outcome(h, d, td);
        if (o === 'pending') continue;
        if (o === 'excused') { excused++; continue; }
        eligible++; if (o === 'success') completed++; else failed++;
      }
    }
    return { completed, eligible, excused, failed, rate: eligible ? completed / eligible * 100 : null };
  });
}

/* EWMA: S_t = α·x_t + (1−α)·S_(t−1), α = 0.3, S_0 = x_0. Needs ≥ 7 observations. */
function ewma(series, alpha = 0.3) {
  if (!series || series.length < 7) return null;
  let s = series[0];
  for (let i = 1; i < series.length; i++) s = alpha * series[i] + (1 - alpha) * s;
  return s;
}
const forecast = h => ewma(habitCore(h).series);

/* PRIORITY 0–100 = 100 × (.35·I + .25·U + .20·R + .10·D + .10·P), all inputs normalised to 0…1:
   I importance (1–5), U urgency today, R = 1 − EWMA (0.5 when unknown), D days since last success (÷7, capped), P manual priority. */
function priorityScore(h) {
  const td = today(), I = (clamp(h.importance || 3, 1, 5) - 1) / 4;
  let U = 0;
  if (isScheduled(h, td) && !isDoneToday(h)) {
    const t = tmin(h.reminder && h.reminder.time || h.cue && h.cue.time), n = tmin(nowTime());
    U = t == null ? 0.5 : n >= t ? 1 : (t - n) <= 120 ? 0.8 : 0.5;
  }
  const e = forecast(h), R = e == null ? 0.5 : 1 - e;
  const ls = habitCore(h).lastSuccess, D = ls ? clamp(diffDays(ls, td) / 7, 0, 1) : 1;
  const P = { low: 0, medium: 0.5, high: 1 }[h.priority || 'medium'];
  return Math.round(100 * (0.35 * I + 0.25 * U + 0.20 * R + 0.10 * D + 0.10 * P));
}

/* Weekly habits stay on "today" until their quota for the week is met. */
function weekCount(h, d) { const ws = activeProfile().weekStart, w = weekStartOf(d, ws); let c = 0; for (let i = 0; i < 7; i++) if (isSuccessLog(getLog(h, addDays(w, i)))) c++; return c; }
function dueOn(h, d) {
  if (h.archived || !isScheduled(h, d)) return false;
  if (isWeekly(h)) { const l = getLog(h, d); return isSuccessLog(l) || weekCount(h, d) < (h.recurrence.timesPerWeek || 1); }
  return true;
}
const isDoneToday = h => isSuccessLog(getLog(h, today()));
const todayHabits = () => activeHabits().filter(h => dueOn(h, today()));

/* Day-level aggregate for charts / calendar: success ÷ eligible over fixed-schedule habits
   (+ weekly habits only on days they were done). */
function dayAgg(d, list) {
  const td = today(); let ok = 0, el = 0, bad = 0, sched = 0, pend = 0;
  for (const h of list) {
    if (!isScheduled(h, d)) continue;
    const l = getLog(h, d);
    if (isWeekly(h)) { if (isSuccessLog(l)) { ok++; el++; sched++; } continue; }
    sched++;
    const o = outcome(h, d, td);
    if (o === 'pending') { pend++; continue; }
    if (o === 'excused') continue;
    el++; if (o === 'success') ok++; else if (h.type === 'quit' && l && l.s === 'failed') bad++;
  }
  return { ok, el, bad, sched, pend, rate: el ? ok / el * 100 : null };
}
function periodRate(list, from, to) {
  let c = 0, e = 0; for (const h of list) { const r = habitRate(h, from, to); c += r.completed; e += r.eligible; }
  return { completed: c, eligible: e, rate: e ? c / e * 100 : null };
}
function totalPoints() { return habitsOf().reduce((s, h) => s + habitCore(h).points, 0); }

/* Goal progress: successes of linked habits since goal start ÷ target.
   Forecast: pace = successes in the last 14 days ÷ 14; days left = ceil(remaining ÷ pace). */
function goalStats(g) {
  const td = today(), hs = (g.habitIds || []).map(habitById).filter(Boolean);
  let done = 0, recent = 0; const from14 = addDays(td, -13);
  for (const h of hs) for (let d = g.startDate; d <= td; d = addDays(d, 1)) {
    if (isSuccessLog(getLog(h, d))) { done++; if (d >= from14) recent++; }
  }
  const target = Math.max(1, g.target || 1), remaining = Math.max(0, target - done);
  const span = Math.min(14, diffDays(g.startDate, td) + 1), pace = span > 0 ? recent / span : 0;
  const daysLeft = remaining === 0 ? 0 : pace > 0 ? Math.ceil(remaining / pace) : null;
  const dueToday = hs.filter(h => dueOn(h, td)); const doneToday = dueToday.filter(isDoneToday).length;
  return { habits: hs, done: Math.min(done, target), target, progress: Math.min(100, done / target * 100), daysLeft, pace, dueToday: dueToday.length, doneToday };
}

/* Median completion time of the last 14 successes (needs ≥ 10) — used for adaptive reminders. */
function medianTime(h) {
  const L = logsOf()[h.id] || {};
  const times = Object.keys(L).sort().reverse().map(d => L[d]).filter(l => isSuccessLog(l) && tmin(l.t) != null).slice(0, 14).map(l => tmin(l.t));
  if (times.length < 10) return null;
  times.sort((a, b) => a - b);
  const m = times.length % 2 ? times[(times.length - 1) / 2] : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
  return mint(Math.round(m / 5) * 5);
}
/* Quiet hours: supports overnight windows (start > end, e.g. 22:30–07:00). */
function inQuiet(t) {
  const st = settings(); if (!st.quietEnabled) return false;
  const a = tmin(st.quietStart), b = tmin(st.quietEnd), x = tmin(t);
  if (a == null || b == null || x == null || a === b) return false;
  return a < b ? (x >= a && x < b) : (x >= a || x < b);
}

/* ---------- mutations on logs ---------- */
function setLog(h, d, patch) {
  const L = logsOf(); const m = L[h.id] = L[h.id] || {};
  const cur = m[d] || {};
  const next = Object.assign({}, cur, patch, { u: nowIso() });
  Object.keys(next).forEach(k => next[k] === undefined && delete next[k]);
  if (!next.s && !next.v && !next.o && !next.n) delete m[d]; else m[d] = next;
  commit([logKey(d)]);
}
function toggleDone(h, d) {
  const l = getLog(h, d);
  if (isSuccessLog(l)) setLog(h, d, { s: undefined, v: h.type === 'build' ? undefined : l.v, t: undefined });
  else setLog(h, d, h.type === 'quit' ? { s: 'completed', o: (l && l.o) || 0, t: nowTime() } : { s: 'completed', v: h.goal || 1, t: nowTime() });
}
function addValue(h, d, delta) {
  const l = getLog(h, d) || {}; const v = clamp(Math.round(((l.v || 0) + delta) * 100) / 100, 0, 100000);
  setLog(h, d, { v, s: v >= (h.goal || 1) ? 'completed' : (l.s === 'completed' ? undefined : l.s), t: v >= (h.goal || 1) ? (l.t || nowTime()) : l.t });
}
function addEpisode(h, d, delta) {
  const l = getLog(h, d) || {}; const o = Math.max(0, (l.o || 0) + delta), max = h.dailyTargetMax || 0;
  setLog(h, d, { o, s: o > max ? 'failed' : 'completed', t: nowTime() });
}

/* ---------- validation ---------- */
function validateHabit(h) {
  const e = {};
  const n = (h.name || '').trim();
  if (n.length < 2 || n.length > 60) e.name = 'Название: от 2 до 60 символов.';
  if (h.type === 'build' && !(h.goal > 0)) e.goal = 'Цель должна быть больше нуля.';
  if (h.type === 'quit' && !(h.dailyTargetMax >= 0)) e.goal = 'Допустимое число эпизодов — 0 или больше.';
  if (!isValidDs(h.startDate)) e.startDate = 'Укажите корректную дату начала.';
  const r = h.recurrence || {};
  if (r.type === 'weekdays' && !(r.weekdays || []).length) e.recurrence = 'Выберите хотя бы один день недели.';
  if (r.type === 'interval' && !(r.intervalDays >= 1 && r.intervalDays <= 365)) e.recurrence = 'Интервал — от 1 до 365 дней.';
  if (r.type === 'timesPerWeek' && !(r.timesPerWeek >= 1 && r.timesPerWeek <= 7)) e.recurrence = 'От 1 до 7 раз в неделю.';
  if ((h.description || '').length > 500) e.description = 'Описание — до 500 символов.';
  if (h.reminder && h.reminder.enabled && tmin(h.reminder.time) == null) e.time = 'Укажите время напоминания.';
  return e;
}

/* ---------- example data (shown until the user saves anything) ---------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function buildDemo() {
  const p = newProfile(); const td = tzParts(p.timezone).date; const t = nowIso();
  S.meta = { version: 1, activeProfileId: p.id, profiles: [p], settings: defaultSettings(), lastAi: null };
  const start = addDays(td, -84);
  const H = (o) => Object.assign({ id: uid('h'), profileId: p.id, description: '', type: 'build', category: 'Здоровье', icon: 'leaf', emoji: '', color: '#6E8B4E', difficulty: 'medium', importance: 3, priority: 'medium', goal: 1, unit: 'раз', dailyTargetMax: null, recurrence: { type: 'daily' }, cue: { type: 'none', value: '' }, reminder: { enabled: true, time: '09:00', adaptive: false }, startDate: start, archived: false, motivation: '', createdAt: t, updatedAt: t }, o);
  const hs = [
    H({ name: 'Вода', description: 'Выпивать 2 литра чистой воды в день', icon: 'drop', color: '#5B9BD5', goal: 8, unit: 'стаканов', difficulty: 'easy', importance: 4, cue: { type: 'routine', value: 'После пробуждения' }, reminder: { enabled: true, time: '07:00', adaptive: true }, motivation: 'Чем больше воды сегодня, тем больше энергии завтра!' }),
    H({ name: 'Бег', description: '30 минут на свежем воздухе', category: 'Спорт', icon: 'run', color: '#E0662F', goal: 30, unit: 'мин', difficulty: 'hard', importance: 4, priority: 'high', recurrence: { type: 'timesPerWeek', timesPerWeek: 3 }, cue: { type: 'time', value: '08:00' }, reminder: { enabled: true, time: '08:00', adaptive: false } }),
    H({ name: 'Чтение', description: 'Прочитать 20 страниц', category: 'Развитие', icon: 'book', color: '#6E8B4E', goal: 20, unit: 'страниц', importance: 5, cue: { type: 'routine', value: 'После ужина' }, reminder: { enabled: true, time: '20:00', adaptive: true } }),
    H({ name: 'Без сладкого', description: 'Не есть сладкое и выпечку', type: 'quit', category: 'Питание', icon: 'ban', color: '#D9534F', goal: 1, unit: 'эпизодов', dailyTargetMax: 0, importance: 3, reminder: { enabled: false, time: '16:00', adaptive: false }, startDate: addDays(td, -40) }),
    H({ name: 'Ранний сон', description: 'Ложиться спать до 23:00', category: 'Сон', icon: 'moon', color: '#8B78C7', goal: 1, unit: 'раз', recurrence: { type: 'weekdays', weekdays: [6, 0, 1, 2, 3] }, reminder: { enabled: true, time: '22:00', adaptive: false } }),
    H({ name: 'Медитация', description: '10 минут тишины и дыхания', category: 'Осознанность', icon: 'flower', color: '#3E9A8E', goal: 10, unit: 'мин', difficulty: 'easy', importance: 2, priority: 'low', cue: { type: 'routine', value: 'После утреннего кофе' }, reminder: { enabled: true, time: '07:30', adaptive: false }, startDate: addDays(td, -30) }),
    H({ name: 'Меньше соцсетей', description: 'Не больше двух заходов в день', type: 'quit', category: 'Осознанность', icon: 'phone', color: '#C99A2E', goal: 1, unit: 'заходов', dailyTargetMax: 2, importance: 3, reminder: { enabled: false, time: '21:00', adaptive: false }, startDate: addDays(td, -35) })
  ];
  const rnd = mulberry(20260929);
  const baseP = [0.9, 0.55, 0.78, 0.8, 0.7, 0.72, 0.68];
  const L = {};
  hs.forEach((h, i) => {
    const m = L[h.id] = {};
    for (let d = h.startDate; d < td; d = addDays(d, 1)) {
      if (!isScheduled(h, d)) continue;
      const age = diffDays(h.startDate, d) / Math.max(1, diffDays(h.startDate, td));
      let pr = baseP[i] * (0.82 + 0.3 * age);
      if (h.name === 'Чтение' && dow(d) === 4) pr = 0.4;          // pattern for the analysis: Fridays are harder
      if (h.name === 'Бег' && dow(d) % 2 === 1) pr *= 0.4;
      const r = rnd(), base = tmin(h.reminder.time) || 540, tt = mint(clamp(base - 20 + Math.round(rnd() * 50), 0, 1439));
      if (r < 0.03) { m[d] = { s: 'excused', n: 'Болела', u: t }; continue; }
      if (h.type === 'quit') {
        const o = r < pr ? (h.dailyTargetMax ? Math.floor(rnd() * (h.dailyTargetMax + 1)) : 0) : (h.dailyTargetMax || 0) + 1 + Math.floor(rnd() * 2);
        m[d] = { s: o > (h.dailyTargetMax || 0) ? 'failed' : 'completed', o, t: tt, u: t };
      } else if (r < pr) m[d] = { s: 'completed', v: h.goal, t: tt, u: t };
      else if (rnd() < 0.3) m[d] = { v: Math.max(1, Math.floor(h.goal * 0.5)), u: t };
    }
  });
  L[hs[0].id][td] = { v: 5, u: t };
  L[hs[3].id][td] = { s: 'completed', o: 0, t: '13:10', u: t };
  L[hs[5].id][td] = { s: 'completed', v: 10, t: '07:40', u: t };
  S.habits = { [p.id]: hs }; S.logs = { [p.id]: L };
  S.goals = { [p.id]: [
    { id: uid('g'), profileId: p.id, title: 'Больше энергии каждый день', description: 'Вода, движение, сон и медитация — вместе', habitIds: [hs[0].id, hs[1].id, hs[4].id, hs[5].id], target: 200, startDate: addDays(td, -45), primary: true, createdAt: t, updatedAt: t },
    { id: uid('g'), profileId: p.id, title: '21 день без сладкого', description: '', habitIds: [hs[3].id], target: 21, startDate: addDays(td, -14), primary: false, createdAt: t, updatedAt: t }
  ] };
  S.demo = true; S.ver++;
}

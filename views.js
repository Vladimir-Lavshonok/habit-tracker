/* ============================================================
   VIEWS (part 1) — shell, shared components, charts, dashboard, habits
   ============================================================ */
'use strict';

const ROUTES = [
  { id: 'today', name: 'Главная', icon: 'home' },
  { id: 'habits', name: 'Привычки', icon: 'habits' },
  { id: 'calendar', name: 'Календарь', icon: 'calendar' },
  { id: 'stats', name: 'Аналитика', icon: 'chart' },
  { id: 'goals', name: 'Цели', icon: 'target' },
  { id: 'reminders', name: 'Напоминания', icon: 'bell' },
  { id: 'profile', name: 'Профиль', icon: 'user' },
  { id: 'data', name: 'Данные', icon: 'data', sep: true },
  { id: 'help', name: 'Помощь', icon: 'help' }
];
/* UI-only state (not user data). A few fields are remembered in the browser. */
const U = { route: 'today', dashDate: null, habitFilter: 'all', habitSort: 'priority', search: '', calMonth: null, calHabit: 'all', statPeriod: 30, statHabit: 'all', weekOffset: 0, helpQ: '' };
try { const saved = JSON.parse(localStorage.getItem('habit-tracker:ui') || '{}'); ['route', 'habitSort', 'statPeriod'].forEach(k => { if (saved[k] != null) U[k] = saved[k]; }); } catch (e) {}
function saveUi() { try { localStorage.setItem('habit-tracker:ui', JSON.stringify({ route: U.route, habitSort: U.habitSort, statPeriod: U.statPeriod })); } catch (e) {} }

const displayName = () => (activeProfile().name || 'друг');
function avatarHtml(p, size) {
  const s = size || 36; const inner = p.emoji ? esc(p.emoji) : esc((p.name || '?').trim().slice(0, 1).toUpperCase() || '?');
  return '<span class="avatar" style="width:' + s + 'px;height:' + s + 'px;background:' + safeColor(p.color) + ';font-size:' + Math.round(s * 0.48) + 'px">' + inner + '</span>';
}
const hIcon = h => h.emoji ? '<span aria-hidden="true">' + esc(h.emoji) + '</span>' : ic(h.icon || 'leaf');

/* ---------- theme / personalization ---------- */
/* Theme, accent, density and font size are applied to <body>. */
function applyTheme() {
  const st = settings(), b = document.body;
  if (st.theme === 'system') b.removeAttribute('data-app-theme'); else b.setAttribute('data-app-theme', st.theme);
  const a = ACCENTS[st.accent] || ACCENTS.forest;
  b.style.setProperty('--accent-l', a.l); b.style.setProperty('--accent-d', a.d);
  b.setAttribute('data-density', st.density === 'compact' ? 'compact' : 'comfortable');
  b.style.setProperty('--fs', clamp(st.fontSize || 15, 13, 18) + 'px');
}
/* Dark or light right now, from the saved setting (system → the OS setting). */
function isDarkNow() {
  const t = S.meta ? settings().theme : 'system';
  if (t === 'dark') return true;
  if (t === 'light') return false;
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}

/* ---------- shell ---------- */
function renderShell() {
  const st = settings(), p = activeProfile();
  $('#brand-logo').innerHTML = ic('sprout', 'logo');
  $('#brand-name').textContent = st.appName || 'Трекер привычек';
  $('#mob-brand').innerHTML = ic('sprout') + '<span>' + esc(st.appName || 'Трекер привычек') + '</span>';
  $('#side-nav').innerHTML = ROUTES.map(r => (r.sep ? '<div class="sep"></div>' : '') +
    '<button data-nav="' + r.id + '"' + (U.route === r.id ? ' aria-current="page"' : '') + '>' + ic(r.icon) + '<span>' + r.name + '</span></button>').join('');
  const mob = ['today', 'habits', 'calendar', 'stats'];
  $('#bottom-nav').innerHTML = mob.map(id => { const r = ROUTES.find(x => x.id === id); return '<button data-nav="' + id + '"' + (U.route === id ? ' aria-current="page"' : '') + '>' + ic(r.icon) + '<span>' + r.name + '</span></button>'; }).join('') +
    '<button data-act="more-menu"' + (!mob.includes(U.route) ? ' aria-current="page"' : '') + ' aria-label="Ещё разделы">' + ic('menu') + '<span>Ещё</span></button>';
  $('#side-quote').textContent = QUOTES[st.quoteIndex % QUOTES.length];
  $('#side-art').innerHTML = landscape('side', false);
  $('#search-ico').innerHTML = ic('search');
  $('#theme-btn').innerHTML = ic(isDarkNow() ? 'sun' : 'moon');
  $('#bell-btn').innerHTML = ic('bell') + (dueReminders().length ? '<span class="dot"></span>' : '');
  $('#profile-btn').innerHTML = avatarHtml(p, 36) + '<span class="pname">' + esc(displayName()) + '</span>' + ic('down');
  document.title = st.appName || 'Трекер привычек';
}

function render() {
  if (!S.meta) return;
  applyTheme(); renderShell();
  const v = $('#view'), fn = VIEWS[U.route] || VIEWS.today;
  const ae = document.activeElement, fid = ae && v.contains(ae) && ae.id, sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  try { v.innerHTML = fn(); if (fid) { const n = document.getElementById(fid); if (n) { n.focus(); if (sel && n.setSelectionRange) try { n.setSelectionRange(sel[0], sel[1]); } catch (e) {} } } }
  catch (e) { console.error(e); v.innerHTML = '<div class="card empty"><div class="big">' + ic('info') + '</div><h2>Не удалось показать раздел</h2><p>' + esc(e.message) + '</p><button class="btn" data-nav="today">На главную</button></div>'; }
}

/* ---------- charts (HTML/CSS so text stays readable at any width) ---------- */
function barChart(items, opts) {
  opts = opts || {}; const h = opts.height || 150;
  return '<div class="chart-wrap" style="display:grid;grid-template-columns:auto 1fr;gap:8px">' +
    '<div class="num tiny muted" style="display:flex;flex-direction:column;justify-content:space-between;height:' + h + 'px;text-align:right"><span>100%</span><span>50%</span><span>0%</span></div>' +
    '<div><div style="position:relative;height:' + h + 'px;display:flex;align-items:flex-end;gap:6px;border-bottom:1px solid var(--line);background:linear-gradient(var(--line),var(--line)) 0 0/100% 1px no-repeat,linear-gradient(var(--line),var(--line)) 0 50%/100% 1px no-repeat">' +
    items.map((it, i) => {
      const v = it.value == null ? 0 : clamp(it.value, 0, 100);
      const col = it.value == null ? 'var(--surface-3)' : (i === opts.highlight ? 'var(--accent)' : 'var(--accent-mid)');
      return '<div data-tip="' + esc(it.tip || (it.label + ': ' + pct(it.value))) + '" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;min-width:0">' +
        (opts.values ? '<span class="tiny num" style="margin-bottom:4px;font-weight:600">' + pct(it.value) + '</span>' : '') +
        '<i style="display:block;width:min(70%,34px);height:' + (it.value == null ? 4 : Math.max(3, v)) + '%;background:' + col + ';border-radius:5px 5px 2px 2px"></i></div>';
    }).join('') + '</div>' +
    '<div style="display:flex;gap:6px;margin-top:6px">' + items.map(it => '<span class="tiny muted" style="flex:1;text-align:center;min-width:0;overflow:hidden;white-space:nowrap">' + esc(it.label) + '</span>').join('') + '</div></div></div>';
}
function lineChart(points, opts) {
  opts = opts || {}; const h = opts.height || 190, n = points.length;
  if (!n) return '';
  const xs = i => n === 1 ? 50 : i / (n - 1) * 100, ys = v => 100 - clamp(v, 0, 100);
  const segs = []; let cur = [];
  points.forEach((p, i) => { if (p.value == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([xs(i), ys(p.value)]); });
  if (cur.length) segs.push(cur);
  const line = segs.map(s => 'M' + s.map(q => q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join(' L')).join(' ');
  const area = segs.filter(s => s.length > 1).map(s => 'M' + s[0][0] + ' 100 L' + s.map(q => q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join(' L') + ' L' + s[s.length - 1][0] + ' 100 Z').join(' ');
  let li = -1; for (let i = n - 1; i >= 0; i--) if (points[i].value != null) { li = i; break; }
  const step = Math.max(1, Math.ceil(n / (opts.maxLabels || 7)));
  return '<div class="chart-wrap" style="display:grid;grid-template-columns:auto 1fr;gap:8px">' +
    '<div class="num tiny muted" style="display:flex;flex-direction:column;justify-content:space-between;height:' + h + 'px;text-align:right"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>' +
    '<div style="min-width:0"><div style="position:relative;height:' + h + 'px">' +
    [0, 25, 50, 75, 100].map(g => '<i style="position:absolute;left:0;right:0;top:' + g + '%;border-top:1px ' + (g === 100 ? 'solid' : 'dashed') + ' var(--line)"></i>').join('') +
    '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible" aria-hidden="true">' +
    '<path d="' + area + '" fill="var(--accent)" fill-opacity=".14"/>' +
    '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
    (li >= 0 ? '<span style="position:absolute;left:' + xs(li) + '%;top:' + ys(points[li].value) + '%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--surface)"></span>' +
      '<span class="tiny num" style="position:absolute;right:0;top:calc(' + ys(points[li].value) + '% - 30px);background:var(--accent);color:var(--on-accent);padding:2px 7px;border-radius:7px;font-weight:700">' + pct(points[li].value) + '</span>' : '') +
    '<div style="position:absolute;inset:0;display:flex">' + points.map(p => '<span data-tip="' + esc(p.label + ': ' + (p.value == null ? 'нет данных' : pct(p.value)) + (p.extra ? ' · ' + p.extra : '')) + '" style="flex:1"></span>').join('') + '</div>' +
    '</div><div style="position:relative;height:18px;margin-top:6px">' +
    points.map((p, i) => (i % step === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < step / 2) ? '<span class="tiny muted" style="position:absolute;left:' + xs(i) + '%;transform:translateX(' + (i === 0 ? '0' : i === n - 1 ? '-100%' : '-50%') + ');white-space:nowrap">' + esc(p.short || p.label) + '</span>' : '').join('') +
    '</div></div></div>';
}
function donut(items, center, sub) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1, r = 60, C = 2 * Math.PI * r; let acc = 0;
  const gap = items.length > 1 ? 2 : 0;
  return '<svg viewBox="0 0 160 160" width="160" height="160" style="flex:none;max-width:100%" role="img" aria-label="Распределение по категориям">' +
    '<circle cx="80" cy="80" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="22"/>' +
    items.map(x => { const len = x.value / total * C; const s = '<circle cx="80" cy="80" r="' + r + '" fill="none" stroke="' + x.color + '" stroke-width="22" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + C + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 80 80)"><title>' + esc(x.label) + ': ' + x.value + '</title></circle>'; acc += len; return s; }).join('') +
    '<text x="80" y="80" text-anchor="middle" style="font:800 28px var(--font);fill:var(--text)">' + esc(center) + '</text>' +
    '<text x="80" y="100" text-anchor="middle" style="font:500 12px var(--font);fill:var(--muted)">' + esc(sub) + '</text></svg>';
}
function ring(value, size, label) {
  const s = size || 120, r = s / 2 - 9, C = 2 * Math.PI * r, v = value == null ? 0 : clamp(value, 0, 100);
  return '<div class="progress-ring" style="width:' + s + 'px;height:' + s + 'px"><svg viewBox="0 0 ' + s + ' ' + s + '" width="' + s + '" height="' + s + '" aria-hidden="true">' +
    '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="10"/>' +
    '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (v / 100 * C) + ' ' + C + '" transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/></svg>' +
    '<div class="c"><div><div class="num" style="font-size:' + Math.round(s / 4.6) + 'px;font-weight:800">' + pct(value) + '</div><div class="tiny muted">' + esc(label || '') + '</div></div></div></div>';
}
function statTile(icon, bg, fg, label, value, sub, extra) {
  return '<div class="card stat"><span class="ico" style="background:' + bg + ';color:' + fg + '">' + ic(icon) + '</span><div style="min-width:0"><div class="lbl">' + label + '</div><div class="val num">' + value + (sub ? '<small>' + sub + '</small>' : '') + (extra || '') + '</div></div></div>';
}
const deltaHtml = (d, suffix) => d == null || !isFinite(d) || Math.round(d) === 0 ? '' : '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '↑ +' : '↓ ') + Math.round(d) + (suffix || '') + '</span>';

/* ---------- habit row ---------- */
function habitProgressText(h, l) {
  if (h.type === 'quit') { const o = (l && l.o) || 0; return o + ' ' + plural(o, 'эпизод', 'эпизода', 'эпизодов') + ' · лимит ' + (h.dailyTargetMax || 0); }
  const v = isSuccessLog(l) ? Math.max(l.v || h.goal, h.goal) : (l && l.v) || 0;
  return v + '/' + h.goal + ' ' + esc(h.unit || '');
}
function habitRow(h, d, opts) {
  opts = opts || {};
  const td = today(), l = getLog(h, d), future = d > td, core = habitCore(h), done = isSuccessLog(l);
  const failed = l && l.s === 'failed', skipped = l && (l.s === 'skipped' || l.s === 'excused');
  const pod = partOfDay(h.reminder && h.reminder.time);
  let actions = '';
  if (future) actions = '<span class="tag grey">Запланировано</span>';
  else if (h.type === 'quit') {
    actions = '<div class="qbtns">' +
      (!l || (!l.s) ? '<button class="btn sm soft" data-act="hold" data-id="' + h.id + '" data-d="' + d + '">' + ic('check') + 'Сегодня удержался</button>' : '') +
      '<button class="btn sm" data-act="episode" data-id="' + h.id + '" data-d="' + d + '" aria-label="Зафиксировать эпизод: ' + esc(h.name) + '">' + ic('plus') + 'Зафиксировать эпизод</button>' +
      (l && l.s ? '<button class="check ' + (failed ? 'fail' : done ? 'on' : 'skip') + '" data-act="toggle" data-id="' + h.id + '" data-d="' + d + '" aria-label="' + (failed ? 'Лимит превышен' : 'Удержался') + ' — нажмите, чтобы сбросить отметку">' + ic(failed ? 'x' : 'check') + '</button>' : '') + '</div>';
  } else {
    actions = (h.goal > 1 && !done ? '<button class="btn sm" data-act="inc" data-id="' + h.id + '" data-d="' + d + '" aria-label="Добавить 1 ' + esc(h.unit) + '">+1</button>' : '') +
      '<button class="check ' + (done ? 'on' : skipped ? 'skip' : '') + '" data-act="toggle" data-id="' + h.id + '" data-d="' + d + '" aria-pressed="' + done + '" aria-label="' + (done ? 'Снять отметку: ' : '✓ Выполнено: ') + esc(h.name) + '">' + ic(skipped ? 'skip' : 'check') + '</button>';
  }
  const progress = h.type === 'build' && h.goal > 1 && !future ? '<div class="bar" style="margin-top:6px;max-width:260px"><i style="width:' + clamp(((done ? h.goal : (l && l.v) || 0) / h.goal) * 100, 0, 100) + '%;background:' + safeColor(h.color) + '"></i></div>' : '';
  return '<div class="habit' + (done ? ' done' : '') + '" style="--hc:' + safeColor(h.color) + '">' +
    '<span class="hicon">' + hIcon(h) + '</span>' +
    '<button class="hbody" data-act="details" data-id="' + h.id + '" style="border:0;background:none;text-align:left;padding:0;min-height:44px" aria-label="Подробнее: ' + esc(h.name) + '">' +
      '<span class="hname">' + esc(h.name) + (opts.tags !== false ? ' <span class="tag">' + esc(h.category) + '</span>' + (pod ? '<span class="tag warm">' + pod + '</span>' : '') + (h.type === 'quit' ? '<span class="tag bad">Избавиться</span>' : '') : '') + '</span>' +
      '<span class="hdesc" style="display:block">' + (skipped ? STATUS_NAMES[l.s] + (l.n ? ' · ' + esc(l.n) : '') : esc(h.description || recurrenceText(h))) + '</span>' + progress +
    '</button>' +
    '<span class="hmeta desk num">' + (future ? '' : habitProgressText(h, l)) + '</span>' +
    '<span class="hmeta"><span class="streak" title="Текущая серия">' + ic('flame') + core.current + '</span></span>' +
    actions +
    '<button class="kebab" data-act="habit-menu" data-id="' + h.id + '" data-d="' + d + '" aria-label="Действия с привычкой ' + esc(h.name) + '">' + ic('more') + '</button></div>';
}
function emptyHabits() {
  return '<div class="empty"><div class="big">' + ic('sprout') + '</div><h2 style="color:var(--text)">Здесь пока пусто</h2><p>Добавьте первую привычку — начнём с маленького действия.</p><div class="row" style="justify-content:center"><button class="btn primary" data-act="new-habit">' + ic('plus') + 'Новая привычка</button><button class="btn" data-act="templates">Выбрать из шаблонов</button></div></div>';
}

/* ---------- DASHBOARD ---------- */
const VIEWS = {};
VIEWS.today = function () {
  const td = today(); const d = U.dashDate && U.dashDate <= td ? U.dashDate : td; U.dashDate = d;
  const list = activeHabits().filter(h => dueOn(h, d)).sort((a, b) => priorityScore(b) - priorityScore(a));
  const doneN = list.filter(h => isSuccessLog(getLog(h, d))).length;
  const st = settings(); const hour = +nowTime().slice(0, 2);
  const hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  let html = '';
  if (S.demo) html += '<div class="demo-banner">' + ic('info') + '<div style="flex:1;min-width:220px"><b>Это пример данных.</b> <span class="muted">Он показывает, как работает трекер. Пока вы ничего не изменили, пример не сохраняется.</span></div><button class="btn sm primary" data-act="demo-keep">Оставить пример</button><button class="btn sm" data-act="demo-clear">Начать с чистого листа</button></div>';
  html += installBannerHtml();
  html += '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--gold)">' + ic('leaf') + '</span>' + hello + ', ' + esc(displayName()) + '!</h1><p class="sub">' + esc(st.greeting || '') + '</p></div>' +
    '<div class="row"><button class="icon-btn" data-act="dash-date" data-delta="-1" aria-label="Предыдущий день">' + ic('left') + '</button><span class="chip" style="min-width:0">' + (d === td ? 'Сегодня, ' : '') + fmtDate(d) + '</span><button class="icon-btn" data-act="dash-date" data-delta="1" aria-label="Следующий день"' + (d >= td ? ' disabled style="opacity:.35"' : '') + '>' + ic('right') + '</button></div></div>';
  if (!habitsOf().length) return html + '<div class="card">' + emptyHabits() + '</div>';

  const W = {};
  const bestCur = activeHabits().map(h => ({ h, c: habitCore(h) })).sort((a, b) => b.c.current - a.c.current)[0];
  const ptsToday = list.filter(h => isSuccessLog(getLog(h, d))).reduce((s, h) => s + Math.round(10 * (DIFF[h.difficulty] || DIFF.medium).k), 0);
  W.stats = '<div class="grid g4">' +
    statTile('check', 'var(--accent-soft)', 'var(--accent)', 'Выполнено ' + (d === td ? 'сегодня' : fmtDate(d)), doneN, 'из ' + list.length) +
    statTile('clock', 'var(--warning-soft)', 'var(--warning)', 'Осталось', Math.max(0, list.length - doneN), list.length ? pct((doneN / list.length) * 100) + ' готово' : '') +
    statTile('flame', 'var(--danger-soft)', 'var(--flame)', 'Текущая лучшая серия', bestCur ? bestCur.c.current : 0, bestCur ? bestCur.c.unit + ' · ' + esc(bestCur.h.name) : '') +
    statTile('star', 'color-mix(in srgb,var(--gold) 18%,var(--surface))', 'var(--gold)', 'Баллы', totalPoints().toLocaleString('ru-RU'), ptsToday ? '+' + ptsToday + ' сегодня' : '') + '</div>';

  W.today = '<div class="card"><div class="card-head"><div class="row"><h2>Мои привычки на ' + (d === td ? 'сегодня' : fmtDate(d)) + '</h2><span class="tag num">' + doneN + ' из ' + list.length + '</span></div><button class="btn primary sm" data-act="new-habit">' + ic('plus') + 'Новая привычка</button></div>' +
    (list.length ? '<div class="stack">' + list.map(h => habitRow(h, d)).join('') + '</div>' : '<div class="empty"><div class="big">' + ic('sun') + '</div><p>На этот день ничего не запланировано. Отдыхайте или загляните в раздел «Привычки».</p></div>') +
    (d === td && list.some(h => { const y = addDays(td, -1); return isScheduled(h, y) && !isWeekly(h) && outcome(h, y, td) === 'fail'; }) ? '<div class="note" style="margin-top:12px">' + ic('heart') + '<p>Один пропуск не обнуляет ваш прогресс. Продолжите со следующей запланированной возможности.</p></div>' : '') + '</div>';

  const ws = weekStartOf(td, activeProfile().weekStart); const hs = activeHabits();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const wr = periodRate(hs, ws, td), pr = periodRate(hs, addDays(ws, -7), addDays(ws, -1));
  const r30 = periodRate(hs, addDays(td, -29), td);
  W.week = '<div class="card"><div class="card-head"><h2>Прогресс недели</h2><div class="num" style="font-size:1.4rem;font-weight:800;color:var(--accent)">' + pct(wr.rate) + deltaHtml(wr.rate != null && pr.rate != null ? wr.rate - pr.rate : null, '%') + '</div></div>' +
    barChart(days.map((x, i) => { const a = dayAgg(x, hs); return { label: DOW_S[dow(x)], value: x > td ? null : a.rate, tip: fmtDate(x) + ': ' + (x > td ? 'ещё впереди' : a.ok + ' из ' + a.el + ' (' + pct(a.rate) + ')') }; }), { highlight: days.indexOf(td) }) +
    '<p class="small muted" style="margin-top:10px">За последние 30 дней: <b class="num" style="color:var(--text)">' + r30.completed + '/' + r30.eligible + ' — ' + pct(r30.rate) + '</b></p></div>';

  const g = goalsOf().find(x => x.primary) || goalsOf()[0];
  if (g) { const gs = goalStats(g);
    W.goal = '<div class="card"><div class="card-head"><h2>Моя цель</h2><button class="link" data-nav="goals">Изменить</button></div><div class="row" style="gap:14px;flex-wrap:nowrap"><span class="ico" style="width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--gold) 18%,var(--surface));color:var(--gold);flex:none">' + ic('target') + '</span><div style="min-width:0"><b style="overflow-wrap:anywhere">' + esc(g.title) + '</b><p class="small muted">' + esc(g.description || '') + '</p></div></div>' +
      '<div class="bar" style="margin:16px 0 8px"><i style="width:' + gs.progress + '%"></i></div><div class="row small"><span class="muted">' + gs.doneToday + ' из ' + gs.dueToday + ' привычек сегодня · ' + gs.done + '/' + gs.target + '</span><span class="spacer"></span><b class="num">' + pct(gs.progress) + '</b></div>' +
      '<p class="small muted" style="margin-top:6px">' + (gs.daysLeft === 0 ? 'Цель достигнута! 🎉' : gs.daysLeft ? 'Если сохранить темп, цель будет достигнута через <b style="color:var(--text)">' + gs.daysLeft + ' ' + plural(gs.daysLeft, 'день', 'дня', 'дней') + '</b>.' : 'Отметьте несколько выполнений, чтобы появился прогноз.') + '</p></div>';
  } else W.goal = '<div class="card"><div class="card-head"><h2>Моя цель</h2></div><div class="empty" style="padding:12px"><p>Свяжите несколько привычек в одну цель — будет видно общий прогресс.</p><button class="btn soft" data-act="new-goal">' + ic('plus') + 'Поставить цель</button></div></div>';

  const risk = activeHabits().map(h => ({ h, e: forecast(h) })).filter(x => x.e != null).sort((a, b) => a.e - b.e).slice(0, 4);
  W.forecast = '<div class="card"><div class="card-head"><h2>Оценка следующего выполнения</h2><span class="tag grey" title="Это статистическая оценка по вашей недавней истории, а не гарантированная вероятность.">EWMA · α 0,3</span></div>' +
    (risk.length ? '<div class="stack">' + risk.map(x => '<div class="row" style="flex-wrap:nowrap"><span class="hicon" style="--hc:' + safeColor(x.h.color) + ';width:34px;height:34px">' + hIcon(x.h) + '</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.h.name) + '</span><div class="bar" style="width:34%"><i style="width:' + x.e * 100 + '%;background:' + (x.e < 0.5 ? 'var(--warning)' : 'var(--accent)') + '"></i></div><b class="num" style="width:44px;text-align:right">' + pct(x.e * 100) + '</b></div>').join('') + '</div><p class="tiny muted" style="margin-top:10px">Статистическая оценка по вашей недавней истории, а не гарантированная вероятность. Сверху — привычки, которым сейчас нужно больше внимания.</p>'
      : '<p class="muted small">Недостаточно данных: оценка появится после 7 запланированных случаев.</p>') + '</div>';

  W.quote = '<div class="grid g2" style="align-items:stretch"><div class="hero">' + landscape('dash', false) + '<p>' + esc(QUOTES[(st.quoteIndex + 2) % QUOTES.length]) + ' <span style="color:var(--gold)">♥</span></p></div>' +
    '<div class="card" style="background:var(--accent-soft);border-color:transparent;display:flex;align-items:center;gap:14px"><p class="script" style="font-size:1.5rem;line-height:1.1;flex:1">Ты делаешь это для себя, и у тебя отлично получается! Продолжай в том же духе.</p><span style="color:var(--accent)">' + ic('sprout') + '</span></div></div>';

  const order = st.widgets.filter(w => w.visible && W[w.id]).map(w => w.id);
  // "today" + "week"/"goal"/"forecast" pair into two columns on desktop
  const side = order.filter(id => ['week', 'goal', 'forecast'].includes(id));
  const out = []; let sideDone = false;
  order.forEach(id => {
    if (id === 'today' && side.length) { out.push('<div class="grid split" style="align-items:start">' + W.today + '<div class="grid">' + side.map(s => W[s]).join('') + '</div></div>'); sideDone = true; }
    else if (side.includes(id)) { if (!order.includes('today') && !sideDone) { out.push('<div class="grid g3">' + side.map(s => W[s]).join('') + '</div>'); sideDone = true; } }
    else out.push(W[id]);
  });
  return html + '<div class="grid" style="gap:var(--gap)">' + out.join('') + '</div>';
};

/* ---------- HABITS ---------- */
VIEWS.habits = function () {
  const all = habitsOf(), q = U.search.trim().toLowerCase();
  const counts = { all: all.filter(h => !h.archived).length, build: all.filter(h => !h.archived && h.type === 'build').length, quit: all.filter(h => !h.archived && h.type === 'quit').length, archived: all.filter(h => h.archived).length };
  let list = all.filter(h => U.habitFilter === 'archived' ? h.archived : !h.archived && (U.habitFilter === 'all' || h.type === U.habitFilter || h.category === U.habitFilter));
  if (q) list = list.filter(h => (h.name + ' ' + h.description + ' ' + h.category).toLowerCase().includes(q));
  const td = today(), from30 = addDays(td, -29);
  const sorters = {
    priority: (a, b) => priorityScore(b) - priorityScore(a),
    progress: (a, b) => (habitRate(b, from30, td).rate ?? -1) - (habitRate(a, from30, td).rate ?? -1),
    streak: (a, b) => habitCore(b).current - habitCore(a).current,
    name: (a, b) => a.name.localeCompare(b.name, 'ru')
  };
  list.sort(sorters[U.habitSort] || sorters.priority);
  const cats = [...new Set(all.filter(h => !h.archived).map(h => h.category))].slice(0, 5);
  const chip = (id, name, n) => '<button class="chip" data-act="hfilter" data-v="' + esc(id) + '" aria-pressed="' + (U.habitFilter === id) + '">' + esc(name) + (n != null ? ' <span class="n">' + n + '</span>' : '') + '</button>';
  const card = h => {
    const c = habitCore(h), r = habitRate(h, from30, td), l = getLog(h, td);
    return '<div class="card" style="--hc:' + safeColor(h.color) + ';display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">' +
      '<span class="hicon" style="width:52px;height:52px">' + hIcon(h) + '</span>' +
      '<div style="flex:1;min-width:200px"><div class="hname" style="font-size:1.05rem">' + esc(h.name) + ' <span class="tag">' + esc(h.category) + '</span>' + (h.type === 'quit' ? '<span class="tag bad">Избавиться</span>' : '<span class="tag grey">Полезная</span>') + (h.archived ? '<span class="tag grey">В архиве</span>' : '') + '</div>' +
      '<p class="hdesc">' + esc(h.description || '') + '</p>' +
      '<p class="small muted" style="margin-top:4px">' + recurrenceText(h) + (h.cue && h.cue.value ? ' · ' + esc(h.cue.value) : '') + ' · ' + DIFF[h.difficulty].name.toLowerCase() + ' · важность ' + h.importance + '/5</p>' +
      '<div class="row" style="margin-top:10px;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:' + (r.rate || 0) + '%;background:' + safeColor(h.color) + '"></i></div><span class="small num" style="font-weight:600">' + pct(r.rate) + ' за 30 дн.</span></div></div>' +
      '<div class="stack" style="min-width:120px;gap:6px"><span class="small muted row" style="gap:6px">' + ic('clock') + (h.reminder && h.reminder.enabled ? esc(h.reminder.time) : '—') + '</span>' +
      '<span class="streak">' + ic('flame') + c.current + ' <span class="small muted" style="font-weight:500">' + c.unit + ' серия</span></span><span class="small muted">Лучшая: ' + c.best + ' · приоритет ' + priorityScore(h) + '</span>' +
      (!h.archived && dueOn(h, td) ? '<span class="small">' + (isSuccessLog(l) ? '✓ Сегодня выполнено' : 'Сегодня: ' + habitProgressText(h, l)) + '</span>' : '') + '</div>' +
      '<button class="kebab" data-act="habit-menu" data-id="' + h.id + '" data-d="' + td + '" aria-label="Действия с привычкой ' + esc(h.name) + '">' + ic('more') + '</button></div>';
  };
  return '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--gold)">' + ic('habits') + '</span>Привычки</h1><p class="sub">Управляйте своими привычками и создавайте новые</p></div>' +
    '<div class="row"><button class="btn" data-act="templates">' + ic('sparkles') + 'Шаблоны</button><button class="btn primary" data-act="new-habit">' + ic('plus') + 'Новая привычка</button></div></div>' +
    '<div class="row" style="margin-bottom:14px">' + chip('all', 'Все', counts.all) + chip('build', 'Полезные', counts.build) + chip('quit', 'Избавиться', counts.quit) + cats.map(c => chip(c, c)).join('') + chip('archived', 'Архив', counts.archived) + '</div>' +
    '<div class="row" style="margin-bottom:16px"><label class="search" style="display:block;max-width:360px;flex:1;min-width:200px"><span class="sr">Поиск по привычкам</span>' + ic('search') + '<input id="habit-search" type="search" placeholder="Поиск по названию, описанию, категории" value="' + esc(U.search) + '"></label>' +
    '<label class="row small" style="gap:8px"><span class="muted">Сортировка</span><select class="input" id="habit-sort" style="width:auto;min-height:40px">' +
    [['priority', 'По приоритету'], ['progress', 'По прогрессу'], ['streak', 'По серии'], ['name', 'По названию']].map(o => '<option value="' + o[0] + '"' + (U.habitSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
    (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' : (all.length ? '<div class="card empty"><div class="big">' + ic('search') + '</div><p>' + (U.habitFilter === 'archived' ? 'В архиве пока ничего нет.' : 'Ничего не найдено. Попробуйте изменить фильтр или запрос.') + '</p></div>' : '<div class="card">' + emptyHabits() + '</div>'));
};

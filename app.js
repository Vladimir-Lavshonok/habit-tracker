/* ============================================================
   APP — events, reminders, AI coach, import/export, start-up
   ============================================================ */
'use strict';

function go(route) { U.route = ROUTES.some(r => r.id === route) ? route : 'today'; saveUi(); closeMenu(); render(); window.scrollTo({ top: 0 }); const v = $('#view'); v && v.focus({ preventScroll: true }); }

/* ---------- reminders (in-app) ---------- */
let REM = { date: '', snooze: {}, dismissed: {}, shown: {} };
function remLoad() { try { const r = JSON.parse(localStorage.getItem('habit-tracker:rem') || 'null'); if (r) REM = r; } catch (e) {} }
function remSave() { try { localStorage.setItem('habit-tracker:rem', JSON.stringify(REM)); } catch (e) {} }
function remToday() { const td = today(); if (REM.date !== td) { REM = { date: td, snooze: {}, dismissed: {}, shown: {} }; remSave(); } }
/* Scheduled today → not done → not in quiet hours → reminder time reached → not dismissed/snoozed. */
function dueReminders() {
  if (!S.meta || !settings().remindersEnabled) return [];
  remToday(); const n = tmin(nowTime());
  if (inQuiet(nowTime())) return [];
  return activeHabits().filter(h => h.reminder && h.reminder.enabled && dueOn(h, today()) && !isDoneToday(h) && tmin(h.reminder.time) != null && tmin(h.reminder.time) <= n && !REM.dismissed[h.id] && (!REM.snooze[h.id] || tmin(REM.snooze[h.id]) <= n));
}
function remAction(h, kind) {
  if (kind === 'done') toggleDone(h, today());
  else if (kind === 'later') { REM.snooze[h.id] = mint(Math.min(tmin(nowTime()) + 30, 1439)); remSave(); toast('Напомню в ' + REM.snooze[h.id]); }
  else { REM.dismissed[h.id] = true; remSave(); toast('Сегодня напоминаний о «' + esc(h.name) + '» не будет'); }
  renderShell(); if (U.route === 'reminders') render();
}
function checkReminders() {
  if (!S.meta) return;
  const due = dueReminders();
  const fresh = due.filter(h => REM.shown[h.id] !== (REM.snooze[h.id] || h.reminder.time));
  fresh.forEach(h => { REM.shown[h.id] = REM.snooze[h.id] || h.reminder.time; }); remSave();
  fresh.forEach(h => systemNotify(h.name, h.reminder.time + ' · ' + (h.motivation || h.description || 'Пора выполнить привычку'), h.id));
  if (fresh.length > 1) {
    toast('<b>' + fresh.length + ' ' + plural(fresh.length, 'напоминание', 'напоминания', 'напоминаний') + '</b><div class="small muted">' + fresh.map(h => esc(h.name)).join(', ') + '</div>',
      [{ label: 'Открыть', primary: true, fn: openBell }, { label: 'Позже', fn: () => {} }], { sticky: true, cls: 'reminder' });
  } else fresh.forEach(h => {
    toast('<b>' + esc(h.name) + '</b><div class="small muted">' + esc(h.reminder.time) + ' · ' + esc(h.motivation || h.description || 'Пора выполнить привычку') + '</div>',
      [{ label: '✓ Выполнено', primary: true, fn: () => remAction(h, 'done') }, { label: 'Через 30 минут', fn: () => remAction(h, 'later') }, { label: 'Сегодня пропустить', fn: () => remAction(h, 'skip') }], { sticky: true, cls: 'reminder' });
  });
  $('#bell-btn').innerHTML = ic('bell') + (due.length ? '<span class="dot"></span>' : '');
}
function openBell() {
  const due = dueReminders(), td = today();
  const next = activeHabits().filter(h => h.reminder && h.reminder.enabled && dueOn(h, td) && !isDoneToday(h) && !due.includes(h)).sort((a, b) => tmin(a.reminder.time) - tmin(b.reminder.time));
  const row = (h, act) => '<div class="setting" style="--hc:' + safeColor(h.color) + '"><span class="hicon" style="width:38px;height:38px">' + hIcon(h) + '</span><div class="grow"><b>' + esc(h.name) + '</b><div class="small muted num">' + esc(h.reminder.time) + (inQuiet(h.reminder.time) ? ' · тихие часы' : '') + '</div></div>' +
    (act ? '<button class="btn sm primary" data-rb="done" data-id="' + h.id + '">✓ Выполнено</button><button class="btn sm" data-rb="later" data-id="' + h.id + '">Через 30 мин</button><button class="btn sm ghost" data-rb="skip" data-id="' + h.id + '">Пропустить</button>' : '') + '</div>';
  openModal('Напоминания на сегодня', (due.length ? '<h3 style="margin-bottom:4px">Пора</h3>' + due.map(h => row(h, true)).join('') : '<p class="muted">Сейчас напоминаний нет.' + (inQuiet(nowTime()) ? ' Действуют тихие часы.' : '') + '</p>') +
    (next.length ? '<h3 style="margin:14px 0 4px">Позже сегодня</h3>' + next.map(h => row(h, false)).join('') : ''), '<button class="btn" data-bell-go>Настроить напоминания</button><button class="btn primary" data-close>Готово</button>', { size: 'wide', focus: '[data-close]' });
  MODAL_HANDLERS.current = { click(e) {
    if (e.target.closest('[data-bell-go]')) { closeModal(); go('reminders'); return true; }
    const b = e.target.closest('[data-rb]'); if (!b) return; const h = habitById(b.dataset.id); closeModal(); remAction(h, b.dataset.rb); return true; } };
}

/* ---------- system notifications (optional, while the app is running) ---------- */
const canNotify = () => 'Notification' in window && 'serviceWorker' in navigator;
function notifySettingHtml() {
  const st = settings();
  if (!canNotify()) return '<div class="setting"><div class="grow"><b>Системные уведомления</b><div class="small muted">' + (IS_IOS && !IS_STANDALONE ? 'На iPhone доступны после установки на экран «Домой» (iOS 16.4+).' : 'Этот браузер не поддерживает уведомления.') + '</div></div></div>';
  const perm = Notification.permission;
  return '<div class="setting"><div class="grow"><b>Системные уведомления</b><div class="small muted">' + (perm === 'denied' ? 'Запрещены в настройках браузера — разрешите их для этого сайта.' : 'Показываются, пока приложение открыто или свёрнуто') + '</div></div><button class="switch" role="switch" aria-checked="' + !!(st.systemNotify && perm === 'granted') + '" data-act="sys-notify" aria-label="Системные уведомления"' + (perm === 'denied' ? ' disabled' : '') + '></button></div>';
}
async function systemNotify(title, body, tag) {
  if (!canNotify() || !settings().systemNotify || Notification.permission !== 'granted') return;
  try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }); }
  catch (e) { try { new Notification(title, { body, tag, icon: 'icons/icon-192.png' }); } catch (x) {} }
}

/* ---------- install (home screen / desktop app) ---------- */
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
let INSTALL_EVT = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; if (S.meta) render(); });
window.addEventListener('appinstalled', () => { INSTALL_EVT = null; toast('Приложение установлено'); if (S.meta) render(); });
function installHidden() { try { return localStorage.getItem('habit-tracker:install-hint') === 'off'; } catch (e) { return false; } }
function installBannerHtml() {
  if (IS_STANDALONE || installHidden() || S.demo) return '';
  if (INSTALL_EVT) return '<div class="demo-banner">' + ic('download') + '<div style="flex:1;min-width:200px"><b>Установите приложение</b> <span class="muted">— значок на экране, работа без интернета.</span></div><button class="btn sm primary" data-act="install">Установить</button><button class="btn sm ghost" data-act="install-hide">Не сейчас</button></div>';
  if (IS_IOS) return '<div class="demo-banner">' + ic('download') + '<div style="flex:1;min-width:200px"><b>Добавьте на экран «Домой»:</b> <span class="muted">нажмите «Поделиться» ⬆︎ внизу Safari → «На экран «Домой»» → «Добавить».</span></div><button class="btn sm ghost" data-act="install-hide">Понятно</button></div>';
  return '';
}
function installCardHtml() {
  const how = IS_STANDALONE ? '<p class="small">✓ Приложение уже установлено на этом устройстве.</p>'
    : INSTALL_EVT ? '<p class="small muted">Браузер готов установить приложение: значок появится на рабочем столе или главном экране.</p><button class="btn primary" data-act="install">' + ic('download') + 'Установить приложение</button>'
    : IS_IOS ? '<p class="small muted">В Safari нажмите «Поделиться» (квадрат со стрелкой вверх) → «На экран «Домой»» → «Добавить».</p>'
    : '<p class="small muted">Android: «⋮» → «Добавить на главный экран». Chrome/Edge на компьютере: значок установки в адресной строке. Safari на Mac: «Файл» → «Добавить в Dock».</p>';
  return '<div class="card stack"><h2>Установка</h2>' + how + '<p class="small muted">Регистрация не нужна: данные хранятся только на этом устройстве.</p></div>';
}

/* ---------- export ---------- */
function exportObject() {
  const logs = [];
  for (const p of S.meta.profiles) { const L = logsOf(p.id); for (const hid in L) for (const d in L[hid]) { const l = L[hid][d];
    logs.push({ id: hid + '_' + d, habitId: hid, profileId: p.id, date: d, status: l.s || null, value: l.v != null ? l.v : null, occurrences: l.o != null ? l.o : null, completedAt: l.t || null, note: l.n || '' }); } }
  return { app: 'habit-tracker', schemaVersion: 1, exportedAt: nowIso(), activeProfileId: S.meta.activeProfileId, settings: S.meta.settings, profiles: S.meta.profiles,
    habits: S.meta.profiles.flatMap(p => habitsOf(p.id)), goals: S.meta.profiles.flatMap(p => goalsOf(p.id)), habitLogs: logs };
}
const csvCell = v => { const s = v == null ? '' : String(v); return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function exportCsv() {
  const rows = [['date', 'habit', 'type', 'category', 'status', 'value', 'unit', 'occurrences', 'time', 'note']];
  const L = logsOf();
  habitsOf().forEach(h => Object.keys(L[h.id] || {}).sort().forEach(d => { const l = L[h.id][d]; rows.push([d, h.name, h.type, h.category, l.s || '', l.v != null ? l.v : '', h.unit, l.o != null ? l.o : '', l.t || '', l.n || '']); }));
  rows.sort((a, b) => a === rows[0] ? -1 : b === rows[0] ? 1 : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}
function exportReport() {
  const td = today(), from = addDays(td, -29), p = activeProfile();
  const r = periodRate(activeHabits(), from, td);
  const rows = activeHabits().map(h => { const c = habitCore(h), hr = habitRate(h, from, td), e = forecast(h);
    return '<tr><td>' + esc(h.name) + '</td><td>' + esc(h.category) + '</td><td>' + recurrenceText(h) + '</td><td class="n">' + pct(hr.rate) + '</td><td class="n">' + hr.completed + '/' + hr.eligible + '</td><td class="n">' + c.current + ' ' + c.unit + '</td><td class="n">' + c.best + ' ' + c.unit + '</td><td class="n">' + (e == null ? '—' : pct(e * 100)) + '</td></tr>'; }).join('');
  const goals = goalsOf().map(g => { const s = goalStats(g); return '<li><b>' + esc(g.title) + '</b> — ' + pct(s.progress) + ' (' + s.done + ' из ' + s.target + ')' + (s.daysLeft ? ', прогноз: ' + s.daysLeft + ' дн.' : '') + '</li>'; }).join('');
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт — ' + esc(settings().appName) + '</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#1F2A1C;max-width:900px;margin:32px auto;padding:0 20px}h1{margin:0 0 4px}p.m{color:#687062;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 10px;border-bottom:1px solid #E2E0D4;text-align:left}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#687062}.n{text-align:right;font-variant-numeric:tabular-nums}.k{display:flex;gap:24px;margin:16px 0}.k div{border:1px solid #E2E0D4;border-radius:12px;padding:12px 16px}.k b{display:block;font-size:22px}@media print{body{margin:0}}</style></head><body>' +
    '<h1>' + esc(settings().appName) + ': отчёт за 30 дней</h1><p class="m">' + esc(p.name || 'Профиль') + ' · ' + fmtDate(from) + ' — ' + fmtDateLong(td) + '. Чтобы сохранить как PDF, нажмите Ctrl+P (⌘P) и выберите «Сохранить как PDF».</p>' +
    '<div class="k"><div>Процент выполнения<b>' + pct(r.rate) + '</b></div><div>Выполнений<b>' + r.completed + ' из ' + r.eligible + '</b></div><div>Баллы<b>' + totalPoints() + '</b></div></div>' +
    '<table><thead><tr><th>Привычка</th><th>Категория</th><th>Частота</th><th class="n">30 дней</th><th class="n">Выполнено</th><th class="n">Серия</th><th class="n">Лучшая</th><th class="n">Прогноз</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    (goals ? '<h2>Цели</h2><ul>' + goals + '</ul>' : '') + '<p class="m">Прогноз — статистическая оценка (EWMA, α = 0,3) по недавней истории, а не гарантированная вероятность.</p><p class="m">Автор приложения: Vladimir Lavshonok</p></body></html>';
}
async function saveFile(filename, data) {
  const type = /\.json$/.test(filename) ? 'application/json' : /\.csv$/.test(filename) ? 'text/csv' : 'text/html';
  const blob = new Blob([data], { type: type + ';charset=utf-8' });
  // iPhone / iPad: the share sheet lets you save to «Файлы» or send the file
  if (IS_IOS && navigator.canShare) {
    try { const file = new File([blob], filename, { type }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Файл «' + esc(filename) + '» сохранён в загрузки', [{ label: 'Показать текст', fn: () => copyFallback(filename, data) }]);
  } catch (e) { copyFallback(filename, data); }
}
function copyFallback(filename, data) {
  openModal('Скопируйте данные', '<p class="small muted" style="margin-bottom:8px">Скопируйте содержимое и сохраните его в файл <b>' + esc(filename) + '</b>.</p><textarea class="input" id="export-text" readonly style="min-height:260px;font-family:ui-monospace,monospace;font-size:12px">' + esc(data) + '</textarea>',
    '<button class="btn" data-close>Закрыть</button><button class="btn primary" data-copy>' + ic('copy') + 'Копировать</button>', { size: 'wide', focus: '[data-copy]' });
  MODAL_HANDLERS.current = { click(e) { if (!e.target.closest('[data-copy]')) return; const t = $('#export-text');
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => toast('Скопировано'), () => { t.focus(); t.select(); toast('Выделено — нажмите «Копировать» в меню'); });
    else { t.focus(); t.select(); } return true; } };
}

/* ---------- import ---------- */
const STATUS_MAP = { completed: 'completed', failed: 'failed', skipped: 'skipped', excused: 'excused', 'выполнено': 'completed', 'нарушение': 'failed', 'пропуск': 'skipped', 'уважительная причина': 'excused', 'уважительная': 'excused', '': undefined };
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
/* Returns {errors[]} or a normalised import plan. Nothing touches state here. */
function planFromJson(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.profiles) || !Array.isArray(obj.habits)) return { errors: ['Это не файл экспорта трекера: нет списков profiles и habits.'] };
  const pids = new Set(obj.profiles.map(p => p && p.id));
  obj.profiles.forEach((p, i) => { if (!p || typeof p.id !== 'string' || typeof (p.name || '') !== 'string' || (p.name || '').length > 50) errors.push('Профиль №' + (i + 1) + ': некорректный id или имя.'); });
  const habits = obj.habits.map((h, i) => {
    const n = Object.assign(blankHabit(), h || {});
    n.recurrence = Object.assign({ type: 'daily' }, n.recurrence || {}); n.cue = Object.assign({ type: 'none', value: '' }, n.cue || {}); n.reminder = Object.assign({ enabled: false, time: '09:00', adaptive: false }, n.reminder || {});
    if (typeof n.id !== 'string' || !n.id) errors.push('Привычка №' + (i + 1) + ': нет id.');
    if (!pids.has(n.profileId)) errors.push('Привычка «' + esc(n.name) + '»: профиль не найден в файле.');
    if (!['build', 'quit'].includes(n.type)) errors.push('Привычка «' + esc(n.name) + '»: неизвестный тип.');
    if (!['daily', 'weekdays', 'interval', 'timesPerWeek'].includes(n.recurrence.type)) errors.push('Привычка «' + esc(n.name) + '»: неизвестная повторяемость.');
    if (!DIFF[n.difficulty]) n.difficulty = 'medium';
    n.color = safeColor(n.color); n.importance = clamp(parseInt(n.importance, 10) || 3, 1, 5);
    const ve = validateHabit(n); Object.values(ve).forEach(m => errors.push('Привычка «' + esc(n.name) + '»: ' + m));
    return n; });
  const hids = new Set(habits.map(h => h.id));
  const goals = (Array.isArray(obj.goals) ? obj.goals : []).map((g, i) => { if (!g || typeof g.id !== 'string' || typeof g.title !== 'string' || !Array.isArray(g.habitIds) || !pids.has(g.profileId)) errors.push('Цель №' + (i + 1) + ': некорректные данные.'); return g; });
  const logs = (Array.isArray(obj.habitLogs) ? obj.habitLogs : []).map((l, i) => {
    if (!l || !hids.has(l.habitId) || !isValidDs(l.date)) { errors.push('Отметка №' + (i + 1) + ': неизвестная привычка или некорректная дата.'); return null; }
    if (l.status != null && !['completed', 'failed', 'skipped', 'excused'].includes(l.status)) { errors.push('Отметка №' + (i + 1) + ': неизвестный статус «' + esc(l.status) + '».'); return null; }
    if ((l.value != null && !isFinite(l.value)) || (l.occurrences != null && !isFinite(l.occurrences))) { errors.push('Отметка №' + (i + 1) + ': значение не число.'); return null; }
    const h = habits.find(x => x.id === l.habitId);
    return { pid: h.profileId, hid: l.habitId, date: l.date, log: { s: l.status || undefined, v: l.value != null ? +l.value : undefined, o: l.occurrences != null ? +l.occurrences : undefined, t: l.completedAt || undefined, n: l.note || undefined, u: nowIso() } };
  }).filter(Boolean);
  if (errors.length) return { errors };
  return { kind: 'json', profiles: obj.profiles.map(p => newProfile(p)), habits, goals, logs, settings: obj.settings };
}
function planFromCsv(text) {
  const rows = parseCsv(text); if (rows.length < 2) return { errors: ['Файл пустой или без строк данных.'] };
  const head = rows[0].map(x => x.trim().toLowerCase()), ix = k => head.indexOf(k);
  if (ix('date') < 0 || ix('habit') < 0 || ix('status') < 0) return { errors: ['Нужны колонки date, habit и status (первая строка — заголовки).'] };
  const errors = [], logs = [], newHabits = {};
  rows.slice(1).forEach((r, i) => {
    const d = (r[ix('date')] || '').trim(), name = (r[ix('habit')] || '').trim(), st = (r[ix('status')] || '').trim().toLowerCase();
    if (!isValidDs(d)) { errors.push('Строка ' + (i + 2) + ': дата «' + esc(d) + '» не в формате ГГГГ-ММ-ДД.'); return; }
    if (name.length < 2 || name.length > 60) { errors.push('Строка ' + (i + 2) + ': название привычки от 2 до 60 символов.'); return; }
    if (!(st in STATUS_MAP)) { errors.push('Строка ' + (i + 2) + ': неизвестный статус «' + esc(st) + '».'); return; }
    let h = habitsOf().find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!h) { h = newHabits[name.toLowerCase()] = newHabits[name.toLowerCase()] || Object.assign(blankHabit({ name }), { id: uid('h'), startDate: d, type: (r[ix('type')] || '').trim() === 'quit' ? 'quit' : 'build' }); if (d < h.startDate) h.startDate = d; if (h.type === 'quit') { h.dailyTargetMax = 0; h.unit = 'эпизодов'; } }
    const num = k => { const v = ix(k) >= 0 ? (r[ix(k)] || '').trim().replace(',', '.') : ''; return v === '' ? undefined : isFinite(+v) ? +v : NaN; };
    const v = num('value'), o = num('occurrences');
    if (Number.isNaN(v) || Number.isNaN(o)) { errors.push('Строка ' + (i + 2) + ': значение не число.'); return; }
    const t = ix('time') >= 0 ? (r[ix('time')] || '').trim() : '';
    logs.push({ pid: pid(), hid: h.id, date: d, log: { s: STATUS_MAP[st], v, o, t: tmin(t) != null ? t : undefined, n: ix('note') >= 0 ? (r[ix('note')] || '').trim() || undefined : undefined, u: nowIso() } });
  });
  if (errors.length) return { errors };
  return { kind: 'csv', profiles: [], habits: Object.values(newHabits), goals: [], logs };
}
function previewImport(plan, fileName) {
  const exP = new Set(S.meta.profiles.map(p => p.id)), exH = new Set(S.meta.profiles.flatMap(p => habitsOf(p.id)).map(h => h.id)), exG = new Set(S.meta.profiles.flatMap(p => goalsOf(p.id)).map(g => g.id));
  const c = (arr, ex) => ({ n: arr.filter(x => !ex.has(x.id)).length, c: arr.filter(x => ex.has(x.id)).length });
  const P = c(plan.profiles, exP), H = c(plan.habits, exH), G = c(plan.goals, exG);
  let Ln = 0, Lc = 0; plan.logs.forEach(x => { const m = (S.logs[x.pid] || {})[x.hid]; if (m && m[x.date]) Lc++; else Ln++; });
  const row = (label, o) => '<div class="setting"><span class="grow">' + label + '</span><span class="tag">' + o.n + ' новых</span>' + (o.c ? '<span class="tag warm">' + o.c + ' ' + plural(o.c, 'конфликт', 'конфликта', 'конфликтов') + '</span>' : '') + '</div>';
  const conflicts = P.c + H.c + G.c + Lc;
  const body = '<p class="small muted" style="margin-bottom:8px">Файл «' + esc(fileName) + '» проверен. Пока ничего не изменено.</p>' +
    (plan.kind === 'json' ? row('Профили', P) : '') + row(plan.kind === 'csv' ? 'Новые привычки (не найдены по названию)' : 'Привычки', H) + (plan.kind === 'json' ? row('Цели', G) : '') + row('Отметки', { n: Ln, c: Lc }) +
    (conflicts ? '<div class="note warn" style="margin-top:12px">' + ic('info') + '<p class="small">Конфликт — запись с тем же идентификатором или отметка на ту же дату уже есть. Выберите, что с ними делать.</p></div>' : '') +
    '<div class="stack" style="margin-top:14px"><label class="row"><input type="radio" name="imp-mode" value="keep" checked style="width:18px;height:18px;accent-color:var(--accent)"> Добавить новое, существующее не трогать</label>' +
    (conflicts ? '<label class="row"><input type="radio" name="imp-mode" value="replace" style="width:18px;height:18px;accent-color:var(--accent)"> Добавить новое и заменить конфликтующие записи</label>' : '') +
    (plan.kind === 'json' ? '<label class="row"><input type="radio" name="imp-mode" value="all" style="width:18px;height:18px;accent-color:var(--danger)"> Заменить все мои данные содержимым файла</label>' : '') + '</div>';
  openModal('Импорт данных', body, '<button class="btn" data-close>Отмена</button><button class="btn primary" data-imp>Импортировать</button>', { focus: '[data-imp]' });
  MODAL_HANDLERS.current = { click(e) { if (!e.target.closest('[data-imp]')) return;
    const mode = (document.querySelector('input[name="imp-mode"]:checked') || {}).value || 'keep';
    const apply = () => { applyImport(plan, mode); closeModal(); toast('Импорт завершён: ' + (H.n + Ln) + ' ' + plural(H.n + Ln, 'запись', 'записи', 'записей') + ' добавлено'); };
    if (mode === 'all') { closeModal(); confirmBox({ title: 'Заменить все данные?', text: 'Текущие профили, привычки, отметки и цели будут удалены и заменены данными из файла. Это нельзя отменить.', ok: 'Заменить', danger: true }).then(ok => { if (ok) { applyImport(plan, mode); toast('Данные заменены'); } }); }
    else apply(); return true; } };
}
function applyImport(plan, mode) {
  if (mode === 'all') {
    S.meta.profiles = plan.profiles; S.meta.activeProfileId = plan.profiles[0].id; S.habits = {}; S.goals = {}; S.logs = {};
    if (plan.settings) S.meta.settings = Object.assign(defaultSettings(), plan.settings);
    plan.profiles.forEach(p => { S.habits[p.id] = []; S.goals[p.id] = []; S.logs[p.id] = {}; });
  }
  const rep = mode !== 'keep';
  plan.profiles.forEach(p => { const i = S.meta.profiles.findIndex(x => x.id === p.id); if (i < 0) { S.meta.profiles.push(p); S.habits[p.id] = S.habits[p.id] || []; S.goals[p.id] = S.goals[p.id] || []; } else if (rep && mode !== 'all') S.meta.profiles[i] = p; });
  plan.habits.forEach(h => { const L = habitsOf(h.profileId); const i = L.findIndex(x => x.id === h.id); if (i < 0) L.push(h); else if (rep) L[i] = h; });
  plan.goals.forEach(g => { const L = goalsOf(g.profileId); const i = L.findIndex(x => x.id === g.id); if (i < 0) L.push(g); else if (rep) L[i] = g; });
  plan.logs.forEach(x => { const m = ((S.logs[x.pid] = S.logs[x.pid] || {})[x.hid] = S.logs[x.pid][x.hid] || {}); if (!m[x.date] || rep) { const l = Object.assign({}, x.log); Object.keys(l).forEach(k => l[k] === undefined && delete l[k]); m[x.date] = l; } });
  commit('all');
}
function handleImportFile(file) {
  const err = $('#import-err'); if (err) err.textContent = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { err.textContent = 'Файл больше 5 МБ — это не похоже на экспорт трекера.'; return; }
  const rd = new FileReader();
  rd.onload = () => {
    let plan;
    try { plan = /\.csv$/i.test(file.name) ? planFromCsv(String(rd.result)) : planFromJson(JSON.parse(String(rd.result))); }
    catch (e) { plan = { errors: ['Файл повреждён или это не JSON: ' + esc(e.message)] }; }
    if (plan.errors) { const box = $('#import-err'); if (box) box.innerHTML = 'Импорт отменён, данные не изменены.<br>' + plan.errors.slice(0, 5).join('<br>') + (plan.errors.length > 5 ? '<br>…и ещё ' + (plan.errors.length - 5) : ''); return; }
    if (!plan.logs.length && !plan.habits.length && !plan.profiles.length) { $('#import-err').textContent = 'В файле нет данных для импорта.'; return; }
    previewImport(plan, file.name);
  };
  rd.onerror = () => { $('#import-err').textContent = 'Не удалось прочитать файл.'; };
  rd.readAsText(file);
}

/* ---------- actions ---------- */
function freshStart(keepSettings) {
  const st = keepSettings && S.meta ? S.meta.settings : defaultSettings(), p = newProfile();
  S.meta = { version: 1, activeProfileId: p.id, profiles: [p], settings: st, lastAi: null };
  S.habits = { [p.id]: [] }; S.goals = { [p.id]: [] }; S.logs = { [p.id]: {} };
  S.demo = false; commit('all');
}
function deleteHabit(h) {
  confirmBox({ title: 'Удалить привычку?', text: 'Привычка «' + esc(h.name) + '» и все её отметки будут удалены без возможности восстановления. Если хотите сохранить историю — отправьте её в архив.', ok: 'Удалить', danger: true }).then(ok => {
    if (!ok) return;
    S.habits[pid()] = habitsOf().filter(x => x.id !== h.id); delete logsOf()[h.id];
    goalsOf().forEach(g => g.habitIds = g.habitIds.filter(x => x !== h.id));
    toast('Привычка удалена'); commit('all');
  });
}
const ACTIONS = {
  'more-menu': el => openMenu(el, ROUTES.filter(r => !['today', 'habits', 'calendar', 'stats'].includes(r.id)).map(r => ({ label: r.name, icon: r.icon, fn: () => go(r.id) }))),
  toggle: el => { const h = habitById(el.dataset.id); if (el.dataset.d > today()) return; toggleDone(h, el.dataset.d); },
  inc: el => addValue(habitById(el.dataset.id), el.dataset.d, 1),
  hold: el => { const h = habitById(el.dataset.id); setLog(h, el.dataset.d, { s: 'completed', o: 0, t: nowTime() }); },
  episode: el => { const h = habitById(el.dataset.id); addEpisode(h, el.dataset.d, 1); const l = getLog(h, el.dataset.d); if (l.s === 'failed') toast('Эпизод записан. Один срыв не отменяет прогресс — продолжим завтра.'); },
  details: el => openDetails(habitById(el.dataset.id)),
  'edit-habit': el => openHabitEditor(habitById(el.dataset.id)),
  'new-habit': () => openHabitEditor(null),
  templates: () => openTemplates(),
  'habit-menu': el => { const h = habitById(el.dataset.id), d = el.dataset.d || today();
    openMenu(el, [
      { label: 'Подробнее', icon: 'info', fn: () => openDetails(h) },
      { label: 'Редактировать', icon: 'edit', fn: () => openHabitEditor(h) },
      { label: 'Отметки за ' + (d === today() ? 'сегодня' : fmtDate(d)) + '…', icon: 'calendar', fn: () => openDay(d) },
      ...(d <= today() && !h.archived ? [{ label: 'Пропуск', icon: 'skip', fn: () => setLog(h, d, { s: 'skipped' }) }, { label: 'Уважительная причина', icon: 'shield', fn: () => setLog(h, d, { s: 'excused' }) }] : []),
      { sep: true },
      { label: 'Дублировать', icon: 'copy', fn: () => { const c = JSON.parse(JSON.stringify(h)); c.id = uid('h'); c.name = (h.name + ' (копия)').slice(0, 60); c.createdAt = c.updatedAt = nowIso(); habitsOf().push(c); toast('Создана копия'); commit(); } },
      { label: h.archived ? 'Вернуть из архива' : 'Архивировать', icon: h.archived ? 'restore' : 'archive', fn: () => { h.archived = !h.archived; h.updatedAt = nowIso(); toast(h.archived ? 'Привычка в архиве. История сохранена.' : 'Привычка снова активна'); commit(); } },
      { label: 'Удалить', icon: 'trash', danger: true, fn: () => deleteHabit(h) }
    ]); },
  'demo-keep': () => { S.demo = false; Store.markAll(); S.ver++; toast('Пример сохранён — теперь это ваши данные'); render(); },
  'demo-clear': () => confirmBox({ title: 'Начать с чистого листа?', text: 'Пример привычек и отметок будет убран. Настройки внешнего вида останутся.', ok: 'Очистить' }).then(ok => ok && freshStart(true)),
  'dash-date': el => { const n = addDays(U.dashDate || today(), +el.dataset.delta); if (n <= today()) { U.dashDate = n; render(); } },
  hfilter: el => { U.habitFilter = el.dataset.v; render(); },
  'cal-month': el => { const [y, m] = U.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + (+el.dataset.delta), 1, 12); U.calMonth = toDs(d).slice(0, 7); render(); },
  'cal-today': () => { U.calMonth = today().slice(0, 7); U.weekOffset = 0; render(); },
  day: el => openDay(el.dataset.d),
  'week-shift': el => { U.weekOffset += +el.dataset.delta; render(); },
  period: el => { U.statPeriod = +el.dataset.v; saveUi(); render(); },
  install: async () => { if (!INSTALL_EVT) return; INSTALL_EVT.prompt(); try { await INSTALL_EVT.userChoice; } catch (e) {} INSTALL_EVT = null; render(); },
  'install-hide': () => { try { localStorage.setItem('habit-tracker:install-hint', 'off'); } catch (e) {} render(); },
  'sys-notify': async () => {
    const st = settings();
    if (st.systemNotify && Notification.permission === 'granted') { st.systemNotify = false; commit(['meta']); return; }
    let p = Notification.permission;
    if (p === 'default') { try { p = await Notification.requestPermission(); } catch (e) { p = 'denied'; } }
    if (p !== 'granted') { toast('Уведомления не разрешены. Их можно включить в настройках браузера для этого сайта.'); render(); return; }
    st.systemNotify = true; commit(['meta']); systemNotify('Уведомления включены', 'Напомню о привычках в выбранное время.', 'test');
  },
  'new-goal': () => { if (!activeHabits().length) { toast('Сначала добавьте хотя бы одну привычку'); return; } openGoalEditor(null); },
  'goal-menu': el => { const g = goalsOf().find(x => x.id === el.dataset.id);
    openMenu(el, [
      { label: 'Редактировать', icon: 'edit', fn: () => openGoalEditor(g) },
      { label: 'Показывать на главной', icon: 'home', fn: () => { goalsOf().forEach(x => x.primary = x.id === g.id); commit(); } },
      { label: 'Удалить цель', icon: 'trash', danger: true, fn: () => confirmBox({ title: 'Удалить цель?', text: 'Цель «' + esc(g.title) + '» будет удалена. Привычки и отметки останутся.', ok: 'Удалить', danger: true }).then(ok => { if (ok) { S.goals[pid()] = goalsOf().filter(x => x.id !== g.id); commit(); } }) }
    ]); },
  'rem-toggle': el => { const h = habitById(el.dataset.id); h.reminder = h.reminder || { time: '09:00', adaptive: false }; h.reminder.enabled = !h.reminder.enabled; h.updatedAt = nowIso(); commit(); },
  'rem-global': () => { settings().remindersEnabled = !settings().remindersEnabled; commit(['meta']); },
  'quiet-toggle': () => { settings().quietEnabled = !settings().quietEnabled; commit(['meta']); },
  adapt: el => { const h = habitById(el.dataset.id); h.reminder.time = el.dataset.v; h.updatedAt = nowIso(); toast('Напоминание перенесено на ' + el.dataset.v); commit(); },
  'set-theme': el => { settings().theme = el.dataset.v; commit(['meta']); },
  'set-accent': el => { if (ACCENTS[el.dataset.v]) { settings().accent = el.dataset.v; commit(['meta']); } },
  'set-density': el => { settings().density = el.dataset.v; commit(['meta']); },
  'set-weekstart': el => { activeProfile().weekStart = +el.dataset.v; activeProfile().updatedAt = nowIso(); commit(['meta']); },
  'widget-toggle': el => { const w = settings().widgets.find(x => x.id === el.dataset.v); w.visible = !w.visible; commit(['meta']); },
  'widget-move': el => { const ws = settings().widgets, i = ws.findIndex(x => x.id === el.dataset.v), j = i + (+el.dataset.delta); if (j < 0 || j >= ws.length) return; [ws[i], ws[j]] = [ws[j], ws[i]]; commit(['meta']); },
  'new-profile': () => openProfileEditor(null),
  'edit-profile': el => openProfileEditor(S.meta.profiles.find(p => p.id === el.dataset.id)),
  'switch-profile': el => { S.meta.activeProfileId = el.dataset.id; U.calHabit = 'all'; U.statHabit = 'all'; U.dashDate = null; toast('Профиль переключён'); commit(['meta']); },
  'delete-profile': el => { const p = S.meta.profiles.find(x => x.id === el.dataset.id);
    confirmBox({ title: 'Удалить профиль?', text: 'Профиль «' + esc(p.name || 'без имени') + '» и все его привычки, отметки и цели будут удалены без возможности восстановления.', ok: 'Удалить профиль', danger: true }).then(ok => {
      if (!ok) return; S.meta.profiles = S.meta.profiles.filter(x => x.id !== p.id); delete S.habits[p.id]; delete S.goals[p.id]; delete S.logs[p.id];
      if (S.meta.activeProfileId === p.id) S.meta.activeProfileId = S.meta.profiles[0].id; toast('Профиль удалён'); commit('all'); }); },
  'cat-remove': el => { const c = el.dataset.v, used = habitsOf().filter(h => h.category === c).length;
    if (settings().categories.length <= 1) { toast('Нужна хотя бы одна категория'); return; }
    if (used) { toast('Категория используется в ' + used + ' ' + plural(used, 'привычке', 'привычках', 'привычках') + '. Сначала смените у них категорию.'); return; }
    settings().categories = settings().categories.filter(x => x !== c); commit(['meta']); },
  'export-json': () => saveFile('habit-tracker-' + today() + '.json', JSON.stringify(exportObject(), null, 2)),
  'export-csv': () => saveFile('habit-log-' + today() + '.csv', exportCsv()),
  'export-report': () => saveFile('habit-report-' + today() + '.html', exportReport()),
  'reset-all': () => confirmBox({ title: 'Удалить все данные?', text: 'Все профили, привычки, отметки, цели и настройки будут удалены без возможности восстановления.', ok: 'Удалить всё', danger: true }).then(ok => { if (ok) { freshStart(false); toast('Все данные удалены'); } })
};

/* ---------- event wiring ---------- */
document.addEventListener('click', e => {
  if (window._menu && !window._menu.contains(e.target)) { closeMenu(); if (!e.target.closest('[data-act="habit-menu"],[data-act="goal-menu"],[data-act="more-menu"],#profile-btn')) return; }
  const mr = $('#modal-root');
  if (mr.contains(e.target)) {
    if (e.target.matches('[data-overlay]') || e.target.closest('[data-close]')) { const h = MODAL_HANDLERS.current; closeModal(); h && h.close && h.close(); return; }
    if (MODAL_HANDLERS.current && MODAL_HANDLERS.current.click && MODAL_HANDLERS.current.click(e)) return;
    return;
  }
  const nav = e.target.closest('[data-nav]'); if (nav) { go(nav.dataset.nav); return; }
  const a = e.target.closest('[data-act]'); if (a && ACTIONS[a.dataset.act] && !a.disabled) { e.preventDefault(); ACTIONS[a.dataset.act](a, e); return; }
  if (e.target.closest('#theme-btn')) { settings().theme = isDarkNow() ? 'light' : 'dark'; commit(['meta']); return; }
  if (e.target.closest('#bell-btn')) { openBell(); return; }
  const pb = e.target.closest('#profile-btn');
  if (pb) openMenu(pb, [...S.meta.profiles.map(p => ({ label: (p.id === pid() ? '✓ ' : '') + (p.name || (p.id === S.meta.profiles[0].id ? displayName() : 'Без имени')), icon: 'user', fn: () => { if (p.id !== pid()) ACTIONS['switch-profile']({ dataset: { id: p.id } }); } })), { sep: true }, { label: 'Профиль и настройки', icon: 'settings', fn: () => go('profile') }, { label: 'Новый профиль', icon: 'plus', fn: () => openProfileEditor(null) }]);
});
let _txtTimer = null;
function onField(e) {
  const t = e.target, id = t.id;
  if ($('#modal-root').contains(t)) { const h = MODAL_HANDLERS.current; if (h && h[e.type]) h[e.type](e); else if (h && e.type === 'input' && h.input) h.input(e); return; }
  if (id === 'global-search' && e.type === 'input') { U.search = t.value; U.habitFilter = U.habitFilter === 'archived' ? 'all' : U.habitFilter; if (U.route !== 'habits') { U.route = 'habits'; saveUi(); } render(); t.focus(); return; }
  if (id === 'habit-search' && e.type === 'input') { U.search = t.value; $('#global-search').value = t.value; render(); return; }
  if (id === 'help-search' && e.type === 'input') { U.helpQ = t.value; render(); return; }
  if (e.type !== 'change' && !['font-size', 'app-name', 'greeting'].includes(id)) return;
  if (id === 'habit-sort') { U.habitSort = t.value; saveUi(); render(); }
  else if (id === 'cal-habit') { U.calHabit = t.value; render(); }
  else if (id === 'stat-habit') { U.statHabit = t.value; render(); }
  else if (t.dataset.rtime) { const h = habitById(t.dataset.rtime); if (tmin(t.value) == null) { toast('Укажите время в формате ЧЧ:ММ'); return; } h.reminder.time = t.value; h.updatedAt = nowIso(); commit(); }
  else if (id === 'quiet-start' || id === 'quiet-end') { if (tmin(t.value) == null) return; settings()[id === 'quiet-start' ? 'quietStart' : 'quietEnd'] = t.value; commit(['meta']); }
  else if (id === 'font-size') { settings().fontSize = clamp(+t.value, 13, 18); applyTheme(); if (e.type === 'change') commit(['meta']); }
  else if (id === 'app-name' || id === 'greeting') {
    const v = t.value.trim(); if (id === 'app-name' && !v) return;
    settings()[id === 'app-name' ? 'appName' : 'greeting'] = v; renderShell();
    clearTimeout(_txtTimer); _txtTimer = setTimeout(() => commit(['meta']), 600);
  }
  else if (id === 'quote-sel') { settings().quoteIndex = +t.value; commit(['meta']); }
  else if (id === 'tz') { activeProfile().timezone = t.value; activeProfile().updatedAt = nowIso(); commit(['meta']); }
  else if (id === 'import-file') { handleImportFile(t.files && t.files[0]); t.value = ''; }
}
document.addEventListener('input', onField);
document.addEventListener('change', onField);
document.addEventListener('submit', e => {
  const f = e.target.closest('form'); if (!f) return; e.preventDefault();
  if (f.dataset.form === 'cat-add') { const inp = $('#cat-new'), v = inp.value.trim(), err = $('#cat-err');
    if (v.length < 2 || v.length > 24) { err.textContent = 'Название категории: от 2 до 24 символов.'; inp.focus(); return; }
    if (settings().categories.some(c => c.toLowerCase() === v.toLowerCase())) { err.textContent = 'Такая категория уже есть.'; inp.focus(); return; }
    settings().categories.push(v); commit(['meta']); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (window._menu) { closeMenu(); return; }
  if ($('#modal-root').firstChild) { const h = MODAL_HANDLERS.current; closeModal(); h && h.close && h.close(); }
});
/* tooltips for chart marks */
const TIP = document.createElement('div'); TIP.className = 'tip'; TIP.style.position = 'fixed'; TIP.hidden = true; document.body.appendChild(TIP);
document.addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t) { TIP.hidden = true; return; } const r = t.getBoundingClientRect(); TIP.textContent = t.dataset.tip; TIP.hidden = false; TIP.style.left = clamp(r.left + r.width / 2, 80, innerWidth - 80) + 'px'; TIP.style.top = Math.max(40, r.top) + 'px'; });
document.addEventListener('scroll', () => { TIP.hidden = true; }, true);

/* ---------- start-up ---------- */
async function init() {
  remLoad();
  const docs = await Store.load();
  if (!applyDocs(docs)) buildDemo();
  if (!ROUTES.some(r => r.id === U.route)) U.route = 'today';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
  checkReminders(); setInterval(checkReminders, 30000);
  // re-render at midnight / when returning to the tab so "today" stays correct
  let lastDay = today();
  setInterval(() => { const d = today(); if (d !== lastDay) { lastDay = d; S.ver++; U.dashDate = null; render(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { S.ver++; render(); checkReminders(); } });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderShell()); } catch (e) {}
  window.addEventListener('pagehide', () => { if (Store.dirty.size) Store.flush(); });
}
init();

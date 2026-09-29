/* ============================================================
   MODALS — dialogs, menus, toasts, editors
   ============================================================ */
'use strict';

/* ---------- toast ---------- */
function toast(msg, actions, opts) {
  const root = $('#toast-root'); const el = document.createElement('div');
  el.className = 'toast' + (opts && opts.cls ? ' ' + opts.cls : '');
  el.innerHTML = '<div style="flex:1">' + msg + '</div>' + (actions || []).map((a, i) => '<button class="btn sm' + (a.primary ? ' primary' : '') + '" data-i="' + i + '">' + esc(a.label) + '</button>').join('');
  el.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const a = actions[+b.dataset.i]; el.remove(); a.fn && a.fn(); });
  root.appendChild(el);
  if (!(opts && opts.sticky)) setTimeout(() => el.remove(), (opts && opts.ms) || 4500);
  return el;
}

/* ---------- modal ---------- */
let _modalReturn = null;
function openModal(title, body, foot, opts) {
  opts = opts || {};
  _modalReturn = document.activeElement;
  $('#modal-root').innerHTML = '<div class="overlay" data-overlay><div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
    '<div class="modal-head"><h2 id="modal-title" style="flex:1">' + title + '</h2><button class="icon-btn" data-close aria-label="Закрыть">' + ic('x') + '</button></div>' +
    '<div class="modal-body" id="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot" id="modal-foot">' + foot + '</div>' : '') + '</div></div>';
  const m = $('#modal-root .modal');
  setTimeout(() => { const f = m.querySelector(opts.focus || 'input:not([type=hidden]),select,textarea,.modal-foot .btn.primary,button'); f && f.focus(); }, 20);
  return m;
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  if (_modalReturn && document.contains(_modalReturn)) try { _modalReturn.focus(); } catch (e) {}
  _modalReturn = null; MODAL_HANDLERS.current = null;
}
const MODAL_HANDLERS = { current: null };
function confirmBox(o) {
  return new Promise(res => {
    openModal(esc(o.title), '<p>' + o.text + '</p>', '<button class="btn" data-cb="0">' + esc(o.cancel || 'Отмена') + '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-cb="1">' + esc(o.ok || 'Подтвердить') + '</button>', { size: 'narrow', focus: '[data-cb="0"]' });
    MODAL_HANDLERS.current = { click(e) { const b = e.target.closest('[data-cb]'); if (b) { closeModal(); res(b.dataset.cb === '1'); return true; } }, close() { res(false); } };
  });
}

/* ---------- popup menu ---------- */
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => it.sep ? '<div class="hr" style="margin:4px 0"></div>' : '<button role="menuitem" data-mi="' + i + '"' + (it.danger ? ' class="danger"' : '') + '>' + ic(it.icon || 'right') + esc(it.label) + '</button>').join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = clamp(r.right - w, 8, innerWidth - w - 8) + 'px';
  m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  m.addEventListener('click', e => { const b = e.target.closest('[data-mi]'); if (!b) return; closeMenu(); items[+b.dataset.mi].fn(); });
  m._anchor = anchor; window._menu = m;
  const f = m.querySelector('button'); f && f.focus();
}
function closeMenu() { if (window._menu) { const a = window._menu._anchor; window._menu.remove(); window._menu = null; if (a && document.contains(a)) a.focus(); } }

/* ---------- habit editor ---------- */
const TEMPLATES = [
  { name: 'Вода', description: 'Выпивать 2 литра воды в день', icon: 'drop', color: '#5B9BD5', goal: 8, unit: 'стаканов', category: 'Здоровье', difficulty: 'easy', cue: { type: 'routine', value: 'После пробуждения' }, time: '08:00' },
  { name: 'Чтение', description: 'Прочитать 20 страниц', icon: 'book', color: '#6E8B4E', goal: 20, unit: 'страниц', category: 'Развитие', cue: { type: 'routine', value: 'После ужина' }, time: '20:30' },
  { name: '8 000 шагов', description: 'Прогулка в течение дня', icon: 'run', color: '#E0662F', goal: 8000, unit: 'шагов', category: 'Спорт', time: '18:00' },
  { name: 'Зарядка', description: '10 минут утренней разминки', icon: 'dumbbell', color: '#E0662F', goal: 10, unit: 'мин', category: 'Спорт', difficulty: 'easy', cue: { type: 'routine', value: 'После умывания' }, time: '07:15' },
  { name: 'Медитация', description: '10 минут тишины', icon: 'flower', color: '#3E9A8E', goal: 10, unit: 'мин', category: 'Осознанность', cue: { type: 'routine', value: 'После утреннего кофе' }, time: '07:30' },
  { name: 'Английский', description: '15 минут практики', icon: 'brain', color: '#8B78C7', goal: 15, unit: 'мин', category: 'Развитие', recurrence: { type: 'weekdays', weekdays: [0, 1, 2, 3, 4] }, time: '19:00' },
  { name: 'Дневник благодарности', description: 'Три вещи, за которые я благодарен', icon: 'pen', color: '#C99A2E', goal: 3, unit: 'пункта', category: 'Осознанность', difficulty: 'easy', cue: { type: 'routine', value: 'Перед сном' }, time: '22:00' },
  { name: 'Тренировка', description: 'Силовая или кардио', icon: 'dumbbell', color: '#D9534F', goal: 45, unit: 'мин', category: 'Спорт', difficulty: 'hard', recurrence: { type: 'timesPerWeek', timesPerWeek: 3 }, time: '19:00' },
  { name: 'Без сладкого', description: 'Не есть сладкое и выпечку', type: 'quit', icon: 'ban', color: '#D9534F', dailyTargetMax: 0, unit: 'эпизодов', category: 'Питание' },
  { name: 'Не курить', description: 'День без сигарет', type: 'quit', icon: 'ban', color: '#8C8A6E', dailyTargetMax: 0, unit: 'сигарет', category: 'Здоровье', difficulty: 'hard', importance: 5 },
  { name: 'Меньше соцсетей', description: 'Не больше двух заходов в день', type: 'quit', icon: 'phone', color: '#C99A2E', dailyTargetMax: 2, unit: 'заходов', category: 'Осознанность' },
  { name: 'Кофе до 14:00', description: 'Не пить кофе после обеда', type: 'quit', icon: 'coffee', color: '#B8622E', dailyTargetMax: 0, unit: 'чашек', category: 'Сон' }
];
function blankHabit(t) {
  t = t || {}; const n = nowIso();
  return {
    id: null, profileId: pid(), name: t.name || '', description: t.description || '', type: t.type || 'build', category: t.category || settings().categories[0] || 'Другое',
    icon: t.icon || 'leaf', emoji: '', color: t.color || HABIT_COLORS[habitsOf().length % HABIT_COLORS.length], difficulty: t.difficulty || 'medium', importance: t.importance || 3, priority: 'medium',
    goal: t.goal || 1, unit: t.unit || 'раз', dailyTargetMax: t.type === 'quit' ? (t.dailyTargetMax || 0) : null,
    recurrence: t.recurrence || { type: 'daily' }, cue: t.cue || { type: 'none', value: '' },
    reminder: { enabled: !!t.time, time: t.time || '09:00', adaptive: true }, startDate: today(), archived: false, motivation: '', createdAt: n, updatedAt: n
  };
}
let DRAFT = null, DRAFT_ERR = {}, DRAFT_TOUCHED = false;
function previewCard(h) {
  const p = Object.assign({}, h, { id: '_preview' });
  return '<span class="label-kind">Предпросмотр</span><div class="habit" style="--hc:' + safeColor(p.color) + ';margin-top:6px"><span class="hicon">' + hIcon(p) + '</span><div class="hbody"><div class="hname">' + (esc(p.name) || '<span class="muted">Название привычки</span>') + ' <span class="tag">' + esc(p.category) + '</span>' + (partOfDay(p.reminder.enabled && p.reminder.time) ? '<span class="tag warm">' + partOfDay(p.reminder.time) + '</span>' : '') + (p.type === 'quit' ? '<span class="tag bad">Избавиться</span>' : '') + '</div><div class="hdesc">' + esc(p.description || recurrenceText(p)) + '</div></div>' +
    '<span class="hmeta desk num">' + (p.type === 'quit' ? 'лимит ' + (p.dailyTargetMax || 0) : '0/' + (p.goal || '?') + ' ' + esc(p.unit)) + '</span><span class="check" aria-hidden="true">' + ic('check') + '</span></div>';
}
function editorBody(h, err) {
  const f = (k) => err[k] ? '<p class="err" id="e-' + k + '">' + esc(err[k]) + '</p>' : '';
  const inv = k => err[k] ? ' aria-invalid="true" aria-describedby="e-' + k + '"' : '';
  const r = h.recurrence, cats = settings().categories.includes(h.category) ? settings().categories : settings().categories.concat([h.category]);
  const sb = (grp, v, label, cur) => '<button type="button" data-hf="' + grp + '" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + label + '</button>';
  return '<div id="hf-preview">' + previewCard(h) + '</div><div class="form-grid" style="margin-top:16px">' +
    '<div class="field full"><label for="hf-name">Название привычки *</label><input class="input" id="hf-name" maxlength="60" value="' + esc(h.name) + '" placeholder="Например, Вода"' + inv('name') + '>' + f('name') + '</div>' +
    '<div class="field full"><label for="hf-desc">Описание</label><input class="input" id="hf-desc" maxlength="500" value="' + esc(h.description) + '" placeholder="Выпивать 2 литра чистой воды в день"' + inv('description') + '>' + f('description') + '</div>' +
    '<div class="field full"><span class="flabel">Тип привычки</span><div class="seg" role="group" aria-label="Тип привычки">' + sb('type', 'build', ic('check') + ' Полезная привычка', h.type) + sb('type', 'quit', ic('ban') + ' Избавиться от привычки', h.type) + '</div></div>' +
    '<div class="field full"><span class="flabel">Иконка</span><div class="iconpick" role="group" aria-label="Иконка">' + HABIT_ICONS.map(i => '<button type="button" data-hf="icon" data-v="' + i + '" aria-pressed="' + (!h.emoji && h.icon === i) + '" aria-label="Иконка ' + i + '">' + ic(i) + '</button>').join('') +
    '<label class="sr" for="hf-emoji">Или emoji</label><input class="input" id="hf-emoji" maxlength="4" value="' + esc(h.emoji) + '" placeholder="emoji" style="width:84px;min-height:44px;text-align:center"></div></div>' +
    '<div class="field full"><span class="flabel">Цвет</span><div class="swatches" role="group" aria-label="Цвет">' + HABIT_COLORS.map(c => '<button type="button" class="sw" style="background:' + c + '" data-hf="color" data-v="' + c + '" aria-pressed="' + (h.color === c) + '" aria-label="Цвет ' + c + '">' + (h.color === c ? ic('check') : '') + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="hf-cat">Категория</label><select class="input" id="hf-cat">' + cats.map(c => '<option' + (c === h.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' +
    (h.type === 'build'
      ? '<div class="field"><span class="flabel">Целевая норма *</span><div class="row" style="flex-wrap:nowrap"><label class="sr" for="hf-goal">Цель</label><input class="input num" type="number" id="hf-goal" min="0.1" step="any" value="' + esc(h.goal) + '" style="width:110px"' + inv('goal') + '><label class="sr" for="hf-unit">Единица</label><input class="input" id="hf-unit" maxlength="20" value="' + esc(h.unit) + '" placeholder="стаканов"></div>' + f('goal') + '</div>'
      : '<div class="field"><span class="flabel">Допустимо эпизодов в день *</span><div class="row" style="flex-wrap:nowrap"><label class="sr" for="hf-max">Лимит</label><input class="input num" type="number" id="hf-max" min="0" step="1" value="' + esc(h.dailyTargetMax || 0) + '" style="width:110px"' + inv('goal') + '><label class="sr" for="hf-unit">Единица</label><input class="input" id="hf-unit" maxlength="20" value="' + esc(h.unit) + '" placeholder="эпизодов"></div><p class="hint">День успешен, если эпизодов не больше лимита.</p>' + f('goal') + '</div>') +
    '<div class="field full"><span class="flabel">Частота</span><div class="seg" role="group" aria-label="Частота">' + sb('rtype', 'daily', 'Ежедневно', r.type) + sb('rtype', 'weekdays', 'Выбрать дни', r.type) + sb('rtype', 'interval', 'Каждые N дней', r.type) + sb('rtype', 'timesPerWeek', 'X раз в неделю', r.type) + '</div>' +
    (r.type === 'weekdays' ? '<div class="daypick" role="group" aria-label="Дни недели" style="margin-top:8px">' + DOW_S.map((d, i) => '<button type="button" data-hf="wd" data-v="' + i + '" aria-pressed="' + (r.weekdays || []).includes(i) + '">' + d + '</button>').join('') + '<button type="button" class="btn sm ghost" data-hf="wd-work">Будни</button></div>' : '') +
    (r.type === 'interval' ? '<div class="row" style="margin-top:8px"><label for="hf-int">Каждые</label><input class="input num" type="number" id="hf-int" min="1" max="365" value="' + esc(r.intervalDays || 2) + '" style="width:90px"><span>дней, начиная с даты начала</span></div>' : '') +
    (r.type === 'timesPerWeek' ? '<div class="row" style="margin-top:8px"><input class="input num" type="number" id="hf-tpw" min="1" max="7" value="' + esc(r.timesPerWeek || 3) + '" style="width:90px" aria-label="Раз в неделю"><span>раз в неделю, в любые дни</span></div>' : '') + f('recurrence') + '</div>' +
    '<div class="field"><span class="flabel">Сложность</span><div class="seg" role="group" aria-label="Сложность">' + Object.entries(DIFF).map(([k, d]) => sb('diff', k, d.name, h.difficulty)).join('') + '</div><p class="hint">Множитель баллов: ×' + String(DIFF[h.difficulty].k).replace('.', ',') + '</p></div>' +
    '<div class="field"><label for="hf-imp">Важность: <b class="num" id="hf-imp-v">' + h.importance + '</b> из 5</label><input type="range" id="hf-imp" min="1" max="5" value="' + h.importance + '" style="accent-color:var(--accent)"></div>' +
    '<div class="field"><label for="hf-prio">Приоритет</label><select class="input" id="hf-prio">' + [['low', 'Низкий'], ['medium', 'Средний'], ['high', 'Высокий']].map(o => '<option value="' + o[0] + '"' + (h.priority === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="hf-start">Дата начала</label><input class="input" type="date" id="hf-start" value="' + esc(h.startDate) + '"' + inv('startDate') + '>' + f('startDate') + '</div>' +
    '<div class="field full"><span class="flabel">Триггер (контекст)</span><div class="row" style="flex-wrap:nowrap"><label class="sr" for="hf-cuet">Тип триггера</label><select class="input" id="hf-cuet" style="width:auto"><option value="none"' + (h.cue.type === 'none' ? ' selected' : '') + '>Без триггера</option><option value="routine"' + (h.cue.type === 'routine' ? ' selected' : '') + '>После…</option><option value="time"' + (h.cue.type === 'time' ? ' selected' : '') + '>В…</option></select>' +
    '<label class="sr" for="hf-cuev">Триггер</label><input class="input" id="hf-cuev" maxlength="60" value="' + esc(h.cue.value) + '" placeholder="' + (h.cue.type === 'time' ? '08:00 или «в обед»' : 'После завтрака') + '"' + (h.cue.type === 'none' ? ' disabled' : '') + '></div><p class="hint">Привычка закрепляется быстрее, если привязана к действию: «После завтрака выпиваю стакан воды».</p></div>' +
    '<div class="field full"><span class="flabel">Напоминание</span><div class="row"><button type="button" class="switch" role="switch" data-hf="rem" aria-checked="' + h.reminder.enabled + '" aria-label="Напоминать"></button><label class="sr" for="hf-time">Время напоминания</label><input class="input num" type="time" id="hf-time" value="' + esc(h.reminder.time || '09:00') + '" style="width:130px"' + (h.reminder.enabled ? '' : ' disabled') + inv('time') + '>' +
    '<label class="row small" style="gap:6px"><input type="checkbox" id="hf-adapt"' + (h.reminder.adaptive ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent)"> Предлагать время по моей истории</label></div>' + f('time') + '</div>' +
    '<div class="field full"><label for="hf-mot">Мотивационный текст</label><textarea class="input" id="hf-mot" maxlength="200" placeholder="Чем больше воды сегодня, тем больше энергии завтра!">' + esc(h.motivation || '') + '</textarea></div></div>';
}
function readDraft() {
  const h = DRAFT, g = id => document.getElementById(id);
  if (!g('hf-name')) return h;
  h.name = g('hf-name').value; h.description = g('hf-desc').value; h.emoji = g('hf-emoji').value.trim();
  h.category = g('hf-cat').value; h.unit = g('hf-unit').value.trim();
  if (h.type === 'build') h.goal = parseFloat(g('hf-goal').value); else h.dailyTargetMax = parseInt(g('hf-max').value, 10);
  if (g('hf-int')) h.recurrence.intervalDays = parseInt(g('hf-int').value, 10);
  if (g('hf-tpw')) h.recurrence.timesPerWeek = parseInt(g('hf-tpw').value, 10);
  h.importance = +g('hf-imp').value; g('hf-imp-v').textContent = h.importance; h.priority = g('hf-prio').value;
  h.startDate = g('hf-start').value; h.cue = { type: g('hf-cuet').value, value: g('hf-cuev').value.trim() };
  g('hf-cuev').disabled = h.cue.type === 'none';
  h.reminder.time = g('hf-time').value; h.reminder.adaptive = g('hf-adapt').checked; h.motivation = g('hf-mot').value;
  return h;
}
function redrawEditor() {
  const b = $('#modal-body'); if (!b) return; const st = b.scrollTop, ae = document.activeElement, fid = ae && b.contains(ae) && ae.id;
  const sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  DRAFT_ERR = DRAFT_TOUCHED ? validateHabit(DRAFT) : {}; b.innerHTML = editorBody(DRAFT, DRAFT_ERR); b.scrollTop = st;
  if (fid) { const n = document.getElementById(fid); if (n) { n.focus(); if (sel) try { n.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
}
function openHabitEditor(h, tpl) {
  DRAFT = h ? JSON.parse(JSON.stringify(h)) : blankHabit(tpl); DRAFT_ERR = {}; DRAFT_TOUCHED = false;
  if (!DRAFT.cue) DRAFT.cue = { type: 'none', value: '' }; if (!DRAFT.reminder) DRAFT.reminder = { enabled: false, time: '09:00', adaptive: true };
  openModal(h ? 'Редактировать привычку' : 'Создать привычку', editorBody(DRAFT, {}), '<button class="btn" data-close>Отмена</button><button class="btn primary" data-hf="save">' + ic('check') + 'Сохранить</button>', { size: 'wide', focus: '#hf-name' });
  MODAL_HANDLERS.current = {
    click(e) {
      const b = e.target.closest('[data-hf]'); if (!b) return;
      readDraft(); const k = b.dataset.hf, v = b.dataset.v, r = DRAFT.recurrence;
      if (k === 'type') { DRAFT.type = v; if (v === 'quit') { DRAFT.dailyTargetMax = DRAFT.dailyTargetMax || 0; if (DRAFT.unit === 'раз') DRAFT.unit = 'эпизодов'; } else { DRAFT.dailyTargetMax = null; if (!(DRAFT.goal > 0)) DRAFT.goal = 1; } }
      else if (k === 'icon') { DRAFT.icon = v; DRAFT.emoji = ''; }
      else if (k === 'color') DRAFT.color = v;
      else if (k === 'rtype') { DRAFT.recurrence = { type: v, weekdays: r.weekdays || [0, 1, 2, 3, 4], intervalDays: r.intervalDays || 2, timesPerWeek: r.timesPerWeek || 3 }; }
      else if (k === 'wd') { const n = +v, w = new Set(r.weekdays || []); w.has(n) ? w.delete(n) : w.add(n); r.weekdays = [...w].sort(); }
      else if (k === 'wd-work') r.weekdays = [0, 1, 2, 3, 4];
      else if (k === 'diff') DRAFT.difficulty = v;
      else if (k === 'rem') DRAFT.reminder.enabled = !DRAFT.reminder.enabled;
      else if (k === 'save') { saveDraft(); return true; }
      redrawEditor(); return true;
    },
    input() { readDraft(); $('#hf-preview').innerHTML = previewCard(DRAFT); if (DRAFT_TOUCHED) { const e = validateHabit(DRAFT); if (Object.keys(e).join() !== Object.keys(DRAFT_ERR).join()) { redrawEditor(); } } }
  };
}
function saveDraft() {
  readDraft(); DRAFT_TOUCHED = true;
  const h = DRAFT; h.name = h.name.trim(); h.description = h.description.trim();
  if (h.cue.type === 'none') h.cue.value = '';
  const r = h.recurrence; h.recurrence = r.type === 'weekdays' ? { type: r.type, weekdays: r.weekdays } : r.type === 'interval' ? { type: r.type, intervalDays: r.intervalDays } : r.type === 'timesPerWeek' ? { type: r.type, timesPerWeek: r.timesPerWeek } : { type: 'daily' };
  const err = validateHabit(h);
  if (Object.keys(err).length) { redrawEditor(); const first = $('#modal-body [aria-invalid="true"]'); first && first.focus(); return; }
  h.updatedAt = nowIso(); h.color = safeColor(h.color);
  const list = habitsOf();
  if (h.id) { const i = list.findIndex(x => x.id === h.id); list[i] = h; toast('Изменения сохранены'); }
  else { h.id = uid('h'); h.createdAt = h.updatedAt; list.push(h); toast('Привычка «' + esc(h.name) + '» добавлена'); }
  closeModal(); commit();
}
function openTemplates() {
  openModal('Шаблоны привычек', '<p class="muted small" style="margin-bottom:12px">Выберите шаблон — его можно изменить перед сохранением.</p><div class="grid g2">' + TEMPLATES.map((t, i) =>
    '<button class="habit" data-tpl="' + i + '" style="--hc:' + t.color + ';text-align:left;cursor:pointer"><span class="hicon">' + ic(t.icon) + '</span><span class="hbody"><span class="hname">' + esc(t.name) + (t.type === 'quit' ? ' <span class="tag bad">Избавиться</span>' : '') + '</span><span class="hdesc" style="display:block">' + esc(t.description) + '</span></span></button>').join('') + '</div>', '', { size: 'wide' });
  MODAL_HANDLERS.current = { click(e) { const b = e.target.closest('[data-tpl]'); if (b) { const t = TEMPLATES[+b.dataset.tpl]; closeModal(); openHabitEditor(null, t); return true; } } };
}

/* ---------- day modal: view and edit marks for one date ---------- */
function openDay(d) {
  const body = () => {
    const td = today(), hs = habitsOf().filter(h => isScheduled(h, d) && (!h.archived || getLog(h, d)));
    if (!hs.length) return '<div class="empty"><p>На этот день ничего не запланировано.</p></div>';
    if (d > td) return '<p class="muted small" style="margin-bottom:10px">Будущий день нельзя отметить выполненным — здесь только план.</p><div class="stack">' + hs.map(h => '<div class="habit" style="--hc:' + safeColor(h.color) + '"><span class="hicon">' + hIcon(h) + '</span><div class="hbody"><div class="hname">' + esc(h.name) + '</div><div class="hdesc">' + recurrenceText(h) + (h.reminder && h.reminder.enabled ? ' · напоминание ' + esc(h.reminder.time) : '') + '</div></div></div>').join('') + '</div>';
    return '<div class="stack">' + hs.map(h => {
      const l = getLog(h, d) || {}, o = outcome(h, d, td);
      const b = (s, label, icon) => '<button type="button" data-ds="' + s + '" data-id="' + h.id + '" aria-pressed="' + (l.s === s) + '">' + (icon ? ic(icon) + ' ' : '') + label + '</button>';
      return '<div class="card" style="padding:14px;--hc:' + safeColor(h.color) + '"><div class="row" style="flex-wrap:nowrap"><span class="hicon">' + hIcon(h) + '</span><div style="flex:1;min-width:0"><b>' + esc(h.name) + '</b><div class="small muted">' + (o === 'success' ? '✓ Выполнено' : o === 'excused' ? 'Уважительная причина' : o === 'pending' ? 'Ещё не отмечено' : l.s === 'failed' ? '× Нарушение' : 'Не выполнено') + '</div></div></div>' +
        '<div class="seg" role="group" aria-label="Статус" style="margin-top:10px">' + (h.type === 'build' ? b('completed', 'Выполнено', 'check') : b('completed', 'Удержался', 'check') + b('failed', 'Нарушение', 'x')) + b('skipped', 'Пропуск') + b('excused', 'Уважительная причина') + '<button type="button" data-ds="" data-id="' + h.id + '">Сбросить</button></div>' +
        '<div class="row" style="margin-top:10px">' + (h.type === 'build' && h.goal > 1 ? '<label class="row small" style="gap:6px">Сделано <input class="input num" type="number" min="0" step="any" data-dv="' + h.id + '" value="' + esc(l.v != null ? l.v : isSuccessLog(l) ? h.goal : '') + '" style="width:90px;min-height:38px"> из ' + h.goal + ' ' + esc(h.unit) + '</label>' : '') +
        (h.type === 'quit' ? '<label class="row small" style="gap:6px">Эпизодов <input class="input num" type="number" min="0" step="1" data-do="' + h.id + '" value="' + esc(l.o != null ? l.o : '') + '" style="width:80px;min-height:38px"> (лимит ' + (h.dailyTargetMax || 0) + ')</label>' : '') +
        '<label class="row small" style="gap:6px;flex:1;min-width:200px">Заметка <input class="input" maxlength="140" data-dn="' + h.id + '" value="' + esc(l.n || '') + '" placeholder="Например: болела" style="min-height:38px;flex:1"></label></div></div>';
    }).join('') + '</div>';
  };
  openModal(fmtDateLong(d), body(), '<button class="btn primary" data-close>Готово</button>', { size: 'wide', focus: '[data-close]' });
  const redraw = () => { const b = $('#modal-body'); if (b) { const st = b.scrollTop; b.innerHTML = body(); b.scrollTop = st; } };
  MODAL_HANDLERS.current = {
    click(e) {
      const b = e.target.closest('[data-ds]'); if (!b) return;
      const h = habitById(b.dataset.id), s = b.dataset.ds || undefined, l = getLog(h, d) || {};
      const patch = { s };
      if (s === 'completed' && h.type === 'build') patch.v = Math.max(l.v || 0, h.goal);
      if (s === 'completed' && h.type === 'quit') patch.o = Math.min(l.o || 0, h.dailyTargetMax || 0);
      if (!s) { patch.v = undefined; patch.o = undefined; }
      if (s && !l.t) patch.t = d === today() ? nowTime() : undefined;
      setLog(h, d, patch); redraw(); return true;
    },
    change(e) {
      const t = e.target; let h;
      if (t.dataset.dv) { h = habitById(t.dataset.dv); const v = Math.max(0, parseFloat(t.value) || 0); const l = getLog(h, d) || {}; setLog(h, d, { v, s: v >= h.goal ? 'completed' : (l.s === 'completed' ? undefined : l.s) }); }
      else if (t.dataset.do) { h = habitById(t.dataset.do); const o = Math.max(0, parseInt(t.value, 10) || 0); setLog(h, d, { o, s: o > (h.dailyTargetMax || 0) ? 'failed' : 'completed' }); }
      else if (t.dataset.dn) { h = habitById(t.dataset.dn); setLog(h, d, { n: t.value.trim() || undefined }); return true; }
      else return;
      redraw(); return true;
    }
  };
}

/* ---------- habit details ---------- */
function openDetails(h) {
  const td = today(), c = habitCore(h), r30 = habitRate(h, addDays(td, -29), td), e = forecast(h);
  const days = []; const start = addDays(weekStartOf(td, activeProfile().weekStart), -28);
  for (let i = 0; i < 35; i++) days.push(addDays(start, i));
  const L = logsOf()[h.id] || {}; const recent = Object.keys(L).sort().reverse().slice(0, 12);
  const body = '<div class="row" style="flex-wrap:nowrap;gap:14px;--hc:' + safeColor(h.color) + '"><span class="hicon" style="width:56px;height:56px">' + hIcon(h) + '</span><div style="min-width:0"><div class="hname" style="font-size:1.1rem">' + esc(h.name) + ' <span class="tag">' + esc(h.category) + '</span></div><p class="small muted">' + esc(h.description) + '</p><p class="small muted">' + recurrenceText(h) + (h.cue && h.cue.value ? ' · триггер: ' + esc(h.cue.value) : '') + ' · с ' + fmtDate(h.startDate) + '</p></div></div>' +
    (h.motivation ? '<p class="script" style="font-size:1.35rem;margin-top:10px;color:var(--accent)">' + esc(h.motivation) + '</p>' : '') +
    '<div class="grid g4" style="margin-top:14px">' + [['Текущая серия', c.current + ' ' + c.unit], ['Лучшая серия', c.best + ' ' + c.unit], ['За 30 дней', pct(r30.rate) + ' (' + r30.completed + '/' + r30.eligible + ')'], ['Прогноз', e == null ? 'мало данных' : pct(e * 100)], ['Всего выполнено', c.total], ['Баллы', c.points], ['Приоритет', priorityScore(h) + ' / 100'], ['Сложность', DIFF[h.difficulty].name]].map(x => '<div class="ai-block"><div class="tiny muted">' + x[0] + '</div><b class="num">' + x[1] + '</b></div>').join('') + '</div>' +
    '<h3 style="margin:16px 0 8px">Последние 5 недель</h3><div class="cal">' + days.map(d => { const o = d > td ? 'f' : !isScheduled(h, d) ? 'n' : outcome(h, d, td); const l = getLog(h, d);
      return '<button class="day ' + (o === 'success' ? 's-full' : o === 'fail' && l && l.s === 'failed' ? 's-bad' : o === 'n' ? 's-none' : '') + (d === td ? ' today' : '') + (o === 'f' ? ' out' : '') + '" data-open-day="' + d + '" style="aspect-ratio:auto;min-height:44px" aria-label="' + fmtDate(d) + '"><span class="num tiny">' + fromDs(d).getDate() + '</span>' + (o === 'success' ? '<span class="m ok">' + ic('check') + '</span>' : o === 'fail' ? (l && l.s === 'failed' ? '<span class="m bad">' + ic('x') + '</span>' : '<span class="m neutral"></span>') : o === 'excused' ? '<span class="tiny muted">уваж.</span>' : '') + '</button>'; }).join('') + '</div>' +
    '<h3 style="margin:16px 0 8px">История отметок</h3>' + (recent.length ? recent.map(d => { const l = L[d]; return '<div class="setting small"><span class="num" style="width:90px">' + fmtDate(d) + '</span><span class="grow">' + (STATUS_NAMES[l.s] || 'Частично') + (l.v != null && h.type === 'build' ? ' · ' + l.v + ' ' + esc(h.unit) : '') + (l.o != null && h.type === 'quit' ? ' · эпизодов: ' + l.o : '') + (l.t ? ' · ' + esc(l.t) : '') + (l.n ? ' · «' + esc(l.n) + '»' : '') + '</span></div>'; }).join('') : '<p class="muted small">Отметок пока нет.</p>');
  openModal('Подробнее', body, '<button class="btn" data-dact="edit">' + ic('edit') + 'Редактировать</button>' + (dueOn(h, td) ? '<button class="btn primary" data-dact="toggle">' + ic('check') + (isDoneToday(h) ? 'Снять отметку' : 'Отметить сегодня') + '</button>' : '<button class="btn primary" data-close>Готово</button>'), { size: 'wide', focus: '[data-close]' });
  MODAL_HANDLERS.current = { click(e) {
    const dd = e.target.closest('[data-open-day]'); if (dd) { closeModal(); openDay(dd.dataset.openDay); return true; }
    const b = e.target.closest('[data-dact]'); if (!b) return;
    closeModal(); if (b.dataset.dact === 'edit') openHabitEditor(h); else { if (h.type === 'quit') toggleDone(h, td); else toggleDone(h, td); }
    return true; } };
}

/* ---------- goal editor ---------- */
function openGoalEditor(g) {
  const d = g ? JSON.parse(JSON.stringify(g)) : { id: null, title: '', description: '', habitIds: [], target: 30, startDate: today(), primary: !goalsOf().length };
  const body = err => '<div class="form-grid"><div class="field full"><label for="gf-title">Название цели *</label><input class="input" id="gf-title" maxlength="80" value="' + esc(d.title) + '" placeholder="Быть более энергичным"' + (err.title ? ' aria-invalid="true"' : '') + '>' + (err.title ? '<p class="err">' + err.title + '</p>' : '') + '</div>' +
    '<div class="field full"><label for="gf-desc">Описание</label><input class="input" id="gf-desc" maxlength="200" value="' + esc(d.description) + '"></div>' +
    '<div class="field"><label for="gf-target">Сколько выполнений нужно *</label><input class="input num" type="number" id="gf-target" min="1" max="100000" value="' + esc(d.target) + '"' + (err.target ? ' aria-invalid="true"' : '') + '>' + (err.target ? '<p class="err">' + err.target + '</p>' : '<p class="hint">Сумма выполнений всех связанных привычек.</p>') + '</div>' +
    '<div class="field"><label for="gf-start">Считать с даты</label><input class="input" type="date" id="gf-start" value="' + esc(d.startDate) + '"' + (err.startDate ? ' aria-invalid="true"' : '') + '>' + (err.startDate ? '<p class="err">' + err.startDate + '</p>' : '') + '</div>' +
    '<div class="field full"><span class="flabel">Связанные привычки *</span><div class="row">' + activeHabits().map(h => '<button type="button" class="chip" data-gh="' + h.id + '" aria-pressed="' + d.habitIds.includes(h.id) + '">' + esc(h.name) + '</button>').join('') + '</div>' + (err.habits ? '<p class="err">' + err.habits + '</p>' : '') + '</div>' +
    '<label class="row full small" style="gap:8px"><input type="checkbox" id="gf-primary"' + (d.primary ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--accent)"> Показывать на главной</label></div>';
  const read = () => { d.title = $('#gf-title').value.trim(); d.description = $('#gf-desc').value.trim(); d.target = parseInt($('#gf-target').value, 10); d.startDate = $('#gf-start').value; d.primary = $('#gf-primary').checked; };
  openModal(g ? 'Изменить цель' : 'Новая цель', body({}), '<button class="btn" data-close>Отмена</button><button class="btn primary" data-gsave>Сохранить</button>', { focus: '#gf-title' });
  MODAL_HANDLERS.current = { click(e) {
    const c = e.target.closest('[data-gh]'); if (c) { read(); const id = c.dataset.gh; d.habitIds = d.habitIds.includes(id) ? d.habitIds.filter(x => x !== id) : d.habitIds.concat(id); $('#modal-body').innerHTML = body({}); return true; }
    if (e.target.closest('[data-gsave]')) {
      read(); const err = {};
      if (d.title.length < 2) err.title = 'Название: от 2 до 80 символов.';
      if (!(d.target >= 1)) err.target = 'Нужно хотя бы одно выполнение.';
      if (!isValidDs(d.startDate)) err.startDate = 'Укажите корректную дату.';
      if (!d.habitIds.length) err.habits = 'Выберите хотя бы одну привычку.';
      if (Object.keys(err).length) { $('#modal-body').innerHTML = body(err); return true; }
      const list = goalsOf(); d.updatedAt = nowIso();
      if (d.primary) list.forEach(x => x.primary = false);
      if (d.id) list[list.findIndex(x => x.id === d.id)] = d; else { d.id = uid('g'); d.profileId = pid(); d.createdAt = d.updatedAt; list.push(d); }
      closeModal(); toast('Цель сохранена'); commit(); return true;
    } } };
}

/* ---------- profile editor ---------- */
function openProfileEditor(p) {
  const isNew = !p; const d = p ? Object.assign({}, p) : newProfile({ name: '', emoji: '🙂', color: HABIT_COLORS[S.meta.profiles.length % HABIT_COLORS.length], weekStart: activeProfile().weekStart, timezone: activeProfile().timezone });
  const emojis = ['🌿', '🙂', '😎', '🦊', '🐻', '🌸', '⭐', '🔥', '🌙', '🏃', '📚', '💪'];
  const body = err => '<div class="row" style="gap:16px;margin-bottom:14px">' + avatarHtml(d, 64) + '<div class="stack" style="flex:1;gap:6px"><span class="flabel small" style="font-weight:600">Аватар</span><div class="row" style="gap:4px">' + emojis.map(e => '<button type="button" class="icon-btn" data-pe="' + e + '" aria-pressed="' + (d.emoji === e) + '" style="font-size:1.3rem;' + (d.emoji === e ? 'background:var(--accent-soft)' : '') + '" aria-label="Эмодзи ' + e + '">' + e + '</button>').join('') + '<button type="button" class="btn sm ghost" data-pe="">Инициалы</button></div>' +
    '<div class="swatches">' + HABIT_COLORS.map(c => '<button type="button" class="sw" style="background:' + c + ';width:30px;height:30px" data-pc="' + c + '" aria-pressed="' + (d.color === c) + '" aria-label="Цвет ' + c + '"></button>').join('') + '</div></div></div>' +
    '<div class="field"><label for="pf-name">Имя *</label><input class="input" id="pf-name" maxlength="50" value="' + esc(d.name) + '" placeholder="' + esc('Как к вам обращаться') + '"' + (err.name ? ' aria-invalid="true"' : '') + '>' + (err.name ? '<p class="err">' + err.name + '</p>' : '<p class="hint">От 1 до 50 символов. Используется в приветствии.</p>') + '</div>' +
    '<div class="field" style="margin-top:12px"><label for="pf-motto">Девиз</label><input class="input" id="pf-motto" maxlength="60" value="' + esc(d.motto || '') + '"></div>';
  const read = () => { d.name = $('#pf-name').value.trim(); d.motto = $('#pf-motto').value.trim(); };
  openModal(isNew ? 'Новый профиль' : 'Профиль', body({}), '<button class="btn" data-close>Отмена</button><button class="btn primary" data-psave>' + (isNew ? 'Создать и переключиться' : 'Сохранить') + '</button>', { size: 'narrow', focus: '#pf-name' });
  MODAL_HANDLERS.current = { click(e) {
    const em = e.target.closest('[data-pe]'), co = e.target.closest('[data-pc]');
    if (em || co) { read(); if (em) d.emoji = em.dataset.pe; if (co) d.color = co.dataset.pc; $('#modal-body').innerHTML = body({}); return true; }
    if (e.target.closest('[data-psave]')) {
      read();
      const needName = true;
      if ((needName && d.name.length < 1) || d.name.length > 50) { $('#modal-body').innerHTML = body({ name: 'Введите имя: от 1 до 50 символов.' }); return true; }
      d.updatedAt = nowIso();
      if (isNew) { S.meta.profiles.push(d); S.meta.activeProfileId = d.id; S.habits[d.id] = []; S.goals[d.id] = []; S.logs[d.id] = {}; }
      else S.meta.profiles[S.meta.profiles.findIndex(x => x.id === d.id)] = d;
      closeModal(); toast(isNew ? 'Профиль создан' : 'Профиль сохранён'); commit(isNew ? ['meta', 'p-' + d.id] : ['meta']); return true;
    } } };
}

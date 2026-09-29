/* ============================================================
   VIEWS (part 2) — calendar, analytics, goals, reminders, profile, data, help
   ============================================================ */
'use strict';

function habitSelect(id, value, withAll) {
  return '<select class="input" id="' + id + '" style="width:auto;min-height:40px;max-width:100%" aria-label="Фильтр по привычке">' + (withAll ? '<option value="all">Все привычки</option>' : '') +
    habitsOf().filter(h => !h.archived || h.id === value).map(h => '<option value="' + h.id + '"' + (value === h.id ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') + '</select>';
}
const filterList = v => v && v !== 'all' ? habitsOf().filter(h => h.id === v) : activeHabits();

/* ---------- CALENDAR ---------- */
function dayCell(d, list, inMonth) {
  const td = today(), a = dayAgg(d, list), n = fromDs(d).getDate();
  let cls = 'day', mark = '', label = fmtDate(d) + ': ';
  if (d > td) { cls += ' s-fut'; mark = a.sched ? '<span class="m" style="border:1.5px dashed var(--faint);width:16px;height:16px"></span>' : ''; label += a.sched ? 'запланировано ' + a.sched : 'ничего не запланировано'; }
  else if (!a.sched) { cls += ' s-none'; label += 'не запланировано'; }
  else if (a.bad && list.length === 1) { cls += ' s-bad'; mark = '<span class="m bad">' + ic('x') + '</span>'; label += 'нарушение'; }
  else if (a.bad) { cls += ' s-part'; mark = '<span class="row" style="gap:3px;flex-wrap:nowrap"><span class="m part num">' + a.ok + '/' + (a.el + a.pend) + '</span><span class="m bad" style="width:12px;height:12px" title="Есть нарушение">' + ic('x') + '</span></span>'; label += 'выполнено ' + a.ok + ' из ' + (a.el + a.pend) + ', есть нарушение'; }
  else if (a.el && a.ok === a.el && !a.pend) { cls += ' s-full'; mark = '<span class="m ok">' + ic('check') + '</span>'; label += 'всё выполнено'; }
  else if (a.ok) { cls += ' s-part'; mark = '<span class="m part num">' + a.ok + '/' + (a.el + a.pend) + '</span>'; label += 'выполнено ' + a.ok + ' из ' + (a.el + a.pend); }
  else if (a.pend) { mark = '<span class="m neutral"></span>'; label += 'ещё не отмечено'; }
  else { mark = '<span class="m neutral"></span>'; label += 'пропуск'; }
  if (!inMonth) cls += ' out'; if (d === td) cls += ' today';
  return '<button class="' + cls + '" data-act="day" data-d="' + d + '" aria-label="' + esc(label) + '"><span class="num">' + n + '</span>' + mark + '</button>';
}
function heatmap(list, weeks) {
  const td = today(), ws = activeProfile().weekStart, end = weekStartOf(td, ws), cells = [];
  for (let w = weeks - 1; w >= 0; w--) { const s = addDays(end, -7 * w); for (let i = 0; i < 7; i++) { const d = addDays(s, i);
    if (d > td) { cells.push('<i class="f"></i>'); continue; }
    const a = dayAgg(d, list); const r = a.rate;
    const lv = a.bad ? 'x' : r == null ? '' : r >= 99 ? 'l4' : r >= 66 ? 'l3' : r >= 33 ? 'l2' : r > 0 ? 'l1' : '';
    cells.push('<i class="' + lv + '" data-tip="' + fmtDate(d) + ': ' + (r == null ? 'нет данных' : pct(r)) + '"></i>'); } }
  return '<div class="chart-wrap"><div class="heat" role="img" aria-label="Активность за последние ' + weeks + ' недель">' + cells.join('') + '</div></div>' +
    '<div class="row tiny muted" style="margin-top:8px;gap:6px">Меньше <span class="heat" style="display:inline-flex;grid-auto-flow:unset;overflow:visible;padding:0"><i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i></span> Больше · <span class="heat" style="display:inline-flex;overflow:visible;padding:0"><i class="x"></i></span> нарушение</div>';
}
VIEWS.calendar = function () {
  const td = today(); if (!U.calMonth) U.calMonth = td.slice(0, 7);
  const list = filterList(U.calHabit), ws = activeProfile().weekStart;
  const first = U.calMonth + '-01', gridStart = weekStartOf(first, ws);
  const [y, m] = U.calMonth.split('-').map(Number);
  const cells = []; for (let i = 0; i < 42; i++) { const d = addDays(gridStart, i); if (i >= 35 && d.slice(0, 7) !== U.calMonth) break; cells.push(dayCell(d, list, d.slice(0, 7) === U.calMonth)); }
  const dows = Array.from({ length: 7 }, (_, i) => DOW_S[(i + (ws === 0 ? 6 : 0)) % 7]);
  const single = U.calHabit !== 'all' ? habitById(U.calHabit) : null;
  const cores = list.map(h => ({ h, c: habitCore(h) }));
  const cur = single ? habitCore(single) : cores.sort((a, b) => b.c.current - a.c.current)[0]?.c || { current: 0, unit: 'дн.' };
  const best = single ? habitCore(single).best : Math.max(0, ...cores.map(x => x.c.best));
  const mStart = first, mEnd = addDays(addDays(first, 32).slice(0, 7) + '-01', -1);
  const mr = periodRate(list, mStart, mEnd);
  // week plan
  const wStart = addDays(weekStartOf(td, ws), 7 * U.weekOffset);
  const week = Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  const weekHtml = '<div class="week">' + week.map(d => '<div class="col' + (d === td ? ' cur' : '') + '"><b class="small">' + DOW_S[dow(d)] + ' ' + fromDs(d).getDate() + '</b>' +
    list.filter(h => isScheduled(h, d) && !h.archived).map(h => { const o = d > td ? 'fut' : outcome(h, d, td); const l = getLog(h, d);
      const cls = o === 'success' ? 'ok' : o === 'fail' ? 'bad' : o === 'fut' || o === 'pending' ? 'fut' : '';
      return '<button class="it" data-act="day" data-d="' + d + '" style="border:0;background:none;padding:2px 0;text-align:left;color:inherit;min-height:24px"><span class="st ' + cls + '" aria-hidden="true">' + (o === 'success' ? ic('check') : o === 'fail' ? ic('x') : '') + '</span><span>' + esc(h.name) + '</span><span class="sr">' + (o === 'success' ? 'выполнено' : o === 'fail' ? (l && l.s === 'failed' ? 'нарушение' : 'пропуск') : o === 'excused' ? 'уважительная причина' : 'ожидает') + '</span></button>'; }).join('') + '</div>').join('') + '</div>';
  let details = '';
  if (single) {
    const h = single, c = habitCore(h), mdays = []; for (let d = mStart; d <= mEnd; d = addDays(d, 1)) mdays.push(d);
    const doneM = mdays.filter(d => isSuccessLog(getLog(h, d))).length, schedM = mdays.filter(d => isScheduled(h, d) && d <= td).length;
    details = '<div class="card"><div class="card-head"><div class="row" style="flex-wrap:nowrap;min-width:0"><span class="hicon" style="--hc:' + safeColor(h.color) + '">' + hIcon(h) + '</span><div style="min-width:0"><h2 style="overflow-wrap:anywhere">' + esc(h.name) + '</h2><p class="small muted">' + esc(h.description) + '</p></div></div>' +
      '<div class="row">' + (dueOn(h, td) ? '<button class="btn sm ' + (isDoneToday(h) ? '' : 'primary') + '" data-act="toggle" data-id="' + h.id + '" data-d="' + td + '">' + ic('check') + (isDoneToday(h) ? 'Снять отметку' : 'Отметить сегодня') + '</button>' : '') +
      '<button class="btn sm" data-act="details" data-id="' + h.id + '">' + ic('calendar') + 'История</button><button class="btn sm" data-nav="reminders">' + ic('bell') + 'Напоминание</button><button class="btn sm" data-act="edit-habit" data-id="' + h.id + '">' + ic('edit') + 'Настроить</button></div></div>' +
      '<div class="grid g4">' + statTile('flame', 'var(--danger-soft)', 'var(--flame)', 'Текущая серия', c.current, c.unit) + statTile('crown', 'color-mix(in srgb,var(--gold) 18%,var(--surface))', 'var(--gold)', 'Лучшая серия', c.best, c.unit) +
      statTile('chart', 'var(--accent-soft)', 'var(--accent)', 'Всего выполнено', c.total, plural(c.total, 'раз', 'раза', 'раз')) + statTile('calendar', 'var(--surface-2)', 'var(--muted)', 'За ' + MONTHS[m - 1], doneM, 'из ' + schedM) + '</div>' +
      '<div class="row" style="margin-top:14px;gap:3px;flex-wrap:nowrap" aria-label="Обзор за месяц">' + mdays.map(d => { const o = d > td ? 'f' : !isScheduled(h, d) ? 'n' : outcome(h, d, td);
        return '<i data-tip="' + fmtDate(d) + '" style="flex:1;height:18px;border-radius:3px;background:' + (o === 'success' ? 'var(--accent)' : o === 'fail' ? (getLog(h, d) && getLog(h, d).s === 'failed' ? 'var(--danger-soft)' : 'var(--surface-3)') : 'var(--surface-2)') + (o === 'f' ? ';opacity:.4' : '') + '"></i>'; }).join('') + '</div></div>';
  }
  return '<div class="page-head"><div><h1>Календарь и серии</h1><p class="sub">Наглядный контроль дней, цепочек и повторяемости</p></div><div class="row">' + habitSelect('cal-habit', U.calHabit, true) + '</div></div>' +
    '<div class="grid split" style="align-items:start"><div class="card"><div class="card-head"><div class="row"><button class="icon-btn" data-act="cal-month" data-delta="-1" aria-label="Предыдущий месяц">' + ic('left') + '</button><h2 style="min-width:150px;text-align:center">' + MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1) + ' ' + y + '</h2><button class="icon-btn" data-act="cal-month" data-delta="1" aria-label="Следующий месяц">' + ic('right') + '</button></div><button class="btn sm" data-act="cal-today">Сегодня</button></div>' +
    '<div class="cal">' + dows.map(x => '<div class="dow">' + x + '</div>').join('') + cells.join('') + '</div>' +
    '<div class="row tiny muted" style="margin-top:12px;gap:14px"><span class="row" style="gap:6px"><span class="m ok" style="width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--on-accent)">' + ic('check') + '</span>всё выполнено</span><span class="row" style="gap:6px"><span style="padding:0 5px;border-radius:9px;background:var(--accent-mid);color:var(--on-accent);font-weight:700">2/3</span>частично</span><span class="row" style="gap:6px;color:var(--danger)">' + ic('x') + '<span class="muted">нарушение</span></span><span class="row" style="gap:6px"><i style="width:6px;height:6px;border-radius:50%;background:var(--faint)"></i>пропуск</span><span class="row" style="gap:6px"><i style="width:14px;height:14px;border-radius:4px;background:var(--surface-2);border:1px solid var(--line)"></i>не запланировано</span></div>' +
    '<p class="small muted" style="margin-top:8px">За месяц: <b class="num" style="color:var(--text)">' + mr.completed + ' из ' + mr.eligible + ' — ' + pct(mr.rate) + '</b>. Нажмите на день, чтобы посмотреть и изменить отметки.</p></div>' +
    '<div class="grid"><div class="card"><h2 style="margin-bottom:14px">Серии и прогресс</h2><div class="grid g2">' +
    '<div class="stat"><span class="ico" style="background:var(--danger-soft);color:var(--flame)">' + ic('flame') + '</span><div><div class="lbl">Текущая серия</div><div class="val num">' + cur.current + '<small>' + (cur.unit || 'дн.') + '</small></div></div></div>' +
    '<div class="stat"><span class="ico" style="background:color-mix(in srgb,var(--gold) 18%,var(--surface));color:var(--gold)">' + ic('crown') + '</span><div><div class="lbl">Лучшая серия</div><div class="val num">' + best + '<small>' + (cur.unit || 'дн.') + '</small></div></div></div></div>' +
    '<h3 style="margin:18px 0 10px">Календарная активность</h3>' + heatmap(list, 18) + '</div>' +
    '<div class="card" style="background:var(--accent-soft);border-color:transparent"><p class="script" style="font-size:1.45rem;line-height:1.1">Серии создаются не за один день, но каждый день имеет значение.</p></div></div></div>' +
    '<div class="card" style="margin-top:var(--gap)"><div class="card-head"><h2>План на неделю</h2><div class="row"><button class="icon-btn" data-act="week-shift" data-delta="-1" aria-label="Предыдущая неделя">' + ic('left') + '</button><span class="small num">' + fmtDate(week[0]) + ' – ' + fmtDate(week[6]) + '</span><button class="icon-btn" data-act="week-shift" data-delta="1" aria-label="Следующая неделя">' + ic('right') + '</button></div></div>' + (list.length ? weekHtml : '<p class="muted">Нет активных привычек.</p>') + '</div>' +
    (details ? '<div style="margin-top:var(--gap)">' + details + '</div>' : '');
};

/* ---------- ANALYTICS ---------- */
function statsPayload(list, P) {
  /* Aggregated, code-computed numbers used by the weekly review. */
  const td = today(), from = addDays(td, -(P - 1)), prevFrom = addDays(from, -P), prevTo = addDays(from, -1);
  const r = periodRate(list, from, td), pr = periodRate(list, prevFrom, prevTo);
  const wd = weekdayRates(list, from, td);
  return {
    periodDays: P, completionRate: r.rate == null ? null : Math.round(r.rate), previousPeriodRate: pr.rate == null ? null : Math.round(pr.rate),
    weekdayPerformance: Object.fromEntries(wd.map((x, i) => [DOW_L[i], x == null ? null : Math.round(x)])),
    habits: list.map(h => { const c = habitCore(h), hr = habitRate(h, from, td), e = forecast(h);
      return { name: h.name, type: h.type === 'quit' ? 'отказ' : 'полезная', category: h.category, schedule: recurrenceText(h), cue: h.cue && h.cue.value || null, reminder: h.reminder && h.reminder.enabled ? h.reminder.time : null,
        completionRate: hr.rate == null ? null : Math.round(hr.rate), completed: hr.completed, eligible: hr.eligible, currentStreak: c.current, bestStreak: c.best, streakUnit: c.unit, ewma: e == null ? null : Math.round(e * 100), priority: priorityScore(h),
        weekdayRates: weekdayRates([h], from, td).map(x => x == null ? null : Math.round(x)) }; }),
    goals: goalsOf().map(g => { const s = goalStats(g); return { title: g.title, progress: Math.round(s.progress), daysLeftAtCurrentPace: s.daysLeft }; })
  };
}
function weekdayRates(list, from, to) {
  const ok = Array(7).fill(0), el = Array(7).fill(0), td = today();
  for (const h of list) { if (isWeekly(h)) continue; for (let d = from < h.startDate ? h.startDate : from; d <= to; d = addDays(d, 1)) { if (!isScheduled(h, d)) continue; const o = outcome(h, d, td); if (o === 'pending' || o === 'excused') continue; el[dow(d)]++; if (o === 'success') ok[dow(d)]++; } }
  return el.map((e, i) => e ? ok[i] / e * 100 : null);
}
function fallbackInsight(p) {
  /* Rule-based text without AI — every statement is a computed fact. */
  const hs = p.habits.filter(h => h.completionRate != null);
  if (!hs.length) return null;
  const best = hs.slice().sort((a, b) => b.completionRate - a.completionRate)[0], worst = hs.slice().sort((a, b) => a.completionRate - b.completionRate)[0];
  const wd = Object.entries(p.weekdayPerformance).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]);
  const low = wd[0];
  return {
    works: '«' + best.name + '» — ' + best.completionRate + '% выполнений, серия ' + best.currentStreak + ' ' + best.streakUnit,
    problem: '«' + worst.name + '» — ' + worst.completionRate + '%' + (low ? '; самый сложный день недели — ' + low[0] + ' (' + low[1] + '%)' : ''),
    hypothesis: worst.cue ? 'Триггер «' + worst.cue + '» может срабатывать не каждый день.' : 'У привычки «' + worst.name + '» нет чёткого триггера — её легко отложить.',
    experiment: 'На следующей неделе привяжите «' + worst.name + '» к конкретному действию: «После …, я …».'
  };
}
VIEWS.stats = function () {
  const P = U.statPeriod, td = today(), from = addDays(td, -(P - 1));
  const list = filterList(U.statHabit);
  const head = '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--accent)">' + ic('chart') + '</span>Аналитика и прогресс</h1><p class="sub">Ваши привычки в цифрах. Все показатели рассчитаны по вашим отметкам.</p></div>' +
    '<div class="row"><div class="seg" role="group" aria-label="Период">' + [7, 30, 90, 365].map(n => '<button data-act="period" data-v="' + n + '" aria-pressed="' + (P === n) + '">' + n + ' дн.</button>').join('') + '</div>' + habitSelect('stat-habit', U.statHabit, true) + '</div></div>';
  const r = periodRate(list, from, td), pr = periodRate(list, addDays(from, -P), addDays(from, -1));
  if (!list.length || !r.eligible) return head + '<div class="card empty"><div class="big">' + ic('chart') + '</div><h2 style="color:var(--text)">Пока недостаточно данных</h2><p>Отметьте выполнение привычек хотя бы за один прошедший день — здесь появятся проценты, серии, графики и прогноз.</p><button class="btn primary" data-nav="today">К привычкам на сегодня</button></div>';
  const cores = list.map(h => ({ h, c: habitCore(h), r: habitRate(h, from, td), e: forecast(h) }));
  const curBest = cores.slice().sort((a, b) => b.c.current - a.c.current)[0];
  const bestAll = cores.slice().sort((a, b) => b.c.best - a.c.best)[0];
  // daily or weekly points for the line chart
  let pts = [];
  if (P <= 30) for (let i = P - 1; i >= 0; i--) { const d = addDays(td, -i), a = dayAgg(d, list); pts.push({ label: fmtDate(d), short: fromDs(d).getDate() + ' ' + MONTHS_G[fromDs(d).getMonth()].slice(0, 3), value: a.rate, extra: a.ok + '/' + a.el }); }
  else { const step = P === 90 ? 7 : 14; for (let s = from; s <= td; s = addDays(s, step)) { const e = addDays(s, step - 1) > td ? td : addDays(s, step - 1), x = periodRate(list, s, e); pts.push({ label: fmtDate(s) + '–' + fmtDate(e), short: fromDs(s).getDate() + ' ' + MONTHS_G[fromDs(s).getMonth()].slice(0, 3), value: x.rate, extra: x.completed + '/' + x.eligible }); } }
  const wd = weekdayRates(list, from, td); const wmin = wd.reduce((m, x, i) => x != null && (m < 0 || x < wd[m]) ? i : m, -1);
  // categories
  const catCount = {}; activeHabits().forEach(h => { catCount[h.category] = (catCount[h.category] || 0) + 1; });
  const cats = settings().categories;
  const catItems = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: c, value: n, color: CAT_COLORS[Math.max(0, cats.indexOf(c)) % CAT_COLORS.length] }));
  const catTotal = catItems.reduce((s, x) => s + x.value, 0);
  const ranked = cores.filter(x => x.r.rate != null).sort((a, b) => b.r.rate - a.r.rate);
  const good = cores.filter(x => x.h.type === 'build'), bad = cores.filter(x => x.h.type === 'quit');
  const epis = (h, a, b) => { let n = 0; for (let d = a; d <= b; d = addDays(d, 1)) { const l = getLog(h, d); if (l && l.o) n += l.o; } return n; };
  const aiP = statsPayload(list, Math.min(P, 30));
  const reviewBlock = res => '<div class="grid g2" style="margin-top:12px">' + [['Что получается', res.works], ['Что мешает', res.problem], ['Гипотеза', res.hypothesis], ['Эксперимент на неделю', res.experiment]].map(x => '<div class="ai-block"><h4>' + x[0] + '</h4><p class="small">' + esc(x[1] || '—') + '</p></div>').join('') + '</div>';
  const fb = fallbackInsight(aiP);
  const aiCard = '<div class="card"><div class="card-head"><div><h2 class="row" style="gap:8px"><span style="color:var(--accent)">' + ic('sparkles') + '</span>Разбор недели</h2><p class="small muted">Сводка строится по вашим отметкам за последние 4 недели. Все выводы — это расчёт, а не диагноз.</p></div></div>' +
    (fb ? '<span class="label-kind">Расчёт по вашим данным</span>' + reviewBlock(fb) : '<p class="muted small">Отметьте несколько дней — здесь появится разбор.</p>') + '</div>';

  return head +
    '<div class="grid g4">' +
    statTile('check', 'var(--accent-soft)', 'var(--accent)', 'Процент успешности', pct(r.rate), '', deltaHtml(r.rate != null && pr.rate != null ? r.rate - pr.rate : null, '%')) +
    statTile('chart', 'var(--surface-2)', 'var(--accent)', 'Выполнений за ' + P + ' дн.', r.completed, 'из ' + r.eligible) +
    statTile('flame', 'var(--danger-soft)', 'var(--flame)', 'Текущая серия', curBest.c.current, curBest.c.unit + (list.length > 1 ? ' · ' + esc(curBest.h.name) : '')) +
    statTile('crown', 'color-mix(in srgb,var(--gold) 18%,var(--surface))', 'var(--gold)', 'Лучшая серия', bestAll.c.best, bestAll.c.unit + (list.length > 1 ? ' · ' + esc(bestAll.h.name) : '')) + '</div>' +
    '<div class="grid split" style="margin-top:var(--gap);align-items:start"><div class="card"><div class="card-head"><h2>Динамика выполнения</h2><span class="small muted">' + (P <= 30 ? 'по дням' : P === 90 ? 'по неделям' : 'по двухнедельным отрезкам') + '</span></div>' + lineChart(pts, { maxLabels: 7 }) + '</div>' +
    '<div class="card"><div class="card-head"><h2>Распределение по категориям</h2></div><div class="row" style="gap:20px;flex-wrap:wrap;justify-content:center">' + donut(catItems, String(catTotal), plural(catTotal, 'привычка', 'привычки', 'привычек')) +
    '<div class="legend" style="flex:1;min-width:150px">' + catItems.map(x => '<div><i style="background:' + x.color + '"></i>' + esc(x.label) + '<b class="num">' + Math.round(x.value / catTotal * 100) + '%</b></div>').join('') + '</div></div></div></div>' +
    '<div class="grid split" style="margin-top:var(--gap);align-items:start"><div class="card"><div class="card-head"><h2>По дням недели</h2>' + (wmin >= 0 ? '<span class="small muted">Сложнее всего: ' + DOW_L[wmin] + '</span>' : '') + '</div>' +
    barChart(wd.map((v, i) => ({ label: DOW_S[i], value: v })), { values: true, highlight: wd.reduce((m, x, i) => x != null && (m < 0 || x > wd[m]) ? i : m, -1) }) + '</div>' +
    '<div class="card"><div class="card-head"><h2>Прогноз следующего выполнения</h2><span class="tag grey" title="S = α·x + (1−α)·S_prev, α = 0,3">EWMA</span></div><div class="stack">' +
    cores.map(x => '<div class="row" style="flex-wrap:nowrap"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.h.name) + '</span>' + (x.e == null ? '<span class="small muted">Недостаточно данных</span>' : '<div class="bar" style="width:38%"><i style="width:' + x.e * 100 + '%;background:' + (x.e < 0.5 ? 'var(--warning)' : 'var(--accent)') + '"></i></div><b class="num" style="width:44px;text-align:right">' + pct(x.e * 100) + '</b>') + '</div>').join('') +
    '</div><p class="tiny muted" style="margin-top:10px">Оценка вероятности следующего выполнения — статистическая оценка по вашей недавней истории, а не гарантированная вероятность. Нужно минимум 7 запланированных случаев.</p></div></div>' +
    '<div class="grid g2" style="margin-top:var(--gap);align-items:start"><div class="card"><h2 style="margin-bottom:12px">Лучшие привычки</h2>' + (ranked.length ? barChart(ranked.slice(0, 5).map(x => ({ label: x.h.name, value: x.r.rate, tip: x.h.name + ': ' + x.r.completed + '/' + x.r.eligible })), { values: true, highlight: 0, height: 120 }) : '<p class="muted">Нет данных.</p>') + '</div>' +
    '<div class="card"><h2 style="margin-bottom:12px">Требуют внимания</h2><div class="stack">' + (ranked.length ? ranked.slice().reverse().slice(0, 5).map(x => '<div class="row" style="flex-wrap:nowrap"><span class="hicon" style="--hc:' + safeColor(x.h.color) + ';width:34px;height:34px">' + hIcon(x.h) + '</span><span style="flex:1;min-width:0">' + esc(x.h.name) + '<span class="small muted" style="display:block">приоритет ' + priorityScore(x.h) + ' · серия ' + x.c.current + ' ' + x.c.unit + '</span></span><b class="num">' + pct(x.r.rate) + '</b></div>').join('') : '<p class="muted">Нет данных.</p>') + '</div></div></div>' +
    '<div class="card" style="margin-top:var(--gap)"><h2 style="margin-bottom:12px">Сравнение с предыдущим периодом</h2><div class="grid g2">' +
    '<div><div class="row small" style="margin-bottom:8px;font-weight:700;color:var(--accent)">Полезные привычки</div>' + (good.length ? good.map(x => { const p0 = habitRate(x.h, addDays(from, -P), addDays(from, -1)).rate; return '<div class="setting"><span class="grow">' + esc(x.h.name) + '</span><span class="small num muted">' + x.r.completed + '/' + x.r.eligible + '</span>' + (deltaHtml(x.r.rate != null && p0 != null ? x.r.rate - p0 : null, '%') || '<span class="tiny muted">—</span>') + '</div>'; }).join('') : '<p class="muted small">Нет полезных привычек.</p>') + '</div>' +
    '<div><div class="row small" style="margin-bottom:8px;font-weight:700;color:var(--danger)">Нежелательные (эпизоды)</div>' + (bad.length ? bad.map(x => { const now = epis(x.h, from, td), before = epis(x.h, addDays(from, -P), addDays(from, -1)); const ch = before ? (now - before) / before * 100 : null;
      return '<div class="setting"><span class="grow">' + esc(x.h.name) + '</span><span class="small num muted">' + now + ' ' + plural(now, 'эпизод', 'эпизода', 'эпизодов') + '</span>' + (ch == null ? '<span class="tiny muted">—</span>' : '<span class="delta ' + (ch <= 0 ? 'up' : 'down') + '">' + (ch <= 0 ? '↓ ' : '↑ +') + Math.round(ch) + '%</span>') + '</div>'; }).join('') : '<p class="muted small">Нет привычек отказа.</p>') + '</div></div></div>' +
    '<div style="margin-top:var(--gap)">' + aiCard + '</div>';
};

/* ---------- GOALS ---------- */
VIEWS.goals = function () {
  const gs = goalsOf();
  return '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--gold)">' + ic('target') + '</span>Цели</h1><p class="sub">Объедините привычки в цель и следите за общим прогрессом</p></div><button class="btn primary" data-act="new-goal">' + ic('plus') + 'Новая цель</button></div>' +
    (gs.length ? '<div class="grid g2">' + gs.map(g => { const s = goalStats(g);
      return '<div class="card"><div class="card-head"><div class="row" style="flex-wrap:nowrap;min-width:0"><span style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--gold) 18%,var(--surface));color:var(--gold);flex:none">' + ic(s.progress >= 100 ? 'trophy' : 'target') + '</span><div style="min-width:0"><h2 style="overflow-wrap:anywhere">' + esc(g.title) + '</h2>' + (g.primary ? '<span class="tag">На главной</span>' : '') + '</div></div>' +
        '<button class="kebab" data-act="goal-menu" data-id="' + g.id + '" aria-label="Действия с целью">' + ic('more') + '</button></div>' +
        (g.description ? '<p class="small muted">' + esc(g.description) + '</p>' : '') +
        '<div class="row" style="margin:14px 0 6px;flex-wrap:nowrap"><div class="bar" style="flex:1;height:10px"><i style="width:' + s.progress + '%"></i></div><b class="num">' + pct(s.progress) + '</b></div>' +
        '<p class="small muted num">' + s.done + ' из ' + s.target + ' выполнений с ' + fmtDate(g.startDate) + ' · сегодня ' + s.doneToday + ' из ' + s.dueToday + '</p>' +
        '<p class="small" style="margin-top:8px">' + (s.daysLeft === 0 ? '🎉 Цель достигнута!' : s.daysLeft ? 'Если сохранить текущий темп (' + (Math.round(s.pace * 10) / 10).toString().replace('.', ',') + ' в день), цель будет достигнута через <b>' + s.daysLeft + ' ' + plural(s.daysLeft, 'день', 'дня', 'дней') + '</b>.' : 'За последние 14 дней выполнений нет — прогноза пока нет.') + '</p>' +
        '<div class="row" style="margin-top:12px;gap:6px">' + s.habits.map(h => '<span class="chip" style="min-height:30px;--hc:' + safeColor(h.color) + '"><span style="color:' + safeColor(h.color) + '">' + hIcon(h) + '</span>' + esc(h.name) + '</span>').join('') + (s.habits.length ? '' : '<span class="small muted">Нет связанных привычек</span>') + '</div></div>'; }).join('') + '</div>'
      : '<div class="card empty"><div class="big">' + ic('target') + '</div><h2 style="color:var(--text)">Целей пока нет</h2><p>Например: «21 день без сладкого» или «Больше энергии» — из воды, сна и движения.</p><button class="btn primary" data-act="new-goal">' + ic('plus') + 'Поставить цель</button></div>');
};

/* ---------- REMINDERS ---------- */
VIEWS.reminders = function () {
  const st = settings(), hs = activeHabits(), due = dueReminders(), td = today();
  const sw = (id, on, label) => '<button class="switch" role="switch" aria-checked="' + !!on + '" data-act="' + id + '" aria-label="' + esc(label) + '"></button>';
  const upcoming = hs.filter(h => h.reminder && h.reminder.enabled && dueOn(h, td) && !isDoneToday(h)).sort((a, b) => tmin(a.reminder.time) - tmin(b.reminder.time));
  return '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--accent)">' + ic('bell') + '</span>Напоминания</h1><p class="sub">Мягкие подсказки в приложении и, по желанию, системные уведомления. Если привычка уже выполнена — напоминания не будет.</p></div></div>' +
    '<div class="grid split" style="align-items:start"><div class="card"><div class="card-head"><h2>Привычки</h2></div>' +
    (hs.length ? hs.map(h => { const med = medianTime(h), r = h.reminder || {};
      return '<div class="setting" style="--hc:' + safeColor(h.color) + '"><span class="hicon" style="width:38px;height:38px">' + hIcon(h) + '</span><div class="grow"><b>' + esc(h.name) + '</b><div class="small muted">' + recurrenceText(h) + '</div>' +
        (med && r.enabled && med !== r.time ? '<div class="note" style="margin-top:8px;padding:10px 12px">' + ic('sparkles') + '<div class="small">Вы обычно выполняете эту привычку около <b>' + med + '</b>. Перенести напоминание с ' + esc(r.time) + ' на ' + med + '?<div class="row" style="margin-top:6px"><button class="btn sm soft" data-act="adapt" data-id="' + h.id + '" data-v="' + med + '">Перенести на ' + med + '</button></div></div></div>' : '') + '</div>' +
        '<label class="sr" for="rt-' + h.id + '">Время напоминания для ' + esc(h.name) + '</label><input class="input num" type="time" id="rt-' + h.id + '" data-rtime="' + h.id + '" value="' + esc(r.time || '09:00') + '" style="width:120px"' + (r.enabled ? '' : ' disabled') + '>' + sw('rem-toggle" data-id="' + h.id, r.enabled, 'Напоминание для ' + h.name) + '</div>'; }).join('') : '<p class="muted">Сначала добавьте привычку.</p>') + '</div>' +
    '<div class="grid"><div class="card"><h2 style="margin-bottom:8px">Общие настройки</h2>' +
    '<div class="setting"><div class="grow"><b>Напоминания в приложении</b><div class="small muted">Показываются, пока приложение открыто</div></div>' + sw('rem-global', st.remindersEnabled, 'Все напоминания') + '</div>' +
    notifySettingHtml() +
    '<div class="setting"><div class="grow"><b>Тихие часы</b><div class="small muted">В это время напоминания откладываются</div></div>' + sw('quiet-toggle', st.quietEnabled, 'Тихие часы') + '</div>' +
    '<div class="setting"><label class="field" style="flex:1"><span class="small muted">С</span><input class="input num" type="time" id="quiet-start" value="' + esc(st.quietStart) + '"></label><label class="field" style="flex:1"><span class="small muted">До</span><input class="input num" type="time" id="quiet-end" value="' + esc(st.quietEnd) + '"></label></div>' +
    '<p class="tiny muted">' + (tmin(st.quietStart) > tmin(st.quietEnd) ? 'Окно переходит через полночь: ' + esc(st.quietStart) + ' → ' + esc(st.quietEnd) + ' следующего дня.' : tmin(st.quietStart) === tmin(st.quietEnd) ? 'Начало и конец совпадают — тихие часы не действуют.' : 'Тихие часы: ' + esc(st.quietStart) + '–' + esc(st.quietEnd) + '.') + '</p></div>' +
    '<div class="card"><h2 style="margin-bottom:10px">Сегодня</h2>' + (upcoming.length ? upcoming.map(h => { const isDue = due.includes(h);
      return '<div class="setting"><span class="num" style="font-weight:700;width:52px">' + esc(h.reminder.time) + '</span><span class="grow">' + esc(h.name) + '</span>' + (isDue ? '<span class="tag warm">Пора</span>' : inQuiet(h.reminder.time) ? '<span class="tag grey">Тихие часы</span>' : '<span class="tag grey">Ожидает</span>') + '</div>'; }).join('') : '<p class="small muted">На сегодня напоминаний не осталось.</p>') + '</div></div></div>';
};

/* ---------- PROFILE & PERSONALIZATION ---------- */
function achievements() {
  const hs = habitsOf(), cores = hs.map(habitCore);
  const total = cores.reduce((s, c) => s + c.total, 0), bestRun = Math.max(0, ...cores.map(c => c.best));
  const health = hs.filter(h => ['Здоровье', 'Сон', 'Осознанность', 'Питание'].includes(h.category)).reduce((s, h) => s + habitCore(h).total, 0);
  const catsN = new Set(hs.filter(h => !h.archived).map(h => h.category)).size;
  return [
    { icon: 'flame', name: '7 дней подряд', ok: bestRun >= 7, bg: 'var(--danger-soft)', fg: 'var(--flame)', hint: 'Серия из 7 выполнений подряд' },
    { icon: 'star', name: 'Первые шаги', ok: total >= 1, bg: 'color-mix(in srgb,var(--gold) 18%,var(--surface))', fg: 'var(--gold)', hint: 'Первое выполнение' },
    { icon: 'leaf', name: 'Забота о себе', ok: health >= 30, bg: 'var(--accent-soft)', fg: 'var(--accent)', hint: '30 выполнений в категориях здоровья' },
    { icon: 'mountain', name: 'Постоянство', ok: bestRun >= 30, bg: 'var(--surface-2)', fg: 'var(--muted)', hint: 'Серия из 30 выполнений' },
    { icon: 'heart', name: 'Баланс', ok: catsN >= 3, bg: 'var(--danger-soft)', fg: 'var(--danger)', hint: 'Привычки в трёх и более категориях' }
  ];
}
VIEWS.profile = function () {
  const p = activeProfile(), st = settings(), td = today();
  const wr = periodRate(activeHabits(), weekStartOf(td, p.weekStart), td);
  const favs = Object.entries(activeHabits().reduce((m, h) => (m[h.category] = (m[h.category] || 0) + habitCore(h).total, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let tzs = []; try { tzs = Intl.supportedValuesOf('timeZone'); } catch (e) { tzs = ['Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Yakutsk', 'Asia/Vladivostok', 'Asia/Magadan', 'Asia/Kamchatka', 'UTC']; }
  if (!tzs.includes(p.timezone)) tzs.unshift(p.timezone);
  const seg = (act, cur, opts) => '<div class="seg" role="group">' + opts.map(o => '<button data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
  return '<div class="page-head"><div><h1>Профиль и персонализация</h1><p class="sub">Настройки, внешний вид и приложение под ваш стиль</p></div></div>' +
    '<div class="grid split" style="align-items:start"><div class="card"><div class="row" style="gap:20px;align-items:center">' + avatarHtml(p, 96) +
    '<div style="flex:1;min-width:200px"><h2 style="font-size:1.5rem">' + esc(displayName()) + ' <span style="color:var(--accent)">' + ic('leaf') + '</span></h2><p class="script" style="font-size:1.35rem;color:var(--muted)">«' + esc(p.motto || '') + '»</p>' +
    '<p class="small" style="margin-top:8px;font-weight:600">Прогресс за неделю</p><div class="row" style="flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:' + (wr.rate || 0) + '%"></i></div><b class="num">' + pct(wr.rate) + '</b></div></div>' +
    '<button class="btn sm" data-act="edit-profile" data-id="' + p.id + '">' + ic('edit') + 'Изменить</button></div></div>' +
    '<div class="card"><h2 style="margin-bottom:12px">Мои достижения</h2><div class="row" style="justify-content:space-between;gap:8px">' + achievements().map(a => '<div style="text-align:center;width:72px;' + (a.ok ? '' : 'opacity:.4;filter:grayscale(1)') + '" title="' + esc(a.hint) + (a.ok ? '' : ' — пока не получено') + '"><span style="width:52px;height:52px;margin:0 auto 6px;border-radius:50%;display:grid;place-items:center;background:' + a.bg + ';color:' + a.fg + '">' + ic(a.icon) + '</span><span class="tiny" style="display:block;line-height:1.2">' + a.name + '</span><span class="sr">' + (a.ok ? 'получено' : 'не получено') + '</span></div>').join('') + '</div></div></div>' +
    (favs.length ? '<div class="card" style="margin-top:var(--gap)"><h2 style="margin-bottom:10px">Любимые категории</h2><div class="row">' + favs.map(f => '<span class="chip">' + esc(f[0]) + ' <span class="n">' + f[1] + '</span></span>').join('') + '</div></div>' : '') +
    '<div class="grid g2" style="margin-top:var(--gap);align-items:start"><div class="card"><h2 style="margin-bottom:6px">Внешний вид</h2>' +
    '<div class="setting"><span class="grow">Тема интерфейса</span>' + seg('set-theme', st.theme, [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']]) + '</div>' +
    '<div class="setting"><span class="grow">Акцентный цвет</span><div class="swatches">' + Object.entries(ACCENTS).map(([k, a]) => '<button class="sw" style="background:' + a.l + '" data-act="set-accent" data-v="' + k + '" aria-pressed="' + (st.accent === k) + '" aria-label="' + a.name + '">' + (st.accent === k ? ic('check') : '') + '</button>').join('') + '</div></div>' +
    '<div class="setting"><label class="grow" for="font-size">Размер шрифта <span class="muted num">' + st.fontSize + ' px</span></label><input type="range" id="font-size" min="13" max="18" step="1" value="' + st.fontSize + '" style="accent-color:var(--accent);width:180px"></div>' +
    '<div class="setting"><span class="grow">Плотность</span>' + seg('set-density', st.density, [['comfortable', 'Просторно'], ['compact', 'Компактно']]) + '</div>' +
    '<div class="field" style="margin-top:10px"><label for="app-name">Название приложения</label><input class="input" id="app-name" maxlength="40" value="' + esc(st.appName) + '"></div>' +
    '<div class="field" style="margin-top:10px"><label for="greeting">Подзаголовок приветствия</label><input class="input" id="greeting" maxlength="80" value="' + esc(st.greeting) + '"></div>' +
    '<div class="field" style="margin-top:10px"><label for="quote-sel">Цитата в боковой панели</label><select class="input" id="quote-sel">' + QUOTES.map((q, i) => '<option value="' + i + '"' + (st.quoteIndex % QUOTES.length === i ? ' selected' : '') + '>' + esc(q) + '</option>').join('') + '</select></div></div>' +
    '<div class="grid"><div class="card"><h2 style="margin-bottom:6px">Виджеты на главной</h2><p class="small muted" style="margin-bottom:6px">Включайте, скрывайте и меняйте порядок.</p>' +
    st.widgets.map((w, i) => '<div class="setting"><button class="switch" role="switch" aria-checked="' + w.visible + '" data-act="widget-toggle" data-v="' + w.id + '" aria-label="Показывать: ' + WIDGETS[w.id] + '"></button><span class="grow">' + WIDGETS[w.id] + '</span><button class="icon-btn" data-act="widget-move" data-v="' + w.id + '" data-delta="-1" aria-label="Выше"' + (i === 0 ? ' disabled style="opacity:.3"' : '') + '>' + ic('up') + '</button><button class="icon-btn" data-act="widget-move" data-v="' + w.id + '" data-delta="1" aria-label="Ниже"' + (i === st.widgets.length - 1 ? ' disabled style="opacity:.3"' : '') + '>' + ic('down') + '</button></div>').join('') + '</div>' +
    '<div class="card"><h2 style="margin-bottom:6px">Профиль</h2>' +
    '<div class="setting"><label class="grow" for="tz">Часовой пояс</label><select class="input" id="tz" style="width:220px;max-width:100%">' + tzs.map(z => '<option' + (z === p.timezone ? ' selected' : '') + '>' + esc(z) + '</option>').join('') + '</select></div>' +
    '<div class="setting"><span class="grow">Начало недели</span>' + seg('set-weekstart', p.weekStart, [[1, 'Понедельник'], [0, 'Воскресенье']]) + '</div>' +
    '<div class="setting"><span class="grow">Язык</span><span class="tag grey">Русский</span></div></div>' +
    '<div class="card"><div class="card-head"><h2>Профили</h2><button class="btn sm" data-act="new-profile">' + ic('plus') + 'Добавить</button></div><p class="small muted" style="margin-bottom:6px">У каждого профиля свои привычки, отметки и цели.</p>' +
    S.meta.profiles.map(x => '<div class="setting">' + avatarHtml(x, 32) + '<span class="grow">' + esc(x.name || (x.id === S.meta.profiles[0].id ? displayName() : 'Без имени')) + ' <span class="small muted">· ' + habitsOf(x.id).length + ' ' + plural(habitsOf(x.id).length, 'привычка', 'привычки', 'привычек') + '</span></span>' +
      (x.id === p.id ? '<span class="tag">Активный</span>' : '<button class="btn sm" data-act="switch-profile" data-id="' + x.id + '">Переключить</button>') +
      '<button class="kebab" data-act="edit-profile" data-id="' + x.id + '" aria-label="Изменить профиль">' + ic('edit') + '</button>' + (S.meta.profiles.length > 1 ? '<button class="kebab" data-act="delete-profile" data-id="' + x.id + '" aria-label="Удалить профиль">' + ic('trash') + '</button>' : '') + '</div>').join('') + '</div>' +
    '<div class="card"><h2 style="margin-bottom:6px">Мои категории</h2><div class="row" style="margin-bottom:10px">' + st.categories.map(c => '<span class="chip" style="padding-right:4px">' + esc(c) + '<button class="icon-btn" style="width:28px;height:28px" data-act="cat-remove" data-v="' + esc(c) + '" aria-label="Удалить категорию ' + esc(c) + '">' + ic('x') + '</button></span>').join('') + '</div>' +
    '<form class="row" data-form="cat-add" style="flex-wrap:nowrap"><label class="sr" for="cat-new">Новая категория</label><input class="input" id="cat-new" maxlength="24" placeholder="Новая категория" style="flex:1"><button class="btn" type="submit">' + ic('plus') + 'Добавить</button></form><p class="err" id="cat-err"></p></div></div></div>' + AUTHOR_NOTE;
};

/* ---------- DATA ---------- */
VIEWS.data = function () {
  const nL = Object.values(logsOf()).reduce((s, m) => s + Object.keys(m).length, 0);
  const where = S.storage === 'local' ? 'Только на этом устройстве, в памяти браузера. Никуда не отправляются, регистрация не нужна. Чтобы перенести данные на другое устройство или сделать резервную копию, используйте экспорт.' : 'Память браузера недоступна (например, приватный режим): изменения сохранятся только до закрытия страницы.';
  return '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--accent)">' + ic('data') + '</span>Данные</h1><p class="sub">Экспортируйте или импортируйте свои данные в любое время</p></div></div>' +
    '<div class="card note" style="margin-bottom:var(--gap)">' + ic('shield') + '<div><b>Где хранятся данные</b><p class="small">' + where + '</p><p class="small muted" style="margin-top:4px">Профиль «' + esc(displayName()) + '»: ' + habitsOf().length + ' ' + plural(habitsOf().length, 'привычка', 'привычки', 'привычек') + ', ' + nL + ' ' + plural(nL, 'отметка', 'отметки', 'отметок') + ', ' + goalsOf().length + ' ' + plural(goalsOf().length, 'цель', 'цели', 'целей') + '.' + (S.demo ? ' Сейчас показан пример — он не сохранён.' : '') + '</p></div></div>' +
    '<div class="grid g2"><div class="card stack"><h2>Экспорт</h2><p class="small muted">Полная копия всех профилей, привычек, отметок и настроек.</p><button class="btn primary" data-act="export-json">' + ic('download') + 'Скачать JSON</button>' +
    '<p class="small muted" style="margin-top:6px">Журнал выполнений активного профиля — для Excel или Google Таблиц.</p><button class="btn" data-act="export-csv">' + ic('file') + 'Скачать CSV</button>' +
    '<p class="small muted" style="margin-top:6px">Отчёт для печати: откройте файл в браузере и сохраните как PDF.</p><button class="btn" data-act="export-report">' + ic('file') + 'Отчёт для печати (HTML)</button></div>' +
    '<div class="card stack"><h2>Импорт</h2><p class="small muted">JSON из этого приложения или CSV журнала (колонки: date, habit, status, value, occurrences, time, note). Перед изменением вы увидите, что будет добавлено и какие есть конфликты.</p>' +
    '<label class="btn" for="import-file" style="cursor:pointer">' + ic('upload') + 'Выбрать файл…</label><input type="file" id="import-file" accept=".json,.csv,application/json,text/csv" class="sr"><p class="err" id="import-err" role="alert"></p></div>' +
    installCardHtml() + '<div class="card stack"><h2>Сброс</h2><p class="small muted">Удалить все профили, привычки и отметки без возможности восстановления. Сначала рекомендуем сделать экспорт.</p><button class="btn danger" data-act="reset-all">' + ic('trash') + 'Удалить все данные</button></div></div>';
};

/* ---------- HELP ---------- */
const AUTHOR_NOTE = '<p class="small muted" style="margin-top:28px;text-align:center">«Трекер привычек» · Автор: Vladimir Lavshonok · © 2026</p>';
const FAQ = [
  ['Как считается серия?', 'Серия — это число запланированных выполнений подряд до сегодняшнего дня. Дни, когда привычка не запланирована, серию не меняют. Отметка «уважительная причина» серию не ломает. Пропуск или нарушение обнуляет текущую серию, но не лучшую. Сегодняшний день, пока он не отмечен, серию не прерывает. Для привычек «X раз в неделю» серия считается в успешных неделях.'],
  ['Почему один пропуск не обнуляет весь прогресс?', 'Исследования формирования привычек (Lally et al., 2010) показали, что единичный пропуск существенно не влияет на то, как привычка становится автоматической. Поэтому рядом с серией мы всегда показываем процент выполнения за период: 27 из 30 дней — это 90%, даже если серия сегодня началась заново.'],
  ['Как считается процент?', 'Процент выполнения = выполнено ÷ (запланировано − уважительные причины) × 100. Сегодняшний день учитывается только после отметки. Для привычек «X раз в неделю» каждая завершённая неделя добавляет X возможностей, а успехи сверх нормы не учитываются.'],
  ['Как засчитывается привычка отказа?', 'Для привычки «избавиться» задаётся допустимое число эпизодов в день (например, 0 для «Без сладкого» или 2 для «Меньше соцсетей»). День успешен, если эпизодов не больше лимита. Нажмите «Сегодня удержался» или фиксируйте каждый эпизод — статус пересчитается сам.'],
  ['Что означает прогноз?', 'Это экспоненциальное сглаживание истории выполнения: S = 0,3 × x + 0,7 × S_пред, где x = 1 при выполнении и 0 при пропуске. Свежие дни весят больше старых. Это статистическая оценка по вашей недавней истории, а не гарантированная вероятность. Она появляется после 7 запланированных случаев.'],
  ['Как начисляются баллы?', 'За каждое выполнение: 10 баллов × множитель сложности (лёгкая 1,0, средняя 1,2, сложная 1,5) плюс бонус за серию — по 1 баллу за каждые 7 дней серии, максимум 5. За пропуски баллы не снимаются.'],
  ['Как работает индекс приоритета?', 'Приоритет 0–100 = 35% важности + 25% срочности сегодня + 20% риска невыполнения (1 − прогноз) + 10% давности последнего успеха + 10% вашего приоритета. По нему сортируется список на главной.'],
  ['Как работают напоминания?', 'Напоминания показываются внутри приложения, пока оно открыто (и системным уведомлением, если оно включено). Если привычка уже выполнена — напоминания не будет. В тихие часы напоминания откладываются. Кнопка «Через 30 минут» переносит напоминание. После 10 выполнений приложение предложит время по вашей фактической медиане — но само ничего не меняет.'],
  ['Как устроен разбор недели?', 'Приложение находит привычку с лучшим и худшим процентом выполнения и самый сложный день недели, а затем предлагает одну гипотезу и маленький эксперимент — например, привязать привычку к конкретному действию. Всё считается по вашим отметкам прямо на устройстве.'],
  ['Как экспортировать данные?', 'Откройте раздел «Данные». JSON — полная копия для резервного копирования и переноса. CSV — журнал выполнений для таблиц. Отчёт для печати — HTML-файл, который можно сохранить в PDF из браузера. Импорт сначала показывает, что будет добавлено, и ничего не меняет без подтверждения.'],
  ['Как установить приложение на iPhone?', 'Откройте ссылку на приложение в Safari. Нажмите «Поделиться» (квадрат со стрелкой вверх), затем «На экран «Домой»» и «Добавить». Приложение откроется со своего значка на весь экран, без адресной строки, и будет работать даже без интернета. Регистрация не нужна.'],
  ['Как установить на Android и компьютер?', 'Android (Chrome): откройте ссылку и нажмите «Установить» в подсказке внизу или «⋮» → «Добавить на главный экран» / «Установить приложение». Компьютер (Chrome или Edge): значок установки в адресной строке или меню → «Установить Трекер привычек». Mac (Safari 17+): «Файл» → «Добавить в Dock».'],
  ['Как дать приложение другому человеку?', 'Просто отправьте ссылку. Аккаунт не нужен: у каждого человека данные хранятся на его собственном устройстве, и никто, включая автора, их не видит.'],
  ['Как перенести данные на другой телефон?', 'На старом устройстве: «Данные» → «Скачать JSON». Перешлите файл себе (почта, мессенджер, облако). На новом устройстве: «Данные» → «Выбрать файл…» → проверьте предпросмотр → «Импортировать». Регулярно делайте такую резервную копию: если очистить данные браузера или удалить приложение, записи пропадут.'],
  ['Работают ли уведомления?', 'Внутри приложения напоминания показываются всегда, пока оно открыто. Системные уведомления можно включить в разделе «Напоминания»: на iPhone — только для приложения, установленного на экран «Домой» (iOS 16.4+). Когда приложение полностью закрыто, уведомления не приходят — для этого нужен собственный сервер.'],
  ['Где хранятся мои данные?', 'Только на вашем устройстве, в памяти браузера. Приложение ничего не отправляет в интернет, не требует регистрации и не собирает статистику. Пароли и платёжные данные не нужны и не хранятся.']
];
VIEWS.help = function () {
  const q = U.helpQ.trim().toLowerCase(), list = FAQ.filter(f => !q || (f[0] + ' ' + f[1]).toLowerCase().includes(q));
  return '<div class="page-head"><div><h1 class="row" style="gap:12px"><span style="color:var(--accent)">' + ic('help') + '</span>Помощь</h1><p class="sub">Как устроены расчёты и функции приложения</p></div></div>' +
    '<label class="search" style="display:block;max-width:480px;margin-bottom:16px"><span class="sr">Поиск по вопросам</span>' + ic('search') + '<input id="help-search" type="search" placeholder="Поиск по вопросам" value="' + esc(U.helpQ) + '"></label>' +
    '<div class="stack">' + (list.length ? list.map((f, i) => '<details class="faq"' + (q && i === 0 ? ' open' : '') + '><summary>' + esc(f[0]) + '</summary><div>' + esc(f[1]) + '</div></details>').join('') : '<p class="muted">Ничего не найдено. Попробуйте другое слово.</p>') + '</div>' +
    AUTHOR_NOTE;
};

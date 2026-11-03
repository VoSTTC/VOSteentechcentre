/* =========================================================================
   RUNNING SCHEDULE: week grid, list and today views, filters, event details,
   add / edit / remove with recurring series and overlap warnings.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const HOUR_PX = 56;

  const state = {
    mode: "week",
    week: T.weekStart(T.now().date),
    zone: "", staff: "",
    types: new Set(Object.keys(C.types))
  };
  try { const s = JSON.parse(sessionStorage.getItem("ttc-sched") || "null"); if (s) { state.mode = s.mode || state.mode; state.zone = s.zone || ""; state.staff = s.staff || ""; if (Array.isArray(s.types)) state.types = new Set(s.types); } } catch (e) {}
  function remember() { try { sessionStorage.setItem("ttc-sched", JSON.stringify({ mode: state.mode, zone: state.zone, staff: state.staff, types: [...state.types] })); } catch (e) {} }

  const isBg = ev => ev.type === "dropin" && ev.location === "centre";
  function passes(ev) {
    if (!state.types.has(ev.type)) return false;
    if (state.zone && ev.zone !== state.zone) return false;
    if (state.staff && ev.staff !== state.staff) return false;
    return true;
  }
  const narrow = () => window.matchMedia("(max-width: 760px)").matches;

  let root = null;

  /* ---------------- render ---------------- */
  function render(el) {
    root = el;
    const staff = T.isStaff();
    const wkEnd = T.addDays(state.week, 6);
    const staffList = [...new Set(T.db.list("events").map(e => e.staff).filter(Boolean))].sort();
    const filtersOn = state.zone || state.staff || state.types.size !== Object.keys(C.types).length;

    el.innerHTML = `
      <section class="page-head wrap">
        <div>
          <p class="eyebrow">Running schedule ${T.arrows("sm")}</p>
          <h1>What's on</h1>
          <p class="lede">All times are ${esc(C.timeZoneLabel)}. Select any entry for details.</p>
        </div>
        <div class="head-actions">
          ${staff ? `<button class="btn primary" id="addEv" type="button">${icon("plus")}<span>Add entry</span></button>` : ""}
          <button class="btn" id="printBtn" type="button">${icon("print")}<span>Print</span></button>
          ${staff ? `<button class="btn" id="exportBtn" type="button">${icon("download")}<span>Export</span></button>` : ""}
        </div>
      </section>
      <section class="wrap sched-controls" aria-label="Schedule controls">
        <div class="ctl-row">
          <div class="seg" role="group" aria-label="View">
            ${[["week", "Week", "calendar"], ["list", "List", "list"], ["today", "Today", "clock"]].map(([m, l, i]) =>
              `<button type="button" data-mode="${m}" aria-pressed="${state.mode === m}">${icon(i)}<span>${l}</span></button>`).join("")}
          </div>
          ${state.mode !== "today" ? `
          <div class="weeknav" role="group" aria-label="Change week">
            <button class="icon-btn" id="prevWk" type="button" aria-label="Previous week">${icon("left")}</button>
            <button class="btn sm" id="thisWk" type="button">This week</button>
            <button class="icon-btn" id="nextWk" type="button" aria-label="Next week">${icon("right")}</button>
            <h2 class="wk-label" aria-live="polite">${esc(T.fmtDate(state.week, "dm"))} to ${esc(T.fmtDate(wkEnd, "dm"))}, ${wkEnd.slice(0, 4)}</h2>
          </div>` : ""}
        </div>
        <details class="filters-d" ${narrow() && !filtersOn ? "" : "open"}><summary>${icon("list")}<span>Filters${filtersOn ? " (on)" : ""}</span></summary>
        <div class="ctl-row filters">
          <div class="field inline"><label for="fZone">Program area</label>
            <select id="fZone"><option value="">All areas</option>${C.zones.map(z => `<option value="${z.id}" ${state.zone === z.id ? "selected" : ""}>${esc(z.name)}</option>`).join("")}</select></div>
          <div class="field inline"><label for="fStaff">Staff or partner</label>
            <select id="fStaff"><option value="">Everyone</option>${staffList.map(s => `<option ${state.staff === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
          <fieldset class="type-filter"><legend>Activity type <span class="opt">select to show or hide</span></legend>
            ${Object.entries(C.types).map(([k, t]) => `<button type="button" class="tchip t-${k} toggle" data-type="${k}" aria-pressed="${state.types.has(k)}">${icon(t.icon)}<span>${esc(t.label)}</span></button>`).join("")}
          </fieldset>
          ${filtersOn ? `<button class="btn sm ghost" id="clearF" type="button">${icon("x")}<span>Clear filters</span></button>` : ""}
        </div></details>
      </section>
      <section class="wrap" id="schedBody" aria-label="Schedule"></section>`;

    const body = el.querySelector("#schedBody");
    if (state.mode === "today") renderToday(body);
    else if (state.mode === "list" || narrow()) renderList(body, state.week, wkEnd, state.mode === "week");
    else renderWeek(body);

    wire(el);
  }

  function wire(el) {
    el.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { state.mode = b.dataset.mode; remember(); render(root); focusSel(`[data-mode="${state.mode}"]`); });
    const pw = el.querySelector("#prevWk"); if (pw) pw.onclick = () => { state.week = T.addDays(state.week, -7); render(root); focusSel("#prevWk"); };
    const nw = el.querySelector("#nextWk"); if (nw) nw.onclick = () => { state.week = T.addDays(state.week, 7); render(root); focusSel("#nextWk"); };
    const tw = el.querySelector("#thisWk"); if (tw) tw.onclick = () => { state.week = T.weekStart(T.now().date); render(root); focusSel("#thisWk"); };
    el.querySelector("#fZone").onchange = e => { state.zone = e.target.value; remember(); render(root); focusSel("#fZone"); };
    el.querySelector("#fStaff").onchange = e => { state.staff = e.target.value; remember(); render(root); focusSel("#fStaff"); };
    el.querySelectorAll("[data-type]").forEach(b => b.onclick = () => {
      const k = b.dataset.type; state.types.has(k) ? state.types.delete(k) : state.types.add(k);
      remember(); render(root); focusSel(`[data-type="${k}"]`);
    });
    const cf = el.querySelector("#clearF"); if (cf) cf.onclick = () => { state.zone = ""; state.staff = ""; state.types = new Set(Object.keys(C.types)); remember(); render(root); focusSel("#fZone"); };
    const add = el.querySelector("#addEv"); if (add) add.onclick = () => openEditor(null);
    el.querySelector("#printBtn").onclick = T.printPage;
    const ex = el.querySelector("#exportBtn"); if (ex) ex.onclick = exportMenu;
    el.querySelectorAll("[data-occ]").forEach(b => b.onclick = () => openDetail(b.dataset.occ));
  }
  const focusSel = s => { const x = root && root.querySelector(s); if (x) x.focus(); };

  /* ---------------- week grid ---------------- */
  function renderWeek(body) {
    const t = T.now();
    const from = state.week, to = T.addDays(from, 6);
    const occ = T.occurrences(from, to).filter(o => passes(o.ev));
    const bad = T.conflictKeys(from, to);
    const g0 = C.gridStartHour, g1 = C.gridEndHour;
    const hours = []; for (let h = g0; h < g1; h++) hours.push(h);
    const days = [...Array(7)].map((_, i) => T.addDays(from, i));
    const outside = occ.filter(o => T.mins(o.ev.end) <= g0 * 60 || T.mins(o.ev.start) >= g1 * 60);

    body.innerHTML = `${legend()}
      <div class="week-scroll">
        <div class="week" style="--hours:${g1 - g0};--hpx:${HOUR_PX}px;grid-template-columns:62px ${days.map(d => occ.some(o => o.date === d) ? "minmax(132px,1fr)" : "minmax(64px,.4fr)").join(" ")}" role="grid" aria-label="Week of ${esc(T.fmtDate(from, "dm"))}">
          <div class="wk-corner" aria-hidden="true"></div>
          ${days.map(d => `<div class="wk-day ${d === t.date ? "today" : ""}" role="columnheader"><span class="dn">${T.DAY_SHORT[T.dow(d)]}</span><span class="dd">${esc(T.fmtDate(d, "dm"))}</span>${d === t.date ? '<span class="today-tag">Today</span>' : ""}${occ.some(o => o.date === d) ? "" : '<span class="dd quiet">Nothing scheduled</span>'}</div>`).join("")}
          <div class="wk-times" aria-hidden="true">${hours.map(h => `<span>${T.fmtTime(T.pad(h) + ":00")}</span>`).join("")}</div>
          ${days.map(d => dayCol(d, occ.filter(o => o.date === d), bad, t)).join("")}
        </div>
      </div>
      ${outside.length ? `<p class="muted small">${outside.length} entr${outside.length === 1 ? "y is" : "ies are"} outside the ${T.fmtTime(T.pad(g0) + ":00")} to ${T.fmtTime(T.pad(g1) + ":00")} grid. Switch to List view to see ${outside.length === 1 ? "it" : "them"}.</p>` : ""}
      ${!occ.length ? `<p class="empty">Nothing matches these filters this week.</p>` : ""}`;
  }

  function dayCol(d, list, bad, t) {
    const g0 = C.gridStartHour * 60, g1 = C.gridEndHour * 60;
    const pos = ev => {
      const s = Math.max(g0, T.mins(ev.start)), e = Math.min(g1, T.mins(ev.end));
      return { top: (s - g0) / 60 * HOUR_PX, h: Math.max(22, (e - s) / 60 * HOUR_PX - 3) };
    };
    const vis = list.filter(o => T.mins(o.ev.end) > g0 && T.mins(o.ev.start) < g1);
    const bg = vis.filter(o => isBg(o.ev)), fg = vis.filter(o => !isBg(o.ev));
    // lanes for foreground events
    const lanes = layout(fg);
    let html = `<div class="wk-col ${d === t.date ? "today" : ""}" role="gridcell" aria-label="${esc(T.fmtDate(d))}">`;
    bg.forEach(o => {
      const p = pos(o.ev);
      html += `<button type="button" class="ev ev-bg t-${o.ev.type} ${bad.has(o.key) ? "clash" : ""}" data-occ="${o.key}" style="top:${p.top}px;height:${p.h}px" aria-label="${esc(aria(o, bad))}">
        <span class="ev-t">${icon(C.types[o.ev.type].icon)}${esc(o.ev.title)}</span><span class="ev-m">${T.fmtRange(o.ev.start, o.ev.end)}</span></button>`;
    });
    fg.forEach(o => {
      const p = pos(o.ev), L = lanes.get(o.key);
      const left = `calc(${L.i / L.n * 100}% + 4px)`, width = `calc(${100 / L.n}% - 8px)`;
      html += `<button type="button" class="ev t-${o.ev.type} ${bad.has(o.key) ? "clash" : ""} ${p.h < 48 ? "tight" : ""} ${L.n > 1 ? "shared" : ""}" data-occ="${o.key}" style="top:${p.top}px;height:${p.h}px;left:${left};width:${width}" aria-label="${esc(aria(o, bad))}">
        <span class="ev-k">${icon(C.types[o.ev.type].icon)}<span>${esc(C.types[o.ev.type].short)}</span>${bad.has(o.key) ? `<span class="clash-tag">${icon("alert")}<span>Overlap</span></span>` : ""}</span>
        <span class="ev-t">${esc(o.ev.title)}</span>
        <span class="ev-m">${T.fmtTime(o.ev.start)} · ${esc(T.location(o.ev.location))}</span></button>`;
    });
    if (d === t.date && t.minutes > g0 && t.minutes < g1) html += `<div class="now-line" style="top:${(t.minutes - g0) / 60 * HOUR_PX}px"><span class="sr-only">Current time ${T.fmtTime(t.hm)}</span></div>`;
    return html + `</div>`;
  }
  function layout(list) {
    const res = new Map(); let cluster = [], colsEnd = [], clusterEnd = -1;
    const flush = () => { cluster.forEach(c => res.set(c.key, { i: c.i, n: colsEnd.length })); cluster = []; colsEnd = []; };
    list.slice().sort((a, b) => T.mins(a.ev.start) - T.mins(b.ev.start) || T.mins(b.ev.end) - T.mins(a.ev.end)).forEach(o => {
      const s = T.mins(o.ev.start), e = T.mins(o.ev.end);
      if (cluster.length && s >= clusterEnd) { flush(); clusterEnd = -1; }
      let i = colsEnd.findIndex(end => end <= s); if (i < 0) { i = colsEnd.length; colsEnd.push(e); } else colsEnd[i] = e;
      cluster.push({ key: o.key, i }); clusterEnd = Math.max(clusterEnd, e);
    });
    flush();
    return res;
  }
  function aria(o, bad) {
    const ev = o.ev;
    return `${C.types[ev.type].label}: ${ev.title}. ${T.fmtDate(o.date, "short")}, ${T.fmtRange(ev.start, ev.end)}, ${T.location(ev.location)}.${bad && bad.has(o.key) ? " Overlaps another booking." : ""} Open details.`;
  }
  function legend() {
    return `<div class="legend"><span class="legend-clash">${icon("alert")}<span>Orange outline = overlapping booking in the same space</span></span>
      <span class="legend-note">Types use the same colours and patterns as the filter buttons above.</span></div>`;
  }

  /* ---------------- list view ---------------- */
  function renderList(body, from, to, fromWeekMode) {
    const t = T.now();
    const occ = T.occurrences(from, to).filter(o => passes(o.ev));
    const bad = T.conflictKeys(from, to);
    const byDay = {}; occ.forEach(o => (byDay[o.date] = byDay[o.date] || []).push(o));
    const days = [...Array(7)].map((_, i) => T.addDays(from, i));
    body.innerHTML = `${fromWeekMode ? `<p class="muted small">Showing the week as a list on this screen size.</p>` : ""}${legend()}
      <div class="daylist">${days.map(d => `
        <section class="dayblock ${d === t.date ? "today" : ""}" aria-labelledby="d-${d}">
          <h3 id="d-${d}">${esc(T.fmtDate(d, "short"))}${d === t.date ? ' <span class="today-tag">Today</span>' : ""}</h3>
          ${(byDay[d] || []).length ? `<ul class="rows">${byDay[d].map(o => row(o, bad)).join("")}</ul>` : `<p class="muted">Nothing scheduled${state.types.size !== Object.keys(C.types).length || state.zone || state.staff ? " that matches the filters" : ""}.</p>`}
        </section>`).join("")}</div>`;
  }
  function row(o, bad) {
    const ev = o.ev;
    return `<li><button type="button" class="row t-${ev.type} ${bad && bad.has(o.key) ? "clash" : ""}" data-occ="${o.key}" aria-label="${esc(aria(o, bad))}">
      <span class="r-time">${T.fmtTime(ev.start)}<span>to ${T.fmtTime(ev.end)}</span></span>
      <span class="r-bar" aria-hidden="true"></span>
      <span class="r-main"><span class="r-title">${esc(ev.title)}</span>
        <span class="r-meta">${T.typeChip(ev.type, "sm")}<span>${icon("pin")}${esc(T.location(ev.location))}</span>${ev.staff ? `<span>${icon("users")}${esc(ev.staff)}</span>` : ""}${ev.repeat ? `<span>${icon("repeat")}Repeats</span>` : ""}</span></span>
      <span class="r-side">${T.statusChip(ev.status)}${bad && bad.has(o.key) ? `<span class="clash-tag">${icon("alert")}Overlap</span>` : ""}</span>
    </button></li>`;
  }

  /* ---------------- today view ---------------- */
  function renderToday(body) {
    const t = T.now();
    const occ = T.occurrences(t.date, t.date).filter(o => passes(o.ev));
    const bad = T.conflictKeys(t.date, t.date);
    const nowL = occ.filter(o => T.mins(o.ev.start) <= t.minutes && T.mins(o.ev.end) > t.minutes);
    const later = occ.filter(o => T.mins(o.ev.start) > t.minutes);
    const done = occ.filter(o => T.mins(o.ev.end) <= t.minutes);
    const block = (h, list, empty) => `<section class="today-sec" aria-labelledby="h-${h.replace(/\W/g, "")}"><h3 id="h-${h.replace(/\W/g, "")}">${h}</h3>${list.length ? `<ul class="rows">${list.map(o => row(o, bad)).join("")}</ul>` : `<p class="muted">${empty}</p>`}</section>`;
    body.innerHTML = `
      <div class="today-head"><p class="today-date">${esc(T.fmtDate(t.date))}</p><p class="today-clock" data-clock>${T.fmtTime(t.hm)} <span>${esc(C.timeZoneLabel)}</span></p></div>
      ${legend()}
      ${block("Happening now", nowL, "Nothing is running right now.")}
      ${block("Later today", later, "Nothing else scheduled today.")}
      ${done.length ? block("Earlier today", done, "") : ""}`;
  }

  /* ---------------- detail ---------------- */
  function openDetail(key) {
    const [id, date] = key.split("@");
    const ev = T.db.find("events", id); if (!ev) return;
    const act = ev.activity ? T.activity(ev.activity) : null;
    const z = T.zone(ev.zone);
    const from = T.addDays(date, -1), to = T.addDays(date, 1);
    const hits = T.conflictsFor(ev, date, date);
    const staff = T.isStaff();
    T.modal({
      title: ev.title,
      body: `
        <div class="detail-chips">${T.typeChip(ev.type)}${T.statusChip(ev.status)}</div>
        <dl class="dl">
          <dt>${icon("calendar")}When</dt><dd>${esc(T.fmtDate(date))}<br>${T.fmtRange(ev.start, ev.end)} <span class="muted">${esc(C.timeZoneLabel)}</span></dd>
          <dt>${icon("repeat")}Repeats</dt><dd>${esc(T.describeRepeat(ev))}</dd>
          <dt>${icon("pin")}Where</dt><dd>${esc(T.location(ev.location))}${z ? ` · ${esc(z.name)}` : ""}</dd>
          ${ev.staff ? `<dt>${icon("users")}Staff or partner</dt><dd>${esc(ev.staff)}</dd>` : ""}
          ${ev.capacity ? `<dt>${icon("checkin")}Capacity</dt><dd>${esc(ev.capacity)} spots</dd>` : ""}
          ${act ? `<dt>${icon("grid")}Activity</dt><dd><a href="#activity-${act.id}" data-close>${esc(act.name)}</a>${act.signup ? `<br><span class="muted">${esc(act.signup)}</span>` : ""}</dd>` : ""}
          ${ev.notes ? `<dt>${icon("info")}Notes</dt><dd>${esc(ev.notes)}</dd>` : ""}
        </dl>
        ${ev.status !== "confirmed" ? `<p class="callout">${icon("info")}<span>${esc(C.statuses[ev.status].hint)}</span></p>` : ""}
        ${hits.length ? `<div class="callout warn" role="note">${icon("alert")}<div><b>Overlaps on this date:</b><ul>${hits.map(h => `<li>${esc(h.other.title)}, ${T.fmtRange(h.other.start, h.other.end)}, ${esc(T.location(h.other.location))}</li>`).join("")}</ul></div></div>` : ""}`,
      actions: staff ? [
        { label: "Remove", kind: "danger ghost", icon: "trash", onClick: c => { c(); removeFlow(ev, date); } },
        { label: "Duplicate", icon: "copy", onClick: c => { c(); const copy = JSON.parse(JSON.stringify(ev)); copy.id = ""; copy.title = ev.title + " (copy)"; copy.date = date; copy.exceptions = []; openEditor(copy); } },
        { label: "Edit", kind: "primary", icon: "edit", onClick: c => { c(); editFlow(ev, date); } }
      ] : [{ label: "Close", kind: "primary" }]
    });
  }

  function seriesChoice(title, verbOne, verbAll) {
    return new Promise(resolve => {
      T.modal({
        title, body: `<p>This entry repeats. Do you want to change only this date, or every date in the series?</p>`,
        actions: [
          { label: "Cancel", onClick: c => { c(); resolve(null); } },
          { label: verbOne, onClick: c => { c(); resolve("one"); } },
          { label: verbAll, kind: "primary", onClick: c => { c(); resolve("all"); } }
        ]
      });
    });
  }
  async function editFlow(ev, date) {
    if (!ev.repeat) return openEditor(ev);
    const pick = await seriesChoice("Edit a repeating entry", "Only this date", "Whole series");
    if (pick === "all") openEditor(ev);
    if (pick === "one") {
      const one = JSON.parse(JSON.stringify(ev));
      one.id = ""; one.date = date; one.repeat = null; one.exceptions = [];
      openEditor(one, { splitFrom: ev.id, splitDate: date });
    }
  }
  async function removeFlow(ev, date) {
    if (ev.repeat) {
      const pick = await seriesChoice("Remove a repeating entry", "Only this date", "Whole series");
      if (pick === "one") {
        const s = T.db.find("events", ev.id); s.exceptions = [...new Set([...(s.exceptions || []), date])];
        T.db.upsert("events", s); T.toast(`Removed ${ev.title} on ${T.fmtDate(date, "dm")}.`); return;
      }
      if (pick !== "all") return;
    } else {
      const ok = await T.confirmDialog(`Remove "${ev.title}" on ${T.fmtDate(date, "short")}? This cannot be undone.`, { title: "Remove entry", confirmLabel: "Remove", danger: true });
      if (!ok) return;
    }
    T.db.remove("events", ev.id); T.toast(`Removed ${ev.title}.`);
  }

  /* ---------------- editor ---------------- */
  function openEditor(src, split) {
    if (!T.isStaff()) { T.staffLogin(() => openEditor(src, split)); return; }
    const t = T.now();
    const ev = src ? JSON.parse(JSON.stringify(src)) : {
      id: "", title: "", type: "workshop", activity: "", zone: "", location: "centre",
      date: t.date, start: "16:00", end: "17:00", repeat: null, exceptions: [], staff: "", capacity: "", status: "tentative", notes: ""
    };
    const isNew = !ev.id;
    const staffList = [...new Set(T.db.list("events").map(e => e.staff).filter(Boolean))].sort();
    let confirmedClash = false;

    const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? "selected" : ""}>${esc(l)}</option>`;
    const body = `
      <form id="evForm" class="form" novalidate>
        ${split ? `<p class="callout">${icon("info")}<span>You are editing only ${esc(T.fmtDate(split.splitDate, "short"))}. The rest of the series stays the same.</span></p>` : ""}
        <div id="formErr" class="callout warn" role="alert" hidden></div>
        <div class="field"><label for="f-title">Title <span class="req">required</span></label><input id="f-title" required value="${esc(ev.title)}" autocomplete="off"></div>
        <div class="grid2">
          <div class="field"><label for="f-type">Type</label><select id="f-type">${Object.entries(C.types).map(([k, x]) => opt(k, x.label, ev.type === k)).join("")}</select></div>
          <div class="field"><label for="f-status">Status</label><select id="f-status">${Object.entries(C.statuses).map(([k, x]) => opt(k, x.label, ev.status === k)).join("")}</select></div>
          <div class="field"><label for="f-act">Activity <span class="opt">optional</span></label><select id="f-act">${opt("", "None", !ev.activity)}${T.db.list("activities").map(a => opt(a.id, a.name, ev.activity === a.id)).join("")}</select></div>
          <div class="field"><label for="f-zone">Program area <span class="opt">optional</span></label><select id="f-zone">${opt("", "None", !ev.zone)}${C.zones.map(z => opt(z.id, z.name, ev.zone === z.id)).join("")}</select></div>
          <div class="field"><label for="f-loc">Location</label><select id="f-loc">${C.locations.map(l => opt(l.id, l.name, ev.location === l.id)).join("")}</select></div>
          <div class="field"><label for="f-staff">Staff or partner <span class="opt">optional</span></label><input id="f-staff" list="staffOpts" value="${esc(ev.staff)}" autocomplete="off"><datalist id="staffOpts">${staffList.map(s => `<option value="${esc(s)}">`).join("")}</datalist></div>
        </div>
        <div class="grid3">
          <div class="field"><label for="f-date">${split ? "Date" : "Date (first date if repeating)"}</label><input id="f-date" type="date" required value="${ev.date}"></div>
          <div class="field"><label for="f-start">Starts</label><input id="f-start" type="time" step="900" required value="${ev.start}"></div>
          <div class="field"><label for="f-end">Ends</label><input id="f-end" type="time" step="900" required value="${ev.end}"></div>
        </div>
        <p class="hint">${icon("clock")}Times are ${esc(C.timeZoneLabel)}.</p>
        ${split ? "" : `
        <fieldset class="field repeat-set"><legend>Repeat</legend>
          <div class="radio-row">
            <label><input type="radio" name="rep" value="none" ${!ev.repeat ? "checked" : ""}> One time</label>
            <label><input type="radio" name="rep" value="weekly" ${ev.repeat ? "checked" : ""}> Weekly</label>
          </div>
          <div id="repOpts" ${ev.repeat ? "" : "hidden"}>
            <fieldset class="days"><legend class="sr-only">Days of the week</legend>
              ${T.DAY_SHORT.map((d, i) => `<label class="daybox"><input type="checkbox" name="day" value="${i}" ${ev.repeat && ev.repeat.days.includes(i) ? "checked" : ""}><span>${d}</span></label>`).join("")}
            </fieldset>
            <div class="grid2">
              <div class="field"><label for="f-every">How often</label><select id="f-every">${[1, 2, 3, 4].map(n => opt(n, n === 1 ? "Every week" : `Every ${n} weeks`, (ev.repeat ? ev.repeat.every : 1) === n)).join("")}</select></div>
              <div class="field"><label for="f-until">Ends on <span class="opt">optional</span></label><input id="f-until" type="date" value="${ev.repeat ? ev.repeat.until || "" : ""}"></div>
            </div>
            ${ev.exceptions && ev.exceptions.length ? `<p class="hint">${ev.exceptions.length} date${ev.exceptions.length === 1 ? " is" : "s are"} skipped in this series.</p>` : ""}
          </div>
        </fieldset>`}
        <div class="grid2">
          <div class="field"><label for="f-cap">Capacity <span class="opt">optional</span></label><input id="f-cap" inputmode="numeric" value="${esc(ev.capacity)}"></div>
        </div>
        <div class="field"><label for="f-notes">Notes <span class="opt">optional</span></label><textarea id="f-notes" rows="3">${esc(ev.notes)}</textarea></div>
        <div id="clashBox" hidden></div>
      </form>`;

    T.modal({
      title: isNew ? (split ? "Edit this date" : "Add schedule entry") : "Edit schedule entry",
      wide: true, body,
      actions: [{ label: "Cancel" }, { label: isNew ? "Save entry" : "Save changes", kind: "primary", id: "saveEv", onClick: close => submit(close) }],
      onOpen: box => {
        box.querySelectorAll('input[name="rep"]').forEach(r => r.onchange = () => {
          const weekly = box.querySelector('input[name="rep"]:checked').value === "weekly";
          box.querySelector("#repOpts").hidden = !weekly;
          if (weekly && !box.querySelector('input[name="day"]:checked')) {
            const d = T.dow(box.querySelector("#f-date").value || t.date);
            box.querySelector(`input[name="day"][value="${d}"]`).checked = true;
          }
        });
        box.querySelector("#f-act").onchange = e => {
          const a = T.activity(e.target.value); if (!a) return;
          const ti = box.querySelector("#f-title"); if (!ti.value.trim()) ti.value = a.name;
          box.querySelector("#f-zone").value = a.zone || ""; box.querySelector("#f-loc").value = a.location || "centre";
          if (a.capacity && !box.querySelector("#f-cap").value) box.querySelector("#f-cap").value = a.capacity;
        };
        // any change after a clash warning means the warning must be re-checked
        box.querySelector("#evForm").addEventListener("input", () => { if (confirmedClash) { confirmedClash = false; box.querySelector("#clashBox").hidden = true; setSaveLabel(box, isNew); } });
        box.querySelector("#evForm").addEventListener("submit", e => { e.preventDefault(); submit(T.closeModal); });
      }
    });

    function setSaveLabel(box, isNew) { const b = box.querySelector("#saveEv span"); if (b) b.textContent = isNew ? "Save entry" : "Save changes"; }

    function submit(close) {
      const box = document.querySelector(".modal");
      const v = id => box.querySelector(id).value.trim();
      const errs = [];
      const out = Object.assign({}, ev, {
        title: v("#f-title"), type: v("#f-type"), status: v("#f-status"), activity: v("#f-act"), zone: v("#f-zone"),
        location: v("#f-loc"), staff: v("#f-staff"), date: v("#f-date"), start: v("#f-start"), end: v("#f-end"),
        capacity: v("#f-cap"), notes: box.querySelector("#f-notes").value.trim()
      });
      if (!split) {
        const weekly = box.querySelector('input[name="rep"]:checked').value === "weekly";
        if (weekly) {
          const days = [...box.querySelectorAll('input[name="day"]:checked')].map(x => Number(x.value));
          out.repeat = { days, every: Number(v("#f-every")) || 1, until: v("#f-until") };
          if (!days.length) errs.push(["f-every", "Pick at least one day for a weekly entry."]);
          if (out.repeat.until && out.repeat.until < out.date) errs.push(["f-until", "The end date must be after the first date."]);
        } else out.repeat = null;
      }
      if (!out.title) errs.push(["f-title", "Add a title."]);
      if (!out.date) errs.push(["f-date", "Pick a date."]);
      if (!out.start || !out.end) errs.push(["f-start", "Add a start and end time."]);
      else if (T.mins(out.end) <= T.mins(out.start)) errs.push(["f-end", "The end time must be after the start time."]);
      const errBox = box.querySelector("#formErr");
      box.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
      if (errs.length) {
        errBox.hidden = false;
        errBox.innerHTML = `${icon("alert")}<div><b>Fix ${errs.length === 1 ? "this" : "these"} before saving:</b><ul>${errs.map(e => `<li>${esc(e[1])}</li>`).join("")}</ul></div>`;
        errs.forEach(e => { const f = box.querySelector("#" + e[0]); if (f) f.setAttribute("aria-invalid", "true"); });
        const first = box.querySelector("#" + errs[0][0]); if (first) first.focus();
        return;
      }
      errBox.hidden = true;

      // overlap check over the next 8 weeks of this entry
      const today = T.now().date;
      const from = out.date > today ? out.date : today;
      const probe = Object.assign({}, out, { id: out.id || "__new__" });
      // a split date must not clash with its own (soon to be skipped) series date
      const saved = split ? T.db.find("events", split.splitFrom) : null;
      let hits = T.conflictsFor(probe, from, T.addDays(from, 56));
      if (split) hits = hits.filter(h => !(h.other.id === split.splitFrom && h.date === split.splitDate));
      if (hits.length && !confirmedClash) {
        confirmedClash = true;
        const cb = box.querySelector("#clashBox");
        cb.hidden = false;
        cb.innerHTML = `<div class="callout warn" role="alert">${icon("alert")}<div><b>This overlaps ${hits.length} other booking${hits.length === 1 ? "" : "s"} in the next 8 weeks.</b>
          <ul>${hits.slice(0, 6).map(h => `<li>${esc(T.fmtDate(h.date, "short"))}: ${esc(h.other.title)}, ${T.fmtRange(h.other.start, h.other.end)}, ${esc(T.location(h.other.location))}</li>`).join("")}${hits.length > 6 ? `<li>and ${hits.length - 6} more</li>` : ""}</ul>
          <p>Change the time or location, or select <b>Save anyway</b> to keep the overlap. It will stay flagged on the schedule.</p></div></div>`;
        box.querySelector("#saveEv span").textContent = "Save anyway";
        cb.scrollIntoView({ block: "nearest" });
        return;
      }
      if (!out.id) out.id = T.uid("ev");
      if (split && saved) { saved.exceptions = [...new Set([...(saved.exceptions || []), split.splitDate])]; T.db.upsert("events", saved); }
      T.db.upsert("events", out);
      close();
      T.toast(`${isNew && !split ? "Added" : "Saved"} ${out.title}${hits.length ? " (overlap flagged)" : ""}.`);
    }
  }

  /* ---------------- export ---------------- */
  function exportMenu() {
    const from = state.week, to = T.addDays(from, 6);
    T.modal({
      title: "Export schedule",
      body: `<p>Exports use the current filters. Nothing is sent to Google Calendar or any other service: you get a file to import yourself.</p>
        <ul class="export-list">
          <li><b>Calendar file (.ics)</b><span>Every matching entry, with repeats. Import it into Google Calendar or Outlook.</span></li>
          <li><b>Spreadsheet (.csv)</b><span>Each date in the week shown (${esc(T.fmtDate(from, "dm"))} to ${esc(T.fmtDate(to, "dm"))}).</span></li>
        </ul>`,
      actions: [
        { label: "Cancel" },
        { label: "Week as CSV", icon: "download", onClick: c => { c(); exportCSV(from, to); } },
        { label: "Calendar (.ics)", kind: "primary", icon: "download", onClick: c => { c(); T.exportFile("ttc-schedule.ics", T.toICS(T.db.list("events").filter(passes)), "text/calendar"); } }
      ]
    });
  }
  function exportCSV(from, to) {
    const rows = [["Date", "Day", "Start", "End", "Title", "Type", "Location", "Program area", "Staff or partner", "Capacity", "Status", "Repeats", "Notes"]];
    T.occurrences(from, to).filter(o => passes(o.ev)).forEach(o => {
      const e = o.ev;
      rows.push([o.date, T.DAY_NAMES[T.dow(o.date)], e.start, e.end, e.title, C.types[e.type].label, T.location(e.location), (T.zone(e.zone) || {}).name || "", e.staff, e.capacity, C.statuses[e.status].label, T.describeRepeat(e), e.notes]);
    });
    T.exportFile(`ttc-schedule-${from}.csv`, T.toCSV(rows), "text/csv");
  }

  let mq = null;
  T.views.schedule = {
    title: "Schedule",
    render(el) {
      render(el);
      mq = window.matchMedia("(max-width: 760px)");
      mq.onchange = () => render(root);
    },
    refresh() { render(root); },
    tick() {
      // update clocks and the now-line in place, so focus is never lost
      const t = T.now();
      root.querySelectorAll("[data-clock]").forEach(c => { c.firstChild.textContent = T.fmtTime(t.hm) + " "; });
      const line = root.querySelector(".now-line"), g0 = C.gridStartHour * 60;
      if (line) line.style.top = ((t.minutes - g0) / 60 * HOUR_PX) + "px";
    },
    cleanup() { if (mq) mq.onchange = null; }
  };
  // shared with other views
  T.openEventDetail = openDetail;
  T.openEventEditor = openEditor;
  T.scheduleRow = row;
})();

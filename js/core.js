/* =========================================================================
   CORE: time zone helpers, data store, recurrence, overlap checks,
   prototype staff gate and shared UI pieces (icons, modal, toast, export).
   ========================================================================= */
window.TTC = (function () {
  const C = window.TTC_CONFIG;
  const TZ = C.timeZone;

  /* ---------------- small helpers ---------------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const uid = p => (p || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------------- time (always Toronto) ---------------- */
  const partsFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  function now() {
    const p = {}; partsFmt.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    const date = `${p.year}-${p.month}-${p.day}`;
    const h = Number(p.hour) % 24, m = Number(p.minute);
    return { date, minutes: h * 60 + m, hm: `${pad(h)}:${pad(m)}`, seconds: Number(p.second) };
  }
  const toUTC = iso => new Date(iso + "T00:00:00Z");
  const addDays = (iso, n) => { const d = toUTC(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = iso => toUTC(iso).getUTCDay();
  const weekStart = iso => addDays(iso, -dow(iso));
  const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
  const mins = hm => { if (!hm) return 0; const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  function fmtTime(hm) {
    if (!hm) return "";
    let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return m ? `${h}:${pad(m)} ${ap}` : `${h} ${ap}`;
  }
  const fmtRange = (a, b) => `${fmtTime(a)} to ${fmtTime(b)}`;
  function fmtDate(iso, style) {
    const o = style === "short" ? { weekday: "short", month: "short", day: "numeric" }
      : style === "day" ? { weekday: "long" }
      : style === "month" ? { month: "long", year: "numeric" }
      : style === "dm" ? { month: "short", day: "numeric" }
      : { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    return toUTC(iso).toLocaleDateString("en-CA", Object.assign({ timeZone: "UTC" }, o));
  }
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function deviceTZ() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } }
  function tzOffsetsDiffer() {
    // compare offsets now, so devices in a different zone that matches Toronto right now are not warned
    const d = new Date();
    const local = d.getHours() * 60 + d.getMinutes();
    return local !== now().minutes;
  }

  /* ---------------- store (localStorage on this browser) ---------------- */
  const KEY = "vos-ttc-hub:v1";
  let persistent = true;
  let data = null;

  function readRaw() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { persistent = false; return null; }
  }
  function seed() {
    const t = now().date;
    const s = window.TTC_SAMPLE(weekStart(t), addDays, t);
    return { version: 1, seededAt: new Date().toISOString(), hasSample: true, ...s };
  }
  function load() {
    data = readRaw() || seed();
    ["events", "activities", "announcements", "attendance"].forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
    purgeAttendance();
    save(true);
  }
  function save(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); persistent = true; }
    catch (e) { persistent = false; }
    if (!silent) document.dispatchEvent(new CustomEvent("ttc:change"));
  }
  function purgeAttendance() {
    const cutoff = addDays(now().date, -C.attendanceRetentionDays);
    data.attendance = data.attendance.filter(a => a.date >= cutoff);
  }
  window.addEventListener("storage", e => {
    if (e.key === KEY) { data = readRaw() || data; document.dispatchEvent(new CustomEvent("ttc:change")); }
    if (e.key === STAFF_KEY) document.dispatchEvent(new CustomEvent("ttc:staff"));
  });

  const db = {
    get all() { return data; },
    get persistent() { return persistent; },
    list(k) { return data[k]; },
    find(k, id) { return data[k].find(x => x.id === id); },
    upsert(k, row) {
      const i = data[k].findIndex(x => x.id === row.id);
      if (i >= 0) data[k][i] = row; else data[k].push(row);
      save();
      return row;
    },
    remove(k, id) { data[k] = data[k].filter(x => x.id !== id); save(); },
    replaceAll(obj) {
      data = Object.assign({ version: 1 }, obj);
      ["events", "activities", "announcements", "attendance"].forEach(k => { if (!Array.isArray(data[k])) data[k] = []; });
      save();
    },
    resetToSample() { data = seed(); save(); },
    clearSample() {
      data.events = data.events.filter(e => e.status !== "sample");
      data.announcements = data.announcements.filter(a => a.status !== "sample");
      data.attendance = data.attendance.filter(a => !a.sample);
      data.hasSample = false;
      save();
    },
    sampleCount() {
      return data.events.filter(e => e.status === "sample").length +
        data.announcements.filter(a => a.status === "sample").length +
        data.attendance.filter(a => a.sample).length;
    }
  };

  /* ---------------- recurrence ---------------- */
  // weekly repeat: { days:[0-6], every:N weeks, until:"YYYY-MM-DD"|"" }, exceptions:["YYYY-MM-DD"]
  function occursOn(ev, iso) {
    if (!ev.repeat) return ev.date === iso;
    if (iso < ev.date) return false;
    if (ev.repeat.until && iso > ev.repeat.until) return false;
    if ((ev.exceptions || []).includes(iso)) return false;
    if (!ev.repeat.days.includes(dow(iso))) return false;
    const weeks = Math.round(daysBetween(weekStart(ev.date), weekStart(iso)) / 7);
    return weeks % (ev.repeat.every || 1) === 0;
  }
  function occurrences(from, to, list) {
    const out = [];
    (list || data.events).forEach(ev => {
      if (!ev.repeat) {
        if (ev.date >= from && ev.date <= to) out.push(occ(ev, ev.date));
        return;
      }
      let d = ev.date > from ? ev.date : from;
      const end = ev.repeat.until && ev.repeat.until < to ? ev.repeat.until : to;
      for (; d <= end; d = addDays(d, 1)) if (occursOn(ev, d)) out.push(occ(ev, d));
    });
    return out.sort((a, b) => a.date.localeCompare(b.date) || mins(a.ev.start) - mins(b.ev.start));
  }
  const occ = (ev, date) => ({ ev, date, key: ev.id + "@" + date });
  function describeRepeat(ev) {
    if (!ev.repeat) return "One-time event";
    const days = ev.repeat.days.slice().sort().map(i => DAY_SHORT[i]).join(", ");
    const every = ev.repeat.every > 1 ? `Every ${ev.repeat.every} weeks` : "Every week";
    return `${every} on ${days}` + (ev.repeat.until ? `, until ${fmtDate(ev.repeat.until, "dm")}` : "");
  }

  /* ---------------- overlap / conflict checks ---------------- */
  function locationsClash(a, b) {
    if (a.location === "offsite" || b.location === "offsite") return false;
    if (a.location === b.location) return true; // same room or area (two whole-centre drop-ins also clash)
    if (a.location === "centre" && a.type !== "dropin") return true; // whole-centre booking blocks every area
    if (b.location === "centre" && b.type !== "dropin") return true;
    return false;
  }
  const timesOverlap = (a, b) => mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end);
  // conflicts for one (possibly unsaved) event over a window
  function conflictsFor(ev, from, to) {
    const mine = occurrences(from, to, [ev]);
    const others = occurrences(from, to, data.events.filter(x => x.id !== ev.id));
    const hits = [];
    mine.forEach(m => others.forEach(o => {
      if (o.date === m.date && timesOverlap(m.ev, o.ev) && locationsClash(m.ev, o.ev)) hits.push({ date: m.date, other: o.ev });
    }));
    return hits;
  }
  // set of occurrence keys that clash with something, for flagging in views
  function conflictKeys(from, to) {
    const list = occurrences(from, to);
    const bad = new Set();
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.date !== b.date) break; // list is sorted by date
      if (timesOverlap(a.ev, b.ev) && locationsClash(a.ev, b.ev)) { bad.add(a.key); bad.add(b.key); }
    }
    return bad;
  }
  function conflictPairs(from, to) {
    const list = occurrences(from, to); const pairs = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.date !== b.date) break;
      if (timesOverlap(a.ev, b.ev) && locationsClash(a.ev, b.ev)) pairs.push([a, b]);
    }
    return pairs;
  }

  /* ---------------- lookups ---------------- */
  const zone = id => C.zones.find(z => z.id === id);
  const location = id => (C.locations.find(l => l.id === id) || { name: id || "" }).name;
  const activity = id => data.activities.find(a => a.id === id);

  /* ---------------- prototype staff gate ---------------- */
  const STAFF_KEY = "vos-ttc-hub:staff-until";
  let memStaffUntil = 0;
  function staffUntil() { try { return Number(localStorage.getItem(STAFF_KEY) || 0); } catch (e) { return memStaffUntil; } }
  const isStaff = () => Date.now() < staffUntil();
  function unlockStaff(code) {
    if (String(code).trim() !== String(C.staffCode)) return false;
    const until = Date.now() + C.staffMinutes * 60000;
    memStaffUntil = until;
    try { localStorage.setItem(STAFF_KEY, String(until)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("ttc:staff"));
    return true;
  }
  function lockStaff() {
    memStaffUntil = 0;
    try { localStorage.removeItem(STAFF_KEY); } catch (e) {}
    document.dispatchEvent(new CustomEvent("ttc:staff"));
  }
  let wasStaff = null;
  setInterval(() => { const s = isStaff(); if (wasStaff !== null && s !== wasStaff) document.dispatchEvent(new CustomEvent("ttc:staff")); wasStaff = s; }, 5000);

  /* ---------------- icons (simple line icons) ---------------- */
  const P = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    checkin: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 13l2.5 2.5 4.5-5"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l8 5V4L7 9H5a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    door: '<path d="M6 21V4h10v17"/><path d="M4 21h16"/><circle cx="13" cy="12.5" r=".9" fill="currentColor"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    handshake: '<path d="M3 11l4-4 4 2 3-2 7 5"/><path d="M7 7l-1 8 5 4 3-2 3 2 4-5"/><path d="M11 13l2 2"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    tool: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-1-1-3z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
    signout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    arrow: '<path d="M7 17L17 7M9 7h8v8"/>'
  };
  function icon(name, cls) {
    return `<svg class="ico ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.info}</svg>`;
  }
  // the triple arrow mark used through the brand guide
  const arrows = (cls) => `<span class="arrows ${cls || ""}" aria-hidden="true">${icon("arrow")}${icon("arrow")}${icon("arrow")}</span>`;

  /* ---------------- toast ---------------- */
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------------- modal (focus trapped, Esc closes) ---------------- */
  let openModal = null;
  function modal({ title, body, actions, wide, onOpen, labelledBy }) {
    closeModal();
    const prev = document.activeElement;
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const id = uid("m");
    scrim.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head"><h2 id="${id}">${esc(title)}</h2>
      <button class="icon-btn" data-close aria-label="Close dialog">${icon("x")}</button></div>
      <div class="modal-body"></div>
      ${actions ? `<div class="modal-actions"></div>` : ""}</div>`;
    const bodyEl = scrim.querySelector(".modal-body");
    if (typeof body === "string") bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    if (actions) {
      const bar = scrim.querySelector(".modal-actions");
      actions.forEach(a => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn " + (a.kind || ""); b.innerHTML = (a.icon ? icon(a.icon) : "") + `<span>${esc(a.label)}</span>`;
        if (a.id) b.id = a.id;
        b.onclick = () => { const r = a.onClick ? a.onClick(close) : close(); };
        bar.appendChild(b);
      });
    }
    document.body.appendChild(scrim);
    document.body.classList.add("has-modal");
    const box = scrim.querySelector(".modal");
    function close() {
      scrim.remove(); document.body.classList.remove("has-modal");
      document.removeEventListener("keydown", onKey, true);
      openModal = null;
      document.dispatchEvent(new CustomEvent("ttc:modalclose"));
      if (prev && prev.focus && document.contains(prev)) prev.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const f = [...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    scrim.addEventListener("click", e => { if (e.target === scrim || e.target.closest("[data-close]")) close(); });
    openModal = { close, box };
    if (onOpen) onOpen(box, close);
    const firstField = box.querySelector("input,select,textarea") || box.querySelector(".modal-actions .btn") || box.querySelector("[data-close]");
    if (firstField) firstField.focus();
    return { close, box };
  }
  function closeModal() { if (openModal) openModal.close(); }
  function confirmDialog(message, { title, confirmLabel, danger } = {}) {
    return new Promise(resolve => {
      modal({
        title: title || "Are you sure?",
        body: `<p>${esc(message)}</p>`,
        actions: [
          { label: "Cancel", onClick: c => { c(); resolve(false); } },
          { label: confirmLabel || "Confirm", kind: danger ? "danger" : "primary", onClick: c => { c(); resolve(true); } }
        ]
      });
    });
  }

  /* ---------------- export / print ---------------- */
  const embedded = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  function exportFile(filename, text, mime) {
    if (!embedded) {
      try {
        const blob = new Blob([text], { type: mime || "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast(`Downloaded ${filename}`);
        return;
      } catch (e) { /* fall through to copy */ }
    }
    modal({
      title: `Copy ${filename}`,
      wide: true,
      body: `<p class="muted">This preview window blocks file downloads. Copy the text below and paste it into a new file named <b>${esc(filename)}</b>, or open the app from its own files or hosted link to download directly.</p>
             <label class="sr-only" for="export-text">File contents</label>
             <textarea id="export-text" class="export-text" readonly>${esc(text)}</textarea>`,
      actions: [
        { label: "Close" },
        { label: "Copy to clipboard", kind: "primary", icon: "copy", onClick: () => {
          const ta = document.getElementById("export-text");
          const fallback = () => { ta.focus(); ta.select(); toast("Text selected. Press Ctrl+C or Cmd+C to copy."); };
          try { navigator.clipboard.writeText(text).then(() => toast("Copied."), fallback); } catch (e) { fallback(); }
        } }
      ]
    });
  }
  function printPage() {
    if (embedded) {
      modal({ title: "Printing", body: `<p>Printing is blocked inside this preview window. Open the app from its own files or hosted link and use Print there. The print layout hides navigation and keeps the schedule readable on letter paper.</p>`, actions: [{ label: "OK", kind: "primary" }] });
      return;
    }
    window.print();
  }
  const csvCell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCSV = rows => rows.map(r => r.map(csvCell).join(",")).join("\r\n");

  function toICS(events) {
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Visions of Science//TTC Hub//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VTIMEZONE", "TZID:America/Toronto",
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
      "END:VTIMEZONE"];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const dt = (iso, hm) => iso.replace(/-/g, "") + "T" + hm.replace(":", "") + "00";
    const txt = s => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
    const BY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    events.forEach(ev => {
      // first real occurrence of a series is the DTSTART
      let first = ev.date;
      if (ev.repeat) { for (let i = 0; i < 400; i++) { const d = addDays(ev.date, i); if (occursOn(ev, d)) { first = d; break; } } }
      L.push("BEGIN:VEVENT", "UID:" + ev.id + "@ttc-hub", "DTSTAMP:" + stamp,
        "DTSTART;TZID=America/Toronto:" + dt(first, ev.start), "DTEND;TZID=America/Toronto:" + dt(first, ev.end),
        "SUMMARY:" + txt(ev.title), "LOCATION:" + txt(location(ev.location) + ", " + C.venue),
        "DESCRIPTION:" + txt(`${C.types[ev.type].label}. Status: ${C.statuses[ev.status].label}. ${ev.notes || ""}`));
      if (ev.repeat) {
        let r = "RRULE:FREQ=WEEKLY;INTERVAL=" + (ev.repeat.every || 1) + ";BYDAY=" + ev.repeat.days.map(i => BY[i]).join(",");
        if (ev.repeat.until) r += ";UNTIL=" + ev.repeat.until.replace(/-/g, "") + "T235959Z";
        L.push(r);
        (ev.exceptions || []).forEach(x => L.push("EXDATE;TZID=America/Toronto:" + dt(x, ev.start)));
      }
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n");
  }

  /* ---------------- shared bits of markup ---------------- */
  function typeChip(type, extra) {
    const t = C.types[type]; if (!t) return "";
    return `<span class="tchip t-${type} ${extra || ""}">${icon(t.icon)}<span>${esc(t.label)}</span></span>`;
  }
  function statusChip(status) {
    const s = C.statuses[status]; if (!s) return "";
    return `<span class="schip s-${status}" title="${esc(s.hint)}">${esc(s.label)}</span>`;
  }
  const staffPill = () => `<span class="staff-pill">${icon("lock")}<span>Staff only</span></span>`;

  load();

  return {
    C, esc, pad, uid, now, addDays, dow, weekStart, daysBetween, mins, fmtTime, fmtRange, fmtDate, DAY_NAMES, DAY_SHORT,
    deviceTZ, tzOffsetsDiffer, db, occursOn, occurrences, describeRepeat, conflictsFor, conflictKeys, conflictPairs,
    timesOverlap, locationsClash, zone, location, activity, isStaff, unlockStaff, lockStaff, staffUntil,
    icon, arrows, toast, modal, closeModal, confirmDialog, exportFile, printPage, toCSV, toICS, embedded,
    typeChip, statusChip, staffPill, views: {}
  };
})();

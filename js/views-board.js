/* =========================================================================
   ANNOUNCEMENTS + CENTRE DISPLAY (TV mode).
   The display shows the schedule and announcements only. It never shows
   youth names, attendance lists or staff-only time.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const KINDS = { announcement: "Announcement", shoutout: "Shout-out", reminder: "Reminder" };

  const isLive = (a, d) => (!a.start || a.start <= d) && (!a.end || a.end >= d);
  const sortA = (x, y) => (y.pinned - x.pinned) || String(y.start).localeCompare(String(x.start));
  function live() { const d = T.now().date; return T.db.list("announcements").filter(a => isLive(a, d)).sort(sortA); }
  function forDisplay() { return live().filter(a => a.onDisplay && (a.kind !== "shoutout" || a.consent)); }
  window.TTCBoard = { live, forDisplay };

  /* ---------------- announcements page ---------------- */
  function card(a, staff) {
    const d = T.now().date;
    const blocked = a.onDisplay && a.kind === "shoutout" && !a.consent;
    return `<li class="ann k-${a.kind}">
      <div class="ann-top"><span class="kchip k-${a.kind}">${icon(a.kind === "shoutout" ? "star" : a.kind === "reminder" ? "clock" : "megaphone")}${KINDS[a.kind]}</span>
        ${a.pinned ? `<span class="pinned">${icon("pin")}Pinned</span>` : ""}${T.statusChip(a.status)}</div>
      <h3>${esc(a.title)}</h3>
      ${a.body ? `<p>${esc(a.body)}</p>` : ""}
      ${staff ? `<p class="ann-meta">${a.start ? `From ${esc(T.fmtDate(a.start, "dm"))}` : "Always"}${a.end ? ` to ${esc(T.fmtDate(a.end, "dm"))}` : ", no end date"} ·
        ${blocked ? `<span class="warn-txt">${icon("alert")}Hidden from TV until consent is confirmed</span>` : a.onDisplay ? `${icon("tv")}On TV display` : "Not on TV display"}
        ${!isLive(a, d) ? ` · <b>${a.start > d ? "Scheduled" : "Ended"}</b>` : ""}</p>
        <div class="ann-actions"><button class="btn sm" data-edit="${a.id}" type="button">${icon("edit")}<span>Edit</span></button>
        <button class="btn sm danger ghost" data-del="${a.id}" type="button">${icon("trash")}<span>Remove</span></button></div>` : ""}
    </li>`;
  }

  T.views.announcements = {
    title: "Announcements",
    render(el) {
      const staff = T.isStaff(), d = T.now().date;
      const all = T.db.list("announcements").slice().sort(sortA);
      const now = all.filter(a => isLive(a, d));
      const future = all.filter(a => a.start && a.start > d);
      const past = all.filter(a => a.end && a.end < d);
      el.innerHTML = `
        <section class="page-head wrap">
          <div><p class="eyebrow">Announcements ${T.arrows("sm")}</p><h1>What's new</h1>
          <p class="lede">News, reminders and shout-outs from the centre.</p></div>
          <div class="head-actions">
            ${staff ? `<button class="btn primary" id="addAnn" type="button">${icon("plus")}<span>New announcement</span></button>` : ""}
            <a class="btn" href="#display">${icon("tv")}<span>Open centre display</span></a>
          </div>
        </section>
        <div class="wrap">
          ${now.length ? `<ul class="ann-list">${now.map(a => card(a, staff)).join("")}</ul>` : `<p class="empty">No announcements right now.${staff ? " Add one with New announcement." : ""}</p>`}
          ${staff ? `
            <section class="staff-sec"><h2>${T.staffPill()} Scheduled</h2>${future.length ? `<ul class="ann-list">${future.map(a => card(a, staff)).join("")}</ul>` : `<p class="muted">Nothing scheduled.</p>`}</section>
            <section class="staff-sec"><h2>${T.staffPill()} Ended</h2>${past.length ? `<ul class="ann-list">${past.map(a => card(a, staff)).join("")}</ul>` : `<p class="muted">Nothing has ended yet.</p>`}</section>` : ""}
        </div>`;
      const add = el.querySelector("#addAnn"); if (add) add.onclick = () => editAnn(null);
      el.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editAnn(T.db.find("announcements", b.dataset.edit)));
      el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        const a = T.db.find("announcements", b.dataset.del);
        if (await T.confirmDialog(`Remove "${a.title}"? It will disappear from the TV display too.`, { title: "Remove announcement", confirmLabel: "Remove", danger: true })) { T.db.remove("announcements", a.id); T.toast("Announcement removed."); }
      });
    }
  };

  function editAnn(src) {
    if (!T.isStaff()) { T.staffLogin(() => editAnn(src)); return; }
    const d = T.now().date;
    const a = src ? JSON.parse(JSON.stringify(src)) : { id: "", kind: "announcement", title: "", body: "", start: d, end: "", onDisplay: true, pinned: false, consent: false, status: "confirmed" };
    const opt = (v, l, s) => `<option value="${v}" ${s ? "selected" : ""}>${esc(l)}</option>`;
    T.modal({
      title: src ? "Edit announcement" : "New announcement", wide: true,
      body: `<form class="form" id="annForm" novalidate>
        <div id="annErr" class="callout warn" role="alert" hidden></div>
        <div class="grid2">
          <div class="field"><label for="n-kind">Type</label><select id="n-kind">${Object.entries(KINDS).map(([k, l]) => opt(k, l, a.kind === k)).join("")}</select></div>
          <div class="field"><label for="n-status">Status</label><select id="n-status">${Object.entries(C.statuses).map(([k, x]) => opt(k, x.label, a.status === k)).join("")}</select></div>
        </div>
        <div class="field"><label for="n-title">Headline <span class="req">required</span></label><input id="n-title" maxlength="70" value="${esc(a.title)}" aria-describedby="n-title-c"><span class="count" id="n-title-c"></span></div>
        <div class="field"><label for="n-body">Details <span class="opt">optional</span></label><textarea id="n-body" rows="3" maxlength="200" aria-describedby="n-body-c">${esc(a.body)}</textarea><span class="count" id="n-body-c"></span></div>
        <p class="hint">${icon("tv")}Short and plain reads best from across the room.</p>
        <div class="grid2">
          <div class="field"><label for="n-start">Show from</label><input id="n-start" type="date" value="${a.start || ""}"></div>
          <div class="field"><label for="n-end">Show until <span class="opt">optional</span></label><input id="n-end" type="date" value="${a.end || ""}"></div>
        </div>
        <div class="checks">
          <label class="check"><input type="checkbox" id="n-disp" ${a.onDisplay ? "checked" : ""}> Show on the centre TV display</label>
          <label class="check"><input type="checkbox" id="n-pin" ${a.pinned ? "checked" : ""}> Pin to the top</label>
          <label class="check consent" id="consentRow" ${a.kind === "shoutout" ? "" : "hidden"}><input type="checkbox" id="n-consent" ${a.consent ? "checked" : ""}> Anyone named here has agreed to be shown, and only first names are used.</label>
        </div>
        <p class="hint">${icon("lock")}Never include last names, contact details or other personal information.</p>
      </form>`,
      actions: [{ label: "Cancel" }, { label: "Save", kind: "primary", onClick: close => {
        const box = document.querySelector(".modal"), v = s => box.querySelector(s).value.trim(), c = s => box.querySelector(s).checked;
        const out = Object.assign(a, { kind: v("#n-kind"), status: v("#n-status"), title: v("#n-title"), body: v("#n-body"), start: v("#n-start"), end: v("#n-end"),
          onDisplay: c("#n-disp"), pinned: c("#n-pin"), consent: c("#n-consent") });
        const errs = [];
        if (!out.title) errs.push("Add a headline.");
        if (out.start && out.end && out.end < out.start) errs.push("The end date must be after the start date.");
        if (out.kind === "shoutout" && out.onDisplay && !out.consent) errs.push("Confirm consent for this shout-out, or turn off the TV display option.");
        const e = box.querySelector("#annErr");
        if (errs.length) { e.hidden = false; e.innerHTML = `${icon("alert")}<div><ul>${errs.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`; e.focus && box.querySelector("#n-title").focus(); return; }
        if (out.kind !== "shoutout") out.consent = true;
        if (!out.id) out.id = T.uid("an");
        T.db.upsert("announcements", out); close(); T.toast("Announcement saved.");
      } }],
      onOpen: box => {
        const k = box.querySelector("#n-kind");
        k.onchange = () => { box.querySelector("#consentRow").hidden = k.value !== "shoutout"; };
        [["#n-title", 70], ["#n-body", 200]].forEach(([s, max]) => {
          const f = box.querySelector(s), out = box.querySelector(s + "-c");
          const up = () => { out.textContent = `${f.value.length} of ${max} characters`; };
          f.addEventListener("input", up); up();
        });
      }
    });
  }

  /* ---------------- centre display ---------------- */
  let slideIdx = 0, slideTimer = null, wake = null, dispEl = null, idleTimer = null;

  function displayHTML() {
    const t = T.now();
    const occ = T.occurrences(t.date, t.date).filter(o => o.ev.type !== "staff");
    const nowL = occ.filter(o => T.mins(o.ev.start) <= t.minutes && T.mins(o.ev.end) > t.minutes);
    const next = occ.filter(o => T.mins(o.ev.start) > t.minutes).slice(0, 4);
    const open = nowL.some(o => o.ev.type === "dropin" && o.ev.location === "centre");
    const nextOpen = !open ? T.occurrences(t.date, T.addDays(t.date, 120)).find(o => o.ev.type === "dropin" && o.ev.location === "centre" && (o.date > t.date || T.mins(o.ev.start) > t.minutes)) : null;
    const head = C.display.showHeadcount && T.openTodayAttendance ? T.openTodayAttendance().length : null;
    const tile = (o, big) => `<li class="d-ev t-${o.ev.type} ${big ? "big" : ""}">
      <span class="d-kind">${icon(C.types[o.ev.type].icon)}${esc(C.types[o.ev.type].short)}</span>
      <span class="d-title">${esc(o.ev.title)}</span>
      <span class="d-meta">${T.fmtRange(o.ev.start, o.ev.end)} · ${esc(T.location(o.ev.location))}</span></li>`;
    return `
      <div class="d-top">
        <img src="assets/visions-logo-white.png" alt="Visions" class="d-logo" width="676" height="212">
        <div class="d-name"><span>Best Buy</span> Teen Tech Centre</div>
        <div class="d-clock"><span class="d-time" data-clock>${T.fmtTime(t.hm)}</span><span class="d-date">${esc(T.fmtDate(t.date, "short"))}</span></div>
      </div>
      <div class="d-main">
        <section class="d-left" aria-label="Schedule">
          <h2 class="d-h">${open ? `<span class="live-dot" aria-hidden="true"></span>Open now` : "Right now"}</h2>
          ${nowL.length ? `<ul class="d-list">${nowL.map(o => tile(o, true)).join("")}</ul>`
            : `<p class="d-closed">${nextOpen ? `Next drop-in: ${esc(T.fmtDate(nextOpen.date, "short"))} at ${T.fmtTime(nextOpen.ev.start)}` : "See you soon"}</p>`}
          <h2 class="d-h">Up next today</h2>
          ${next.length ? `<ul class="d-list">${next.map(o => tile(o)).join("")}</ul>` : `<p class="d-none">Nothing else scheduled today.</p>`}
          ${comingHTML(t, nowL.length + next.length && window.innerHeight < 1300 ? 0 : 3)}
        </section>
        <section class="d-right" aria-label="Announcements" aria-live="polite" id="dSlides"></section>
      </div>
      ${tickerHTML(head)}
      <div class="brand-band" aria-hidden="true"><i></i><i></i></div>
      <div class="d-ctl" id="dCtl">
        <a class="btn sm" href="#home">${icon("left")}<span>Exit display</span></a>
        <button class="btn sm" type="button" id="dFull">${icon("expand")}<span>Full screen</span></button>
      </div>`;
  }
  /* ---------------- news ticker ---------------- */
  const DAY3 = T.DAY_SHORT;
  function dayList(days) {
    const d = days.slice().sort((a, b) => a - b); const parts = []; let i = 0;
    while (i < d.length) { let j = i; while (j + 1 < d.length && d[j + 1] === d[j] + 1) j++; parts.push(j - i >= 2 ? `${DAY3[d[i]]} to ${DAY3[d[j]]}` : d.slice(i, j + 1).map(x => DAY3[x]).join(" and ")); i = j + 1; }
    return parts.join(", ");
  }
  function hoursLine(t) {
    const series = T.db.list("events").filter(e => e.type === "dropin" && e.location === "centre" && e.repeat && (!e.repeat.until || e.repeat.until >= t.date));
    if (!series.length) return "";
    const byTime = {}; series.forEach(e => { const k = e.start + "-" + e.end; (byTime[k] = byTime[k] || []).push(...e.repeat.days); });
    const open = new Set(series.flatMap(e => e.repeat.days));
    const closed = [0, 1, 2, 3, 4, 5, 6].filter(d => !open.has(d));
    const parts = Object.entries(byTime).map(([k, days]) => { const [a, b] = k.split("-"); return `${dayList([...new Set(days)])} ${T.fmtTime(a).slice(-2) === T.fmtTime(b).slice(-2) ? T.fmtTime(a).slice(0, -3) : T.fmtTime(a)} to ${T.fmtTime(b)}`; });
    return `Drop-in hours: ${parts.join(" · ")}` + (closed.length ? ` · Closed ${dayList(closed)}` : "");
  }
  function tickerItems() {
    const t = T.now(), items = [];
    items.push({ k: "welcome", tx: `Welcome to the ${C.centre} at ${C.org}` });
    const h = hoursLine(t); if (h) items.push({ k: "hours", tx: h });
    const today = T.occurrences(t.date, t.date).filter(o => o.ev.type !== "staff" && !(o.ev.type === "dropin" && o.ev.location === "centre") && T.mins(o.ev.end) > t.minutes);
    today.slice(0, 3).forEach(o => items.push({ k: "today", tx: `Today: ${o.ev.title}, ${T.fmtRange(o.ev.start, o.ev.end)}` }));
    const ws = T.weekStart(t.date);
    const lul = T.occurrences(ws, T.addDays(ws, 6)).filter(o => o.ev.type === "workshop" && /level up lab/i.test(o.ev.title) && o.date >= t.date);
    if (lul.length) {
      const topic = lul[0].ev.title.replace(/^level up lab:\s*/i, "");
      const days = [...new Set(lul.filter(o => o.ev.title === lul[0].ev.title).map(o => T.DAY_NAMES[T.dow(o.date)]))].join(" and ");
      items.push({ k: "lul", tx: `Level Up Lab this week: ${topic}, ${days} at ${T.fmtTime(lul[0].ev.start)}` });
    }
    forDisplay().forEach(a => items.push({ k: a.kind, tx: a.title }));
    if (T.signupUrl()) items.push({ k: "signup", tx: "New here? Scan the code to sign up" });
    items.push({ k: "signin", tx: "Sign in when you arrive" });
    if ((C.equipment || []).length) items.push({ k: "equip", tx: `Using the ${C.equipment.map(s => s.name.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase())).join(", ").replace(/, ([^,]*)$/, " or $1")}? Sign in on the equipment sheet` });
    (C.display.ticker && C.display.ticker.extra || []).forEach(x => x && items.push({ k: "extra", tx: x }));
    items.push({ k: "tag", tx: C.tagline });
    return items;
  }
  const TICON = { welcome: "home", hours: "clock", today: "calendar", lul: "spark", announcement: "megaphone", reminder: "clock", shoutout: "star", signup: "plus", signin: "checkin", equip: "cube", extra: "info", tag: "arrow" };
  let tickKey = "", tickStart = 0, tickDur = 0, tickRot = null;
  function tickerHTML(head) {
    const tk = C.display.ticker || {};
    const qr = T.signupUrl() ? `<a class="d-su" href="${esc(T.signupUrl())}" target="_blank" rel="noopener noreferrer"><span class="qr" id="dQR" aria-hidden="true"></span><span class="su-scan">Scan to<br>sign up</span><span class="su-tap">New? Sign up</span></a>` : "";
    if (tk.on === false) return `<div class="d-foot"><span>${icon("checkin")}Sign in when you arrive${head !== null ? ` · ${head} youth here now` : ""}</span>${qr}<span>${esc(C.tagline)}</span></div>`;
    const items = tickerItems();
    if (head !== null) items.splice(1, 0, { k: "signin", tx: `${head} youth in the centre right now` });
    const run = items.map(i => `<span class="tk-item tk-${i.k}">${icon(TICON[i.k] || "info")}${esc(i.tx)}</span>`).join(`<span class="tk-sep" aria-hidden="true"></span>`);
    return `<div class="d-ticker">
      <span class="tk-tag">${T.arrows("sm")}<span class="tk-long">TTC Updates</span><span class="tk-short">Updates</span></span>
      <div class="tk-win"><div class="tk-run" data-key="${esc(items.map(i => i.tx).join("|"))}"><div class="tk-set">${run}<span class="tk-sep" aria-hidden="true"></span></div><div class="tk-set" aria-hidden="true">${run}<span class="tk-sep"></span></div></div></div>
      ${qr}
      <ul class="sr-only">${items.map(i => `<li>${esc(i.tx)}</li>`).join("")}</ul>
    </div>`;
  }
  // keep the crawl moving smoothly across re-renders (the display repaints every 30 s)
  function startTicker() {
    const runEl = dispEl && dispEl.querySelector(".tk-run"); if (!runEl) return;
    const set = runEl.querySelector(".tk-set");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const key = runEl.dataset.key, w = set.scrollWidth;
    const speed = (C.display.ticker && C.display.ticker.speed) || 110;
    if (key !== tickKey || !tickDur) { tickKey = key; tickStart = Date.now(); tickDur = Math.max(20, w / speed); }
    if (reduce) { // no crawl: show one update at a time instead
      runEl.classList.add("static");
      const items = [...set.querySelectorAll(".tk-item")]; let i = 0;
      const show = () => items.forEach((x, j) => { x.hidden = j !== i; });
      show(); clearInterval(tickRot); tickRot = setInterval(() => { i = (i + 1) % items.length; show(); }, 6000);
      return;
    }
    runEl.style.animationDuration = tickDur + "s";
    runEl.style.animationDelay = -(((Date.now() - tickStart) / 1000) % tickDur) + "s";
  }

  // "Coming up" list, shown on vertical screens where there is room for it
  function comingHTML(t, max) {
    if (!max) return "";
    const list = T.occurrences(T.addDays(t.date, 1), T.addDays(t.date, 21))
      .filter(o => o.ev.type !== "staff" && !(o.ev.type === "dropin" && o.ev.location === "centre")).slice(0, max);
    if (!list.length) return "";
    return `<section class="d-coming" aria-label="Coming up"><h2 class="d-h">Coming up</h2>
      <ul class="d-clist">${list.map(o => `<li class="t-${o.ev.type}"><span class="dc-day"><b>${esc(T.DAY_SHORT[T.dow(o.date)])}</b>${esc(T.fmtDate(o.date, "dm"))}</span>
        <span class="dc-main"><span class="dc-title">${esc(o.ev.title)}</span><span class="dc-meta">${T.fmtRange(o.ev.start, o.ev.end)}</span></span></li>`).join("")}</ul></section>`;
  }

  function paintSlide() {
    const box = dispEl && dispEl.querySelector("#dSlides"); if (!box) return;
    const list = forDisplay();
    if (!list.length) { box.innerHTML = `<div class="d-slide empty"><p class="d-s-title">${esc(C.tagline)}</p><p class="d-s-body">Ask staff about today's activities.</p></div>`; return; }
    slideIdx = slideIdx % list.length;
    const a = list[slideIdx];
    box.innerHTML = `<div class="d-slide k-${a.kind}">
      <span class="d-s-kind">${icon(a.kind === "shoutout" ? "star" : a.kind === "reminder" ? "clock" : "megaphone")}${KINDS[a.kind]}</span>
      <p class="d-s-title">${esc(a.title)}</p>${a.body ? `<p class="d-s-body">${esc(a.body)}</p>` : ""}
      ${list.length > 1 ? `<div class="d-dots" aria-hidden="true">${list.map((_, i) => `<i class="${i === slideIdx ? "on" : ""}"></i>`).join("")}</div>` : ""}
    </div>`;
    fitSlide();
  }
  function fitSlide() {
    const s = dispEl && dispEl.querySelector(".d-slide");
    if (s) T.fitText(s, [".d-s-title", ".d-s-body"], 14);
  }
  // fonts can arrive after the first paint and change text widths
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitSlide());
  window.addEventListener("resize", () => { clearTimeout(fitSlide._t); fitSlide._t = setTimeout(fitSlide, 150); });
  function paintDisplay() {
    if (!dispEl) return;
    dispEl.innerHTML = `<div class="display" id="displayRoot" tabindex="-1">${displayHTML()}</div>`;
    paintSlide();
    startTicker();
    const dq = dispEl.querySelector("#dQR");
    if (dq && !T.drawQR(dq, T.signupUrl(), Math.round(window.innerHeight * 0.085))) dq.parentNode.hidden = true;
    const full = dispEl.querySelector("#dFull");
    full.onclick = () => {
      const r = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (r.requestFullscreen) r.requestFullscreen().catch(() => T.toast("Full screen is not available here. Use the browser's own full-screen option."));
      else T.toast("Full screen is not available here. Use the browser's own full-screen option.");
    };
    wakeIdle();
  }
  function wakeIdle() {
    const ctl = dispEl && dispEl.querySelector("#dCtl"); if (!ctl) return;
    ctl.classList.add("show"); clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!ctl.contains(document.activeElement)) ctl.classList.remove("show"); }, 4000);
  }
  function onKey(e) {
    if (e.key === "Escape" && !document.fullscreenElement && !document.querySelector(".scrim")) { location.hash = "home"; return; }
    if (e.key === "ArrowRight") { slideIdx++; paintSlide(); }
    if (e.key === "ArrowLeft") { slideIdx = Math.max(0, slideIdx - 1); paintSlide(); }
    wakeIdle();
  }
  async function getWake() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) { wake = null; } }

  T.views.display = {
    title: "Centre display",
    render(el) {
      dispEl = el; slideIdx = 0;
      paintDisplay();
      clearInterval(slideTimer);
      slideTimer = setInterval(() => { slideIdx++; paintSlide(); }, C.display.slideSeconds * 1000);
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousemove", wakeIdle);
      document.addEventListener("focusin", wakeIdle);
      getWake();
    },
    refresh() { const keep = slideIdx; paintDisplay(); slideIdx = keep; paintSlide(); },
    tick() { this.refresh(); },
    cleanup() {
      clearInterval(slideTimer); clearTimeout(idleTimer); clearInterval(tickRot);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousemove", wakeIdle);
      document.removeEventListener("focusin", wakeIdle);
      if (wake) { try { wake.release(); } catch (e) {} wake = null; }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      dispEl = null;
    }
  };
  T.editAnnouncement = editAnn;
})();

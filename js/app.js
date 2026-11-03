/* =========================================================================
   APP SHELL: navigation, routing, notices, staff gate and the home screen.
   Views register themselves on TTC.views and render into #main.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;

  const NAV = [
    { id: "home",          label: "Home",          icon: "home" },
    { id: "schedule",      label: "Schedule",      icon: "calendar" },
    { id: "programs",      label: "Programs",      icon: "grid" },
    { id: "signin",        label: "Sign-in",       icon: "checkin" },
    { id: "announcements", label: "Announcements", icon: "megaphone" },
    { id: "display",       label: "Display",       icon: "tv" },
    { id: "staff",         label: "Staff tools",   icon: "lock", staff: true }
  ];

  /* ---------------- shell ---------------- */
  const app = document.getElementById("app");
  app.innerHTML = `
    <a class="skip" href="#home" id="skip">Skip to main content</a>
    <header class="topbar">
      <div class="topbar-in">
        <a class="brand" href="#home" aria-label="${esc(C.centre)} home">
          <img src="assets/visions-logo-white.png" alt="Visions" width="676" height="212">
          <span class="brand-txt"><span class="b1">Teen Tech Centre</span><span class="b2">Best Buy · Visions of Science</span></span>
        </a>
        <button class="icon-btn menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mainnav" aria-label="Open menu">${icon("menu")}</button>
        <nav id="mainnav" class="mainnav" aria-label="Main">
          <ul>${NAV.map(n => `<li><a href="#${n.id}" data-nav="${n.id}">${icon(n.icon)}<span>${esc(n.label)}</span></a></li>`).join("")}</ul>
        </nav>
        <button class="staff-btn" id="staffBtn" type="button"></button>
      </div>
    </header>
    <div id="notices" class="notices"></div>
    <main id="main" tabindex="-1"></main>
    <footer class="site-foot">
      <div class="foot-in">
        <span>${esc(C.org)} · ${esc(C.centre)} · ${esc(C.venue)}</span>
        <span>All times ${esc(C.timeZoneLabel)} · Data saved on this device only</span>
      </div>
      <div class="brand-band" aria-hidden="true"><i></i><i></i></div>
    </footer>`;

  const main = document.getElementById("main");
  document.getElementById("skip").addEventListener("click", e => { e.preventDefault(); main.focus(); });

  const menuBtn = document.getElementById("menuBtn"), nav = document.getElementById("mainnav");
  menuBtn.onclick = () => { const open = nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open); menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu"); };
  nav.addEventListener("click", e => { if (e.target.closest("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });

  /* ---------------- staff gate ---------------- */
  const staffBtn = document.getElementById("staffBtn");
  function paintStaff() {
    const on = T.isStaff();
    staffBtn.dataset.on = on ? "1" : "0";
    staffBtn.innerHTML = icon(on ? "unlock" : "lock") + `<span class="sb-long">${on ? "Staff mode on" : "Staff access"}</span><span class="sb-short">${on ? "Staff on" : "Staff"}</span>`;
    staffBtn.setAttribute("aria-label", on ? "Staff mode is on. Open staff options" : "Staff access. Enter staff code");
    document.body.classList.toggle("is-staff", on);
  }
  staffBtn.onclick = () => T.isStaff() ? staffPanel() : staffLogin();

  function staffLogin(after) {
    T.modal({
      title: "Staff access",
      body: `<p>Enter the staff code to add, edit and remove schedule entries, manage announcements and view attendance.</p>
        <div class="field"><label for="staff-code">Staff code</label>
        <input id="staff-code" type="password" inputmode="numeric" autocomplete="off" aria-describedby="staff-err staff-proto"></div>
        <p id="staff-err" class="err" role="alert"></p>
        <p id="staff-proto" class="proto-note">${icon("alert")}<span><b>Prototype gate.</b> This code is stored in the app files and is not real security. It must be replaced with proper staff accounts before the app holds real youth information.</span></p>`,
      actions: [
        { label: "Cancel" },
        { label: "Unlock", kind: "primary", id: "staff-ok", onClick: close => tryCode(close) }
      ],
      onOpen: box => box.querySelector("#staff-code").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); tryCode(T.closeModal); } })
    });
    function tryCode(close) {
      const v = document.getElementById("staff-code").value;
      if (T.unlockStaff(v)) { close(); T.toast(`Staff mode on for ${C.staffMinutes} minutes on this device.`); if (after) after(); }
      else { document.getElementById("staff-err").textContent = "That code does not match. Check with the centre coordinator."; document.getElementById("staff-code").select(); }
    }
  }
  function staffPanel() {
    const left = Math.max(0, Math.round((T.staffUntil() - Date.now()) / 60000));
    T.modal({
      title: "Staff mode is on",
      body: `<p>Editing controls are showing on every page of this device for about ${left} more minute${left === 1 ? "" : "s"}. Lock staff mode before you leave a shared tablet.</p>`,
      actions: [
        { label: "Keep it on" },
        { label: "Open staff tools", onClick: c => { c(); location.hash = "staff"; } },
        { label: "Lock staff mode", kind: "danger", icon: "lock", onClick: c => { T.lockStaff(); c(); T.toast("Staff mode locked."); } }
      ]
    });
  }
  T.staffLogin = staffLogin;

  /* ---------------- notices ---------------- */
  function paintNotices() {
    const n = [];
    if (T.db.sampleCount() > 0) n.push(`<div class="notice sample">${icon("info")}<p><b>Sample content.</b> The schedule, programs and announcements are examples so you can try the app. Staff must replace or confirm them before sharing. Nothing here is a confirmed date, partner or staffing assignment.</p></div>`);
    if (!T.db.persistent) n.push(`<div class="notice warn">${icon("alert")}<p><b>Changes will not be saved.</b> This browser is blocking local storage (for example a private window). Anything you add will be lost when the page closes.</p></div>`);
    if (T.tzOffsetsDiffer()) n.push(`<div class="notice">${icon("clock")}<p>This device is set to <b>${esc(T.deviceTZ() || "another time zone")}</b>. All times in this app are shown in ${esc(C.timeZoneLabel)}.</p></div>`);
    if (T.isStaff()) n.push(`<div class="notice staff">${icon("unlock")}<p><b>Staff mode is on.</b> Prototype gate only, not a secure sign-in. Lock it before leaving a shared device.</p></div>`);
    document.getElementById("notices").innerHTML = n.join("");
  }

  /* ---------------- router ---------------- */
  let current = null;
  function route() {
    const raw = (location.hash || "#home").slice(1);
    let name = raw, param = "";
    if (raw.startsWith("activity-")) { name = "activity"; param = raw.slice(9); }
    if (!T.views[name]) name = "home";
    const view = T.views[name];
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) {} }
    current = view;
    document.body.classList.toggle("display-mode", name === "display");
    document.querySelectorAll("[data-nav]").forEach(a => {
      const on = a.dataset.nav === name || (name === "activity" && a.dataset.nav === "programs");
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    paintNotices();
    main.innerHTML = "";
    view.render(main, param);
    document.title = (view.title ? (typeof view.title === "function" ? view.title(param) : view.title) + " · " : "") + "TTC Hub";
    window.scrollTo(0, 0);
    if (route.ready) main.focus({ preventScroll: true });
    route.ready = true;
  }
  function rerender() {
    if (!current) return;
    // remember what had focus so keyboard users keep their place
    const a = document.activeElement; let sel = null;
    if (a && main.contains(a)) {
      if (a.id) sel = "#" + CSS.escape(a.id);
      else { const k = [...a.attributes].find(x => x.name.startsWith("data-")); if (k) sel = `[${k.name}="${CSS.escape(k.value)}"]`; }
    }
    if (current.refresh) current.refresh();
    else { paintNotices(); main.innerHTML = ""; current.render(main, (location.hash.match(/^#activity-(.*)/) || [])[1] || ""); }
    paintNotices();
    const back = sel && main.querySelector(sel);
    if (back) back.focus({ preventScroll: true }); else if (a && !document.contains(a)) main.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", route);
  // never redraw under an open dialog; redraw once it closes instead
  let pending = false;
  const later = () => { if (document.querySelector(".scrim")) { pending = true; paintNotices(); } else rerender(); };
  document.addEventListener("ttc:change", later);
  document.addEventListener("ttc:staff", () => { paintStaff(); later(); });
  document.addEventListener("ttc:modalclose", () => { if (pending) { pending = false; setTimeout(rerender, 0); } });
  T.rerender = rerender;

  /* ---------------- HOME ---------------- */
  function openStatus() {
    const t = T.now();
    const todays = T.occurrences(t.date, t.date).filter(o => o.ev.type === "dropin" && o.ev.location === "centre");
    if (todays.length) {
      const open = Math.min(...todays.map(o => T.mins(o.ev.start))), close = Math.max(...todays.map(o => T.mins(o.ev.end)));
      const hm = m => `${T.pad(Math.floor(m / 60))}:${T.pad(m % 60)}`;
      if (t.minutes < open) return { state: "later", text: `Opens today at ${T.fmtTime(hm(open))}`, sub: `Drop-in until ${T.fmtTime(hm(close))}` };
      if (t.minutes < close) return { state: "open", text: `Open now until ${T.fmtTime(hm(close))}`, sub: "Drop-in. Sign in when you arrive." };
    }
    const next = T.occurrences(T.addDays(t.date, 1), T.addDays(t.date, 14)).find(o => o.ev.type === "dropin" && o.ev.location === "centre");
    return { state: "closed", text: todays.length ? "Closed for today" : "No drop-in today",
      sub: next ? `Next drop-in: ${T.fmtDate(next.date, "short")} at ${T.fmtTime(next.ev.start)}` : "No drop-in hours scheduled in the next two weeks" };
  }

  const CARDS = [
    { id: "schedule", name: "Running Schedule", blurb: "Week, list and today views of drop-in hours, workshops, partner sessions and events.", icon: "calendar", c: "var(--c-lightblue)" },
    { id: "programs", name: "Programs & Activities", blurb: "Zones, activities, equipment and supervision notes, plus Spark Card ideas.", icon: "grid", c: "var(--c-orange)" },
    { id: "signin", name: "Youth Sign-in", blurb: "Tap to sign in or out for drop-in and workshops.", icon: "checkin", c: "var(--c-mint)" },
    { id: "announcements", name: "Announcements", blurb: "What is happening at the centre, plus shout-outs.", icon: "megaphone", c: "var(--c-yellow)" },
    { id: "display", name: "Centre Display", blurb: "Large-text TV screen with what is on now, what is next and announcements.", icon: "tv", c: "var(--c-midblue)" },
    { id: "staff", name: "Staff Tools", blurb: "Manage the schedule, programs, announcements and attendance. Export and print.", icon: "tool", c: "var(--c-purple)", staff: true }
  ];

  T.views.home = {
    title: "Home",
    render(el) {
      const t = T.now();
      const st = openStatus();
      const upcoming = T.occurrences(t.date, t.date).filter(o => o.ev.type !== "staff" && T.mins(o.ev.end) > t.minutes && !(o.ev.type === "dropin" && o.ev.location === "centre"));
      const next = upcoming[0];
      const live = window.TTCBoard ? window.TTCBoard.live().length : 0;
      el.innerHTML = `
        <section class="hero">
          <div class="hero-in">
            <div class="hero-copy">
              <p class="eyebrow">${esc(C.org)} ${T.arrows("sm")}</p>
              <h1>Best Buy <span class="nowrap">Teen Tech Centre</span></h1>
              <p class="hero-sub">${esc(C.venue)}</p>
              <p class="welcome">Welcome. Choose what you need below: check what is on, sign in, or find an activity. Staff tools unlock with the staff code.</p>
            </div>
            <div class="glance" aria-label="Today at a glance">
              <p class="glance-date">${esc(T.fmtDate(t.date))}</p>
              <div class="glance-row status-${st.state}">
                <span class="dot" aria-hidden="true"></span>
                <div><p class="g-main">${esc(st.text)}</p><p class="g-sub">${esc(st.sub)}</p></div>
              </div>
              <div class="glance-row">
                ${icon("clock")}
                <div><p class="g-main">${next ? esc(next.ev.title) : "Nothing else scheduled today"}</p>
                <p class="g-sub">${next ? `${T.fmtRange(next.ev.start, next.ev.end)} · ${esc(T.location(next.ev.location))}` : "See the schedule for the week ahead"}</p></div>
              </div>
              <div class="glance-row">
                ${icon("megaphone")}
                <div><p class="g-main">${live} announcement${live === 1 ? "" : "s"} today</p><p class="g-sub"><a href="#announcements">Read announcements</a></p></div>
              </div>
            </div>
          </div>
        </section>
        <section class="wrap" aria-labelledby="fn-h">
          <h2 id="fn-h" class="section-h">What do you need?</h2>
          <ul class="cards">
            ${CARDS.map(c => `<li>
              <a class="card fn-card" href="#${c.id}" style="--c:${c.c}">
                <span class="fn-ico">${icon(c.icon)}</span>
                <span class="fn-name">${esc(c.name)}</span>
                <span class="fn-blurb">${esc(c.blurb)}</span>
                <span class="fn-foot">${c.staff ? T.staffPill() : ""}<span class="go">Open ${icon("right")}</span></span>
              </a></li>`).join("")}
          </ul>
          <p class="staffnote">${T.isStaff() ? "Staff mode is on. Editing controls are showing across the app." : "Staff: select Staff access at the top to unlock editing, attendance and exports."}</p>
        </section>`;
    }
  };

  /* ---------------- boot ---------------- */
  function boot() {
    paintStaff();
    route();
    // keep clocks and "now" markers honest
    setInterval(() => { if (current && current.tick) current.tick(); }, 30000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

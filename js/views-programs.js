/* =========================================================================
   PROGRAMS & ACTIVITIES directory, activity pages, and the youth sign-in
   and sign-out flow. Attendance stays on this device and never appears on
   public pages or the TV display (counts only).
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;

  function nextSession(actId) {
    const t = T.now();
    return T.occurrences(t.date, T.addDays(t.date, 21)).find(o => o.ev.activity === actId && (o.date > t.date || T.mins(o.ev.end) > t.minutes));
  }
  const nextText = o => o ? `${T.fmtDate(o.date, "short")}, ${T.fmtTime(o.ev.start)}` : "Not on the schedule in the next 3 weeks";

  /* ---------------- directory ---------------- */
  T.views.programs = {
    title: "Programs",
    render(el) {
      const acts = T.db.list("activities");
      const staff = T.isStaff();
      el.innerHTML = `
        <section class="page-head wrap">
          <div><p class="eyebrow">Programs &amp; activities ${T.arrows("sm")}</p><h1>Explore the centre</h1>
          <p class="lede">The centre is youth-driven: drop in, try a station and follow what interests you. Level Up Lab workshops are a friendly way to start with new equipment.</p></div>
          <div class="head-actions">${staff ? `<button class="btn primary" id="addAct" type="button">${icon("plus")}<span>Add activity</span></button>` : ""}</div>
        </section>
        <nav class="wrap zone-jump" aria-label="Program areas">${C.zones.map(z => `<a href="#programs" data-zone="${z.id}" style="--c:${z.colour}">${esc(z.name)}</a>`).join("")}</nav>
        <div class="wrap zones">
          ${C.zones.map(z => {
            const list = acts.filter(a => a.zone === z.id);
            return `<section class="zone" id="zone-${z.id}" style="--c:${z.colour}" aria-labelledby="zh-${z.id}">
              <header class="zone-head pat-${z.pattern}">
                <h2 id="zh-${z.id}">${esc(z.name)}</h2><p>${esc(z.blurb)}</p>
              </header>
              ${list.length ? `<ul class="act-grid">${list.map(a => {
                const n = nextSession(a.id);
                return `<li><a class="card act-card" href="#activity-${a.id}">
                  <span class="act-name">${esc(a.name)}</span>
                  <span class="act-desc">${esc(a.description)}</span>
                  <span class="act-meta"><span>${icon("pin")}${esc(T.location(a.location))}</span><span>${icon("calendar")}${esc(nextText(n))}</span>${a.capacity ? `<span>${icon("users")}${esc(a.capacity)} spots</span>` : ""}</span>
                  <span class="go">View details ${icon("right")}</span></a></li>`;
              }).join("")}</ul>` : `<p class="muted pad">No activities listed yet${staff ? ". Add one with Add activity." : "."}</p>`}
            </section>`;
          }).join("")}
        </div>`;
      el.querySelectorAll("[data-zone]").forEach(a => a.onclick = e => {
        e.preventDefault(); const t = el.querySelector("#zone-" + a.dataset.zone);
        t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        const h = t.querySelector("h2"); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
      });
      const add = el.querySelector("#addAct"); if (add) add.onclick = () => editActivity(null);
    }
  };

  /* ---------------- activity page ---------------- */
  T.views.activity = {
    title: id => { const a = T.activity(id); return a ? a.name : "Activity"; },
    render(el, id) {
      const a = T.activity(id);
      if (!a) { el.innerHTML = `<section class="wrap page-head"><div><h1>Activity not found</h1><p class="lede">It may have been removed. <a href="#programs">Back to programs</a></p></div></section>`; return; }
      const z = T.zone(a.zone) || { name: "", colour: "var(--c-lightblue)", pattern: "nodes" };
      const t = T.now();
      const occ = T.occurrences(t.date, T.addDays(t.date, 13)).filter(o => o.ev.activity === a.id);
      const bad = T.conflictKeys(t.date, T.addDays(t.date, 13));
      const staff = T.isStaff();
      el.innerHTML = `
        <section class="act-hero" style="--c:${z.colour}">
          <div class="wrap">
            <nav class="crumbs" aria-label="Breadcrumb"><a href="#programs">Programs</a> <span aria-hidden="true">/</span> <span>${esc(z.name)}</span></nav>
            <h1>${esc(a.name)}</h1>
            <p class="lede">${esc(a.description)}</p>
            <div class="head-actions">
              <a class="btn primary" href="#signin" id="goSign">${icon("checkin")}<span>Sign in to this activity</span></a>
              ${staff ? `<button class="btn" id="editAct" type="button">${icon("edit")}<span>Edit activity</span></button>` : ""}
            </div>
          </div>
        </section>
        <div class="wrap act-body">
          <section class="facts" aria-label="Key details">
            <div class="fact">${icon("pin")}<div><h2>Where</h2><p>${esc(T.location(a.location))}</p></div></div>
            <div class="fact">${icon("users")}<div><h2>Capacity</h2><p>${a.capacity ? esc(a.capacity) + " spots" : "Set by staff on the day"}</p></div></div>
            <div class="fact">${icon("checkin")}<div><h2>How to join</h2><p>${esc(a.signup || "Ask staff.")}</p></div></div>
          </section>
          <div class="two-col">
            <section class="panel" aria-labelledby="eq-h">
              <h2 id="eq-h">${icon("tool")}Equipment</h2><p>${esc(a.equipment || "No notes yet.")}</p>
              <h2 id="sup-h">${icon("info")}Supervision and safety</h2><p>${esc(a.supervision || "Standard drop-in supervision.")}</p>
              ${a.spark && a.spark.length ? `<h2>${icon("spark")}Project ideas from the Spark Cards</h2>
                <ul class="spark">${a.spark.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
                <p class="muted small">From the Clubhouse Network Spark Cards deck. Any similar software at the centre works.</p>` : ""}
            </section>
            <section class="panel" aria-labelledby="up-h">
              <h2 id="up-h">${icon("calendar")}Next two weeks</h2>
              ${occ.length ? `<ul class="rows compact">${occ.map(o => `<li><button type="button" class="row t-${o.ev.type}" data-occ="${o.key}"><span class="r-time">${esc(T.fmtDate(o.date, "short"))}<span>${T.fmtRange(o.ev.start, o.ev.end)}</span></span><span class="r-bar" aria-hidden="true"></span><span class="r-main"><span class="r-title">${esc(o.ev.title)}</span><span class="r-meta">${T.typeChip(o.ev.type, "sm")}${T.statusChip(o.ev.status)}${bad.has(o.key) ? `<span class="clash-tag">${icon("alert")}Overlap</span>` : ""}</span></span></button></li>`).join("")}</ul>`
                : `<p class="muted">No sessions on the schedule in the next two weeks. It may still be available during drop-in: ask staff.</p>`}
              <p><a href="#schedule">See the full schedule</a></p>
            </section>
          </div>
        </div>`;
      el.querySelector("#goSign").onclick = () => { try { sessionStorage.setItem("ttc-signin-act", a.id); } catch (e) {} };
      el.querySelectorAll("[data-occ]").forEach(b => b.onclick = () => T.openEventDetail(b.dataset.occ));
      const ed = el.querySelector("#editAct"); if (ed) ed.onclick = () => editActivity(a);
    }
  };

  /* ---------------- activity editor ---------------- */
  function editActivity(src) {
    if (!T.isStaff()) { T.staffLogin(() => editActivity(src)); return; }
    const a = src ? JSON.parse(JSON.stringify(src)) : { id: "", zone: C.zones[0].id, name: "", location: "centre", description: "", capacity: "", signup: "", equipment: "", supervision: "", spark: [] };
    const opt = (v, l, s) => `<option value="${esc(v)}" ${s ? "selected" : ""}>${esc(l)}</option>`;
    T.modal({
      title: src ? "Edit activity" : "Add activity", wide: true,
      body: `<form id="actForm" class="form" novalidate>
        <div id="actErr" class="callout warn" role="alert" hidden></div>
        <div class="field"><label for="a-name">Name <span class="req">required</span></label><input id="a-name" value="${esc(a.name)}" autocomplete="off"></div>
        <div class="grid2">
          <div class="field"><label for="a-zone">Program area</label><select id="a-zone">${C.zones.map(z => opt(z.id, z.name, a.zone === z.id)).join("")}</select></div>
          <div class="field"><label for="a-loc">Location</label><select id="a-loc">${C.locations.map(l => opt(l.id, l.name, a.location === l.id)).join("")}</select></div>
        </div>
        <div class="field"><label for="a-desc">Description</label><textarea id="a-desc" rows="3">${esc(a.description)}</textarea></div>
        <div class="grid2">
          <div class="field"><label for="a-cap">Capacity <span class="opt">optional</span></label><input id="a-cap" inputmode="numeric" value="${esc(a.capacity)}"></div>
          <div class="field"><label for="a-sign">How to join</label><input id="a-sign" value="${esc(a.signup)}"></div>
        </div>
        <div class="field"><label for="a-eq">Equipment notes</label><textarea id="a-eq" rows="2">${esc(a.equipment)}</textarea></div>
        <div class="field"><label for="a-sup">Supervision and safety notes</label><textarea id="a-sup" rows="2">${esc(a.supervision)}</textarea></div>
        <div class="field"><label for="a-spark">Spark Card ideas <span class="opt">one per line</span></label><textarea id="a-spark" rows="3">${esc((a.spark || []).join("\n"))}</textarea></div>
      </form>`,
      actions: [
        ...(src ? [{ label: "Remove activity", kind: "danger ghost", icon: "trash", onClick: async c => {
          c();
          const used = T.db.list("events").filter(e => e.activity === a.id).length;
          const ok = await T.confirmDialog(`Remove "${a.name}"?${used ? ` ${used} schedule entr${used === 1 ? "y links" : "ies link"} to it. They will stay on the schedule without an activity link.` : ""}`, { title: "Remove activity", confirmLabel: "Remove", danger: true });
          if (!ok) return;
          T.db.list("events").filter(e => e.activity === a.id).forEach(e => { e.activity = ""; });
          T.db.remove("activities", a.id); T.toast("Activity removed."); location.hash = "programs";
        } }] : []),
        { label: "Cancel" },
        { label: "Save", kind: "primary", onClick: close => {
          const box = document.querySelector(".modal"); const v = s => box.querySelector(s).value.trim();
          const name = v("#a-name");
          if (!name) { const e = box.querySelector("#actErr"); e.hidden = false; e.innerHTML = `${icon("alert")}<span>Add a name for the activity.</span>`; box.querySelector("#a-name").setAttribute("aria-invalid", "true"); box.querySelector("#a-name").focus(); return; }
          Object.assign(a, { name, zone: v("#a-zone"), location: v("#a-loc"), description: v("#a-desc"), capacity: v("#a-cap"), signup: v("#a-sign"),
            equipment: v("#a-eq"), supervision: v("#a-sup"), spark: v("#a-spark").split("\n").map(s => s.trim()).filter(Boolean) });
          if (!a.id) a.id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 5);
          T.db.upsert("activities", a); close(); T.toast("Activity saved.");
        } }
      ]
    });
  }
  T.editActivity = editActivity;

  /* ---------------- youth sign-in ---------------- */
  const S = { tab: "in", act: "", step: 1, done: null };
  const cleanName = s => String(s || "").trim().replace(/\s+/g, " ").replace(/\b\p{L}/gu, c => c.toUpperCase()).slice(0, 30);
  const displayName = (first, ini) => `${cleanName(first)} ${String(ini || "").trim().charAt(0).toUpperCase()}.`;
  function openToday() { const d = T.now().date; return T.db.list("attendance").filter(a => a.date === d && !a.timeOut); }
  let resetTimer = null;

  function renderSign(el) {
    clearTimeout(resetTimer);
    const t = T.now();
    const acts = T.db.list("activities");
    const todayOcc = T.occurrences(t.date, t.date);
    const nowIds = new Set(todayOcc.filter(o => T.mins(o.ev.start) <= t.minutes && T.mins(o.ev.end) > t.minutes).map(o => o.ev.activity).filter(Boolean));
    const todayIds = new Set(todayOcc.map(o => o.ev.activity).filter(Boolean));
    const ordered = acts.slice().sort((a, b) => (nowIds.has(b.id) - nowIds.has(a.id)) || (todayIds.has(b.id) - todayIds.has(a.id)));
    const here = openToday().length;

    el.innerHTML = `
      <section class="kiosk wrap">
        <div class="kiosk-head">
          <div><p class="eyebrow">Youth sign-in ${T.arrows("sm")}</p><h1>${S.tab === "in" ? "Welcome in!" : S.tab === "out" ? "Heading out?" : "First time here?"}</h1>
          <p class="lede">${S.tab === "in" ? "Pick what you're here for, then add your first name and last initial." : S.tab === "out" ? "Type the same name you signed in with." : "Sign up once to become a Teen Tech Centre member. After that, just sign in each visit."}</p></div>
          <p class="here-count" aria-live="polite"><span class="big">${here}</span> youth signed in right now</p>
        </div>
        <div class="seg big" role="group" aria-label="Sign in, sign out or sign up">
          <button type="button" data-tab="in" aria-pressed="${S.tab === "in"}">${icon("checkin")}<span>Sign in</span></button>
          <button type="button" data-tab="out" aria-pressed="${S.tab === "out"}">${icon("signout")}<span>Sign out</span></button>
          <button type="button" data-tab="new" aria-pressed="${S.tab === "new"}">${icon("plus")}<span>New? Sign up</span></button>
        </div>
        <div id="kioskBody"></div>
        <p class="privacy-note">${icon("lock")}<span>Sign-ins are saved on this centre device for attendance and removed after ${C.attendanceRetentionDays} days. Names never appear on the TV display. New here? Check in with staff before using equipment.</span></p>
        <p class="eq-link">${icon("cube")}<span>Using the recording studio, photo studio, 3D printers or laser cutter? <a href="#equipment">Sign in on the equipment sheet</a> too.</span></p>
        ${T.isStaff() ? `<p><a href="#staff" id="toAtt">${icon("lock")} Staff: view today's attendance</a></p>` : ""}
      </section>`;
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; S.step = 1; S.done = null; renderSign(el); el.querySelector(`[data-tab="${S.tab}"]`).focus(); });
    const toAtt = el.querySelector("#toAtt"); if (toAtt) toAtt.onclick = () => { try { sessionStorage.setItem("ttc-staff-tab", "attendance"); } catch (e) {} };
    const body = el.querySelector("#kioskBody");

    if (S.tab === "new") { renderSignup(body); return; }

    if (S.done) {
      body.innerHTML = `<div class="done-card" role="status">
        <p class="done-big">${S.done.out ? "See you next time" : "You're signed in"}, ${esc(S.done.first)}!</p>
        <p>${S.done.out ? `Signed out at ${T.fmtTime(S.done.time)}.` : `${esc(S.done.actName)} · ${T.fmtTime(S.done.time)}`}</p>
        <button class="btn primary big" id="doneBtn" type="button">Done</button></div>`;
      body.querySelector("#doneBtn").onclick = () => { S.done = null; S.step = 1; S.act = ""; renderSign(el); };
      body.querySelector("#doneBtn").focus();
      resetTimer = setTimeout(() => { if (location.hash === "#signin") { S.done = null; S.step = 1; S.act = ""; renderSign(el); } }, 9000);
      return;
    }

    if (S.tab === "in" && S.step === 1) {
      body.innerHTML = `<fieldset class="pick"><legend class="step">Step 1 of 2 · What are you here for?</legend>
        <ul class="pick-grid">${ordered.map(a => {
          const z = T.zone(a.zone) || {};
          return `<li><button type="button" class="pick-tile" data-act="${a.id}" style="--c:${z.colour || "var(--c-lightblue)"}" aria-pressed="${S.act === a.id}">
            <span class="pt-name">${esc(a.name)}</span><span class="pt-zone">${esc(z.name || "")}</span>
            ${nowIds.has(a.id) ? `<span class="pt-badge now">Happening now</span>` : todayIds.has(a.id) ? `<span class="pt-badge">On today</span>` : ""}</button></li>`;
        }).join("")}</ul></fieldset>`;
      body.querySelectorAll("[data-act]").forEach(b => b.onclick = () => { S.act = b.dataset.act; S.step = 2; renderSign(el); });
      if (!S.act) { try { const pre = sessionStorage.getItem("ttc-signin-act"); if (pre && T.activity(pre)) { sessionStorage.removeItem("ttc-signin-act"); S.act = pre; S.step = 2; renderSign(el); return; } } catch (e) {} }
      return;
    }

    // name form (sign in step 2, or sign out)
    const act = T.activity(S.act);
    body.innerHTML = `<form class="name-form" id="nameForm" novalidate>
      ${S.tab === "in" ? `<p class="step">Step 2 of 2 · Your name</p>
        <p class="chosen">${icon("checkin")}<span>Signing in to <b>${esc(act ? act.name : "")}</b></span> <button type="button" class="btn sm ghost" id="changeAct">Change</button></p>` : ""}
      <div class="name-row">
        <div class="field"><label for="k-first">First name</label><input id="k-first" autocomplete="off" autocapitalize="words" maxlength="30" required></div>
        <div class="field ini"><label for="k-ini">Last initial</label><input id="k-ini" autocomplete="off" maxlength="1" required></div>
      </div>
      <p id="k-err" class="err" role="alert"></p>
      <button class="btn primary big" type="submit">${S.tab === "in" ? "Sign in" : "Sign out"}</button>
    </form>`;
    const f = body.querySelector("#nameForm");
    const ch = body.querySelector("#changeAct"); if (ch) ch.onclick = () => { S.step = 1; renderSign(el); };
    body.querySelector("#k-first").focus();
    f.onsubmit = e => {
      e.preventDefault();
      const first = body.querySelector("#k-first").value, ini = body.querySelector("#k-ini").value;
      const err = body.querySelector("#k-err");
      if (!cleanName(first) || !/^\p{L}$/u.test(ini.trim())) {
        err.textContent = "Add your first name and the first letter of your last name.";
        body.querySelector(!cleanName(first) ? "#k-first" : "#k-ini").focus(); return;
      }
      const name = displayName(first, ini), now = T.now();
      const open = openToday().filter(r => r.name.toLowerCase() === name.toLowerCase());
      if (S.tab === "in") {
        if (open.length) {
          const r = open[open.length - 1]; r.activity = S.act; T.db.upsert("attendance", r);
          S.done = { first: cleanName(first), time: r.timeIn, actName: `Already signed in. Switched to ${act.name}` };
        } else {
          T.db.upsert("attendance", { id: T.uid("at"), date: now.date, name, activity: S.act, timeIn: now.hm, timeOut: "", sample: false });
          S.done = { first: cleanName(first), time: now.hm, actName: act.name };
        }
      } else {
        if (!open.length) { err.textContent = "We could not find an open sign-in for that name today. Check the spelling or ask staff for help."; return; }
        const r = open[open.length - 1]; r.timeOut = now.hm; T.db.upsert("attendance", r);
        S.done = { first: cleanName(first), time: now.hm, out: true };
      }
      renderSign(el);
    };
  }

  /* ---------------- new member sign-up (Google Form link) ---------------- */
  function renderSignup(body) {
    const url = T.signupUrl();
    const name = (C.signup && C.signup.formName) || "Sign-up form";
    if (!url) {
      body.innerHTML = `<div class="signup-card">
        <div class="su-copy"><h2>Sign up with staff</h2>
        <p>The online sign-up form isn't available on this screen yet. Find a staff member and they'll get you set up.</p>
        ${T.isStaff() ? `<p class="callout">${icon("info")}<span>Staff: add the Google Form link in <b>js/config.js</b> under <b>signup.formUrl</b> to turn on online sign-up and the QR code.</span></p>` : ""}</div></div>`;
      return;
    }
    body.innerHTML = `<div class="signup-card">
      <div class="su-copy">
        <h2>${esc(name)}</h2>
        <ol class="su-steps">
          <li>Scan the code with your phone, or select <b>Open the sign-up form</b>.</li>
          <li>Fill it in. It only takes a couple of minutes.</li>
          <li>Come back here and sign in.</li>
        </ol>
        <a class="btn primary big" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon("edit")}<span>Open the sign-up form</span></a>
        <p class="su-note">${icon("lock")}<span>The form is run by Visions of Science in Google Forms. Your answers go to Visions of Science, not to this screen.</span></p>
      </div>
      <figure class="su-qr">
        <div class="qr" id="suQR" role="img" aria-label="QR code that opens the sign-up form"></div>
        <figcaption>Scan to sign up on your phone</figcaption>
      </figure>
    </div>`;
    if (!T.drawQR(body.querySelector("#suQR"), url, 220)) body.querySelector(".su-qr").hidden = true;
  }

  let signEl = null;
  T.views.signin = {
    title: "Youth sign-in",
    render(el) { signEl = el; S.done = null; S.step = 1; S.act = ""; renderSign(el); },
    // only refresh the headcount, so typing is never interrupted
    refresh() { const c = signEl && signEl.querySelector(".here-count .big"); if (c) c.textContent = openToday().length; },
    cleanup() { clearTimeout(resetTimer); }
  };
  T.openTodayAttendance = openToday;
})();

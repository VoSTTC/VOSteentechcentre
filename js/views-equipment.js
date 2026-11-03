/* =========================================================================
   SPECIAL EQUIPMENT SIGN-IN SHEETS
   Recording studio, photo studio, 3D printers and laser cutter (stations
   are set in config.js). Youth sign in with first name and last initial,
   say whether they have done onboarding, and answer a few questions.
   Records stay on this device, are removed with attendance, and only staff
   see names. The public page shows how many sessions are open, never who.
   A station can later link to a crash-course guide (set `guide` on it).
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const stations = () => C.equipment || [];
  const station = id => stations().find(s => s.id === id);
  const E = { tab: "start", st: "", done: null, choose: null };
  let root = null, resetTimer = null;

  const cleanName = s => String(s || "").trim().replace(/\s+/g, " ").replace(/\b\p{L}/gu, c => c.toUpperCase()).slice(0, 30);
  const today = () => T.now().date;
  function openSessions(stId) { return T.db.list("equipment").filter(r => r.date === today() && !r.timeOut && (!stId || r.station === stId)); }

  function answerText(st, r) {
    return (st ? st.fields : []).map(f => {
      const v = r.answers ? r.answers[f.key] : "";
      const t = Array.isArray(v) ? v.join(", ") : v;
      return t ? `${f.label.replace(/\?$/, "")}: ${t}` : "";
    }).filter(Boolean).join(" · ");
  }

  /* ---------------- page ---------------- */
  function render(el) {
    root = el; clearTimeout(resetTimer);
    const head = E.tab === "start" ? (E.st ? `Signing in to the ${esc(station(E.st).name.toLowerCase())}` : "Using special equipment?") : "Finished with the equipment?";
    el.innerHTML = `
      <section class="kiosk wrap">
        <div class="kiosk-head">
          <div><p class="eyebrow">Equipment sign-in ${T.arrows("sm")}</p><h1>${head}</h1>
          <p class="lede">${E.tab === "start" ? "Sign in each time you use the studios, 3D printers or laser cutter, so staff can help and keep the gear in good shape." : "Type the same name you signed in with."}</p></div>
        </div>
        <div class="seg big" role="group" aria-label="Start or finish">
          <button type="button" data-etab="start" aria-pressed="${E.tab === "start"}">${icon("checkin")}<span>Start using</span></button>
          <button type="button" data-etab="done" aria-pressed="${E.tab === "done"}">${icon("signout")}<span>I'm done</span></button>
        </div>
        <div id="eqBody"></div>
        <p class="privacy-note">${icon("lock")}<span>Equipment sign-ins are saved on this centre device for staff and removed after ${C.attendanceRetentionDays} days. Names never appear on public screens. Also sign in to the centre on the <a href="#signin">Sign-in page</a>.</span></p>
        ${T.isStaff() ? `<p><a href="#staff" id="toEqAtt">${icon("lock")} Staff: view today's equipment use</a></p>` : ""}
      </section>`;
    el.querySelectorAll("[data-etab]").forEach(b => b.onclick = () => { E.tab = b.dataset.etab; E.st = ""; E.done = null; E.choose = null; render(root); root.querySelector(`[data-etab="${E.tab}"]`).focus(); });
    const ta = el.querySelector("#toEqAtt"); if (ta) ta.onclick = () => { try { sessionStorage.setItem("ttc-staff-tab", "attendance"); } catch (e) {} };
    const body = el.querySelector("#eqBody");
    if (E.done) return doneCard(body);
    if (E.tab === "done") return finishForm(body);
    if (!E.st) return pickStation(body);
    startForm(body);
  }

  function pickStation(body) {
    body.innerHTML = `<fieldset class="pick"><legend class="step">Step 1 of 2 · Which equipment?</legend>
      <ul class="pick-grid eq-grid">${stations().map(s => {
        const n = openSessions(s.id).length, z = T.zone(s.zone) || {};
        return `<li><button type="button" class="pick-tile eq-tile" data-st="${s.id}" style="--c:${z.colour || "var(--c-lightblue)"}">
          <span class="eq-ico">${icon(s.icon)}</span>
          <span class="pt-name">${esc(s.name)}</span>
          <span class="pt-zone">${esc(T.location(s.location))}</span>
          <span class="pt-badge ${n ? "now" : ""}">${n ? `In use · ${n} session${n === 1 ? "" : "s"}` : "Free right now"}</span>
        </button></li>`;
      }).join("")}</ul></fieldset>`;
    body.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { E.st = b.dataset.st; render(root); });
  }

  function fieldHTML(f, i) {
    const id = "eq-f" + i, req = f.required ? ` <span class="req">required</span>` : "";
    if (f.type === "text") return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label><input id="${id}" data-key="${f.key}" maxlength="60" autocomplete="off" placeholder="${esc(f.placeholder || "")}"></div>`;
    const multi = f.type === "chips";
    return `<fieldset class="field opts" data-key="${f.key}" data-multi="${multi}"><legend>${esc(f.label)}${req}${multi ? ` <span class="opt">pick any</span>` : ""}</legend>
      <div class="opt-row">${f.options.map((o, j) => `<label class="optpill"><input type="${multi ? "checkbox" : "radio"}" name="${id}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div></fieldset>`;
  }

  function startForm(body) {
    const s = station(E.st);
    const units = (s.units || []).filter(Boolean);
    body.innerHTML = `<form class="name-form eq-form" id="eqForm" novalidate>
      <p class="step">Step 2 of 2 · A few quick questions</p>
      <p class="chosen">${icon(s.icon)}<span><b>${esc(s.name)}</b> · ${esc(T.location(s.location))}</span> <button type="button" class="btn sm ghost" id="eqChange">Change</button></p>
      <div class="name-row">
        <div class="field"><label for="eq-first">First name</label><input id="eq-first" autocomplete="off" autocapitalize="words" maxlength="30"></div>
        <div class="field ini"><label for="eq-ini">Last initial</label><input id="eq-ini" autocomplete="off" maxlength="1"></div>
      </div>
      <fieldset class="field opts" data-key="__onboard"><legend>Have you done the onboarding for this equipment with staff? <span class="req">required</span></legend>
        <div class="opt-row"><label class="optpill"><input type="radio" name="eq-onb" value="yes"><span>Yes</span></label>
        <label class="optpill"><input type="radio" name="eq-onb" value="no"><span>Not yet</span></label></div></fieldset>
      ${units.length ? `<fieldset class="field opts" data-key="__unit"><legend>Which one? <span class="opt">optional</span></legend><div class="opt-row">${units.map(u => `<label class="optpill"><input type="radio" name="eq-unit" value="${esc(u)}"><span>${esc(u)}</span></label>`).join("")}</div></fieldset>`
        : (s.id === "printer" || s.id === "laser") ? `<div class="field"><label for="eq-unit-t">Machine number <span class="opt">optional, if it has one</span></label><input id="eq-unit-t" maxlength="20" autocomplete="off"></div>` : ""}
      ${s.fields.map(fieldHTML).join("")}
      ${s.reminder ? `<p class="callout">${icon("info")}<span>${esc(s.reminder)}</span></p>` : ""}
      ${s.guide ? `<p><a href="${esc(s.guide)}" target="_blank" rel="noopener">${icon("spark")} Crash course: how to use the ${esc(s.name.toLowerCase())}</a></p>` : ""}
      <div id="eqErr" class="callout warn" role="alert" hidden></div>
      <button class="btn primary big" type="submit">Sign in to the ${esc(s.name.toLowerCase())}</button>
    </form>`;
    body.querySelector("#eqChange").onclick = () => { E.st = ""; render(root); };
    body.querySelector("#eq-first").focus();
    body.querySelector("#eqForm").onsubmit = e => {
      e.preventDefault();
      const f = body.querySelector("#eqForm");
      const first = cleanName(f.querySelector("#eq-first").value), ini = f.querySelector("#eq-ini").value.trim();
      const pick = name => [...f.querySelectorAll(`input[name="${name}"]:checked`)].map(x => x.value);
      const errs = [], answers = {};
      if (!first || !/^\p{L}$/u.test(ini)) errs.push(["eq-first", "Add your first name and the first letter of your last name."]);
      const onb = pick("eq-onb")[0];
      if (!onb) errs.push(["eq-onb", "Say whether you've done the onboarding."]);
      s.fields.forEach((fd, i) => {
        let v;
        if (fd.type === "text") v = f.querySelector("#eq-f" + i).value.trim();
        else v = fd.type === "chips" ? pick("eq-f" + i) : (pick("eq-f" + i)[0] || "");
        answers[fd.key] = v;
        if (fd.required && (!v || (Array.isArray(v) && !v.length))) errs.push(["eq-f" + i, `Answer: ${fd.label}`]);
      });
      const unit = units.length ? (pick("eq-unit")[0] || "") : ((f.querySelector("#eq-unit-t") || {}).value || "").trim();
      const err = body.querySelector("#eqErr");
      if (errs.length) {
        err.hidden = false; err.innerHTML = `${icon("alert")}<div><b>Almost there:</b><ul>${errs.map(x => `<li>${esc(x[1])}</li>`).join("")}</ul></div>`;
        const t = f.querySelector("#" + errs[0][0]) || f.querySelector(`input[name="${errs[0][0]}"]`); if (t) t.focus();
        return;
      }
      const now = T.now(), name = `${first} ${ini.toUpperCase()}.`;
      // one open session per person per station
      openSessions(s.id).filter(r => r.name.toLowerCase() === name.toLowerCase()).forEach(r => { r.timeOut = now.hm; });
      T.db.upsert("equipment", { id: T.uid("eq"), date: now.date, station: s.id, name, unit, onboarded: onb === "yes", answers, timeIn: now.hm, timeOut: "" });
      E.done = { first, station: s, onboarded: onb === "yes", time: now.hm };
      render(root);
    };
  }

  function finishForm(body) {
    if (E.choose) {
      body.innerHTML = `<div class="name-form"><p class="step">Which equipment are you done with?</p>
        <div class="opt-row">${E.choose.map(r => `<button type="button" class="btn big" data-end="${r.id}">${icon(station(r.station) ? station(r.station).icon : "cube")}<span>${esc(station(r.station) ? station(r.station).name : r.station)}</span></button>`).join("")}
        <button type="button" class="btn big" data-end="all">All of them</button></div></div>`;
      body.querySelectorAll("[data-end]").forEach(b => b.onclick = () => {
        const hm = T.now().hm, list = b.dataset.end === "all" ? E.choose : E.choose.filter(r => r.id === b.dataset.end);
        list.forEach(r => { r.timeOut = hm; }); T.db.upsert("equipment", list[0]);
        E.done = { first: E.choose[0].name.split(" ")[0], out: true, time: hm }; E.choose = null; render(root);
      });
      body.querySelector("[data-end]").focus();
      return;
    }
    body.innerHTML = `<form class="name-form" id="eqOut" novalidate>
      <div class="name-row">
        <div class="field"><label for="eo-first">First name</label><input id="eo-first" autocomplete="off" maxlength="30"></div>
        <div class="field ini"><label for="eo-ini">Last initial</label><input id="eo-ini" autocomplete="off" maxlength="1"></div>
      </div>
      <p id="eo-err" class="err" role="alert"></p>
      <button class="btn primary big" type="submit">I'm done</button></form>`;
    body.querySelector("#eo-first").focus();
    body.querySelector("#eqOut").onsubmit = e => {
      e.preventDefault();
      const name = `${cleanName(body.querySelector("#eo-first").value)} ${body.querySelector("#eo-ini").value.trim().toUpperCase()}.`;
      const mine = openSessions().filter(r => r.name.toLowerCase() === name.toLowerCase());
      if (!mine.length) { body.querySelector("#eo-err").textContent = "We couldn't find open equipment sign-ins for that name today. Check the spelling or ask staff."; return; }
      if (mine.length > 1) { E.choose = mine; render(root); return; }
      mine[0].timeOut = T.now().hm; T.db.upsert("equipment", mine[0]);
      E.done = { first: name.split(" ")[0], out: true, time: mine[0].timeOut, station: station(mine[0].station) };
      render(root);
    };
  }

  function doneCard(body) {
    const d = E.done;
    body.innerHTML = `<div class="done-card" role="status">
      <p class="done-big">${d.out ? `Thanks, ${esc(d.first)}!` : `You're signed in, ${esc(d.first)}!`}</p>
      <p>${d.out ? `Signed out at ${T.fmtTime(d.time)}. Please tidy up and return any gear to staff.` : `${esc(d.station.name)} · ${T.fmtTime(d.time)}`}</p>
      ${!d.out && !d.onboarded ? `<p class="callout warn">${icon("alert")}<span><b>Find a staff member before you start.</b> They'll walk you through the onboarding for the ${esc(d.station.name.toLowerCase())}.</span></p>` : ""}
      <button class="btn primary big" id="eqDone" type="button">Done</button></div>`;
    const b = body.querySelector("#eqDone");
    b.onclick = () => { E.done = null; E.st = ""; render(root); }; b.focus();
    resetTimer = setTimeout(() => { if (location.hash === "#equipment") { E.done = null; E.st = ""; render(root); } }, 12000);
  }

  T.views.equipment = {
    title: "Equipment sign-in",
    render(el) { E.tab = "start"; E.st = ""; E.done = null; E.choose = null; render(el); },
    refresh() { // only repaint "in use" badges while choosing, so typing is never interrupted
      if (root && E.tab === "start" && !E.st && !E.done) pickStation(root.querySelector("#eqBody"));
    },
    cleanup() { clearTimeout(resetTimer); }
  };
  T.equipmentStations = stations;
  T.equipmentAnswerText = answerText;
})();

/* =========================================================================
   STAFF TOOLS: overview, manage schedule, programs, announcements,
   attendance, exports and data backup. Behind the prototype staff gate.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const TABS = [
    ["overview", "Overview", "home"], ["schedule", "Schedule", "calendar"], ["programs", "Programs", "grid"],
    ["announcements", "Announcements", "megaphone"], ["attendance", "Attendance", "checkin"], ["showcase", "Showcase", "star"], ["data", "Data & backup", "download"]
  ];
  let tab = "overview", attDate = null, root = null;

  function render(el) {
    root = el;
    try { const s = sessionStorage.getItem("ttc-staff-tab"); if (s) { tab = s; sessionStorage.removeItem("ttc-staff-tab"); } } catch (e) {}
    if (!T.isStaff()) {
      el.innerHTML = `<section class="wrap locked">
        <span class="lock-ico">${icon("lock")}</span>
        <h1>Staff tools</h1>
        <p class="lede">Staff tools manage the schedule, programs, announcements and attendance. Enter the staff code to continue.</p>
        <button class="btn primary big" id="unlockBtn" type="button">${icon("unlock")}<span>Enter staff code</span></button>
        <p class="proto-note">${icon("alert")}<span><b>Prototype gate.</b> The code lives in the app files and is not real security. Replace it with proper staff accounts before the app stores real youth information.</span></p>
      </section>`;
      el.querySelector("#unlockBtn").onclick = () => T.staffLogin();
      return;
    }
    el.innerHTML = `
      <section class="page-head wrap">
        <div><p class="eyebrow">${T.staffPill()} ${T.arrows("sm")}</p><h1>Staff tools</h1>
        <p class="lede">Everything on this page is for staff. Changes save on this device only.</p></div>
        <div class="head-actions"><button class="btn danger ghost" id="lockNow" type="button">${icon("lock")}<span>Lock staff mode</span></button></div>
      </section>
      <div class="wrap">
        <div class="tabs" role="tablist" aria-label="Staff sections">
          ${TABS.map(([id, l, i]) => `<button role="tab" type="button" id="tab-${id}" aria-controls="panel" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}" data-tab="${id}">${icon(i)}<span>${l}</span></button>`).join("")}
        </div>
        <section id="panel" role="tabpanel" aria-labelledby="tab-${tab}" class="tabpanel" tabindex="0"></section>
      </div>`;
    el.querySelector("#lockNow").onclick = () => { T.lockStaff(); T.toast("Staff mode locked."); };
    const tabs = [...el.querySelectorAll("[role=tab]")];
    tabs.forEach((b, i) => {
      b.onclick = () => { tab = b.dataset.tab; render(root); root.querySelector(`#tab-${tab}`).focus(); };
      b.onkeydown = e => {
        let j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length; if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") j = 0; if (e.key === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); tab = tabs[j].dataset.tab; render(root); root.querySelector(`#tab-${tab}`).focus(); }
      };
    });
    const p = el.querySelector("#panel");
    ({ overview, schedule, programs, announcements, attendance, data, showcase: q => T.showcaseStaff(q) })[tab](p);
  }

  /* ---------------- overview ---------------- */
  function overview(p) {
    const t = T.now(), to = T.addDays(t.date, 27);
    const pairs = T.conflictPairs(t.date, to);
    const unconfirmed = T.db.list("events").filter(e => e.status !== "confirmed");
    const here = T.openTodayAttendance().length;
    const sample = T.db.sampleCount();
    p.innerHTML = `
      <div class="ov-grid">
        <section class="panel ov ${pairs.length ? "warn" : "ok"}"><h2>${icon("alert")}Overlaps in the next 4 weeks</h2>
          <p class="ov-n">${pairs.length}</p>
          ${pairs.length ? `<ul class="ov-list">${pairs.slice(0, 6).map(([a, b]) => `<li><button type="button" class="linkish" data-occ="${a.key}">${esc(T.fmtDate(a.date, "short"))}: ${esc(a.ev.title)} and ${esc(b.ev.title)}</button><span>${esc(T.location(a.ev.location))}</span></li>`).join("")}</ul>` : `<p class="muted">No overlapping bookings.</p>`}
        </section>
        <section class="panel ov"><h2>${icon("info")}Entries not confirmed</h2><p class="ov-n">${unconfirmed.length}</p>
          <p class="muted">Schedule entries marked Sample or To confirm. Confirm them in the Schedule tab before sharing the schedule.</p>
          <button class="btn sm" type="button" data-go="schedule">Review entries</button></section>
        <section class="panel ov"><h2>${icon("users")}Signed in now</h2><p class="ov-n">${here}</p>
          <p class="muted">${T.db.list("equipment").filter(r => r.date === t.date && !r.timeOut).length} equipment session(s) open.</p>
          <button class="btn sm" type="button" data-go="attendance">Open attendance</button></section>
        <section class="panel ov ${sample ? "warn" : "ok"}"><h2>${icon("info")}Sample content</h2><p class="ov-n">${sample}</p>
          <p class="muted">${sample ? "Example items are still in the app. Remove them once real content is in." : "All sample content has been removed."}</p>
          ${sample ? `<button class="btn sm" type="button" id="clrSample">Clear sample content</button>` : ""}</section>
      </div>
      ${membershipPanel()}
      <section class="panel"><h2>${icon("lock")}Before using with real youth information</h2>
        <ul class="plain">
          <li>The staff code is a prototype gate. Anyone can read it in the app files.</li>
          <li>Data is saved in this browser only. Other tablets, laptops and the TV do not see each other's changes. Clearing browser data erases it.</li>
          <li>Get organizational approval before storing youth names on any device, and take regular backups from the Data tab.</li>
        </ul></section>`;
    p.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { tab = b.dataset.go; render(root); });
    p.querySelectorAll("[data-occ]").forEach(b => b.onclick = () => T.openEventDetail(b.dataset.occ));
    const cs = p.querySelector("#clrSample"); if (cs) cs.onclick = clearSample;
  }
  /* ---------------- memberships (Salesforce) ---------------- */
  function membershipPanel() {
    const J = C.join || {};
    const rawForm = String(J.guardianFormUrl || "").trim();
    const hosts = (J.approvedFormHosts || []).filter(Boolean);
    const links = (J.staffLinks || []).map(l => ({ label: l.label, url: T.safeLink(l.url) }));
    const tick = (done, text, help) => `<li class="ck ${done ? "done" : ""}"><span class="ck-box" aria-hidden="true">${done ? icon("checkin") : ""}</span><span><b>${done ? "Done" : "To do"}:</b> ${text}${help ? `<span class="sub">${help}</span>` : ""}</span></li>`;
    const ret = ["join-thanks", "join-confirmed", "join-complete"];
    return `<section class="panel mem-panel"><h2>${icon("users")}Memberships</h2>
      <p>Memberships follow the parent or guardian first process on <a href="#join">Join the TTC</a>: <b>Pending guardian consent</b>, then <b>Youth registration invited</b>, then <b>Active</b>. Consent, registration and activation all happen in Salesforce. This app never stores or shows membership details.</p>
      ${links.some(l => l.url) ? `<div class="tool-row">${links.filter(l => l.url).map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icon("arrow")}<span>${esc(l.label)}</span></a>`).join("")}</div>` : ""}
      <h3>Setup checklist</h3>
      <ul class="checklist">
        ${tick(hosts.length > 0, "Approved form tool address added", "js/config.js: join.approvedFormHosts")}
        ${tick(!!T.guardianFormUrl(), "Parent or guardian form connected", rawForm && !T.guardianFormUrl() ? `${icon("alert")}A link is set, but it isn't on an approved form address, so it's switched off.` : "js/config.js: join.guardianFormUrl, after the Salesforce admin approves it")}
        ${tick(links.some(l => l.url), "Salesforce links for staff added", "js/config.js: join.staffLinks (report or list view links)")}
        ${tick(J.showReviewNotes === false, "Consent, privacy and youth agreement wording approved by VoS", "Then set join.showReviewNotes to false")}
        <li class="ck"><span class="ck-box" aria-hidden="true"></span><span><b>Check:</b> the old youth Google Form is closed or retired<span class="sub">It collected youth details without a guardian step.</span></span></li>
      </ul>
      <h3>Form tool return pages</h3>
      <p class="small">Give these links to the Salesforce admin. They're the "thank you" pages the form tool should send people to.</p>
      <dl class="ret-list">${ret.map(r => `<div><dt>${esc({ "join-thanks": "After the guardian form", "join-confirmed": "After consent is confirmed", "join-complete": "After the youth registration" }[r])}</dt><dd><code>${esc(T.siteUrl(r))}</code></dd></div>`).join("")}</dl>
      <p class="small"><a href="https://github.com/VoSTTC/VOSteentechcentre/blob/main/docs/membership-setup.md" target="_blank" rel="noopener noreferrer">Salesforce setup guide</a> (docs/membership-setup.md)</p>
    </section>`;
  }

  async function clearSample() {
    if (await T.confirmDialog("Remove every schedule entry, announcement and attendance row marked Sample? Entries marked To confirm or Confirmed stay. Programs stay so you can edit them.", { title: "Clear sample content", confirmLabel: "Clear sample content", danger: true })) {
      T.db.clearSample(); T.toast("Sample content removed.");
    }
  }

  /* ---------------- schedule ---------------- */
  function schedule(p) {
    const list = T.db.list("events").slice().sort((a, b) => (a.status === "confirmed") - (b.status === "confirmed") || a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    p.innerHTML = `
      <div class="tool-row">
        <button class="btn primary" id="sAdd" type="button">${icon("plus")}<span>Add entry</span></button>
        <button class="btn" id="sIcs" type="button">${icon("download")}<span>Calendar file (.ics)</span></button>
        <button class="btn" id="sCsv" type="button">${icon("download")}<span>All entries (.csv)</span></button>
        <a class="btn ghost" href="#schedule">${icon("calendar")}<span>Open schedule</span></a>
      </div>
      <div class="table-wrap"><table class="tbl">
        <caption class="sr-only">All schedule entries</caption>
        <thead><tr><th scope="col">Entry</th><th scope="col">Type</th><th scope="col">When</th><th scope="col">Where</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list.map(e => `<tr>
          <th scope="row">${esc(e.title)}${e.staff ? `<span class="sub">${esc(e.staff)}</span>` : ""}</th>
          <td>${T.typeChip(e.type, "sm")}</td>
          <td>${esc(T.describeRepeat(e))}${e.repeat ? `<span class="sub">From ${esc(T.fmtDate(e.date, "dm"))}</span>` : `<span class="sub">${esc(T.fmtDate(e.date, "short"))}</span>`}<span class="sub">${T.fmtRange(e.start, e.end)}</span></td>
          <td>${esc(T.location(e.location))}</td>
          <td>${T.statusChip(e.status)}</td>
          <td class="acts"><button class="btn sm" type="button" data-e="${e.id}" aria-label="Edit ${esc(e.title)}">${icon("edit")}<span>Edit</span></button>
          <button class="btn sm danger ghost" type="button" data-d="${e.id}" aria-label="Remove ${esc(e.title)}">${icon("trash")}</button></td></tr>`).join("")}</tbody>
      </table></div>
      ${!list.length ? `<p class="empty">No schedule entries yet. Add the first one with Add entry.</p>` : ""}`;
    p.querySelector("#sAdd").onclick = () => T.openEventEditor(null);
    p.querySelector("#sIcs").onclick = () => T.exportFile("ttc-schedule.ics", T.toICS(T.db.list("events")), "text/calendar");
    p.querySelector("#sCsv").onclick = () => {
      const rows = [["Title", "Type", "Status", "First date", "Start", "End", "Repeats", "Skipped dates", "Location", "Program area", "Staff or partner", "Capacity", "Notes"]];
      T.db.list("events").forEach(e => rows.push([e.title, C.types[e.type].label, C.statuses[e.status].label, e.date, e.start, e.end, T.describeRepeat(e), (e.exceptions || []).join(" "), T.location(e.location), (T.zone(e.zone) || {}).name || "", e.staff, e.capacity, e.notes]));
      T.exportFile("ttc-schedule-entries.csv", T.toCSV(rows), "text/csv");
    };
    p.querySelectorAll("[data-e]").forEach(b => b.onclick = () => T.openEventEditor(T.db.find("events", b.dataset.e)));
    p.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => {
      const e = T.db.find("events", b.dataset.d);
      if (await T.confirmDialog(`Remove "${e.title}"${e.repeat ? " and every date in its series" : ""}?`, { title: "Remove entry", confirmLabel: "Remove", danger: true })) { T.db.remove("events", e.id); T.toast("Entry removed."); }
    });
  }

  /* ---------------- programs ---------------- */
  function programs(p) {
    const acts = T.db.list("activities");
    p.innerHTML = `<div class="tool-row"><button class="btn primary" id="pAdd" type="button">${icon("plus")}<span>Add activity</span></button></div>
      <div class="table-wrap"><table class="tbl"><caption class="sr-only">Activities</caption>
        <thead><tr><th scope="col">Activity</th><th scope="col">Program area</th><th scope="col">Location</th><th scope="col">Capacity</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${acts.map(a => `<tr><th scope="row"><a href="#activity-${a.id}">${esc(a.name)}</a></th><td>${esc((T.zone(a.zone) || {}).name || "")}</td><td>${esc(T.location(a.location))}</td><td>${esc(a.capacity || "Not set")}</td>
          <td class="acts"><button class="btn sm" type="button" data-a="${a.id}" aria-label="Edit ${esc(a.name)}">${icon("edit")}<span>Edit</span></button></td></tr>`).join("")}</tbody></table></div>`;
    p.querySelector("#pAdd").onclick = () => T.editActivity(null);
    p.querySelectorAll("[data-a]").forEach(b => b.onclick = () => T.editActivity(T.activity(b.dataset.a)));
  }

  /* ---------------- announcements ---------------- */
  function announcements(p) {
    const list = T.db.list("announcements").slice().sort((a, b) => String(b.start).localeCompare(String(a.start)));
    const d = T.now().date;
    p.innerHTML = `<div class="tool-row"><button class="btn primary" id="nAdd" type="button">${icon("plus")}<span>New announcement</span></button>
      <a class="btn" href="#display">${icon("tv")}<span>Preview display</span></a></div>
      <div class="table-wrap"><table class="tbl"><caption class="sr-only">Announcements</caption>
        <thead><tr><th scope="col">Headline</th><th scope="col">Type</th><th scope="col">Dates</th><th scope="col">TV display</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${list.map(a => `<tr><th scope="row">${esc(a.title)}</th><td>${a.kind === "shoutout" ? "Shout-out" : a.kind === "reminder" ? "Reminder" : "Announcement"}</td>
          <td>${a.start ? esc(T.fmtDate(a.start, "dm")) : "Always"}${a.end ? " to " + esc(T.fmtDate(a.end, "dm")) : ""}${a.end && a.end < d ? `<span class="sub">Ended</span>` : a.start > d ? `<span class="sub">Scheduled</span>` : ""}</td>
          <td>${a.onDisplay ? (a.kind === "shoutout" && !a.consent ? "Hidden: needs consent" : "Yes") : "No"}</td><td>${T.statusChip(a.status)}</td>
          <td class="acts"><button class="btn sm" type="button" data-n="${a.id}" aria-label="Edit ${esc(a.title)}">${icon("edit")}<span>Edit</span></button>
          <button class="btn sm danger ghost" type="button" data-nd="${a.id}" aria-label="Remove ${esc(a.title)}">${icon("trash")}</button></td></tr>`).join("")}</tbody></table></div>
      ${!list.length ? `<p class="empty">No announcements yet.</p>` : ""}`;
    p.querySelector("#nAdd").onclick = () => T.editAnnouncement(null);
    p.querySelectorAll("[data-n]").forEach(b => b.onclick = () => T.editAnnouncement(T.db.find("announcements", b.dataset.n)));
    p.querySelectorAll("[data-nd]").forEach(b => b.onclick = async () => {
      const a = T.db.find("announcements", b.dataset.nd);
      if (await T.confirmDialog(`Remove "${a.title}"?`, { title: "Remove announcement", confirmLabel: "Remove", danger: true })) { T.db.remove("announcements", a.id); T.toast("Announcement removed."); }
    });
  }

  /* ---------------- attendance ---------------- */
  function attendance(p) {
    const today = T.now().date;
    attDate = attDate || today;
    const rows = T.db.list("attendance").filter(a => a.date === attDate).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
    const open = rows.filter(r => !r.timeOut);
    const eqRows = T.db.list("equipment").filter(a => a.date === attDate).sort((a, b) => a.timeIn.localeCompare(b.timeIn));
    const eqOpen = eqRows.filter(r => !r.timeOut);
    const stationOf = id => (T.equipmentStations ? T.equipmentStations() : []).find(s => s.id === id);
    const byAct = {}; rows.forEach(r => { byAct[r.activity] = (byAct[r.activity] || 0) + 1; });
    const actName = id => (T.activity(id) || { name: "Other" }).name;
    p.innerHTML = `
      <p class="callout">${icon("lock")}<span>Attendance is private. It is stored on this device only, kept for ${C.attendanceRetentionDays} days, and never shown on public pages or the TV display.</span></p>
      <div class="tool-row">
        <div class="field inline"><label for="attDate">Date</label><input type="date" id="attDate" value="${attDate}" max="${today}"></div>
        <button class="btn" id="attCsv" type="button">${icon("download")}<span>This day (.csv)</span></button>
        <button class="btn" id="attAll" type="button">${icon("download")}<span>Last ${C.attendanceRetentionDays} days (.csv)</span></button>
        <button class="btn" id="attPrint" type="button">${icon("print")}<span>Print</span></button>
        ${(open.length || eqOpen.length) && attDate === today ? `<button class="btn" id="attEnd" type="button">${icon("signout")}<span>Sign out everyone still here</span></button>` : ""}
      </div>
      <div class="att-sum">
        <div><span class="ov-n">${rows.length}</span><span>sign-ins</span></div>
        <div><span class="ov-n">${open.length}</span><span>still signed in</span></div>
        ${Object.entries(byAct).map(([k, n]) => `<div><span class="ov-n sm">${n}</span><span>${esc(actName(k))}</span></div>`).join("")}
      </div>
      ${rows.length ? `<div class="table-wrap"><table class="tbl"><caption class="sr-only">Sign-ins for ${esc(T.fmtDate(attDate))}</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Activity</th><th scope="col">In</th><th scope="col">Out</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${rows.map(r => `<tr><th scope="row">${esc(r.name)}${r.sample ? ` <span class="schip s-sample">Sample</span>` : ""}</th><td>${esc(actName(r.activity))}</td><td>${T.fmtTime(r.timeIn)}</td><td>${r.timeOut ? T.fmtTime(r.timeOut) : `<span class="here">Here now</span>`}</td>
          <td class="acts">${!r.timeOut ? `<button class="btn sm" type="button" data-out="${r.id}" aria-label="Sign out ${esc(r.name)}">${icon("signout")}<span>Sign out</span></button>` : ""}
          <button class="btn sm danger ghost" type="button" data-rm="${r.id}" aria-label="Delete sign-in for ${esc(r.name)}">${icon("trash")}</button></td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">No sign-ins on ${esc(T.fmtDate(attDate, "short"))}. Youth sign in from the <a href="#signin">sign-in page</a>.</p>`}
      <section class="eq-staff" aria-labelledby="eqh">
        <h2 id="eqh">${icon("cube")}Equipment use</h2>
        <div class="tool-row">
          <button class="btn" id="eqCsv" type="button">${icon("download")}<span>This day (.csv)</span></button>
          <button class="btn" id="eqAll" type="button">${icon("download")}<span>Last ${C.attendanceRetentionDays} days (.csv)</span></button>
        </div>
        <div class="att-sum">${(T.equipmentStations ? T.equipmentStations() : []).map(st => { const n = eqRows.filter(r => r.station === st.id).length; const o = eqRows.filter(r => r.station === st.id && !r.timeOut).length; return `<div><span class="ov-n sm">${n}</span><span>${esc(st.name)}${o ? ` · ${o} in use` : ""}</span></div>`; }).join("")}</div>
        ${eqRows.some(r => !r.onboarded) ? `<p class="callout warn">${icon("alert")}<span>${eqRows.filter(r => !r.onboarded).length} equipment sign-in${eqRows.filter(r => !r.onboarded).length === 1 ? "" : "s"} said onboarding was not done yet. Check in with them.</span></p>` : ""}
        ${eqRows.length ? `<div class="table-wrap"><table class="tbl"><caption class="sr-only">Equipment use for ${esc(T.fmtDate(attDate))}</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Equipment</th><th scope="col">Details</th><th scope="col">Onboarded</th><th scope="col">In</th><th scope="col">Out</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${eqRows.map(r => { const st = stationOf(r.station); return `<tr><th scope="row">${esc(r.name)}</th><td>${esc(st ? st.name : r.station)}${r.unit ? `<span class="sub">${esc(r.unit)}</span>` : ""}</td><td>${esc(T.equipmentAnswerText(st, r))}</td>
            <td>${r.onboarded ? "Yes" : `<span class="warn-txt">${icon("alert")}Not yet</span>`}</td><td>${T.fmtTime(r.timeIn)}</td><td>${r.timeOut ? T.fmtTime(r.timeOut) : `<span class="here">In use</span>`}</td>
            <td class="acts">${!r.timeOut ? `<button class="btn sm" type="button" data-eqout="${r.id}" aria-label="End ${esc(r.name)}'s session">${icon("signout")}<span>End</span></button>` : ""}
            <button class="btn sm danger ghost" type="button" data-eqrm="${r.id}" aria-label="Delete equipment sign-in for ${esc(r.name)}">${icon("trash")}</button></td></tr>`; }).join("")}</tbody></table></div>`
          : `<p class="empty">No equipment sign-ins on ${esc(T.fmtDate(attDate, "short"))}. Youth sign in on the <a href="#equipment">equipment sheet</a>.</p>`}
      </section>`;
    p.querySelector("#attDate").onchange = e => { attDate = e.target.value || today; render(root); root.querySelector("#attDate").focus(); };
    const header = ["Date", "Name", "Activity", "Time in", "Time out"];
    p.querySelector("#attCsv").onclick = () => T.exportFile(`ttc-attendance-${attDate}.csv`, T.toCSV([header, ...rows.map(r => [r.date, r.name, actName(r.activity), r.timeIn, r.timeOut])]), "text/csv");
    p.querySelector("#attAll").onclick = () => T.exportFile(`ttc-attendance-last-${C.attendanceRetentionDays}-days.csv`, T.toCSV([header, ...T.db.list("attendance").slice().sort((a, b) => (a.date + a.timeIn).localeCompare(b.date + b.timeIn)).map(r => [r.date, r.name, actName(r.activity), r.timeIn, r.timeOut])]), "text/csv");
    p.querySelector("#attPrint").onclick = T.printPage;
    const end = p.querySelector("#attEnd"); if (end) end.onclick = async () => {
      if (await T.confirmDialog(`Sign out all ${open.length} youth still signed in and end ${eqOpen.length} open equipment session${eqOpen.length === 1 ? "" : "s"}, at the current time?`, { title: "End of day", confirmLabel: "Sign everyone out" })) {
        const hm = T.now().hm; open.forEach(r => { r.timeOut = hm; }); eqOpen.forEach(r => { r.timeOut = hm; });
        if (open.length) T.db.upsert("attendance", open[0]); if (eqOpen.length) T.db.upsert("equipment", eqOpen[0]); T.toast("Everyone signed out.");
      }
    };
    p.querySelectorAll("[data-out]").forEach(b => b.onclick = () => { const r = T.db.find("attendance", b.dataset.out); r.timeOut = T.now().hm; T.db.upsert("attendance", r); T.toast(`${r.name} signed out.`); });
    const eqHeader = ["Date", "Name", "Equipment", "Machine", "Onboarded", "Details", "Time in", "Time out"];
    const eqLine = r => { const st = stationOf(r.station); return [r.date, r.name, st ? st.name : r.station, r.unit || "", r.onboarded ? "Yes" : "Not yet", T.equipmentAnswerText(st, r), r.timeIn, r.timeOut]; };
    p.querySelector("#eqCsv").onclick = () => T.exportFile(`ttc-equipment-${attDate}.csv`, T.toCSV([eqHeader, ...eqRows.map(eqLine)]), "text/csv");
    p.querySelector("#eqAll").onclick = () => T.exportFile(`ttc-equipment-last-${C.attendanceRetentionDays}-days.csv`, T.toCSV([eqHeader, ...T.db.list("equipment").slice().sort((a, b) => (a.date + a.timeIn).localeCompare(b.date + b.timeIn)).map(eqLine)]), "text/csv");
    p.querySelectorAll("[data-eqout]").forEach(b => b.onclick = () => { const r = T.db.find("equipment", b.dataset.eqout); r.timeOut = T.now().hm; T.db.upsert("equipment", r); T.toast(`Ended ${r.name}'s session.`); });
    p.querySelectorAll("[data-eqrm]").forEach(b => b.onclick = async () => {
      const r = T.db.find("equipment", b.dataset.eqrm);
      if (await T.confirmDialog(`Delete the equipment sign-in for ${r.name} at ${T.fmtTime(r.timeIn)}?`, { title: "Delete sign-in", confirmLabel: "Delete", danger: true })) { T.db.remove("equipment", r.id); T.toast("Sign-in deleted."); }
    });
    p.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => {
      const r = T.db.find("attendance", b.dataset.rm);
      if (await T.confirmDialog(`Delete the sign-in for ${r.name} at ${T.fmtTime(r.timeIn)}?`, { title: "Delete sign-in", confirmLabel: "Delete", danger: true })) { T.db.remove("attendance", r.id); T.toast("Sign-in deleted."); }
    });
  }

  /* ---------------- data & backup ---------------- */
  function data(p) {
    let bytes = 0; try { bytes = (localStorage.getItem("vos-ttc-hub:v1") || "").length; } catch (e) {}
    p.innerHTML = `
      <section class="panel"><h2>${icon("info")}Where your data lives</h2>
        <ul class="plain">
          <li>Everything is saved in this browser's local storage on this device (about ${Math.max(1, Math.round(bytes / 1024))} KB used). It stays after a refresh or restart.</li>
          <li>It is <b>not shared</b> between devices. The front tablet, a staff laptop and the TV each keep their own copy. To move data, export a backup here and import it on the other device.</li>
          <li>Clearing browser data, a private window, or a different browser on the same device starts fresh.</li>
          <li>The app does not send anything to Google Calendar, Salesforce or any other service. Exports are files you import yourself.</li>
          <li>${T.db.persistent ? "Saving is working on this device." : "<b>Saving is blocked on this device.</b> Changes will be lost when the page closes."}</li>
        </ul></section>
      <div class="ov-grid">
        <section class="panel"><h2>${icon("download")}Back up</h2><p>Download every entry, activity, announcement and attendance row as one file.</p>
          <button class="btn primary" id="bk" type="button">${icon("download")}<span>Download backup (.json)</span></button></section>
        <section class="panel"><h2>${icon("upload")}Restore</h2><p>Replace everything on this device with a backup file.</p>
          <div class="field"><label for="imp">Backup file</label><input type="file" id="imp" accept="application/json,.json"></div>
          <details><summary>Or paste backup text</summary><div class="field"><label for="impTxt">Backup text</label><textarea id="impTxt" rows="4"></textarea></div>
          <button class="btn" id="impGo" type="button">Restore from pasted text</button></details></section>
        <section class="panel"><h2>${icon("trash")}Reset</h2>
          <div class="stack">
            <button class="btn" id="clrS" type="button">Clear sample content</button>
            <button class="btn" id="rsS" type="button">Reset to the starting schedule</button>
            <button class="btn danger" id="wipe" type="button">Erase all data on this device</button>
          </div></section>
      </div>`;
    p.querySelector("#bk").onclick = () => T.exportFile(`ttc-hub-backup-${T.now().date}.json`, JSON.stringify(T.db.all, null, 2), "application/json");
    const restore = async text => {
      let obj; try { obj = JSON.parse(text); } catch (e) { T.toast("That file is not a valid backup."); return; }
      if (!obj || !Array.isArray(obj.events) || !Array.isArray(obj.activities)) { T.toast("That file is not a TTC Hub backup."); return; }
      if (await T.confirmDialog(`Replace everything on this device with this backup (${obj.events.length} entries, ${obj.activities.length} activities, ${(obj.announcements || []).length} announcements, ${(obj.attendance || []).length} sign-ins, ${(obj.equipment || []).length} equipment sign-ins)?`, { title: "Restore backup", confirmLabel: "Replace and restore", danger: true })) {
        T.db.replaceAll(obj); T.toast("Backup restored.");
      }
    };
    p.querySelector("#imp").onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => restore(r.result); r.readAsText(f); };
    p.querySelector("#impGo").onclick = () => restore(p.querySelector("#impTxt").value);
    p.querySelector("#clrS").onclick = clearSample;
    p.querySelector("#rsS").onclick = async () => { if (await T.confirmDialog("Replace the schedule, programs and announcements on this device with the starting schedule that ships with the app? Sign-ins stay. Your own edits will be lost unless you back up first.", { title: "Reset schedule", confirmLabel: "Reset", danger: true })) { T.db.resetToSample(); T.toast("Starting schedule restored."); } };
    p.querySelector("#wipe").onclick = async () => { if (await T.confirmDialog("Erase every schedule entry, announcement, sign-in and activity on this device? This cannot be undone. Download a backup first if you need one.", { title: "Erase all data", confirmLabel: "Erase everything", danger: true })) { T.db.replaceAll({ events: [], activities: [], announcements: [], attendance: [], equipment: [], showcase: [], hasSample: false }); if (T.clearShowcasePhotos) T.clearShowcasePhotos(); T.toast("All data erased."); } };
  }

  T.views.staff = { title: "Staff tools", render };
})();

/* =========================================================================
   PROJECT SHOWCASE (smart board carousel)
   Staff add youth projects on the device that runs the board: a photo,
   a title, an optional first name, the area or tool and a short caption.
   Staff confirm the youth agreed to share it and that the photo has no
   faces unless media consent is on file. Nothing is shown until staff add it.

   Storage: project details live with the rest of the app data; photos are
   kept in this browser's IndexedDB (more room than local storage). Both stay
   on this device only. Photos are resized before saving.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const SLIDE_MS = ((C.showcase && C.showcase.slideSeconds) || 10) * 1000;
  const MAX_PX = 1600;

  /* ---------------- photo store (IndexedDB) ---------------- */
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open("vos-ttc-hub-photos", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("photos");
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  const tx = (mode, fn) => idb().then(db => new Promise((res, rej) => {
    const t = db.transaction("photos", mode), st = t.objectStore("photos"), out = fn(st);
    t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
  const putPhoto = (id, blob) => tx("readwrite", st => st.put(blob, id));
  const getPhoto = id => tx("readonly", st => st.get(id));
  const delPhoto = id => tx("readwrite", st => st.delete(id));
  const clearPhotos = () => tx("readwrite", st => st.clear());
  const urls = new Map();
  async function photoURL(id) {
    if (urls.has(id)) return urls.get(id);
    try { const b = await getPhoto(id); if (!b) return ""; const u = URL.createObjectURL(b); urls.set(id, u); return u; } catch (e) { return ""; }
  }
  function dropURL(id) { if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } }

  function resize(file) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(u);
        const k = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b => b ? res(b) : rej(new Error("resize")), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("That file isn't an image this browser can open.")); };
      img.src = u;
    });
  }

  const items = () => T.db.list("showcase");
  const live = () => items().filter(p => p.onBoard && p.consent && p.mediaOk).sort((a, b) => String(b.added).localeCompare(String(a.added)));

  /* ---------------- editor (staff) ---------------- */
  function editProject(src) {
    if (!T.isStaff()) { T.staffLogin(() => editProject(src)); return; }
    const p = src ? JSON.parse(JSON.stringify(src)) : { id: "", title: "", maker: "", zone: "", tool: "", caption: "", onBoard: true, consent: false, mediaOk: false, added: T.now().date };
    let newBlob = null;
    const opt = (v, l, s) => `<option value="${esc(v)}" ${s ? "selected" : ""}>${esc(l)}</option>`;
    T.modal({
      title: src ? "Edit project" : "Add a project to the showcase", wide: true,
      body: `<form class="form" id="pjForm" novalidate>
        <div id="pjErr" class="callout warn" role="alert" hidden></div>
        <div class="pj-photo-row">
          <div class="pj-prev" id="pjPrev">${src ? "" : `<span>${icon("camera")}No photo yet</span>`}</div>
          <div class="field"><label for="pj-file">${src ? "Replace photo" : "Photo of the project"} ${src ? `<span class="opt">optional</span>` : `<span class="req">required</span>`}</label>
            <input type="file" id="pj-file" accept="image/*">
            <p class="hint">${icon("info")}On a tablet this can open the camera. Photos are resized before saving.</p></div>
        </div>
        <div class="field"><label for="pj-title">Project title <span class="req">required</span></label><input id="pj-title" maxlength="60" value="${esc(p.title)}" autocomplete="off"></div>
        <div class="grid2">
          <div class="field"><label for="pj-maker">Made by <span class="opt">first name only, optional</span></label><input id="pj-maker" maxlength="40" value="${esc(p.maker)}" autocomplete="off" placeholder="e.g. Maya, or Maya and Jordan"></div>
          <div class="field"><label for="pj-zone">Program area</label><select id="pj-zone">${opt("", "Choose one", !p.zone)}${C.zones.map(z => opt(z.id, z.name, p.zone === z.id)).join("")}</select></div>
        </div>
        <div class="field"><label for="pj-tool">Made with <span class="opt">optional</span></label><input id="pj-tool" maxlength="50" value="${esc(p.tool)}" autocomplete="off" placeholder="e.g. 3D printer, laser cutter, recording studio"></div>
        <div class="field"><label for="pj-cap">About the project <span class="opt">optional</span></label><textarea id="pj-cap" rows="2" maxlength="160">${esc(p.caption)}</textarea><span class="count" id="pj-cap-c"></span></div>
        <div class="checks">
          <label class="check consent"><input type="checkbox" id="pj-consent" ${p.consent ? "checked" : ""}> The youth agreed to show this project on the board${p.maker ? " with their first name" : ""}.</label>
          <label class="check consent"><input type="checkbox" id="pj-media" ${p.mediaOk ? "checked" : ""}> The photo shows no faces, or media consent is on file for everyone in it.</label>
          <label class="check"><input type="checkbox" id="pj-on" ${p.onBoard ? "checked" : ""}> Show on the smart board now</label>
        </div>
        <p class="hint">${icon("lock")}Use first names only. No last names, schools or other personal details.</p>
      </form>`,
      actions: [{ label: "Cancel" }, { label: "Save project", kind: "primary", id: "pjSave", onClick: close => save(close) }],
      onOpen: async box => {
        const prev = box.querySelector("#pjPrev");
        if (src) { const u = await photoURL(src.id); prev.innerHTML = u ? `<img src="${u}" alt="Current photo">` : `<span>${icon("alert")}Photo missing</span>`; }
        box.querySelector("#pj-file").onchange = async e => {
          const f = e.target.files[0]; if (!f) return;
          try { newBlob = await resize(f); prev.innerHTML = `<img src="${URL.createObjectURL(newBlob)}" alt="New photo">`; }
          catch (err) { newBlob = null; showErr([err.message || "That photo couldn't be read. Try another one."]); }
        };
        const cap = box.querySelector("#pj-cap"), cc = box.querySelector("#pj-cap-c");
        const up = () => { cc.textContent = `${cap.value.length} of 160 characters`; }; cap.oninput = up; up();
      }
    });
    function showErr(list) {
      const e = document.querySelector("#pjErr"); e.hidden = false;
      e.innerHTML = `${icon("alert")}<div><ul>${list.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    }
    async function save(close) {
      const box = document.querySelector(".modal"), v = s => box.querySelector(s).value.trim(), c = s => box.querySelector(s).checked;
      Object.assign(p, { title: v("#pj-title"), maker: v("#pj-maker"), zone: v("#pj-zone"), tool: v("#pj-tool"), caption: v("#pj-cap"),
        consent: c("#pj-consent"), mediaOk: c("#pj-media"), onBoard: c("#pj-on") });
      const errs = [];
      if (!src && !newBlob) errs.push("Add a photo of the project.");
      if (!p.title) errs.push("Add a project title.");
      if (p.onBoard && !p.consent) errs.push("Confirm the youth agreed to share it, or untick Show on the smart board.");
      if (p.onBoard && !p.mediaOk) errs.push("Confirm the photo has no faces or that media consent is on file, or untick Show on the smart board.");
      if (errs.length) { showErr(errs); box.querySelector("#pj-title").focus(); return; }
      const btn = box.querySelector("#pjSave"); btn.disabled = true;
      if (!p.id) p.id = T.uid("pj");
      try { if (newBlob) { await putPhoto(p.id, newBlob); dropURL(p.id); } }
      catch (e) { btn.disabled = false; showErr(["This browser couldn't save the photo. It may be in a private window or out of storage space."]); return; }
      T.db.upsert("showcase", p); close(); T.toast(p.onBoard ? "Project added to the showcase." : "Project saved. It's hidden from the board.");
    }
  }
  async function removeProject(p) {
    if (!(await T.confirmDialog(`Remove "${p.title}" and its photo from this device?`, { title: "Remove project", confirmLabel: "Remove", danger: true }))) return;
    try { await delPhoto(p.id); } catch (e) {}
    dropURL(p.id); T.db.remove("showcase", p.id); T.toast("Project removed.");
  }

  /* ---------------- carousel page ---------------- */
  let el = null, idx = 0, timer = null, idleTimer = null, wake = null;
  async function paint() {
    if (!el) return;
    const list = live(), staff = T.isStaff();
    if (!list.length) {
      el.innerHTML = `<div class="display show" id="showRoot">
        <div class="sh-empty"><img src="assets/visions-logo-white.png" alt="Visions" width="676" height="212">
          <h1>Youth projects will appear here</h1>
          <p>${staff ? "Add the first project with the button below." : "Made something you're proud of? Show a staff member to add it to the board."}</p>
          ${staff ? `<button class="btn primary big" id="shAdd" type="button">${icon("plus")}<span>Add a project</span></button>` : ""}</div>
        ${ctl()}</div>`;
      wire(); return;
    }
    idx = ((idx % list.length) + list.length) % list.length;
    const p = list[idx], z = T.zone(p.zone) || {};
    const u = await photoURL(p.id);
    if (!el) return;
    el.innerHTML = `<div class="display show" id="showRoot">
      <div class="d-top">
        <img src="assets/visions-logo-white.png" alt="Visions" class="d-logo" width="676" height="212">
        <div class="d-name"><span>Youth project showcase</span> Made at the Teen Tech Centre</div>
        <div class="sh-count" aria-hidden="true">${idx + 1} / ${list.length}</div>
      </div>
      <div class="sh-main" aria-live="polite">
        <figure class="sh-photo">${u ? `<img src="${u}" alt="${esc(p.title)}">` : `<span class="sh-missing">${icon("camera")}Photo not on this device</span>`}</figure>
        <div class="sh-text" style="--c:${z.colour || "var(--c-lightblue)"}">
          ${z.name ? `<span class="sh-zone">${esc(z.name)}</span>` : ""}
          <h1 class="sh-title">${esc(p.title)}</h1>
          ${p.maker ? `<p class="sh-maker">by ${esc(p.maker)}</p>` : ""}
          ${p.caption ? `<p class="sh-cap">${esc(p.caption)}</p>` : ""}
          ${p.tool ? `<p class="sh-tool">${icon("tool")}Made with ${esc(p.tool)}</p>` : ""}
          ${list.length > 1 ? `<div class="d-dots sh-dots" aria-hidden="true">${list.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join("")}</div>` : ""}
        </div>
      </div>
      <div class="sh-foot"><span>${icon("star")}Made something you're proud of? Show a staff member to add it to the board.</span><span>${esc(C.tagline)}</span></div>
      <div class="brand-band" aria-hidden="true"><i></i><i></i></div>
      ${ctl()}</div>`;
    wire();
  }
  function ctl() {
    return `<div class="d-ctl" id="dCtl">
      <a class="btn sm" href="#home">${icon("left")}<span>Exit</span></a>
      <button class="btn sm" type="button" id="shPrev" aria-label="Previous project">${icon("left")}</button>
      <button class="btn sm" type="button" id="shNext" aria-label="Next project">${icon("right")}</button>
      <button class="btn sm" type="button" id="dFull">${icon("expand")}<span>Full screen</span></button>
      ${T.isStaff() ? `<button class="btn sm" type="button" id="shAdd2">${icon("plus")}<span>Add project</span></button><a class="btn sm" href="#staff" id="shManage">${icon("lock")}<span>Manage</span></a>` : `<button class="btn sm" type="button" id="shStaff">${icon("lock")}<span>Staff</span></button>`}
    </div>`;
  }
  function wire() {
    const q = s => el && el.querySelector(s);
    if (q("#shAdd")) q("#shAdd").onclick = () => editProject(null);
    if (q("#shAdd2")) q("#shAdd2").onclick = () => editProject(null);
    if (q("#shStaff")) q("#shStaff").onclick = () => T.staffLogin();
    if (q("#shManage")) q("#shManage").onclick = () => { try { sessionStorage.setItem("ttc-staff-tab", "showcase"); } catch (e) {} };
    if (q("#shPrev")) q("#shPrev").onclick = () => { idx--; restart(); paint(); };
    if (q("#shNext")) q("#shNext").onclick = () => { idx++; restart(); paint(); };
    if (q("#dFull")) q("#dFull").onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => T.toast("Full screen is not available here. Use the browser's own full-screen option."));
    };
    wakeIdle();
  }
  function wakeIdle() {
    const c = el && el.querySelector("#dCtl"); if (!c) return;
    c.classList.add("show"); clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!c.contains(document.activeElement)) c.classList.remove("show"); }, 4000);
  }
  function restart() { clearInterval(timer); timer = setInterval(() => { idx++; paint(); }, SLIDE_MS); }
  function onKey(e) {
    if (document.querySelector(".scrim")) return;
    if (e.key === "Escape" && !document.fullscreenElement) { location.hash = "home"; return; }
    if (e.key === "ArrowRight") { idx++; restart(); paint(); }
    if (e.key === "ArrowLeft") { idx--; restart(); paint(); }
    wakeIdle();
  }

  T.views.showcase = {
    title: "Project showcase",
    render(container) {
      el = container; idx = 0; document.body.classList.add("display-mode");
      paint(); restart();
      document.addEventListener("keydown", onKey); document.addEventListener("mousemove", wakeIdle); document.addEventListener("focusin", wakeIdle);
      try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(w => { wake = w; }).catch(() => {}); } catch (e) {}
    },
    refresh() { paint(); },
    cleanup() {
      clearInterval(timer); clearTimeout(idleTimer); el = null;
      document.removeEventListener("keydown", onKey); document.removeEventListener("mousemove", wakeIdle); document.removeEventListener("focusin", wakeIdle);
      if (wake) { try { wake.release(); } catch (e) {} wake = null; }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  };

  /* ---------------- staff tab ---------------- */
  T.showcaseStaff = async function (p) {
    const list = items().slice().sort((a, b) => String(b.added).localeCompare(String(a.added)));
    p.innerHTML = `
      <p class="callout">${icon("info")}<span>Projects and photos are saved on <b>this device only</b>. Add them on the device that runs the smart board, and open <a href="#showcase">the showcase</a> there. Photos aren't included in the Data &amp; backup file.</span></p>
      <div class="tool-row"><button class="btn primary" id="pjAdd" type="button">${icon("plus")}<span>Add a project</span></button>
      <a class="btn" href="#showcase">${icon("tv")}<span>Open the showcase</span></a></div>
      ${list.length ? `<ul class="pj-list">${list.map(x => `<li class="pj-row">
          <span class="pj-thumb" data-thumb="${x.id}"></span>
          <span class="pj-main"><b>${esc(x.title)}</b><span class="sub">${x.maker ? "by " + esc(x.maker) + " · " : ""}${esc((T.zone(x.zone) || {}).name || "No area")} · added ${esc(T.fmtDate(x.added, "dm"))}</span>
            <span class="sub">${x.onBoard && x.consent && x.mediaOk ? `<span class="here">On the board</span>` : x.onBoard ? `<span class="warn-txt">${icon("alert")}Hidden: consent not confirmed</span>` : "Hidden from the board"}</span></span>
          <span class="acts"><button class="btn sm" type="button" data-pjt="${x.id}">${x.onBoard ? "Hide" : "Show"}</button>
          <button class="btn sm" type="button" data-pje="${x.id}" aria-label="Edit ${esc(x.title)}">${icon("edit")}<span>Edit</span></button>
          <button class="btn sm danger ghost" type="button" data-pjd="${x.id}" aria-label="Remove ${esc(x.title)}">${icon("trash")}</button></span></li>`).join("")}</ul>`
        : `<p class="empty">No projects yet. Add one with Add a project.</p>`}`;
    p.querySelector("#pjAdd").onclick = () => editProject(null);
    p.querySelectorAll("[data-pje]").forEach(b => b.onclick = () => editProject(T.db.find("showcase", b.dataset.pje)));
    p.querySelectorAll("[data-pjd]").forEach(b => b.onclick = () => removeProject(T.db.find("showcase", b.dataset.pjd)));
    p.querySelectorAll("[data-pjt]").forEach(b => b.onclick = () => {
      const x = T.db.find("showcase", b.dataset.pjt);
      if (!x.onBoard && !(x.consent && x.mediaOk)) { editProject(x); return; }
      x.onBoard = !x.onBoard; T.db.upsert("showcase", x); T.toast(x.onBoard ? "Showing on the board." : "Hidden from the board.");
    });
    for (const t of p.querySelectorAll("[data-thumb]")) { const u = await photoURL(t.dataset.thumb); if (u) t.innerHTML = `<img src="${u}" alt="">`; }
  };
  T.clearShowcasePhotos = () => clearPhotos().catch(() => {});
})();

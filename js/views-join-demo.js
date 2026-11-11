/* =========================================================================
   JOIN THE TTC: DEMO (#join-demo)
   A click-through preview of the planned membership process for the
   Salesforce team and VoS leadership. Every screen uses made-up example
   people. There are no input boxes, nothing can be typed, and nothing is
   saved or sent. Each step also explains what Salesforce would do.
   Matches docs/membership-setup.md.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const EX = { youth: "Jordan", youthLast: "Example", guardian: "Sam", guardianLast: "Example", email: "sam@example.com", phone: "555-0100", youthEmail: "jordan@example.com" };

  const STAT = {
    pending: { label: "Pending guardian consent", cls: "ms-pending", ico: "clock" },
    invited: { label: "Youth registration invited", cls: "ms-invited", ico: "arrow" },
    review: { label: "Ready for staff review", cls: "ms-review", ico: "users", internal: true },
    active: { label: "Active", cls: "ms-active", ico: "checkin" }
  };
  const ORDER = ["none", "pending", "invited", "review", "active"];
  const chip = id => STAT[id] ? `<span class="mstat ${STAT[id].cls}">${icon(STAT[id].ico)}${esc(STAT[id].label)}</span>` : `<span class="mstat ms-none">Not started</span>`;

  // a field that looks like a form box but can't be typed into
  const fld = (label, value, opt) => `<div class="dm-f"><span class="dm-l">${esc(label)}${opt ? ` <span class="opt">optional</span>` : ""}</span><span class="dm-v">${esc(value)}</span></div>`;
  const tick = (text, on) => `<div class="dm-ck ${on ? "on" : ""}"><span class="dm-box" aria-hidden="true">${on ? icon("checkin") : ""}</span><span>${text}</span></div>`;
  const pick = (label, opts, chosen) => `<div class="dm-f"><span class="dm-l">${esc(label)}</span><span class="dm-opts">${opts.map(o => `<span class="dm-opt ${o === chosen ? "on" : ""}">${esc(o)}</span>`).join("")}</span></div>`;
  const fakeBtn = (text) => `<span class="dm-btn" aria-hidden="true">${esc(text)}</span>`;
  const browser = (addr, inner) => `<div class="dm-browser"><div class="dm-bar"><span class="dm-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="dm-addr">${icon("lock")}${esc(addr)}</span></div><div class="dm-page">${inner}</div></div>`;
  const mail = (to, subj, inner) => `<div class="dm-mail"><div class="dm-mhead"><p><b>From:</b> Visions of Science, Teen Tech Centre</p><p><b>To:</b> ${esc(to)}</p><p class="dm-subj">${esc(subj)}</p></div><div class="dm-mbody">${inner}</div></div>`;
  const FORM = "forms.approved-form-tool.example";
  const SITE = "vosttc.github.io/VOSteentechcentre";

  const STEPS = [
    {
      who: "Parent or guardian", where: "TTC Hub", status: "none", title: "Finds Join the TTC",
      say: "Sam, Jordan's parent, opens the Teen Tech Centre Hub and selects Join the TTC. They read how joining works and the participation and privacy information, then select Start as a parent or guardian.",
      screen: browser(`${SITE}/#join`, `<p class="dm-eyebrow">Membership</p><h4 class="dm-h">Join the TTC</h4>
        <p>Joining takes two parts: a parent or guardian gives permission first, then the youth finishes their own registration.</p>
        <p>${fakeBtn("Start as a parent or guardian")}</p><p class="dm-small">Opens Visions of Science's secure membership form.</p>`),
      sf: ["Nothing yet. The hub only links to the approved form. It doesn't collect or store anything."]
    },
    {
      who: "Parent or guardian", where: "Approved form (Form 1)", status: "none", title: "Fills in the guardian form",
      say: "The form asks only for what's needed to identify Jordan and reach Sam, and shows the consent items in full before Sam submits.",
      screen: browser(`${FORM}/ttc-guardian`, `<h4 class="dm-h">TTC membership: parent or guardian</h4>
        <div class="dm-grid">${fld("Youth first name", EX.youth)}${fld("Youth last name", EX.youthLast)}${fld("Youth date of birth", "2012-04-12")}${fld("Your relationship to the youth", "Parent")}
        ${fld("Your first name", EX.guardian)}${fld("Your last name", EX.guardianLast)}${fld("Email", EX.email)}${fld("Phone", EX.phone)}</div>
        <div class="dm-sect"><p class="dm-l">I give permission for:</p>
        ${tick("Jordan to become a TTC member", true)}${tick("Jordan to arrive and leave on their own during open hours, signing in and out", true)}${tick("TTC staff to contact Jordan about programs through the approved channel", true)}${tick("I've provided current emergency contact information", true)}</div>
        ${tick("<b>I am Jordan's parent or legal guardian, or I'm otherwise authorized to give permission.</b>", true)}
        <p class="dm-small">Participation and privacy information is shown above this button. [Wording for VoS review]</p>
        <p>${fakeBtn("Submit")}</p>`),
      sf: ["The form tool writes to Salesforce through its approved connection.", "Flow 1 finds or creates two Contacts (Sam and Jordan), checking for duplicates.", `Creates a TTC Membership record with status ${STAT.pending.label}.`, "Generates a random, single-use consent token that expires in 7 days. The box Sam ticked is saved, but it isn't the verification."],
      next: "pending"
    },
    {
      who: "Parent or guardian", where: "TTC Hub (return page)", status: "pending", title: "Sees what happens next",
      say: "The form sends Sam back to the hub's #join-thanks page, which explains the next step. It shows no names or details.",
      screen: browser(`${SITE}/#join-thanks`, `<p class="dm-eyebrow">Step 1 of 4 done</p><h4 class="dm-h">Next, check your email</h4>
        <p>Membership status: ${chip("pending")}</p><ol class="dm-ol"><li>Visions of Science will email you a link to confirm your permission.</li><li>The membership stays pending until you confirm.</li><li>Then the youth gets their own invitation link.</li></ol>`),
      sf: ["Flow 1 emails Sam the consent request (template A), with a link to Form 2 carrying the consent token."]
    },
    {
      who: "Parent or guardian", where: "Email", status: "pending", title: "Gets the confirmation email",
      say: "Sam receives an email from Visions of Science. The link works once and expires. It doesn't contain Jordan's name or any record number.",
      screen: mail(EX.email, `Please confirm ${EX.youth} can join the Teen Tech Centre`, `<p>Hi ${esc(EX.guardian)},</p><p>Thanks for starting a Best Buy Teen Tech Centre membership for ${esc(EX.youth)}. To finish this step, please confirm your permission:</p>
        <p>${fakeBtn("Confirm my permission")}</p><p class="dm-small">This link works once and expires in 7 days. If you didn't request this, you can ignore this email.</p>`),
      sf: ["The email link looks like: …/ttc-consent?t=8f3k…q2 (a random token, never a name or Salesforce record ID).", "Flow 5 (daily) sends one reminder after 3 days, and marks the request Expired after 7."]
    },
    {
      who: "Parent or guardian", where: "Approved form (Form 2)", status: "pending", title: "Confirms permission",
      say: "The confirmation form shows the consent wording again. Sam types their name and confirms. This is the verification step.",
      screen: browser(`${FORM}/ttc-consent?t=••••••`, `<h4 class="dm-h">Confirm permission for ${esc(EX.youth)}</h4>
        <p>Please read the TTC participation and consent information. [Wording for VoS review, version TTC-consent-2027-01]</p>
        ${tick(`I confirm I give permission for ${esc(EX.youth)} to join the Teen Tech Centre`, true)}
        <div class="dm-grid one">${fld("Type your full name", `${EX.guardian} ${EX.guardianLast}`)}</div><p>${fakeBtn("Confirm")}</p>`),
      sf: ["Flow 2 looks up the membership by token. It stops if the token is wrong, expired, already used, or the status isn't pending.", "Saves Consent confirmed (date and time), Consent confirmed by, and the consent wording version, then clears the token so it can't be reused.", `Sets status to ${STAT.invited.label}.`, "Generates a youth invite token (expires in 14 days)."],
      next: "invited"
    },
    {
      who: "Youth", where: "Email", status: "invited", title: "Gets a personal invitation",
      say: "Only now does Jordan get an invitation. The link is just for Jordan.",
      screen: mail(EX.youthEmail, "You're invited to finish joining the Teen Tech Centre", `<p>Hi ${esc(EX.youth)},</p><p>Your parent or guardian has given permission for you to join the Best Buy Teen Tech Centre. Finish your registration here:</p>
        <p>${fakeBtn("Finish my registration")}</p><p class="dm-small">This link is just for you and expires in 14 days.</p>`),
      sf: ["Flow 2 sends template B. VoS decides whether it goes to the youth's email, the guardian's email, or the approved WhatsApp channel.", "Flow 5 sends one reminder after 7 days."]
    },
    {
      who: "Youth", where: "Approved form (Form 3)", status: "invited", title: "Completes their own registration",
      say: "Jordan fills in their own details. Photo and video permission is its own optional question, and the community agreements are a separate step.",
      screen: browser(`${FORM}/ttc-youth?t=••••••`, `<h4 class="dm-h">Finish your TTC registration</h4>
        <div class="dm-grid">${fld("School", "Example Middle School")}${fld("Grade", "9")}${fld("Pronouns", "they/them", true)}${fld("Anything that helps you take part", "Prefers quieter spaces", true)}</div>
        <div class="dm-sect">${pick("Photos and video (optional, and you can still take part in everything)", ["Yes", "No", "Ask me first"], "Ask me first")}</div>
        <div class="dm-sect"><p class="dm-l">TTC community agreements</p><ul class="dm-ul"><li>Treat everyone with respect</li><li>Use equipment safely, after a staff walkthrough</li><li>Take care of shared spaces</li><li>Sign in and out every visit</li><li>Tell staff about any concern</li></ul>
        ${tick("I've read and agree to the TTC community agreements", true)}</div><p>${fakeBtn("Submit my registration")}</p>`),
      sf: ["Flow 3 checks the youth invite token (same checks as Flow 2), saves Jordan's details, media consent and the agreement date and version, then clears the token.", `Sets status to ${STAT.review.label} (staff only) and notifies TTC staff.`],
      next: "review"
    },
    {
      who: "Youth", where: "TTC Hub (return page)", status: "review", title: "Sees they're almost a member",
      say: "The form sends Jordan to the hub's #join-complete page. Families still see \"Youth registration invited\" until staff activate.",
      screen: browser(`${SITE}/#join-complete`, `<p class="dm-eyebrow">Step 3 of 4 done</p><h4 class="dm-h">You're almost a member</h4>
        <ol class="dm-ol"><li>TTC staff will check your registration and activate your membership.</li><li>Once it's active, sign in at the front tablet every visit.</li></ol>`),
      sf: ["Nothing new. The record waits in the staff \"Ready to activate\" list."]
    },
    {
      who: "TTC staff", where: "Salesforce", status: "review", title: "Check the record and activate",
      say: "A staff member opens the Ready to activate list from Staff tools on the hub (it opens Salesforce, which asks them to log in), checks the record and selects Activate.",
      screen: `<div class="dm-sf"><div class="dm-sfbar">${icon("grid")}<b>TTC Memberships</b><span>·</span>Ready to activate</div>
        <div class="dm-sftable" role="table" aria-label="Example Salesforce list">
          <div class="dm-tr dm-th" role="row"><span role="columnheader">Youth</span><span role="columnheader">Guardian</span><span role="columnheader">Consent confirmed</span><span role="columnheader">Youth agreement</span><span role="columnheader">Media</span><span role="columnheader"></span></div>
          <div class="dm-tr" role="row"><span role="cell">${esc(EX.youth)} ${esc(EX.youthLast)}</span><span role="cell">${esc(EX.guardian)} ${esc(EX.guardianLast)}</span><span role="cell">${icon("checkin")}Jan 6, 2027</span><span role="cell">${icon("checkin")}Jan 7, 2027</span><span role="cell">Ask first</span><span role="cell">${fakeBtn("Activate")}</span></div>
        </div><p class="dm-small">Example Salesforce screen. The real layout is up to the Salesforce admin.</p></div>`,
      sf: ["Flow 4 (the Activate quick action) sets status to Active, records Activated by and Activated on, and sends the welcome email (template C).", "Only TTC staff with the right permission can activate. Field-level security keeps tokens hidden."],
      next: "active"
    },
    {
      who: "Youth", where: "Front tablet at the TTC", status: "active", title: "Signs in every visit",
      say: "Jordan gets a welcome email with the hours, then signs in and out at the front tablet every visit. The tablet and TV display never show anyone's status or details.",
      screen: browser(`${SITE}/#signin`, `<h4 class="dm-h">Welcome in!</h4><p>Pick what you're here for, then add your first name and last initial.</p>
        <div class="dm-grid">${fld("First name", EX.youth)}${fld("Last initial", "E")}</div><p>${fakeBtn("Sign in")}</p>`),
      sf: ["Today: the tablet records visits on the device. Later (optional): a secure lookup could check the membership is Active and record attendance in Salesforce, which TTC 3.1 asks for. That needs a small backend (Option B)."]
    }
  ];

  let i = 0, root = null;
  function render(el, focus) {
    root = el;
    const s = STEPS[i];
    const statusNow = s.next ? s.status : s.status;
    el.innerHTML = `
      <section class="demo-banner" role="note"><div class="wrap">${icon("info")}<p><b>Demo with made-up example people.</b> There's nothing to type here, and nothing is saved or sent. This shows the planned process from <a href="#join">Join the TTC</a> and the <a href="https://github.com/VoSTTC/VOSteentechcentre/blob/main/docs/membership-setup.md" target="_blank" rel="noopener noreferrer">Salesforce setup guide</a>.</p></div></section>
      <section class="page-head wrap"><div><p class="eyebrow">Join the TTC · demo ${T.arrows("sm")}</p><h1>How membership would work</h1>
        <p class="lede">Step through what a parent or guardian, a youth and TTC staff would see, and what Salesforce does at each step.</p></div></section>
      <div class="wrap demo">
        <nav class="dm-track" aria-label="Membership status">
          ${["pending", "invited", "review", "active"].map(id => `<span class="dm-tstep ${ORDER.indexOf(statusNow) >= ORDER.indexOf(id) ? "reached" : ""} ${statusNow === id ? "now" : ""}">${chip(id)}${STAT[id].internal ? `<span class="dm-int">staff only</span>` : ""}</span>`).join(`<span class="dm-tsep" aria-hidden="true">${icon("right")}</span>`)}
        </nav>
        <div class="dm-layout">
          <ol class="dm-steps" aria-label="Steps">
            ${STEPS.map((x, k) => `<li><button type="button" data-step="${k}" ${k === i ? 'aria-current="step"' : ""} class="${k < i ? "done" : ""}"><span class="dm-n">${k + 1}</span><span><b>${esc(x.title)}</b><span class="dm-who">${esc(x.who)} · ${esc(x.where)}</span></span></button></li>`).join("")}
          </ol>
          <section class="dm-stage" aria-labelledby="dmh">
            <p class="dm-meta"><span class="dm-whochip">${icon(s.who === "TTC staff" ? "lock" : s.who === "Youth" ? "spark" : "users")}${esc(s.who)}</span><span>${esc(s.where)}</span><span>Step ${i + 1} of ${STEPS.length}</span></p>
            <h2 id="dmh" tabindex="-1">${esc(s.title)}</h2>
            <p class="dm-say">${esc(s.say)}</p>
            <div class="dm-screen" aria-label="Example screen">${s.screen}</div>
            <section class="dm-sfbox" aria-label="Behind the scenes in Salesforce"><h3>${icon("tool")}Behind the scenes in Salesforce</h3><ul>${s.sf.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
              ${s.next ? `<p class="dm-change">Status after this step: ${chip(s.next)}</p>` : `<p class="dm-change">Status: ${chip(s.status)}</p>`}</section>
            <div class="dm-nav">
              <button type="button" class="btn" id="dmPrev" ${i === 0 ? "disabled" : ""}>${icon("left")}<span>Back</span></button>
              ${i < STEPS.length - 1 ? `<button type="button" class="btn primary" id="dmNext"><span>Next: ${esc(STEPS[i + 1].title)}</span>${icon("right")}</button>`
                : `<button type="button" class="btn primary" id="dmRestart">${icon("repeat")}<span>Start the demo again</span></button>`}
            </div>
          </section>
        </div>
      </div>`;
    const go = k => { i = Math.max(0, Math.min(STEPS.length - 1, k)); render(root, true); };
    el.querySelectorAll("[data-step]").forEach(b => b.onclick = () => go(+b.dataset.step));
    const p = el.querySelector("#dmPrev"); if (p) p.onclick = () => go(i - 1);
    const n = el.querySelector("#dmNext"); if (n) n.onclick = () => go(i + 1);
    const r = el.querySelector("#dmRestart"); if (r) r.onclick = () => go(0);
    if (focus) { const h = el.querySelector("#dmh"); h.focus({ preventScroll: true }); h.scrollIntoView({ block: "nearest" }); }
  }

  T.views["join-demo"] = { title: "Join the TTC demo", render(el) { i = 0; render(el, false); } };
})();

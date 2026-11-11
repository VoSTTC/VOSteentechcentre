/* =========================================================================
   JOIN THE TTC
   Explains the proposed parent-or-guardian-first membership process and
   links to the approved form once it exists (config.js > join).

   This page collects nothing. There are no form fields here, nothing is
   saved in the browser, and no membership, guardian or youth information
   is ever shown on this site, the sign-in tablet or the centre screens.
   Consent and membership status live in the approved system (Salesforce).
   Wording marked "Draft for VoS review" is placeholder text.
   ========================================================================= */
(function () {
  const T = window.TTC, C = T.C, esc = T.esc, icon = T.icon;
  const J = () => C.join || {};
  const rv = (what) => J().showReviewNotes ? `<span class="rv-tag" title="Placeholder wording. Needs Visions of Science review before going live.">${icon("info")}Draft for VoS review${what ? `: ${esc(what)}` : ""}</span>` : "";

  const STATUSES = [
    { id: "pending", label: "Pending guardian consent", tx: "A parent or guardian has started, and Visions of Science is confirming their permission. The youth can't use the centre yet." },
    { id: "invited", label: "Youth registration invited", tx: "Permission is confirmed. The youth has a personal invitation link to finish their own registration." },
    { id: "active", label: "Active", tx: "Registration is complete and staff have activated the membership. The youth signs in at the front tablet each visit." }
  ];
  const statusChip = s => `<span class="mstat ms-${s.id}">${s.id === "active" ? icon("checkin") : s.id === "invited" ? icon("arrow") : icon("clock")}${esc(s.label)}</span>`;

  function cta() {
    const url = T.guardianFormUrl();
    if (url && J().embed === true) {
      return `<div class="join-embed"><iframe src="${esc(url)}" title="Parent or guardian membership form" loading="lazy"></iframe></div>
        <p class="muted small">Having trouble with the form? <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open it in a new tab</a>.</p>`;
    }
    if (url) {
      return `<a class="btn primary big" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon("users")}<span>Start as a parent or guardian</span></a>
        <p class="muted small">Opens Visions of Science's secure membership form in a new tab.</p>`;
    }
    return `<div class="join-pending" role="note">
        <span class="jp-ico">${icon("clock")}</span>
        <div><p class="jp-h">The online form is coming soon</p>
        <p>We're still setting up the secure parent and guardian form. Until it's ready, a parent or guardian can talk to TTC staff at Daniels Spectrum, Room 210, during open hours.</p>
        ${T.isStaff() ? `<p class="jp-staff">${T.staffPill()} Form connection pending. Add the approved form link in <b>js/config.js</b> under <b>join.guardianFormUrl</b> once the VoS Salesforce administrator confirms it.</p>` : ""}</div>
      </div>`;
  }

  /* ---------------- return pages ----------------
     The approved form tool sends people here after they submit. These pages
     show general next steps only: no names, no record details, nothing read
     from the link. Set these addresses as the form tool's "thank you" or
     redirect pages (Staff tools > Overview lists the full links). */
  const RETURN = {
    "join-thanks": {
      title: "Thanks for starting", eyebrow: "Step 1 of 4 done", status: STATUSES[0],
      h: "Next, check your email",
      steps: [
        "Visions of Science will email you a link to confirm your permission. Select it to continue.",
        "The membership stays pending until you confirm. If the email hasn't arrived within a day, check your spam folder or talk to TTC staff.",
        "Once you confirm, the youth gets their own invitation link to finish registering."
      ]
    },
    "join-confirmed": {
      title: "Permission confirmed", eyebrow: "Step 2 of 4 done", status: STATUSES[1],
      h: "Thank you. Your permission is confirmed",
      steps: [
        "The youth will get a personal invitation link to finish their own registration.",
        "They'll fill in their details, choose their photo and video preference, and agree to the community agreements.",
        "Then TTC staff check everything and activate the membership."
      ]
    },
    "join-complete": {
      title: "Registration sent", eyebrow: "Step 3 of 4 done", status: null,
      h: "You're almost a member",
      steps: [
        "TTC staff will check your registration and activate your membership.",
        "Once it's active, sign in at the front tablet when you arrive and sign out when you leave, every visit.",
        "New to the equipment? Ask staff for a walkthrough before you use the studios, 3D printers or laser cutter."
      ]
    }
  };
  Object.entries(RETURN).forEach(([id, r]) => {
    T.views[id] = {
      title: r.title,
      render(el) {
        el.innerHTML = `
          <section class="join-hero">
            <div class="wrap join-hero-in one">
              <div class="jh-copy">
                <p class="eyebrow">${esc(r.eyebrow)} ${T.arrows("sm")}</p>
                <h1>${esc(r.h)}</h1>
                ${r.status ? `<p class="jr-status">Membership status: ${statusChip(r.status)}</p>` : `<p class="jr-status">Next: staff activate your membership, then it's ${statusChip(STATUSES[2])}</p>`}
              </div>
            </div>
          </section>
          <div class="wrap join-body">
            <section class="panel" aria-labelledby="jr-h">
              <h2 id="jr-h">${icon("info")}What happens next</h2>
              <ol class="jr-steps">${r.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
              <p class="small muted">${rv("return page wording")}</p>
            </section>
            <p><a class="btn" href="#join">${icon("left")}<span>See the full joining process</span></a></p>
          </div>`;
      }
    };
  });

  T.views.join = {
    title: "Join the TTC",
    render(el) {
      const ages = J().ages || "";
      el.innerHTML = `
        <section class="join-hero">
          <div class="wrap join-hero-in">
            <div class="jh-copy">
              <p class="eyebrow">Membership ${T.arrows("sm")}</p>
              <h1>Join the TTC</h1>
              <p class="lede">The Best Buy Teen Tech Centre is a drop-in creative tech space${ages ? ` for youth aged ${esc(ages)}` : ""}. Joining takes two parts: a parent or guardian gives permission first, then the youth finishes their own registration.</p>
              ${ages ? `<p class="jh-note">${rv("age range and whether 18-year-olds give their own consent")}</p>` : ""}
            </div>
            <div class="jh-cta" aria-label="Start membership">
              ${cta()}
              <p class="jh-youth">${icon("info")}<span><b>Are you a youth?</b> Ask a parent or guardian to start. Once they've given permission, you'll get your own invitation link.</span></p>
            </div>
          </div>
        </section>

        <div class="wrap join-body">
          <section aria-labelledby="how-h">
            <h2 id="how-h" class="section-h">How joining works</h2>
            <ol class="jsteps">
              <li class="jstep">
                <span class="js-n" aria-hidden="true">1</span>
                <div class="js-body"><h3>A parent or guardian starts</h3>
                  <p>They share the details needed to identify the youth and how to reach them, and confirm they're allowed to give permission for the youth. They read the participation and privacy information below before they submit.</p>
                  <p class="js-status">Status after this step: ${statusChip(STATUSES[0])}</p></div>
              </li>
              <li class="jstep">
                <span class="js-n" aria-hidden="true">2</span>
                <div class="js-body"><h3>Visions of Science confirms permission</h3>
                  <p>The membership stays pending until permission is confirmed through Visions of Science's approved process. Ticking a box on a form isn't enough on its own. ${rv("how consent is verified")}</p>
                  <p class="js-status">Status: ${statusChip(STATUSES[0])}</p></div>
              </li>
              <li class="jstep">
                <span class="js-n" aria-hidden="true">3</span>
                <div class="js-body"><h3>The youth completes their registration</h3>
                  <p>Only after permission is confirmed, the youth gets a personal invitation link. They fill in their own membership details and read and agree to the youth agreement.</p>
                  <p class="js-status">Status: ${statusChip(STATUSES[1])}</p></div>
              </li>
              <li class="jstep">
                <span class="js-n" aria-hidden="true">4</span>
                <div class="js-body"><h3>Staff activate the membership</h3>
                  <p>TTC staff check that everything is complete and activate the membership. From then on, the youth signs in and out at the front tablet every visit.</p>
                  <p class="js-status">Status: ${statusChip(STATUSES[2])}</p></div>
              </li>
            </ol>
            <p class="demo-link"><a class="btn" href="#join-demo">${icon("tv")}<span>See the planned process step by step (demo)</span></a></p>
            <p class="join-callout">${icon("lock")}<span><b>Signing in at the centre doesn't make you a member.</b> The sign-in tablet only records visits. A membership can only become active through the parent or guardian steps above.</span></p>
          </section>

          <section aria-labelledby="st-h" class="panel">
            <h2 id="st-h">${icon("checkin")}What each status means</h2>
            <dl class="mstat-list">${STATUSES.map(s => `<div><dt>${statusChip(s)}</dt><dd>${esc(s.tx)}</dd></div>`).join("")}</dl>
            <p class="muted small">Statuses are kept in Visions of Science's secure membership system. This website and the centre screens never show anyone's name, details or status.</p>
          </section>

          <section aria-labelledby="pp-h">
            <h2 id="pp-h" class="section-h">Participation and privacy</h2>
            <p class="lede">Please read this before starting. ${rv()}</p>
            <div class="pp-grid">
              <section class="panel"><h3>${icon("door")}Taking part at the TTC</h3>
                <ul class="plain">
                  <li>The TTC is a drop-in space. Youth choose what to work on, with staff there to help.</li>
                  <li>Members sign in when they arrive and sign out when they leave. They may come and go on their own during open hours once signed in or out.</li>
                  <li>Some equipment, like 3D printers, laser cutters and the studios, is only used after a staff walkthrough and with staff supervision.</li>
                  <li>Members follow the TTC community agreements, and staff follow Visions of Science's youth safety and supervision policies.</li>
                </ul></section>
              <section class="panel"><h3>${icon("users")}What a parent or guardian is asked to agree to</h3>
                <ul class="plain">
                  <li>The youth becoming a TTC member.</li>
                  <li>The youth arriving and leaving on their own during open hours, as long as they sign in and out.</li>
                  <li>TTC staff contacting the youth about programs through the TTC's approved messaging channel.</li>
                  <li>Providing up-to-date emergency contact information.</li>
                </ul>
                <p class="small">${rv("consent wording, waiver and emergency details")}</p></section>
              <section class="panel"><h3>${icon("lock")}How information is kept</h3>
                <ul class="plain">
                  <li>The form asks for the least information needed: who the youth is, the parent or guardian's name and contact details, and their confirmation that they can give permission.</li>
                  <li>Information is kept in Visions of Science's secure membership system and seen only by staff who need it.</li>
                  <li>It is never shown on this website, the sign-in tablet or the centre screens.</li>
                  <li>[Placeholder: how long information is kept, and who to contact with privacy questions.]</li>
                </ul>
                <p class="small">${rv("privacy statement")}</p></section>
              <section class="panel"><h3>${icon("camera")}Photos and video: optional</h3>
                <ul class="plain">
                  <li>Permission for photos and video is asked for separately, and it's optional.</li>
                  <li>Saying no doesn't affect membership. The youth still takes part in everything.</li>
                  <li>[Placeholder: how to change this choice later.]</li>
                </ul>
                <p class="small">${rv("media consent wording")}</p></section>
            </div>
          </section>

          <section aria-labelledby="ya-h" class="panel youth-ack">
            <h2 id="ya-h">${icon("spark")}The youth agreement (step 3)</h2>
            <p>When the youth finishes registration, they read and agree to the TTC community agreements themselves. This is a separate step from the parent or guardian's permission. Members agree to:</p>
            <ul class="plain cols">
              <li>Treat everyone with respect.</li>
              <li>Use equipment safely and only after a staff walkthrough.</li>
              <li>Take care of shared spaces.</li>
              <li>Sign in and sign out every visit.</li>
              <li>Tell staff about any concern.</li>
            </ul>
            <p class="small">${rv("youth agreement text")}</p>
          </section>

          <p class="join-foot muted small">This page describes the TTC's proposed membership process. It isn't legal advice and doesn't describe what the law requires for every person under 18.</p>
        </div>`;
    }
  };
})();

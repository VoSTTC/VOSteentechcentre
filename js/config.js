/* =========================================================================
   TTC HUB CONFIG
   The one file staff edit to change names, zones, locations, event types
   and the prototype staff code. Every page reads from here.
   ========================================================================= */
window.TTC_CONFIG = {
  org: "Visions of Science",
  centre: "Best Buy Teen Tech Centre",
  venue: "Daniels Spectrum, Room 210 · Regent Park, Toronto",
  tagline: "We Are STEM",

  /* All schedule times are entered and shown in this time zone. */
  timeZone: "America/Toronto",
  timeZoneLabel: "Eastern Time (Toronto)",

  /* Week grid range (24h clock). */
  gridStartHour: 9,
  gridEndHour: 20,

  /* ---- PROTOTYPE STAFF GATE ----
     This is NOT security. The code is readable by anyone who opens this
     file. It only hides editing controls on a shared device. Replace with
     real staff accounts (for example Google Workspace sign-in on a backend)
     before using this app with real youth information. */
  staffCode: "2048",
  staffMinutes: 20,

  /* ---- NEW MEMBER SIGN-UP ----
     Paste the link to the Visions of Science sign-up Google Form here.
     Use the form's "Send > link" URL (starts with https://docs.google.com/forms/
     or https://forms.gle/). Responses go to the form's own response sheet in
     Google Workspace. This app never sees or stores them.
     Leave it empty to show "please see a staff member" instead. */
  signup: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScmjKtbPJtNzNA474Ez488sjlT4-VALhcKjQNvQ3oxS6WNsBw/viewform",
    formName: "Teen Tech Centre sign-up form"
  },

  /* ---- SPECIAL EQUIPMENT SIGN-IN SHEETS ----
     One sheet per station. Each asks the youth's first name and last initial,
     whether they have done onboarding for that equipment, plus the questions
     listed in `fields`. Field types: "choice" (pick one), "chips" (pick any),
     "text" (short answer). Add `required: true` to make an answer required.
     `units`: optional list of machine labels (e.g. ["Printer 1", "Printer 2"]).
     Leave it empty and youth type the number on the machine instead. */
  equipment: [
    { id: "recording", name: "Recording studio", icon: "mic", location: "studio", zone: "music", activity: "studio",
      reminder: "Keep headphone volume comfortable and the studio door visible to staff.",
      fields: [
        { key: "task", label: "What are you working on?", type: "choice", required: true,
          options: ["Making beats", "Recording vocals", "Podcast", "Mixing", "DJ practice", "Something else"] },
        { key: "people", label: "How many people in your session?", type: "choice", options: ["Just me", "2", "3", "4 or more"] }
      ] },
    { id: "photo", name: "Photo studio", icon: "camera", location: "photo", zone: "digital", activity: "photo",
      reminder: "Ask before you photograph or film anyone, and return all gear to staff when you finish.",
      fields: [
        { key: "task", label: "What are you shooting?", type: "choice", required: true,
          options: ["Portraits", "Product photos", "Video", "Something else"] },
        { key: "gear", label: "What gear are you using?", type: "chips", options: ["Camera", "Lights", "Backdrop", "Tripod", "Microphone"] }
      ] },
    { id: "printer", name: "3D printers", icon: "cube", location: "maker", zone: "maker", activity: "lul-3d",
      reminder: "Staff start and check every print until you have finished printer onboarding.",
      units: [],
      fields: [
        { key: "project", label: "What are you printing?", type: "text", required: true, placeholder: "e.g. phone stand" },
        { key: "time", label: "About how long will it print?", type: "choice", options: ["Under 1 hour", "1 to 3 hours", "Over 3 hours", "Not sure"] }
      ] },
    { id: "laser", name: "Laser cutter", icon: "laser", location: "maker", zone: "maker", activity: "lul-laser",
      reminder: "A staff member stays with the laser cutter for the whole job. Use approved materials only.",
      units: [],
      fields: [
        { key: "project", label: "What are you making?", type: "text", required: true, placeholder: "e.g. engraved keychain" },
        { key: "material", label: "Material", type: "choice", required: true,
          options: ["Wood", "Acrylic", "Cardboard", "Engraving card", "Not sure, ask staff"] }
      ] }
  ],

  /* Attendance records older than this are removed automatically. */
  attendanceRetentionDays: 30,

  /* Project showcase carousel (smart board) */
  showcase: { slideSeconds: 10 },

  /* TV display options */
  display: {
    slideSeconds: 12,
    /* News ticker along the bottom of the display. It fills itself from the
       schedule (hours, today's activities, this week's Level Up Lab) and
       announcements. Add your own lines here; keep each short. */
    ticker: {
      on: true,
      speed: 110, // pixels per second
      extra: [
        "Free for teens. No experience needed.",
        "Ask staff before using specialized equipment for the first time."
      ]
    },
    showHeadcount: false // shows a total count only, never names
  },

  /* Program zones. `pattern` is one of the approved STEM patterns. */
  zones: [
    { id: "digital",  name: "Digital Media",         short: "Digital",  colour: "var(--c-lightblue)", pattern: "nodes",
      blurb: "Video editing, digital illustration, graphic design, animation and photography." },
    { id: "maker",    name: "Maker & Engineering",   short: "Maker",    colour: "var(--c-orange)", pattern: "circuit",
      blurb: "3D printing, laser engraving, electronics and product design." },
    { id: "music",    name: "Music & Recording",     short: "Music",    colour: "var(--c-purple)", pattern: "nodes",
      blurb: "Beat-making, recording, podcasting, DJing, voiceovers and sound design." },
    { id: "xr",       name: "Coding, AI & XR",       short: "XR",       colour: "var(--c-mint)", pattern: "circuit",
      blurb: "VR and XR exploration, coding and creative AI tools." },
    { id: "collab",   name: "Collaboration",         short: "Collab",   colour: "var(--c-midblue)", pattern: "hexagons",
      blurb: "Flexible tables for group projects, mentorship and partner sessions." },
    { id: "lounge",   name: "Lounge & Exhibition",   short: "Lounge",   colour: "var(--c-yellow)", pattern: "hexagons",
      blurb: "Hang out, share work and see what other youth have made." }
  ],

  /* Rooms and areas used for overlap checks. "centre" means the whole space. */
  locations: [
    { id: "centre",  name: "Whole centre" },
    { id: "digital", name: "Digital Media zone" },
    { id: "maker",   name: "Maker zone" },
    { id: "studio",  name: "Music studio" },
    { id: "photo",   name: "Photo studio" },
    { id: "xr",      name: "VR / XR area" },
    { id: "collab",  name: "Collaboration tables" },
    { id: "lounge",  name: "Lounge & exhibition wall" },
    { id: "offsite", name: "Off-site" }
  ],

  /* Event types. Each has a text label, an icon and a pattern so the type
     never depends on colour alone. */
  types: {
    dropin:   { label: "Drop-in",             short: "Drop-in",  icon: "door" },
    workshop: { label: "Workshop",            short: "Workshop", icon: "spark" },
    partner:  { label: "Partner programming", short: "Partner",  icon: "handshake" },
    staff:    { label: "Staff only",          short: "Staff",    icon: "lock" },
    special:  { label: "Special event",       short: "Event",    icon: "star" }
  },

  statuses: {
    sample:    { label: "Sample",    hint: "Example content. Replace or confirm before sharing." },
    tentative: { label: "To confirm", hint: "Planned but not confirmed." },
    confirmed: { label: "Confirmed", hint: "Confirmed by staff." }
  }
};

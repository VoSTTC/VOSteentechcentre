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
  gridStartHour: 11,
  gridEndHour: 20,

  /* ---- PROTOTYPE STAFF GATE ----
     This is NOT security. The code is readable by anyone who opens this
     file. It only hides editing controls on a shared device. Replace with
     real staff accounts (for example Google Workspace sign-in on a backend)
     before using this app with real youth information. */
  staffCode: "2468",
  staffMinutes: 20,

  /* Attendance records older than this are removed automatically. */
  attendanceRetentionDays: 30,

  /* TV display options */
  display: {
    slideSeconds: 12,
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

/* =========================================================================
   STARTING CONTENT
   Loaded the first time the app opens on a device, and again whenever
   DATA_VERSION goes up (attendance on the device is kept).

   Sources:
   - Drop-in and Level Up Lab hours: TTC Weekly Schedule (confirmed hours).
     Start date Tuesday, January 5, 2027.
   - Bookings, partner visits and meetings in the centre: the TTC booking
     calendar and the coordinator's Google Calendar (as of Nov 3, 2026).
     Partner visits are listed by organization only, never by contact name.

   Program descriptions in `activities` are working drafts for staff to edit.
   ========================================================================= */
window.TTC_DATA_VERSION = 2;

window.TTC_SAMPLE = function () {
  const OPEN = "2027-01-05"; // first day of drop-in (Tuesday)
  const HOURS_NOTE = "Hours from the TTC Weekly Schedule. Hours may change on holidays and school breaks.";

  const activities = [
    { id: "open-studio", zone: "collab", name: "Open Studio", location: "centre",
      description: "Drop in, explore the tools and work on whatever you are into. Staff can help you get started on any station.",
      capacity: "", signup: "Drop-in. Sign in when you arrive.",
      equipment: "Stations available depend on what staff have open that day.",
      supervision: "Specialized equipment needs onboarding with staff first.",
      spark: [] },
    { id: "lul-3d", zone: "maker", name: "Level Up Lab: 3D Printing", location: "maker",
      description: "A one-hour intro to 3D printing. Design a small object, slice it and watch it print. No experience needed.",
      capacity: "", signup: "Ask staff when you arrive. Drop-in stays open during Level Up Lab.",
      equipment: "3D printers and slicing software on centre laptops. Check the equipment inventory for installed models.",
      supervision: "Staff start and monitor all prints until youth complete printer onboarding.",
      spark: ["3D Print 2D Sketches", "Design Your Own Game Pieces", "Make A Coaster"] },
    { id: "lul-laser", zone: "maker", name: "Level Up Lab: Laser Engraving", location: "maker",
      description: "Learn how a laser engraver turns a drawing into a cut or engraved piece, then make a small item to take home.",
      capacity: "", signup: "Ask staff when you arrive. Drop-in stays open during Level Up Lab.",
      equipment: "Laser engraver, design software and approved materials only.",
      supervision: "A staff member stays with the engraver for the whole job. Safety briefing before every first use.",
      spark: ["Make A Coaster", "Make Your Own Puzzle", "Cell Phone Charging Holder"] },
    { id: "lul-video", zone: "digital", name: "Level Up Lab: Video Editing", location: "digital",
      description: "Cut, trim and add sound to a short clip. Leave with a video you can keep building on.",
      capacity: "", signup: "Ask staff when you arrive. Drop-in stays open during Level Up Lab.",
      equipment: "Editing workstations and headphones. Software depends on current licences.",
      supervision: "Media consent applies before filming other people.",
      spark: ["Recut Movie Trailers", "Stop-Motion Movie", "Create A Video Tutorial"] },
    { id: "lul-illustration", zone: "digital", name: "Level Up Lab: Digital Illustration", location: "digital",
      description: "Try digital drawing tools, layers and brushes. Sketch a character, poster or design of your own.",
      capacity: "", signup: "Ask staff when you arrive. Drop-in stays open during Level Up Lab.",
      equipment: "Drawing tablets or touch devices and illustration software (check current licences).",
      supervision: "Standard drop-in supervision.",
      spark: ["Design Your Own Superhero", "Trading Cards", "Movie Poster Mania"] },
    { id: "studio", zone: "music", name: "Music Studio", location: "studio",
      description: "Make beats, record vocals or start a podcast during drop-in. Staff manage studio time so everyone gets a turn.",
      capacity: "", signup: "Ask staff for studio time during drop-in.",
      equipment: "Recording and production gear in the music studio. See the equipment inventory.",
      supervision: "Studio door stays visible to staff. Headphone volume checks for new users.",
      spark: ["Recreate Video Game Music", "Junkstruments", "Make A Music Video"] },
    { id: "vr", zone: "xr", name: "VR Exploration", location: "xr",
      description: "Try virtual and mixed reality experiences during drop-in, then talk about what you would build.",
      capacity: "", signup: "Ask staff for a headset turn.",
      equipment: "VR headsets and a cleared play area.",
      supervision: "Staff help with headset fit and play-area safety. Wipe headsets between users.",
      spark: ["Easy 3D Modeling To VR", "Custom Virtual Reality Glasses"] },
    { id: "showcase", zone: "lounge", name: "Showcase Wall", location: "lounge",
      description: "Share something you made. Staff help you print, mount or display it.",
      capacity: "", signup: "Talk to staff to add your work.",
      equipment: "Display wall and screen.",
      supervision: "Only show names or faces with youth and media consent.",
      spark: ["Curate Yourself", "Show Off Your Dream Place"] }
  ];

  const ev = (o) => Object.assign({ activity: "", zone: "", repeat: null, exceptions: [], capacity: "", status: "confirmed", notes: "" }, o);
  const visit = (id, date, start, end, org) => ev({
    id, title: "Partner visit: " + org, type: "partner", location: "centre", date, start, end,
    staff: org, notes: "Tour of the centre and a conversation about opening the space to youth this organization serves. Booked through the partner meeting calendar."
  });

  // Level Up Lab rotation, in the order listed on the weekly schedule
  const lul = ["lul-3d", "lul-laser", "lul-video", "lul-illustration"];
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

  const events = [
    /* ---- weekly hours (TTC Weekly Schedule) ---- */
    ev({ id: "ev-dropin-weekday", title: "Drop-In", type: "dropin", activity: "open-studio", zone: "collab", location: "centre",
      date: OPEN, start: "14:00", end: "19:00", repeat: { days: [2, 3, 4, 5], every: 1, until: "" },
      staff: "TTC staff on duty", notes: HOURS_NOTE }),
    ev({ id: "ev-dropin-sat", title: "Drop-In", type: "dropin", activity: "open-studio", zone: "collab", location: "centre",
      date: addDays(OPEN, 4), start: "15:00", end: "19:00", repeat: { days: [6], every: 1, until: "" },
      staff: "TTC staff on duty", notes: HOURS_NOTE }),
    ...lul.map((id, i) => {
      const a = activities.find(x => x.id === id);
      return ev({ id: "ev-" + id, title: a.name, type: "workshop", activity: id, zone: a.zone, location: a.location,
        date: addDays(OPEN, i * 7), start: "16:00", end: "17:00", repeat: { days: [2, 6], every: 4, until: "" },
        staff: "TTC Coordinator", status: "tentative",
        notes: "Level Up Lab runs Tuesday and Saturday, 4 to 5 PM (confirmed). The order of topics week to week is still to confirm." });
    }),

    /* ---- TTC booking calendar ---- */
    ev({ id: "ev-bk-packing", title: "VoS staff use: packing", type: "staff", location: "centre",
      date: "2026-11-04", start: "09:00", end: "13:00", staff: "Visions of Science staff",
      notes: "TTC booking. No youth." }),
    ev({ id: "ev-bk-journey", title: "STEM Journey Lunch & Learn", type: "special", location: "centre",
      date: "2026-11-07", start: "11:00", end: "14:00", staff: "Visions of Science (Journey program)", capacity: "50",
      status: "tentative",
      notes: "TTC booking 11 AM to 2 PM for about 50 youth. The event invite runs to 3 PM and says it is tentatively held in the TTC." }),

    /* ---- meetings in the centre (coordinator's calendar) ---- */
    ev({ id: "ev-board-setup", title: "Board retreat: room setup and materials", type: "staff", location: "centre",
      date: "2026-11-12", start: "15:30", end: "16:30", staff: "Visions of Science staff" }),
    ev({ id: "ev-board-tour", title: "Board retreat: TTC tour", type: "special", location: "centre",
      date: "2026-11-13", start: "09:15", end: "10:00", staff: "Visions of Science board" }),

    /* ---- community partner visits ---- */
    visit("ev-pv-layup", "2026-11-16", "14:30", "15:30", "Lay-Up Basketball"),
    visit("ev-pv-th3rdspace", "2026-11-16", "15:30", "16:30", "TH3RDSPACE"),
    visit("ev-pv-kickback", "2026-11-18", "13:30", "14:30", "Kickback Foundation"),
    visit("ev-pv-launchpad", "2026-11-25", "10:00", "11:00", "MLSE LaunchPad"),
    visit("ev-pv-shootforpeace", "2026-11-25", "16:30", "17:30", "Shoot for Peace")
  ];

  const announcements = [
    { id: "an-opening", kind: "announcement", title: "Drop-in opens Tuesday, January 5",
      body: "Free drop-in for teens: Tuesday to Friday 2 to 7 PM, Saturday 3 to 7 PM. Closed Sunday and Monday.",
      start: "2026-11-03", end: "2027-01-05", onDisplay: true, pinned: true, consent: true, status: "confirmed" },
    { id: "an-lul", kind: "reminder", title: "Level Up Lab: Tuesdays and Saturdays, 4 to 5 PM",
      body: "A new skill to try each week: 3D printing, laser engraving, video editing and digital illustration. No experience needed, and drop-in stays open.",
      start: "2026-11-03", end: "", onDisplay: true, pinned: false, consent: true, status: "confirmed" },
    { id: "an-welcome", kind: "announcement", title: "Welcome to the Teen Tech Centre",
      body: "Sign in when you arrive, then pick a station. Staff can help you get started with any tool.",
      start: OPEN, end: "", onDisplay: true, pinned: false, consent: true, status: "confirmed" }
  ];

  return { activities, events, announcements, attendance: [] };
};

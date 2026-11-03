/* =========================================================================
   SAMPLE CONTENT
   Everything in this file is example content so the app opens in a working
   state. None of it is a confirmed date, partner commitment, staffing
   assignment or final operating hour. Staff replace or confirm it in the
   app (Staff tools > Data > Clear sample content) before sharing.
   Dates are placed relative to the week the app is first opened.
   ========================================================================= */
window.TTC_SAMPLE = function (weekStart, addDays, today) {
  // weekStart = Sunday of the current week (YYYY-MM-DD, Toronto)
  const d = n => addDays(weekStart, n); // 0 Sun ... 6 Sat
  const HOURS_NOTE = "Hours taken from October 2026 planning notes (Tue to Fri 2 to 7 PM, Sat 3 to 7 PM). Confirm against the latest schedule before sharing.";

  const activities = [
    { id: "open-studio", zone: "collab", name: "Open Studio", location: "centre",
      description: "Drop in, explore the tools and work on whatever you are into. Staff can help you get started on any station.",
      capacity: "", signup: "Drop-in. Sign in at the front tablet when you arrive.",
      equipment: "Stations available depend on what staff have open that day.",
      supervision: "Specialized equipment needs onboarding with staff first.",
      spark: [] },
    { id: "lul-3d", zone: "maker", name: "Level Up Lab: 3D Printing", location: "maker",
      description: "A one-hour intro to 3D printing. Design a small object, slice it and watch it print. No experience needed.",
      capacity: "8", signup: "Sign up with staff when you arrive. Extra spots open to drop-ins.",
      equipment: "3D printers and slicing software on centre laptops. Check the equipment inventory for installed models.",
      supervision: "Staff start and monitor all prints until youth complete printer onboarding.",
      spark: ["3D Print 2D Sketches", "Design Your Own Game Pieces", "Make A Coaster"] },
    { id: "lul-laser", zone: "maker", name: "Level Up Lab: Laser Engraving", location: "maker",
      description: "Learn how a laser engraver turns a drawing into a cut or engraved piece, then make a small item to take home.",
      capacity: "6", signup: "Sign up with staff when you arrive.",
      equipment: "Laser engraver, design software and approved materials only.",
      supervision: "A staff member stays with the engraver for the whole job. Safety briefing before every first use.",
      spark: ["Make A Coaster", "Make Your Own Puzzle", "Cell Phone Charging Holder"] },
    { id: "lul-video", zone: "digital", name: "Level Up Lab: Video Editing", location: "digital",
      description: "Cut, trim and add sound to a short clip. Leave with a video you can keep building on.",
      capacity: "8", signup: "Sign up with staff when you arrive.",
      equipment: "Editing workstations and headphones. Software depends on current licences.",
      supervision: "Media consent applies before filming other people.",
      spark: ["Recut Movie Trailers", "Stop-Motion Movie", "Create A Video Tutorial"] },
    { id: "lul-illustration", zone: "digital", name: "Level Up Lab: Digital Illustration", location: "digital",
      description: "Try digital drawing tools, layers and brushes. Sketch a character, poster or design of your own.",
      capacity: "8", signup: "Sign up with staff when you arrive.",
      equipment: "Drawing tablets or touch devices and illustration software (check current licences).",
      supervision: "Standard drop-in supervision.",
      spark: ["Design Your Own Superhero", "Trading Cards", "Movie Poster Mania"] },
    { id: "studio", zone: "music", name: "Studio Sessions", location: "studio",
      description: "Make beats, record vocals or start a podcast. Staff manage time in the studio so everyone gets a turn.",
      capacity: "4", signup: "Book a time slot with staff on arrival.",
      equipment: "Recording and production gear in the music studio. See the equipment inventory.",
      supervision: "Studio door stays visible to staff. Headphone volume checks for new users.",
      spark: ["Recreate Video Game Music", "Junkstruments", "Make A Music Video"] },
    { id: "vr", zone: "xr", name: "VR Exploration", location: "xr",
      description: "Try virtual and mixed reality experiences, then talk about what you would build.",
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

  const lul = [
    { a: "lul-3d", loc: "maker" }, { a: "lul-video", loc: "digital" },
    { a: "lul-laser", loc: "maker" }, { a: "lul-illustration", loc: "digital" }
  ];

  const events = [
    { id: "ev-open-weekday", title: "Open Studio", type: "dropin", activity: "open-studio", zone: "collab", location: "centre",
      date: d(2), start: "14:00", end: "19:00", repeat: { days: [2, 3, 4, 5], every: 1, until: "" }, exceptions: [],
      staff: "TTC staff on duty", capacity: "", status: "tentative", notes: HOURS_NOTE },
    { id: "ev-open-sat", title: "Open Studio", type: "dropin", activity: "open-studio", zone: "collab", location: "centre",
      date: d(6), start: "15:00", end: "19:00", repeat: { days: [6], every: 1, until: "" }, exceptions: [],
      staff: "TTC staff on duty", capacity: "", status: "tentative", notes: HOURS_NOTE },
    ...lul.map((x, i) => {
      const act = activities.find(a => a.id === x.a);
      return { id: "ev-" + x.a, title: act.name, type: "workshop", activity: x.a, zone: act.zone, location: x.loc,
        date: d(i * 7 + 2), start: "16:00", end: "17:00", repeat: { days: [2, 6], every: 4, until: "" }, exceptions: [],
        staff: "TTC Coordinator", capacity: act.capacity, status: "sample",
        notes: "Sample rotation: same topic Tuesday and Saturday, a new topic each week." };
    }),
    { id: "ev-studio", title: "Studio Sessions", type: "dropin", activity: "studio", zone: "music", location: "studio",
      date: d(3), start: "16:00", end: "18:00", repeat: { days: [3, 5], every: 1, until: "" }, exceptions: [],
      staff: "TTC staff on duty", capacity: "4", status: "sample", notes: "" },
    { id: "ev-vr", title: "VR Exploration", type: "dropin", activity: "vr", zone: "xr", location: "xr",
      date: d(4), start: "15:00", end: "17:00", repeat: { days: [4], every: 1, until: "" }, exceptions: [],
      staff: "TTC staff on duty", capacity: "", status: "sample", notes: "" },
    { id: "ev-prep", title: "Staff setup and equipment checks", type: "staff", activity: "", zone: "", location: "centre",
      date: d(2), start: "12:00", end: "13:30", repeat: { days: [2], every: 1, until: "" }, exceptions: [],
      staff: "TTC Coordinator", capacity: "", status: "sample", notes: "Centre closed to youth. Check printers, charge devices, restock consumables." },
    { id: "ev-partner", title: "Partner workshop (partner to be confirmed)", type: "partner", activity: "", zone: "collab", location: "collab",
      date: d(4), start: "17:00", end: "18:30", repeat: { days: [4], every: 2, until: "" }, exceptions: [],
      staff: "Partner to be confirmed", capacity: "12", status: "sample",
      notes: "Placeholder slot only. No partner has confirmed this time." },
    { id: "ev-group", title: "Group visit (sample booking)", type: "partner", activity: "", zone: "maker", location: "maker",
      date: d(6), start: "16:30", end: "18:00", repeat: null, exceptions: [],
      staff: "Visiting group (sample)", capacity: "10", status: "sample",
      notes: "Sample booking that overlaps Level Up Lab in the Maker zone, to show how conflicts are flagged." },
    { id: "ev-showcase", title: "Youth Showcase Night", type: "special", activity: "showcase", zone: "lounge", location: "lounge",
      date: d(13), start: "17:30", end: "19:00", repeat: null, exceptions: [],
      staff: "TTC staff", capacity: "", status: "sample", notes: "Sample special event. Not a scheduled date." }
  ];

  const announcements = [
    { id: "an-welcome", kind: "announcement", title: "Welcome to the Teen Tech Centre",
      body: "Sign in at the front tablet, then pick a station. Staff can help you get started with any tool.",
      start: d(0), end: "", onDisplay: true, pinned: true, consent: true, status: "sample" },
    { id: "an-lul", kind: "reminder", title: "Level Up Lab: Tuesdays and Saturdays, 4 to 5 PM",
      body: "A different intro workshop each week. No experience needed. Ask staff to save your spot.",
      start: d(0), end: d(27), onDisplay: true, pinned: false, consent: true, status: "sample" },
    { id: "an-shout", kind: "shoutout", title: "Shout-out to the Maker crew",
      body: "Thanks to everyone who helped test the printers and sort the filament this week.",
      start: d(0), end: d(6), onDisplay: true, pinned: false, consent: true, status: "sample" },
    { id: "an-headphones", kind: "reminder", title: "Borrowing gear",
      body: "Headphones, cameras and drawing tablets are signed out through staff. Return them before you leave.",
      start: d(0), end: "", onDisplay: true, pinned: false, consent: true, status: "sample" }
  ];

  const attendance = [
    { id: "at-s1", date: today, name: "Sample A.", activity: "open-studio", timeIn: "14:12", timeOut: "", sample: true },
    { id: "at-s2", date: today, name: "Sample B.", activity: "studio", timeIn: "14:40", timeOut: "15:55", sample: true }
  ];

  return { activities, events, announcements, attendance };
};

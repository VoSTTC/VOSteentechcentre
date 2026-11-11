# Teen Tech Centre Hub (prototype)

Running schedule and operations hub for the Visions of Science Best Buy Teen Tech Centre.
Plain HTML, CSS and JavaScript. No build step, no server code.

## Run it

- **On one computer:** unzip and open `index.html` in Chrome, Edge or Safari. Or, from this folder, run `python3 -m http.server` and visit `http://localhost:8000`.
- **Hosted (like the reference site):** upload the folder to GitHub Pages, Netlify or any static host. Downloads and printing work there.
- **TV:** open the hosted link on the TV browser, go to Display, and select Full screen.

## Pages

| Link | What it does |
|---|---|
| `#home` | Landing page with today at a glance and function cards |
| `#schedule` | Week grid, list and today views; filters; details; add, edit, remove (staff) |
| `#programs`, `#activity-<id>` | Program areas, activity pages with schedule, capacity, equipment and supervision notes |
| `#join` | Join the TTC: the parent or guardian first membership process, statuses, and participation and privacy information. Collects nothing. |
| `#signin` | Member sign-in and sign-out (first name and last initial). The New? Join tab sends families to Join the TTC. |
| `#equipment` | Sign-in sheets for the recording studio, photo studio, 3D printers and laser cutter |
| `#announcements` | Announcements, reminders and shout-outs |
| `#showcase` | Smart board carousel of youth projects. Staff add each project (photo, title, first name, caption) and confirm consent. |
| `#display` | Large-text TV display: now, up next, rotating announcements and a news ticker. No names. |
| `#staff` | Staff tools: overview, schedule, programs, announcements, attendance, data and backup |

## Where to change things

- `js/config.js`: centre name, time zone, grid hours, zones, locations, event types, staff code, attendance retention,
  display timing and ticker lines, Join the TTC settings (`join`), and the equipment sheets (`equipment`).
- `js/sample-data.js`: the starting schedule (weekly hours, Level Up Lab, bookings, partner visits) and announcements.
  After editing it, raise `TTC_DATA_VERSION` by 1 so every device picks up the new schedule on its next load
  (sign-ins on each device are kept; edits made in the app on that device are replaced).
- `css/app.css`: brand colours and layout. Colours follow the Visions Brand Guidelines & Asset Kit.
- `assets/`: Visions logo and STEM patterns, extracted unchanged from the brand guide.

## Data and limits

- Data is saved in the browser's local storage on each device. It survives refresh and restart.
- Devices do **not** share data. Use Staff tools > Data & backup to export a backup and import it on another device.
- Clearing browser data, private windows or another browser start fresh.
- Nothing is sent to Google Calendar, Salesforce or any other service. The `.ics` and `.csv` exports are files you import yourself.
- Attendance is removed after 30 days (configurable) and never appears on public pages or the TV display.
- Showcase photos are stored in the browser's IndexedDB on the device that runs the smart board.
  They are not part of the Data & backup file, so add projects on that device.

## Before real use

1. **Replace the staff gate.** The staff code in `config.js` is visible to anyone and is not security.
   Real use needs staff accounts on a backend (for example Google Workspace sign-in).
2. **Shared data needs a backend.** A shared database (for example Firebase, Supabase or a Google Sheets-backed service)
   is required for the tablet, staff laptops and TV to see the same schedule live.
3. **Youth data approval.** Get organizational approval before storing youth names on any device or service.
4. **Review program descriptions.** Activity descriptions and equipment notes are drafts. Edit them in Staff tools > Programs.

## Membership (Join the TTC)

- Membership is parent or guardian first: **Pending guardian consent**, then **Youth registration invited**, then **Active**.
- This site does not collect, store or show membership, guardian or youth information. Consent and status belong
  in the approved system (Salesforce).
- The parent or guardian form is **not connected yet**. When the VoS Salesforce administrator approves a form,
  paste its public link in `js/config.js` under `join.guardianFormUrl`. Set `join.embed` to true only if the
  provider supports embedding and it works on phones.
- Never put passwords, API tokens or client secrets in this repository. Everything in it is public.
- Wording tagged "Draft for VoS review" is placeholder text. Set `join.showReviewNotes` to false once approved.

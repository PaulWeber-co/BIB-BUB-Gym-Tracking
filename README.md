# Gym Tracker

A gym workout tracking web app – track exercises, create routines, and monitor your progress.
Works 100 % offline, no account needed, no server – all data stays in your browser.

**[Live Demo →](https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/)**

---

## 📖 What is this app?

This is a **Progressive Web App (PWA)** that works like the Strong app on iOS.
You can install it on your iPhone home screen and use it like a native app –
it runs without internet and keeps your data safe in the browser.

### What can it do?

| Feature | Description |
|---|---|
| 🏋️ **Workout Tracking** | Start a workout, add exercises, log weight + reps for every set |
| 📝 **Routines** | Save workout templates (e.g. "Push Day") and restart them with one tap |
| 🔄 **Unilateral Support** | Track left / right side separately for exercises like Dumbbell Curls |
| 📊 **Progress Charts** | See your estimated 1RM, volume and strength trend over time |
| ⏱️ **Rest Timer** | Automatic timer after each set with adjustable duration |
| 📅 **History & Calendar** | Calendar view and list of all past workouts |
| 🏅 **Personal Records** | Automatic PR detection with notification |
| 📦 **Backup & Restore** | Export / import all data as a JSON file |
| 🥩 **Protein Tracking** | Daily target from your body weight, quick logging, 14-day chart |
| 🔗 **Supersets** | Link exercises; the rest timer waits until the round is done |
| 🌓 **Light & Dark** | Follows iOS, or pick one — dark keeps bars dark for badly lit gyms |
| ⚙️ **Settings** | kg / lb toggle, weekly goals, bar weight for plate calculator |

---

## 🗂️ Project Structure – What does each file do?

```
BIB-BUB-Gym-Tracking/
│
├── index.html              ← The only HTML page (Single Page App)
├── manifest.webmanifest    ← Tells the browser this is an installable app
├── sw.js                   ← Service Worker: makes the app work offline
│
├── css/
│   └── style.css           ← All styling: colors, layout, animations
│
├── icons/                  ← App icons for the home screen
│
└── js/                     ← All the logic, split into modules
    ├── theme.js            ← 🎨 Light / dark / system, set before the first paint
    ├── store.js            ← 💾 Data layer: saves/loads everything from localStorage
    ├── stats.js            ← 📊 Calculations: volume, 1RM, records, streaks
    ├── charts.js           ← 📈 Drawing: SVG bar charts, line charts, calendar
    ├── muscles.js          ← 🧍 Body diagrams showing the trained muscle group
    ├── ui.js               ← 🖼️ UI helpers: modals, alerts, toasts, haptics
    ├── nutrition.js        ← 🥩 Protein target and daily logging
    ├── picker.js           ← 🔍 Exercise selection modal with search
    ├── workout.js          ← 🏋️ The live workout screen (sets, timer, PR detection)
    ├── routines.js         ← 📝 Routine templates (create, edit, start)
    ├── history.js          ← 📅 Past workouts: calendar and detail views
    ├── trends.js           ← 📈 Long-term trends: load, per-exercise, body weight
    ├── exercises.js        ← 📋 Exercise library: browse, create, detail
    ├── settings.js         ← ⚙️ Settings panel: goals, units, backup
    ├── summary.js          ← 🏠 Home screen: goal bands, quick start, records
    └── app.js              ← 🚀 Main entry: navigation, init, wiring
```

---

## 🧩 How does the app work? (For absolute beginners)

### The Big Picture

The app is a **Single Page Application (SPA)**. That means there is only ONE
HTML file (`index.html`). Instead of loading new pages, JavaScript shows and
hides different sections ("views"). Think of it like a book where you flip
between chapters – but all chapters are already in front of you and only one
is visible at a time.

### Step by step: What happens when you open the app

```
1. Browser loads index.html
   └── index.html loads style.css (makes it look pretty)
   └── index.html loads all .js files (makes it work)

2. app.js runs automatically when the page is ready
   └── It calls init(), which:
       ├── Connects all buttons to their functions ("binding")
       ├── Shows the Summary tab (home screen)
       ├── Restores any workout that was running before (in case you closed the browser)
       └── Registers the Service Worker (for offline use)

3. User taps a tab (e.g. "Workout")
   └── app.js hides the old view, shows the new one
   └── The new view's render() function runs
       └── It reads data from Store
       └── It builds HTML strings
       └── It puts them into the page (innerHTML)
```

### How data is stored

All data lives in **localStorage** – a tiny database built into every browser.
It's like a dictionary: you give it a name (key) and some text (value).

```
Key                    → Value (JSON text)
─────────────────────────────────────────
gym_workouts           → [{id: "...", date: "...", exercises: [...]}]
gym_templates          → [{id: "...", name: "Push Day", exercises: [...]}]
gym_custom_exercises   → [{id: "...", name: "Cable Lateral Raise", ...}]
gym_settings           → {unit: "kg", goalVolume: 20000, ...}
gym_active_workout     → {id: "...", startedAt: 123456, exercises: [...]}
gym_bodyweight         → [{date: "2026-01-15", weight: 80}]
```

> ⚠️ localStorage is specific to this browser on this device. If you clear
> browser data or switch browsers, the data is gone – that's why the
> backup/restore feature exists.

### How a workout is tracked

```
1. User taps "Start Workout"
   └── workout.js creates a new workout object in memory
   └── Saves it to localStorage immediately (so a crash doesn't lose data)

2. User adds exercises via the Picker
   └── picker.js shows a searchable list of all exercises
   └── Selected exercises get added to the workout

3. For each set, the user fills in weight + reps
   └── Every keystroke saves to localStorage
   └── If the exercise is "unilateral", there are two reps fields (L + R)

4. User taps the checkmark → set is completed
   └── stats.js calculates estimated 1RM
   └── If it's a new personal record → toast notification + haptic feedback
   └── If auto-rest is on → rest timer starts

5. User taps "Finish"
   └── Only completed sets are saved to the permanent workout log
   └── Active workout is cleared from localStorage
   └── Summary screen shows updated rings and records
```

### How the modules talk to each other

```
┌──────────┐    reads/writes    ┌──────────┐
│  store   │◄──────────────────►│ browser  │
│  .js     │                    │ localStorage
└────▲─────┘                    └──────────┘
     │ data access
     │
┌────┴─────────────────────────────────────┐
│              stats.js                     │
│  (calculates from raw data)              │
└────▲─────────────────────────────────────┘
     │ derived values
     │
┌────┴─────────────────────────────────────┐
│           View Modules                    │
│  summary / workout / routines / history  │
│  trends / exercises / settings           │
│  (each builds its own HTML)              │
└────▲─────────────────────────────────────┘
     │ display
     │
┌────┴─────────────────────────────────────┐
│           ui.js / charts.js              │
│  (sheets, toasts, SVG charts)            │
└──────────────────────────────────────────┘
     │
┌────┴─────────────────────────────────────┐
│             app.js                        │
│  (navigation, init, ties it all together)│
└──────────────────────────────────────────┘
```

---

## 📄 What does each JavaScript file do? (Detailed)

### `store.js` – The Data Layer 💾
This is the app's "brain". It holds:
- **68 built-in exercises** with muscle group, category, and unilateral flag
- Functions to **read/write** workouts, routines, custom exercises and settings
- **Unit conversion** (kg ↔ lb) – weights are always stored in kg internally
- **Backup/restore** – export everything as JSON, import it back

### `stats.js` – The Calculator 📊
Takes raw data from the Store and derives useful numbers:
- **Volume** = weight × reps (per set, workout, week, or all time)
- **Estimated 1RM** = Epley formula: `weight × (1 + reps / 30)`
- **Rings** = how much of your weekly goal you've completed
- **Streaks** = how many consecutive weeks you met your goal
- **Per-exercise progression** = 1RM / weight / volume over time

### `charts.js` – The Drawing Module 📈
Creates all visualizations as **SVG** (a format for graphics that scales perfectly):
- **Activity Rings** – like the Apple Watch rings
- **Bar Charts** – weekly volume, daily volume
- **Line Charts** – exercise progression with smooth curves
- **Calendar** – one ring per training day in a month grid

### `ui.js` – The Interface Toolkit 🖼️
Reusable UI components that the other modules use:
- **Sheets** – slide-up panels (like iOS)
- **Action Sheets** – lists of options to pick from
- **Alerts / Confirms** – "Are you sure?" dialogs
- **Toasts** – temporary messages that fade away
- **Haptics** – vibration feedback on button presses
- **Beep** – sound effect when the rest timer ends

### `picker.js` – Exercise Picker 🔍
The full-screen modal to search and select exercises:
- Search by name, filter by muscle group
- "Recent" section shows exercises you've used lately
- Multi-select mode for adding several at once
- "Create New Exercise" button at the bottom

### `workout.js` – Live Workout Screen 🏋️
The core feature – the screen where you actually log sets:
- Running clock, volume counter
- Add/remove exercises and sets
- Unilateral mode (L/R columns)
- Set types: Normal, Warm-up, Drop set, To Failure
- Real-time PR detection
- "Previous" column showing what you did last time
- Plate calculator for barbell exercises
- Auto-save every change

### `routines.js` – Templates 📝
Create reusable workout templates:
- Set target weights and reps
- Unilateral toggle per exercise
- Start with one tap – previous values are filled in
- Save a finished workout as a new routine

### `history.js` – Past Workouts 📅
Two ways to view your history:
- **Calendar mode** – month view with rings showing training days
- **List mode** – searchable, grouped by month
- **Workout Detail** – every set with weight, reps, and estimated 1RM

### `trends.js` – Long-term Progress 📈
Three sub-tabs:
- **Overview** – 12-week training load chart, sessions per week, muscle split
- **Exercise** – pick any exercise and see its 1RM/weight/volume/reps over time
- **Body** – log your body weight and see the trend

### `exercises.js` – Exercise Library 📋
Browse, search and manage exercises:
- Alphabetical list with muscle group filter
- Create custom exercises with all the same properties as built-in ones
- Exercise Detail shows records, 1RM chart, and session history

### `settings.js` – Settings Panel ⚙️
All configuration:
- Weekly goals (volume, workouts, sets) – drive the summary rings
- Unit switch (kg / lb)
- Rest timer defaults
- Bar weight for plate calculator
- Export / import backup
- Apple Health integration via Shortcuts
- Delete all data

### `summary.js` – Home Screen 🏠
The first thing you see:
- Weekly goal rings (volume, workouts, sets)
- This Week strip with mini rings per day
- Start Workout / resume button
- Quick-start chips for your routines
- Statistics tiles (streak, last workout, vs last week)
- 14-day volume chart
- Recent personal records
- Last 3 workouts

### `app.js` – Main Controller 🚀
Ties everything together:
- Tab navigation (show/hide views, remember scroll position)
- Init function that binds all modules
- Service Worker registration (offline support)
- Back gesture handling (close modals instead of leaving the app)
- Backup reminders

---

## 🛠️ Run it locally

```bash
# No build step needed! Just serve the files:
npx -y http-server . -p 8080 -o

# Then open http://localhost:8080 in your browser
```

## 📦 Releasing – IMPORTANT

Asset URLs carry `?v=<version>` and the service worker fetches **network first**.
Both exist because of a real outage: an earlier release served a fresh `index.html`
together with **cached scripts from the previous version**, which left the app on a
blank screen.

**When you change any file under `css/` or `js/`, bump the version in both places:**

1. `VERSION` at the top of `sw.js`
2. the `?v=` query on the stylesheet and every `<script>` in `index.html`

A worker taking control reloads the page once, so a tab that already loaded old code
lands on the new release instead of running half of each. If something ever does go
wrong, the app shows an error card with a **Reload App** button that clears all caches
and service workers — never a blank page again.

## 🚀 Deploy to GitHub Pages

```bash
# 1. Make sure all files are committed
git add .
git commit -m "Initial commit"
git push origin main

# 2. Go to your repo on GitHub
#    Settings → Pages → Source: "main" / root → Save

# 3. After ~1 minute your app is live at:
#    https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/
```

---

## 🔧 Tech Stack

| Technology | What it does |
|---|---|
| **HTML** | Page structure (just one file!) |
| **CSS** | All styling, animations, dark theme |
| **JavaScript** | All logic, no frameworks, no build step |
| **localStorage** | Data storage (in the browser) |
| **SVG** | Charts and rings (no chart library needed) |
| **Service Worker** | Offline caching |
| **PWA Manifest** | Install on home screen |

> **No React, no Vue, no Node.js, no database, no server.**
> Just plain HTML + CSS + JS that runs directly in the browser.

---

## 📱 Optimized for

- iPhone 12 (390 × 844)
- iOS Safari (PWA mode)
- Safe area insets for notch + home indicator
- Touch targets ≥ 44px
- Dark theme

---

## 📦 Data Format

Every workout is stored as a JSON object like this:

```json
{
  "id": "workout-abc123",
  "date": "2026-08-10T14:30:00.000Z",
  "endTime": "2026-08-10T15:45:00.000Z",
  "duration": 4500000,
  "name": "Push Day",
  "exercises": [
    {
      "exerciseId": "ex-bench-press",
      "isUnilateral": false,
      "notes": "Felt strong today",
      "sets": [
        { "weight": 80, "reps": 8, "type": "normal", "completed": true },
        { "weight": 80, "reps": 7, "type": "normal", "completed": true }
      ]
    },
    {
      "exerciseId": "ex-db-curl",
      "isUnilateral": true,
      "notes": "",
      "sets": [
        { "weight": 14, "repsL": 12, "repsR": 10, "type": "normal", "completed": true }
      ]
    }
  ]
}
```

---

## 📄 License

MIT – use it however you want.

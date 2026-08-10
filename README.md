# Gym Tracker

A workout tracker for the phone, built in the visual language of the iOS Fitness app:
dark surfaces, activity rings, and charts that answer the question *"am I actually getting stronger?"*

No frameworks, no build step, no server, no account. Everything is stored in the browser.

**[Open the app →](https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/)**

## Screens

| | |
|---|---|
| **Summary** | Weekly rings (volume / workouts / sets), the week at a glance, 14-day volume, records, recent sessions |
| **Workout** | Routines and the live training screen |
| **History** | Training calendar with one ring per day, month totals, searchable session list |
| **Trends** | Training load over 12 weeks, per-exercise progression, muscle split, body weight |
| **Exercises** | 60+ built-in exercises plus your own, each with its own history and records |

## Training screen

The part you actually use in the gym:

- **Previous column** — what you lifted last time, per set. Tap it to copy the numbers in.
- **Prefilled sets** — a new exercise starts with the sets from your last session, so logging is mostly tapping the checkmark.
- **Set types** — tap the set number for warm-up, drop set or to failure. Warm-ups are excluded from volume and records.
- **Rest timer** — starts automatically when you tick a set, runs as a bar at the bottom instead of a blocking dialog, with ±15 s and skip. Per-exercise durations override the default.
- **Live PR detection** — beat your estimated 1RM or your heaviest set and you get a notification while it happens.
- **Plate calculator** — what to load per side for barbell lifts, based on your bar weight.
- **Left / right tracking** — unilateral exercises log both sides separately.
- **Crash safe** — the running workout is written to storage after every change. Reload the page, get a call, let iOS discard the tab: it comes back with the clock still running.
- **Minimize** — leave the workout running and browse the rest of the app; a bar at the bottom takes you back.

## Metrics

- **Volume** = weight × reps, summed over working sets
- **Estimated 1RM** — Epley, `weight × (1 + reps / 30)`, capped at 20 reps
- **Rings** — the three weekly goals from Settings: volume, sessions, working sets
- **Records** — best estimated 1RM and heaviest set per exercise, computed from the log rather than stored

Weights are always stored in kilograms and converted for display, so switching between kg and lb is lossless.

## Apple Health

There is no direct connection, and there cannot be one. HealthKit is only available to native apps
signed and distributed by Apple; Safari exposes no HealthKit interface, not even for a web app added
to the home screen. That limit is deliberate and no browser setting changes it.

What does work is the Shortcuts app, which *can* write to Health and *can* be launched from a website:

1. Create a shortcut, e.g. **Log Gym Workout**, with a *Log Health Sample* / *Log Workout* action
   (Traditional Strength Training).
2. Fill duration and start date from **Shortcut Input** — the app hands over JSON with `start`, `end`,
   `durationMinutes`, `volumeKg`, `sets`, `reps`, `title` and `exercises`.
3. Enter the shortcut's name in **Settings → Apple Health**.

A *Send to Apple Health* button then appears on the workout summary. Reading data back out (body weight,
for instance) works the same way in reverse, manually. Fully automatic sync would need a native wrapper
around the web view, which is outside what GitHub Pages can host.

## Install on iPhone

Open the page in Safari → share button → **Add to Home Screen**. It then runs full screen without the
address bar, works offline through a service worker, and iOS is far less likely to clear its stored data.

Because storage is local to the browser, **export a backup now and then**
(Settings → Data → Export backup). iOS clears the storage of websites you have not opened in a while.
The app reminds you if your last export is more than a month old. Import merges by id, so restoring
never duplicates sessions.

## Run locally

```bash
npx http-server . -p 8080
```

Then open `http://localhost:8080`. A plain file:// open works too, minus the service worker.

## Structure

```
├── index.html                – all screens
├── manifest.webmanifest      – PWA metadata
├── sw.js                     – offline cache
├── icons/                    – app icons
├── css/style.css             – design system
└── js/
    ├── store.js              – persistence, exercise database, settings, backup
    ├── stats.js              – everything derived: volume, rings, records, streaks
    ├── charts.js             – SVG rings, bars, lines, calendar (no chart library)
    ├── ui.js                 – sheets, action sheets, alerts, toasts, haptics
    ├── picker.js             – exercise picker
    ├── workout.js            – live training screen
    ├── routines.js           – templates and their editor
    ├── history.js            – calendar, session list, session detail
    ├── trends.js             – long range progress and body weight
    ├── exercises.js          – library, editor, exercise detail
    ├── settings.js           – goals, units, backup, Apple Health
    ├── summary.js            – landing screen
    └── app.js                – navigation and bootstrap
```

## Data

Workouts logged with earlier versions keep working — the storage keys and workout shape are unchanged,
new fields are additive.

```js
gym_workouts          // sessions with exercises and sets
gym_templates         // routines
gym_custom_exercises  // your own exercises
gym_bodyweight        // body weight log
gym_settings          // goals, units, timers
gym_active_workout    // the session currently running
```

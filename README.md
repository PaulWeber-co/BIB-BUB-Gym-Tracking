# Gym Tracker

A workout tracker for the phone. Flat editorial design: paper background, blue and navy bands,
black blocks, square corners, uppercase type. No frameworks, no build step, no server, no account —
everything lives in the browser.

**[Open the app →](https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/)**

## Screens

| | |
|---|---|
| **Summary** | Three goal bands (protein today, workouts and sets this week), quick start, headline stats, 14-day volume, records, recent sessions |
| **Workout** | Routines and the live training screen |
| **History** | Training calendar as a block grid, month totals, searchable session list |
| **Trends** | 12-week training load, per-exercise progression, muscle split, body weight, protein |
| **Exercises** | 60+ built-in exercises plus your own, each with a muscle diagram, history and records |

## Training screen

- **Previous column** — what you lifted last time, per set, warm-ups matched to warm-ups. Tap to copy the numbers in.
- **Prefilled sets** — a new exercise starts with the sets from your last session, so logging is mostly tapping the checkmark.
- **Supersets** — link an exercise with the next one. Completing a set jumps to the partner exercise; the rest timer only starts once the round is done.
- **Set types** — tap the set number for warm-up, drop set or to failure. Warm-ups are excluded from volume, records and the rest timer.
- **Rest timer** — a bar at the bottom rather than a blocking dialog, with per-exercise durations, ±15 s and skip.
- **Live PR detection** — beat your estimated 1RM or your heaviest set and you are told while it happens.
- **Left / right tracking** — unilateral exercises log both sides separately, including **separate notes per side**.
- **Plate calculator** — what to load per side for barbell lifts.
- **Crash safe** — the running workout is written to storage after every change. Reload, take a call, let iOS discard the tab: it comes back with the clock running.
- **Minimize** — leave the workout running and browse the rest of the app; a bar at the bottom takes you back.

## Protein

The daily target is derived from your body weight: `body weight × g per kg`, adjustable from 1.4
(maintain) to 2.2 (cutting), or a fixed number if you prefer. Log intake with the +20/+30/+40 buttons
or an exact amount; the summary band, a 14-day chart, the streak and the 7-day average all follow.
Log a body weight under Trends → Body once and the target keeps itself up to date.

## Metrics

- **Volume** = weight × reps, summed over working sets
- **Estimated 1RM** — Epley, `weight × (1 + reps / 30)`, capped at 20 reps
- **Records** — best estimated 1RM and heaviest set per exercise, computed from the log rather than stored
- **Muscle diagrams** — each exercise shows a body outline with its muscle group filled in

Weights are always stored in kilograms and converted for display, so switching between kg and lb is lossless.

## Haptics

Two mechanisms, both no-ops where unsupported. `navigator.vibrate` covers Android and desktop Chrome.
Safari exposes no Vibration API, so a hidden `switch` checkbox is toggled instead — the one control iOS
gives a system haptic to (17.4 and later). Sound is never used as a stand-in for haptics; the only tone
in the app marks the end of the rest timer.

## Apple Health

There is no direct connection, and there cannot be one. HealthKit is only available to native apps
signed and distributed by Apple; Safari exposes no HealthKit interface, not even for a web app added
to the home screen.

What does work is the Shortcuts app, which *can* write to Health and *can* be launched from a website:

1. Create a shortcut, e.g. **Log Gym Workout**, with a *Log Health Sample* / *Log Workout* action
   (Traditional Strength Training).
2. Fill duration and start date from **Shortcut Input** — the app hands over JSON with `start`, `end`,
   `durationMinutes`, `volumeKg`, `sets`, `reps`, `title` and `exercises`.
3. Enter the shortcut's name in **Settings → Apple Health**.

A *Send to Apple Health* button then appears on the workout summary.

## Install on iPhone

Open the page in Safari → share button → **Add to Home Screen**. It then runs full screen without the
address bar, works offline through a service worker, and iOS is far less likely to clear its stored data.

Because storage is local to the browser, **export a backup now and then**
(Settings → Data → Export backup). The app reminds you if your last export is more than a month old.
Import merges by id, so restoring never duplicates sessions.

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
    ├── stats.js              – everything derived: volume, goals, records, streaks, protein
    ├── charts.js             – SVG bars, lines, calendar (no chart library)
    ├── muscles.js            – body diagrams per muscle group
    ├── ui.js                 – sheets, action sheets, alerts, toasts, haptics
    ├── nutrition.js          – protein target and logging
    ├── picker.js             – exercise picker
    ├── workout.js            – live training screen, supersets, rest timer
    ├── routines.js           – templates and their editor
    ├── history.js            – calendar, session list, session detail
    ├── trends.js             – long range progress, body weight, protein
    ├── exercises.js          – library, editor, exercise detail
    ├── settings.js           – goals, units, backup, Apple Health
    ├── summary.js            – landing screen
    └── app.js                – navigation and bootstrap
```

## Data

Workouts logged with earlier versions keep working — storage keys and the workout shape are unchanged,
new fields are additive.

```js
gym_workouts          // sessions with exercises and sets
gym_templates         // routines
gym_custom_exercises  // your own exercises
gym_bodyweight        // body weight log
gym_protein           // daily protein intake
gym_settings          // goals, units, timers
gym_active_workout    // the session currently running
```

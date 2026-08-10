# 💪 BIB-BUB Gym Tracker

A modern gym workout tracking web app — track exercises, create routines, and monitor your progress.

**[Live Demo →](https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/)**

## Features

- 🏋️ **Workout Tracking** – Start workouts, add exercises, log sets with weight and reps
- ↔️ **Unilateral Exercises** – Track Left & Right side separately (L Reps / R Reps) for single-arm/leg exercises
- ✏️ **Custom Exercises** – Create your own exercises with muscle group, category, and unilateral setting
- 📜 **Templates / Routines** – Save workout plans and start them with one tap
- 🗒️ **Exercise Notes** – Add notes per exercise (e.g. grip width, form cues)
- 📈 **Progress Charts** – View your progress per exercise (Max Weight, Volume, Est. 1RM)
- 📊 **Workout History** – Browse all past workouts with details
- ⏱️ **Rest Timer** – Countdown timer between sets with preset durations
- 💾 **Offline Storage** – All data saved locally in the browser (no server needed)

## Tech Stack

- **HTML / CSS / JavaScript** – No frameworks, no build step
- **Chart.js** – For progress graphs (loaded via CDN)
- **localStorage** – For persistent data storage
- **GitHub Pages** – Free hosting

## Run Locally

```bash
# Clone the repo
git clone https://github.com/PaulWeber-co/BIB-BUB-Gym-Tracking.git
cd BIB-BUB-Gym-Tracking

# Serve locally (any static server works)
npx http-server . -p 8080
```

Then open `http://localhost:8080` in your browser.

## Deploy to GitHub Pages

1. Push your code to the `main` branch
2. Go to **Settings** → **Pages** in your GitHub repository
3. Under **Source**, select `Deploy from a branch`
4. Select `main` branch and `/ (root)` folder
5. Click **Save**
6. Your app will be live at `https://paulweber-co.github.io/BIB-BUB-Gym-Tracking/`

## Project Structure

```
├── index.html          – Main HTML (all views)
├── css/
│   └── style.css       – Styles (white/red theme)
├── js/
│   ├── app.js          – Navigation & initialization
│   ├── data.js         – Exercise database & localStorage
│   ├── workout.js      – Workout tracking logic
│   ├── exercises.js    – Custom exercise management
│   ├── templates.js    – Workout templates / routines
│   ├── history.js      – Workout history
│   ├── charts.js       – Progress graphs (Chart.js)
│   └── timer.js        – Rest timer
└── README.md
```

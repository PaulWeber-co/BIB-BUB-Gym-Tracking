/* ============================================================
   SUMMARY — Der Dashboard-Bildschirm (Home-Screen der App)
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   summary.js baut die Startseite der App ("Summary"-Tab) auf:
   1. Drei Activity Rings (Volumen, Workouts, Sätze) für Wochenziele
   2. "This Week" Streifen mit Tages-Ringen
   3. Quick-Start (Start Workout, Resume Workout oder Routinen-Chips)
   4. Kacheln (Goal streak, Tage seit letztem Workout, Volume vs. letzte Woche)
   5. 14-Tage Volumen-Balkendiagramm
   6. Neue persönliche Rekorde (PRs)
   7. Die 3 neuesten Workouts
   ============================================================ */

const Summary = (() => {

    const body = () => document.getElementById('summary-body');

    /**
     * render() — Erzeugt den gesamten Inhalt des Home-Screens.
     * Baut aus den berechneten Zahlen von Stats und den SVG-Diagrammen
     * von Charts ein responsives HTML-Dashboard auf.
     */
    function render() {
        const g = Stats.goals();
        const all = Stats.allTime();
        const now = new Date();

        // Datum im Header setzen (z.B. "Monday, 10 August")
        document.getElementById('summary-date').textContent =
            new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

        const dailyVolume = Math.max(1, s.goalVolume / Math.max(1, s.goalWorkouts));
        const dailySets = Math.max(1, s.goalSets / Math.max(1, s.goalWorkouts));

        const parts = [];

        // 1. ---- ACTIVITY RINGS ----
        parts.push(`
            <div class="card rings-card">
                <div class="rings-figure">${Charts.rings([r.volume.pct, r.workouts.pct, r.sets.pct], { size: 128, stroke: 12.5 })}</div>
                <div class="rings-legend">
                    <div class="legend-item">
                        <div class="legend-label">Volume</div>
                        <div class="legend-value lc-1">${Stats.fmtVolume(r.volume.value)}<span class="goal">/${Stats.fmtVolume(r.volume.goal)}</span><span class="unit"> ${Store.unit()}</span></div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-label">Workouts</div>
                        <div class="legend-value lc-2">${r.workouts.value}<span class="goal">/${r.workouts.goal}</span></div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-label">Sets</div>
                        <div class="legend-value lc-3">${r.sets.value}<span class="goal">/${r.sets.goal}</span></div>
                    </div>
                </div>
            </div>`);

        // 2. ---- THIS WEEK STRIP ----
        parts.push(`
            <div class="bleed">
                <button class="goal-band goal-band--1" data-act="protein">
                    <span>
                        <span class="goal-name">Protein</span>
                        <span class="goal-sub">${g.protein.goal === null ? 'Log body weight to set a target' : 'Today'}</span>
                    </span>
                    <span class="goal-figure">${proteinValue}</span>
                    <span class="goal-band-track"><span class="goal-band-progress" style="width:${Math.min(100, g.protein.pct * 100).toFixed(1)}%"></span></span>
                </button>
                <button class="goal-band goal-band--2" data-act="goto-history">
                    <span>
                        <span class="goal-name">Workouts</span>
                        <span class="goal-sub">This week</span>
                    </span>
                    <span class="goal-figure">
                        <span class="goal-value">${g.workouts.value}</span><span class="goal-target">/${g.workouts.goal}</span>
                    </span>
                    <span class="goal-band-track"><span class="goal-band-progress" style="width:${Math.min(100, g.workouts.pct * 100).toFixed(1)}%"></span></span>
                </button>
                <button class="goal-band goal-band--3" data-act="goto-trends">
                    <span>
                        <span class="goal-name">Sets</span>
                        <span class="goal-sub">This week &middot; ${Stats.fmtVolume(g.totals.volume)} ${Store.unit()} volume</span>
                    </span>
                    <span class="goal-figure">
                        <span class="goal-value">${g.sets.value}</span><span class="goal-target">/${g.sets.goal}</span>
                    </span>
                    <span class="goal-band-track"><span class="goal-band-progress" style="width:${Math.min(100, g.sets.pct * 100).toFixed(1)}%"></span></span>
                </button>
            </div>`);

        // 3. ---- QUICK START / RESUME ----
        if (Workout.isActive()) {
            parts.push(`
                <button class="btn btn-blue btn-block" data-act="resume" style="margin-top:14px">
                    Resume Workout &middot; <span id="summary-active-time">${Stats.fmtClock(Date.now() - Workout.startedAt())}</span>
                </button>`);
        } else {
            parts.push(`
                <button class="btn btn-fill btn-block" data-act="start-empty" style="margin-top:14px">
                    Start Workout
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5 3 20 12 5 21"/></svg>
                </button>`);

            const routines = Store.routines().slice(0, 2);
            if (routines.length) {
                parts.push(`
                    <div class="btn-pair">
                        ${routines.map((r, i) => `
                            <button class="btn ${i === 0 ? 'btn-blue' : 'btn-navy'} btn-sm" data-act="start-routine" data-id="${r.id}"
                                style="min-height:44px">${UI.esc(r.name)}</button>`).join('')}
                    </div>`);
            }
        }

        // 4. ---- STATS TILES ----
        const streak = Stats.weekStreak();
        const sinceLast = Stats.daysSinceLastWorkout();
        const weeks = Stats.weeklySeries(2);
        const lastWeekVolume = weeks[0] ? weeks[0].volume : 0;
        const deltaPct = lastWeekVolume > 0
            ? Math.round(((g.totals.volume - lastWeekVolume) / lastWeekVolume) * 100)
            : null;

        parts.push(`
            <div class="summary-split">
                <div class="tile tile-dark">
                    <div class="tile-label">Goal streak</div>
                    <div class="tile-value">${streak}<span class="unit">${streak === 1 ? 'wk' : 'wks'}</span></div>
                </div>
                <div class="summary-split-right">
                    <div class="tile">
                        <div class="tile-label">Last</div>
                        <div class="tile-value" style="font-size:1.125rem">${
                            sinceLast === null ? '—'
                            : sinceLast === 0 ? 'Today'
                            : sinceLast === 1 ? 'Yesterday'
                            : `${sinceLast}<span class="unit">days</span>`}</div>
                    </div>
                    <div class="tile">
                        <div class="tile-label">vs last wk</div>
                        <div class="tile-value ${deltaPct === null ? '' : (deltaPct >= 0 ? 'delta-up' : 'delta-down')}"
                            style="font-size:1.125rem">${deltaPct === null ? '—' : `${deltaPct >= 0 ? '+' : ''}${deltaPct}%`}</div>
                    </div>
                </div>
            </div>`);

        // 5. ---- 14 DAY VOLUME CHART ----
        if (all.workouts > 0) {
            const daily = Stats.dailySeries(14);
            const bars = daily.map((d, i) => ({
                value: d.volume,
                label: i % 2 === 0 || i === daily.length - 1
                    ? d.date.toLocaleDateString(undefined, { weekday: 'narrow' })
                    : '',
                highlight: i === daily.length - 1,
            }));

            parts.push(`
                <div class="section-title"><h2>Volume &mdash; 14 days</h2></div>
                <div class="chart-wrap">${Charts.bars(bars, {
                    height: 118,
                    barWidth: 16,
                    labels: false,
                    ariaLabel: 'Training volume over the last 14 days',
                })}</div>`);
        }

        // 6. ---- RECENT RECORDS ----
        const records = Stats.recentRecords(4);
        if (records.length) {
            parts.push(`
                <div class="section-title"><h2>Records</h2></div>
                <div class="list list-flat">
                    ${records.map(rec => `
                        <button class="list-row" data-act="open-exercise" data-id="${rec.exerciseId}">
                            <span class="badge badge-pr" style="margin:0;padding:5px 6px">PR</span>
                            <div class="list-row-main">
                                <div class="list-row-title">${UI.esc(Store.exerciseName(rec.exerciseId))}</div>
                                <div class="list-row-sub">${rec.type === 'e1rm' ? 'Est 1RM' : 'Max'} ${Stats.fmtWeight(rec.value, { decimals: 1 })}${Store.unit()} &middot; ${UI.esc(Stats.fmtRelativeDay(rec.date))}</div>
                            </div>
                        </button>`).join('')}
                </div>`);
        }

        // 7. ---- RECENT WORKOUTS ----
        const recent = Store.workouts().slice(0, 3);
        parts.push(`
            <div class="section-title">
                <h2>Recent</h2>
                ${recent.length ? '<button class="section-link" data-act="all-history">All</button>' : ''}
            </div>`);

        if (recent.length === 0) {
            parts.push(`
                <div class="empty">
                    <strong>No workouts yet</strong>
                    Start a session and your stats, records and trends start filling up.
                </div>`);
        } else {
            parts.push(`
                <div class="list list-flat">
                    ${recent.map(w => {
                        const t = Stats.workoutTotals(w);
                        return `
                            <button class="list-row" data-act="open-workout" data-id="${w.id}">
                                <div class="list-row-main">
                                    <div class="list-row-title">${UI.esc(Stats.workoutTitle(w))}</div>
                                    <div class="list-row-sub">${UI.esc(Stats.fmtRelativeDay(w.date))}</div>
                                </div>
                                <div class="list-row-num">
                                    <b>${t.sets} sets</b>
                                    <span>${Stats.fmtVolume(t.volume)}${Store.unit()} &middot; ${Stats.fmtDuration(t.duration)}</span>
                                </div>
                            </button>`;
                    }).join('')}
                </div>`);
        }

        body().innerHTML = parts.join('');
    }

    /* ──────────────────────────────────────────────────────────
       EVENTS — Klick-Handler für Schnellstarts & Navigationslinks
       ────────────────────────────────────────────────────────── */
    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'start-empty': App.startEmptyWorkout(); break;
                case 'start-routine': Routines.startRoutine(btn.dataset.id); break;
                case 'resume': Workout.resume(); break;
                case 'protein': Nutrition.openSheet(); break;
                case 'open-workout': History.openDetail(btn.dataset.id); break;
                case 'open-exercise': Exercises.openDetail(btn.dataset.id); break;
                case 'all-history': App.showTab('history'); break;
                case 'goto-history': App.showTab('history'); break;
                case 'goto-trends': App.showTab('trends'); break;
            }
        });

        document.getElementById('btn-open-settings').addEventListener('click', Settings.open);
    }

    return { render, bind };
})();

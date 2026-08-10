/* ============================================================
   SUMMARY — the screen you land on: weekly rings, the week at a
   glance, quick start, records and recent sessions.
   ============================================================ */

const Summary = (() => {

    const body = () => document.getElementById('summary-body');

    function render() {
        const s = Store.settings();
        const r = Stats.rings();
        const days = Stats.weekDays();
        const all = Stats.allTime();

        document.getElementById('summary-date').textContent =
            new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

        const dailyVolume = Math.max(1, s.goalVolume / Math.max(1, s.goalWorkouts));
        const dailySets = Math.max(1, s.goalSets / Math.max(1, s.goalWorkouts));

        const parts = [];

        // ---- rings ----
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

        // ---- week strip ----
        parts.push(`
            <div class="card">
                <div class="card-head" style="margin-bottom:10px">
                    <h2>This Week</h2>
                    <span class="card-sub">${Stats.fmtVolume(r.totals.volume)} ${Store.unit()}</span>
                </div>
                <div class="week-strip">
                    ${days.map(d => {
                        const pcts = d.workouts === 0
                            ? [0, 0, 0]
                            : [d.volume / dailyVolume, Math.min(d.workouts, 1), d.sets / dailySets];
                        return `
                            <div class="week-day ${d.isToday ? 'is-today' : ''}">
                                <span class="week-day-label">${d.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                                ${Charts.miniRing(pcts, 30)}
                                <span class="week-day-num">${d.date.getDate()}</span>
                            </div>`;
                    }).join('')}
                </div>
            </div>`);

        // ---- start / resume ----
        if (Workout.isActive()) {
            parts.push(`
                <button class="card card-tap row-between" data-act="resume" style="width:100%;text-align:left;border:1px solid rgba(123,232,0,.35)">
                    <div class="grow">
                        <div class="tile-label" style="color:var(--ring-2-lite)">In progress</div>
                        <div class="hist-name">Continue workout</div>
                        <div class="hist-date" id="summary-active-time">${Stats.fmtClock(Date.now() - Workout.startedAt())}</div>
                    </div>
                    <span class="btn btn-green btn-sm">Resume</span>
                </button>`);
        } else {
            parts.push(`
                <button class="btn btn-fill btn-block" data-act="start-empty">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Start Workout
                </button>`);

            const routines = Store.routines();
            if (routines.length) {
                parts.push(`
                    <div class="chips">
                        ${routines.slice(0, 8).map(t => `
                            <button class="chip" data-act="start-routine" data-id="${t.id}">${UI.esc(t.name)}</button>`).join('')}
                    </div>`);
            }
        }

        // ---- tiles ----
        const streak = Stats.weekStreak();
        const sinceLast = Stats.daysSinceLastWorkout();
        const weeks = Stats.weeklySeries(2);
        const lastWeekVolume = weeks[0] ? weeks[0].volume : 0;
        const deltaPct = lastWeekVolume > 0
            ? Math.round(((r.totals.volume - lastWeekVolume) / lastWeekVolume) * 100)
            : null;
        const avgDuration = r.totals.workouts > 0 ? r.totals.duration / r.totals.workouts : 0;

        parts.push(`
            <div class="tile-grid">
                <div class="tile">
                    <div class="tile-label">Goal streak</div>
                    <div class="tile-value">${streak}<span class="unit">${streak === 1 ? 'week' : 'weeks'}</span></div>
                    <div class="tile-foot">${streak > 0 ? 'Keep it running' : 'Hit your weekly goal'}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Last workout</div>
                    <div class="tile-value">${sinceLast === null ? '—' : (sinceLast === 0 ? 'Today' : `${sinceLast}<span class="unit">${sinceLast === 1 ? 'day' : 'days'}</span>`)}</div>
                    <div class="tile-foot">${sinceLast === null ? 'Nothing logged yet' : 'since your last session'}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">vs last week</div>
                    <div class="tile-value">${deltaPct === null ? '—' : `${deltaPct >= 0 ? '+' : ''}${deltaPct}<span class="unit">%</span>`}</div>
                    <div class="tile-foot ${deltaPct === null ? '' : (deltaPct >= 0 ? 'delta-up' : 'delta-down')}">${deltaPct === null ? 'no data' : 'training volume'}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Avg session</div>
                    <div class="tile-value">${avgDuration ? Stats.fmtDuration(avgDuration) : '—'}</div>
                    <div class="tile-foot">this week</div>
                </div>
            </div>`);

        // ---- 14 day volume ----
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
                <div class="card">
                    <div class="card-head" style="margin-bottom:4px">
                        <h2>Volume</h2>
                        <span class="card-sub">last 14 days</span>
                    </div>
                    <div class="chart-wrap">${Charts.bars(bars, {
                        height: 130,
                        barWidth: 14,
                        ariaLabel: 'Training volume over the last 14 days',
                    })}</div>
                </div>`);
        }

        // ---- records ----
        const records = Stats.recentRecords(4);
        if (records.length) {
            parts.push(`
                <div class="section-title"><h2>Records</h2></div>
                <div class="list">
                    ${records.map(rec => `
                        <button class="list-row" data-act="open-exercise" data-id="${rec.exerciseId}">
                            <div class="detail-set-n" style="background:rgba(255,214,10,0.18);color:#FFD60A">PR</div>
                            <div class="list-row-main">
                                <div class="list-row-title">${UI.esc(Store.exerciseName(rec.exerciseId))}</div>
                                <div class="list-row-sub">${rec.type === 'e1rm' ? 'Est. 1RM' : 'Heaviest set'} ${Stats.fmtWeight(rec.value, { decimals: 1 })} ${Store.unit()} &middot; ${UI.esc(Stats.fmtRelativeDay(rec.date))}</div>
                            </div>
                            <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>`).join('')}
                </div>`);
        }

        // ---- recent workouts ----
        const recent = Store.workouts().slice(0, 3);
        parts.push(`
            <div class="section-title">
                <h2>Recent</h2>
                ${recent.length ? '<button class="section-link" data-act="all-history">Show All</button>' : ''}
            </div>`);

        if (recent.length === 0) {
            parts.push(`
                <div class="card"><div class="empty">
                    <strong>No workouts yet</strong>
                    Start a session and your rings, records and trends start filling up.
                </div></div>`);
        } else {
            parts.push(`
                <div class="list">
                    ${recent.map(w => {
                        const t = Stats.workoutTotals(w);
                        return `
                            <button class="list-row" data-act="open-workout" data-id="${w.id}">
                                <div class="list-row-main">
                                    <div class="list-row-title">${UI.esc(Stats.workoutTitle(w))}</div>
                                    <div class="list-row-sub">${UI.esc(Stats.fmtRelativeDay(w.date))} &middot; ${t.sets} sets &middot; ${Stats.fmtVolume(t.volume)} ${Store.unit()} &middot; ${Stats.fmtDuration(t.duration)}</div>
                                </div>
                                <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>`;
                    }).join('')}
                </div>`);
        }

        body().innerHTML = parts.join('');
    }

    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'start-empty': App.startEmptyWorkout(); break;
                case 'start-routine': Routines.startRoutine(btn.dataset.id); break;
                case 'resume': Workout.resume(); break;
                case 'open-workout': History.openDetail(btn.dataset.id); break;
                case 'open-exercise': Exercises.openDetail(btn.dataset.id); break;
                case 'all-history': App.showTab('history'); break;
            }
        });

        document.getElementById('btn-open-settings').addEventListener('click', Settings.open);
    }

    return { render, bind };
})();

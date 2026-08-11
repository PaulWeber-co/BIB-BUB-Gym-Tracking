/* ============================================================
   TRENDS — long range progress: training load, per exercise
   progression and body weight.
   ============================================================ */

const Trends = (() => {

    let tab = 'overview';           // overview | exercise | body
    let exerciseId = null;
    let metric = 'e1rm';            // weight | volume | e1rm | reps
    let splitDays = 30;

    const body = () => document.getElementById('trends-body');

    function render() {
        const parts = [`
            <div class="segmented" data-role="tab">
                <button data-tab="overview" class="${tab === 'overview' ? 'is-active' : ''}">Overview</button>
                <button data-tab="exercise" class="${tab === 'exercise' ? 'is-active' : ''}">Exercise</button>
                <button data-tab="body" class="${tab === 'body' ? 'is-active' : ''}">Body</button>
            </div>`];

        if (tab === 'overview') parts.push(renderOverview());
        else if (tab === 'exercise') parts.push(renderExercise());
        else parts.push(renderBody());

        body().innerHTML = parts.join('');
        bindDynamic();
    }

    // ------------------------------------------------------------
    // Overview
    // ------------------------------------------------------------
    function renderOverview() {
        const weeks = Stats.weeklySeries(12);
        const all = Stats.allTime();

        if (all.workouts === 0) {
            return `<div class="card"><div class="empty"><strong>No data yet</strong>
                Finish your first workout and your training load, records and muscle split appear here.</div></div>`;
        }

        const thisWeek = weeks[weeks.length - 1];
        const lastWeek = weeks[weeks.length - 2] || { volume: 0, workouts: 0 };
        const delta = thisWeek.volume - lastWeek.volume;
        const deltaPct = lastWeek.volume > 0 ? Math.round((delta / lastWeek.volume) * 100) : null;

        const volumeBars = weeks.map((w, i) => ({
            value: w.volume,
            label: w.date.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' }).replace(/\.$/, ''),
            highlight: i === weeks.length - 1,
        }));
        // only label every other week so the axis stays readable
        volumeBars.forEach((b, i) => { if (i % 2 !== 0 && i !== volumeBars.length - 1) b.label = ''; });

        const workoutBars = weeks.map((w, i) => ({
            value: w.workouts,
            label: '',
            highlight: i === weeks.length - 1,
        }));

        const split = Stats.muscleSplit(splitDays);
        const splitTotal = split.reduce((s, m) => s + m.volume, 0);

        return `
            <div class="card">
                <div class="card-head" style="margin-bottom:2px"><h2>Training Load</h2><span class="card-sub">12 weeks</span></div>
                <div class="metric-big">${Stats.fmtVolume(thisWeek.volume)}<span class="unit"> ${Store.unit()}</span></div>
                <div class="metric-caption">
                    This week &middot;
                    ${deltaPct === null
                        ? 'first week with data'
                        : `<span class="${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? '+' : ''}${deltaPct}%</span> vs last week`}
                </div>
                <div class="chart-wrap">${Charts.bars(volumeBars, {
                    goal: Store.settings().goalVolume,
                    height: 150,
                    ariaLabel: 'Weekly training volume',
                })}</div>
                <div class="chart-legend">
                    <div class="chart-legend-item"><span class="chart-legend-dot" style="background:#2C68C8"></span>Volume per week</div>
                    <div class="chart-legend-item"><span class="chart-legend-dot" style="background:#8A8A82"></span>Weekly goal</div>
                </div>
            </div>

            <div class="card">
                <div class="card-head" style="margin-bottom:2px"><h2>Sessions per Week</h2></div>
                <div class="metric-big">${thisWeek.workouts}<span class="unit"> / ${Store.settings().goalWorkouts}</span></div>
                <div class="metric-caption">${Stats.weekStreak() > 0 ? `${Stats.weekStreak()} week streak at goal` : 'Goal not reached yet this week'}</div>
                <div class="chart-wrap">${Charts.bars(workoutBars, {
                    goal: Store.settings().goalWorkouts,
                    height: 110,
                    color: '#16386E',
                    labels: false,
                    ariaLabel: 'Workouts per week',
                })}</div>
            </div>

            <div class="card">
                <div class="card-head"><h2>Muscle Split</h2></div>
                <div class="segmented" data-role="split" style="margin-bottom:14px">
                    ${[7, 30, 90].map(d => `<button data-days="${d}" class="${splitDays === d ? 'is-active' : ''}">${d} days</button>`).join('')}
                </div>
                ${split.length === 0
                    ? '<div class="empty">No sets logged in this period.</div>'
                    : split.map(m => `
                        <div class="dist-row">
                            <div class="dist-name">${UI.esc(m.muscle)}</div>
                            <div class="dist-track"><div class="dist-fill" style="width:${(m.pct * 100).toFixed(1)}%;background:${Store.MUSCLE_COLORS[m.muscle]}"></div></div>
                            <div class="dist-value">${Math.round(m.pct * 100)}%</div>
                        </div>`).join('')}
                ${splitTotal > 0 ? `<div class="tiny muted mt-8">${Stats.fmtVolume(splitTotal)} ${Store.unit()} total volume in the last ${splitDays} days.</div>` : ''}
            </div>

            <div class="section-title"><h2>All Time</h2></div>
            <div class="tile-grid">
                <div class="tile">
                    <div class="tile-label">Workouts</div>
                    <div class="tile-value">${all.workouts}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Volume</div>
                    <div class="tile-value">${Stats.fmtVolume(all.volume)}<span class="unit">${Store.unit()}</span></div>
                </div>
                <div class="tile">
                    <div class="tile-label">Sets</div>
                    <div class="tile-value">${all.sets}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Time trained</div>
                    <div class="tile-value">${Math.round(all.duration / 3600000)}<span class="unit">h</span></div>
                </div>
            </div>`;
    }

    // ------------------------------------------------------------
    // Per exercise
    // ------------------------------------------------------------
    function mostTrainedId() {
        const counts = {};
        Store.workouts().forEach(w => (w.exercises || []).forEach(ex => {
            counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1;
        }));
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length ? sorted[0][0] : null;
    }

    function renderExercise() {
        if (!exerciseId) exerciseId = mostTrainedId();
        if (!exerciseId) {
            return `<div class="card"><div class="empty"><strong>No data yet</strong>
                Log an exercise and its progression shows up here.</div></div>`;
        }

        const ex = Store.exercise(exerciseId);
        const series = Stats.exerciseSeries(exerciseId);
        const rec = Stats.records(exerciseId);

        const METRICS = {
            weight: { label: 'Weight', title: 'Top set weight', pick: s => s.maxWeight, fmt: v => Stats.fmtWeight(v), unit: Store.unit() },
            volume: { label: 'Volume', title: 'Session volume', pick: s => s.volume, fmt: v => Stats.fmtVolume(v), unit: Store.unit() },
            e1rm: { label: '1RM', title: 'Estimated 1RM', pick: s => s.e1rm, fmt: v => Stats.fmtWeight(v, { decimals: 1 }), unit: Store.unit() },
            reps: { label: 'Reps', title: 'Total reps', pick: s => s.reps, fmt: v => String(Math.round(v)), unit: '' },
        };
        const m = METRICS[metric];

        const points = series.map(s => ({
            y: metric === 'reps' ? s.reps : Store.toDisplay(m.pick(s)),
            label: new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        }));

        const latest = series.length ? m.pick(series[series.length - 1]) : 0;
        const first = series.length ? m.pick(series[0]) : 0;
        const change = first > 0 ? Math.round(((latest - first) / first) * 100) : null;

        const header = `
            <button class="card card-tap row-between" data-act="pick-exercise" style="width:100%;text-align:left">
                <div class="grow">
                    <div class="tile-label" style="margin-bottom:2px">Exercise</div>
                    <div class="hist-name">${UI.esc(ex ? ex.name : 'Unknown')}</div>
                    <div class="hist-date">${ex ? `${UI.esc(ex.muscleGroup)} · ${UI.esc(ex.category)}` : ''} &middot; ${rec.sessions} sessions</div>
                </div>
                <svg class="chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>`;

        if (series.length === 0) {
            return header + `<div class="card"><div class="empty"><strong>No sessions yet</strong>
                Complete a workout with this exercise to see its progression.</div></div>`;
        }

        return `
            ${header}
            <div class="segmented" data-role="metric">
                ${Object.entries(METRICS).map(([key, v]) =>
                    `<button data-metric="${key}" class="${metric === key ? 'is-active' : ''}">${v.label}</button>`).join('')}
            </div>

            <div class="card">
                <div class="metric-big">${m.fmt(latest)}<span class="unit"> ${m.unit}</span></div>
                <div class="metric-caption">
                    ${m.title} &middot; latest session
                    ${change !== null && series.length > 1
                        ? ` &middot; <span class="${change >= 0 ? 'delta-up' : 'delta-down'}">${change >= 0 ? '+' : ''}${change}%</span> since first`
                        : ''}
                </div>
                <div class="chart-wrap">${Charts.line(points, {
                    height: 175,
                    color: metric === 'volume' ? '#16386E' : '#2C68C8',
                    colorSoft: metric === 'volume' ? 'rgba(22,56,110,0.20)' : 'rgba(44,104,200,0.20)',
                    formatValue: v => (metric === 'reps' ? String(Math.round(v)) : String(Math.round(v * 10) / 10)),
                    ariaLabel: `${m.title} progression`,
                })}</div>
            </div>

            <div class="tile-grid">
                <div class="tile">
                    <div class="tile-label">Best 1RM</div>
                    <div class="tile-value">${Stats.fmtWeight(rec.e1rm, { decimals: 1 })}<span class="unit">${Store.unit()}</span></div>
                </div>
                <div class="tile">
                    <div class="tile-label">Heaviest set</div>
                    <div class="tile-value">${Stats.fmtWeight(rec.weight)}<span class="unit">${Store.unit()}</span></div>
                </div>
                <div class="tile">
                    <div class="tile-label">Best session</div>
                    <div class="tile-value">${Stats.fmtVolume(rec.volume)}<span class="unit">${Store.unit()}</span></div>
                </div>
                <div class="tile">
                    <div class="tile-label">Sessions</div>
                    <div class="tile-value">${rec.sessions}</div>
                </div>
            </div>

            <div class="section-title"><h2 style="font-size:1.0625rem">Recent Sessions</h2></div>
            <div class="list">
                ${series.slice(-8).reverse().map(s => `
                    <button class="list-row" data-act="open-workout" data-id="${s.workoutId}">
                        <div class="list-row-main">
                            <div class="list-row-title">${UI.esc(Stats.fmtRelativeDay(s.date))}</div>
                            <div class="list-row-sub">${s.sets} sets &middot; ${Stats.fmtVolume(s.volume)} ${Store.unit()} &middot; top ${Stats.fmtWeight(s.maxWeight)} ${Store.unit()}</div>
                        </div>
                        <div class="list-row-value">${Stats.fmtWeight(s.e1rm, { decimals: 0 })}</div>
                        <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>`).join('')}
            </div>`;
    }

    // ------------------------------------------------------------
    // Body weight
    // ------------------------------------------------------------
    function proteinCard() {
        const target = Store.proteinTarget();
        const series = Stats.proteinSeries(14);
        const today = Store.proteinOn();
        const average = Stats.proteinAverage(7);

        return `
            <div class="section-title">
                <h2>Protein</h2>
                <button class="section-link" data-act="protein">Log</button>
            </div>
            <div class="card">
                <div class="metric-big">${today}<span class="unit"> / ${target === null ? '—' : target} g today</span></div>
                <div class="metric-caption">${target === null
                    ? 'Log a body weight to get a target'
                    : `${Math.round(average)} g average over 7 days &middot; ${Stats.proteinStreak()} day streak`}</div>
                <div class="chart-wrap">${Charts.bars(series.map((d, i) => ({
                    value: d.grams,
                    highlight: i === series.length - 1,
                })), {
                    height: 110,
                    barWidth: 16,
                    goal: target || 0,
                    labels: false,
                    ariaLabel: 'Protein intake over the last 14 days',
                })}</div>
            </div>`;
    }

    function renderBody() {
        const log = Store.bodyLog();
        const trend = Stats.bodyTrend();

        if (log.length === 0) {
            return `
                <div class="card">
                    <div class="empty">
                        <strong>No body weight logged</strong>
                        Your protein target is derived from body weight, and the chart shows how weight and
                        training volume move together.
                    </div>
                    <button class="btn btn-fill btn-block" data-act="add-weight">Log Body Weight</button>
                </div>
                ${proteinCard()}`;
        }

        const points = log.slice(-60).map(e => ({
            y: Store.toDisplay(e.weight),
            label: new Date(e.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        }));

        return `
            <div class="card">
                <div class="metric-big">${Stats.fmtWeight(trend.latest.weight, { decimals: 1 })}<span class="unit"> ${Store.unit()}</span></div>
                <div class="metric-caption">
                    ${UI.esc(Stats.fmtRelativeDay(trend.latest.date))}
                    ${trend.delta !== 0 ? ` &middot; <span style="color:var(--ink)">${trend.delta > 0 ? '+' : ''}${Stats.fmtWeight(trend.delta, { decimals: 1 })} ${Store.unit()}</span> in 30 days` : ''}
                </div>
                <div class="chart-wrap">${Charts.line(points, {
                    height: 175,
                    color: '#16386E', colorSoft: 'rgba(22,56,110,0.20)',
                    formatValue: v => String(Math.round(v * 10) / 10),
                    ariaLabel: 'Body weight',
                })}</div>
            </div>

            <button class="btn btn-fill btn-block" data-act="add-weight">Log Body Weight</button>

            ${proteinCard()}

            <div class="section-title"><h2>Entries</h2></div>
            <div class="list">
                ${log.slice().reverse().slice(0, 15).map(e => `
                    <div class="list-row">
                        <div class="list-row-main">
                            <div class="list-row-title">${Stats.fmtWeight(e.weight, { decimals: 1 })} ${Store.unit()}</div>
                            <div class="list-row-sub">${UI.esc(Stats.fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</div>
                        </div>
                        <button class="icon-btn" data-act="delete-weight" data-date="${UI.esc(e.date)}" aria-label="Delete entry">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>`).join('')}
            </div>`;
    }

    async function addWeight() {
        const log = Store.bodyLog();
        const last = log.length ? Store.toDisplay(log[log.length - 1].weight) : '';
        const value = await UI.prompt({
            title: 'Body Weight',
            message: `Today's weight in ${Store.unit()}.`,
            value: last ? String(Math.round(last * 10) / 10) : '',
            placeholder: Store.unit(),
            inputmode: 'decimal',
        });
        if (value === null || value.trim() === '') return;
        const num = UI.num(value);
        if (num <= 0) return;
        Store.addBodyEntry(Store.toBase(num));
        render();
        App.refreshAll();          // the protein target follows body weight
        UI.toast({ title: 'Body weight saved', tone: 'success' });
    }

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    function bindDynamic() {
        const root = body();

        root.querySelectorAll('[data-role="tab"] button').forEach(btn => {
            btn.addEventListener('click', () => { tab = btn.dataset.tab; render(); });
        });
        root.querySelectorAll('[data-role="metric"] button').forEach(btn => {
            btn.addEventListener('click', () => { metric = btn.dataset.metric; render(); });
        });
        root.querySelectorAll('[data-role="split"] button').forEach(btn => {
            btn.addEventListener('click', () => { splitDays = Number(btn.dataset.days); render(); });
        });
    }

    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'pick-exercise':
                    Picker.open({
                        title: 'Choose Exercise',
                        multi: false,
                        onPick: (ids) => { exerciseId = ids[0]; render(); },
                    });
                    break;
                case 'open-workout': History.openDetail(btn.dataset.id); break;
                case 'add-weight': addWeight(); break;
                case 'protein': Nutrition.openSheet(); break;
                case 'delete-weight':
                    Store.deleteBodyEntry(btn.dataset.date);
                    render();
                    break;
            }
        });
    }

    function showExercise(id) {
        tab = 'exercise';
        exerciseId = id;
        App.showTab('trends');
        render();
    }

    /** Opens the body weight prompt from anywhere (the protein sheet uses it). */
    function openWeightPrompt() {
        addWeight();
    }

    return { render, bind, showExercise, openWeightPrompt };
})();

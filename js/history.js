/* ============================================================
   HISTORY — training calendar, past sessions and their detail.
   ============================================================ */

const History = (() => {

    let mode = 'calendar';           // calendar | list
    let cursor = new Date();         // month shown in calendar mode
    let query = '';
    let detailId = null;

    const body = () => document.getElementById('history-body');
    const detailBody = () => document.getElementById('workout-detail-body');

    // ------------------------------------------------------------
    // Tab
    // ------------------------------------------------------------
    function render() {
        const parts = [];

        parts.push(`
            <div class="segmented" data-role="mode">
                <button data-mode="calendar" class="${mode === 'calendar' ? 'is-active' : ''}">Calendar</button>
                <button data-mode="list" class="${mode === 'list' ? 'is-active' : ''}">All Workouts</button>
            </div>`);

        parts.push(mode === 'calendar' ? renderCalendar() : renderList());
        body().innerHTML = parts.join('');
        bindDynamic();
    }

    function renderCalendar() {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const from = new Date(year, month, 1);
        const to = new Date(year, month + 1, 1);
        const totals = Stats.rangeTotals(from, to);
        const settings = Store.settings();
        const dailyTarget = Math.max(1, settings.goalVolume / Math.max(1, settings.goalWorkouts));

        const dayData = new Map();
        totals.list.forEach(w => {
            const key = Stats.dayKey(w.date);
            const t = Stats.workoutTotals(w);
            const prev = dayData.get(key) || { volume: 0, count: 0 };
            dayData.set(key, { volume: prev.volume + t.volume, count: prev.count + 1 });
        });
        dayData.forEach((v, k) => dayData.set(k, { ...v, pct: v.volume / dailyTarget }));

        const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
        const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        const sessions = totals.list;

        return `
            <div class="card">
                <div class="row-between" style="margin-bottom:6px">
                    <button class="icon-btn" data-act="prev-month" aria-label="Previous month">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <h2 style="font-size:1.0625rem;font-weight:700">${UI.esc(monthLabel)}</h2>
                    <button class="icon-btn" data-act="next-month" aria-label="Next month" ${isCurrentMonth ? 'style="opacity:.3"' : ''}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
                <div class="chart-wrap">${Charts.monthCalendar(year, month, dayData, { ariaLabel: `Training days in ${monthLabel}` })}</div>
            </div>

            <div class="tile-grid">
                <div class="tile">
                    <div class="tile-label">Workouts</div>
                    <div class="tile-value">${totals.workouts}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Volume</div>
                    <div class="tile-value">${Stats.fmtVolume(totals.volume)}<span class="unit">${Store.unit()}</span></div>
                </div>
                <div class="tile">
                    <div class="tile-label">Sets</div>
                    <div class="tile-value">${totals.sets}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Time</div>
                    <div class="tile-value">${Stats.fmtDuration(totals.duration)}</div>
                </div>
            </div>

            ${sessions.length === 0
                ? '<div class="card"><div class="empty"><strong>No workouts this month</strong>Sessions you log will show up here.</div></div>'
                : sessions.map(card).join('')}`;
    }

    function renderList() {
        let workouts = Store.workouts();
        if (query) {
            const q = query.toLowerCase();
            workouts = workouts.filter(w => {
                if (Stats.workoutTitle(w).toLowerCase().includes(q)) return true;
                return (w.exercises || []).some(ex => Store.exerciseName(ex.exerciseId).toLowerCase().includes(q));
            });
        }

        if (workouts.length === 0) {
            return `
                <div class="search-field">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                    <input class="input" type="search" data-role="search" placeholder="Search workouts or exercises" value="${UI.esc(query)}">
                </div>
                <div class="card"><div class="empty"><strong>${query ? 'No matches' : 'No workouts yet'}</strong>${query ? 'Try a different search.' : 'Your finished sessions are collected here.'}</div></div>`;
        }

        const groups = new Map();
        workouts.forEach(w => {
            const d = new Date(w.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!groups.has(key)) groups.set(key, { label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), items: [] });
            groups.get(key).items.push(w);
        });

        let html = `
            <div class="search-field">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                <input class="input" type="search" data-role="search" placeholder="Search workouts or exercises" value="${UI.esc(query)}">
            </div>`;

        groups.forEach(group => {
            const vol = group.items.reduce((s, w) => s + Stats.workoutTotals(w).volume, 0);
            html += `<div class="section-title"><h2 style="font-size:1.0625rem">${UI.esc(group.label)}</h2>
                <span class="card-sub">${group.items.length} &middot; ${Stats.fmtVolume(vol)} ${Store.unit()}</span></div>`;
            html += group.items.map(card).join('');
        });
        return html;
    }

    function card(w) {
        const t = Stats.workoutTotals(w);
        const names = (w.exercises || []).map(ex => Store.exerciseName(ex.exerciseId));
        const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');

        return `
            <button class="card card-tap hist-card" data-act="open-detail" data-id="${w.id}">
                <div class="hist-top">
                    <div class="hist-title">
                        <div class="hist-name">${UI.esc(Stats.workoutTitle(w))}</div>
                        <div class="hist-date">${UI.esc(Stats.fmtRelativeDay(w.date))} &middot; ${new Date(w.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="margin-top:4px"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div class="hist-stats">
                    <div>
                        <div class="hist-stat-label">Volume</div>
                        <div class="hist-stat-value">${Stats.fmtVolume(t.volume)} <span style="font-size:.6875rem;color:var(--ink-2)">${Store.unit()}</span></div>
                    </div>
                    <div>
                        <div class="hist-stat-label">Sets</div>
                        <div class="hist-stat-value">${t.sets}</div>
                    </div>
                    <div>
                        <div class="hist-stat-label">Time</div>
                        <div class="hist-stat-value">${Stats.fmtDuration(t.duration)}</div>
                    </div>
                </div>
                <div class="hist-exercises">${UI.esc(preview)}</div>
            </button>`;
    }

    // ------------------------------------------------------------
    // Detail
    // ------------------------------------------------------------
    function openDetail(id) {
        const w = Store.workout(id);
        if (!w) return;
        detailId = id;

        const t = Stats.workoutTotals(w);
        const records = Stats.workoutRecords(w);
        const recordIds = new Set(records.map(r => r.exerciseId));
        const muscles = Object.entries(t.muscles).sort((a, b) => b[1] - a[1]);
        const totalMuscle = muscles.reduce((s, m) => s + m[1], 0);

        let html = `
            <div class="card">
                <div class="hist-name" style="font-size:1.375rem">${UI.esc(Stats.workoutTitle(w))}</div>
                <div class="hist-date">${UI.esc(Stats.fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} &middot; ${new Date(w.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="hist-stats mt-8" style="gap:22px">
                    <div>
                        <div class="hist-stat-label">Volume</div>
                        <div class="hist-stat-value">${Stats.fmtVolume(t.volume)} <span style="font-size:.6875rem;color:var(--ink-2)">${Store.unit()}</span></div>
                    </div>
                    <div>
                        <div class="hist-stat-label">Sets</div>
                        <div class="hist-stat-value">${t.sets}</div>
                    </div>
                    <div>
                        <div class="hist-stat-label">Reps</div>
                        <div class="hist-stat-value">${t.reps}</div>
                    </div>
                    <div>
                        <div class="hist-stat-label">Time</div>
                        <div class="hist-stat-value">${Stats.fmtDuration(t.duration)}</div>
                    </div>
                </div>
            </div>`;

        if (records.length) {
            html += `
                <div class="card">
                    <div class="card-head"><h3>Records</h3><span class="card-sub">${records.length}</span></div>
                    ${records.map(r => `
                        <div class="detail-set">
                            <div class="detail-set-n" style="background:#000;color:#fff">PR</div>
                            <div class="grow">
                                <div style="font-size:.9375rem">${UI.esc(Store.exerciseName(r.exerciseId))}</div>
                                <div class="tiny muted">${r.type === 'e1rm' ? 'Estimated 1RM' : 'Heaviest set'} &middot; ${Stats.fmtWeight(r.value, { decimals: 1 })} ${Store.unit()}</div>
                            </div>
                        </div>`).join('')}
                </div>`;
        }

        if (muscles.length > 1) {
            html += `
                <div class="card">
                    <div class="card-head"><h3>Muscle Split</h3></div>
                    ${muscles.map(([name, vol]) => `
                        <div class="dist-row">
                            <div class="dist-name">${UI.esc(name)}</div>
                            <div class="dist-track"><div class="dist-fill" style="width:${((vol / totalMuscle) * 100).toFixed(1)}%;background:${Store.MUSCLE_COLORS[name] || Store.MUSCLE_COLORS.Other}"></div></div>
                            <div class="dist-value">${Math.round((vol / totalMuscle) * 100)}%</div>
                        </div>`).join('')}
                </div>`;
        }

        // superset letters, derived from neighbouring exercises sharing an id
        const supersetLetter = new Map();
        let letterIndex = 0;
        (w.exercises || []).forEach((ex, i, arr) => {
            if (!ex.supersetId || supersetLetter.has(ex.supersetId)) return;
            const partners = arr.filter(x => x.supersetId === ex.supersetId);
            if (partners.length > 1) supersetLetter.set(ex.supersetId, String.fromCharCode(65 + letterIndex++));
        });

        (w.exercises || []).forEach(ex => {
            const meta = Store.exercise(ex.exerciseId);
            const vol = ex.sets.filter(Stats.isWorkingSet).reduce((s, x) => s + Stats.setVolume(x), 0);
            const ssLetter = ex.supersetId ? supersetLetter.get(ex.supersetId) : null;
            html += `
                <div class="card">
                    <div class="card-head" style="margin-bottom:8px">
                        <h3>${UI.esc(meta ? meta.name : 'Unknown exercise')}${ssLetter ? `<span class="badge badge-ss">SS ${ssLetter}</span>` : ''}${recordIds.has(ex.exerciseId) ? '<span class="badge badge-pr">PR</span>' : ''}</h3>
                        <span class="card-sub">${Stats.fmtVolume(vol)} ${Store.unit()}</span>
                    </div>
                    ${ex.notes ? `<div class="detail-note">${UI.esc(ex.notes)}</div>` : ''}
                    ${ex.notesL ? `<div class="detail-note"><b>L</b> ${UI.esc(ex.notesL)}</div>` : ''}
                    ${ex.notesR ? `<div class="detail-note"><b>R</b> ${UI.esc(ex.notesR)}</div>` : ''}
                    ${(() => { let n = 0; return ex.sets.map((s) => {
                        if (s.type !== 'warmup') n++;
                        const uni = Stats.isUnilateralSet(s);
                        const reps = uni ? `${s.repsL || 0} / ${s.repsR || 0}` : `${s.reps || 0}`;
                        const tag = s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : String(n);
                        return `
                            <div class="detail-set">
                                <div class="detail-set-n">${tag}</div>
                                <div class="detail-set-val">${Stats.fmtWeight(Stats.setWeight(s))} <span style="font-size:.75rem;color:var(--ink-2)">${Store.unit()}</span></div>
                                <div class="detail-set-x">&times;</div>
                                <div class="detail-set-val">${reps} <span style="font-size:.75rem;color:var(--ink-2)">reps</span></div>
                                <div class="grow"></div>
                                <div class="tiny muted">${Stats.fmtWeight(Stats.setE1rm(s), { decimals: 0 })} ${Store.unit()} 1RM</div>
                            </div>`;
                    }).join(''); })()}
                </div>`;
        });

        detailBody().innerHTML = html;
        UI.openScreen('screen-workout-detail');
    }

    function closeDetail() {
        detailId = null;
        UI.closeScreen('screen-workout-detail');
    }

    function detailMenu() {
        const w = Store.workout(detailId);
        if (!w) return;
        UI.actionSheet({
            title: Stats.workoutTitle(w),
            actions: [
                { label: 'Repeat This Workout', plain: true, onSelect: () => repeatWorkout(w) },
                { label: 'Save as Routine', plain: true, onSelect: async () => {
                    const name = await UI.prompt({
                        title: 'Save as Routine',
                        value: Stats.workoutTitle(w),
                        placeholder: 'Routine name',
                    });
                    if (name === null || !name.trim()) return;
                    Routines.createFromWorkout(w, name.trim());
                    UI.toast({ title: 'Routine saved', tone: 'success' });
                    App.refreshAll();
                } },
                { label: 'Delete Workout', destructive: true, onSelect: async () => {
                    const ok = await UI.confirm({
                        title: 'Delete workout?',
                        message: 'This cannot be undone.',
                        confirmLabel: 'Delete', destructive: true,
                    });
                    if (!ok) return;
                    Store.deleteWorkout(w.id);
                    closeDetail();
                    render();
                    App.refreshAll();
                    UI.toast({ title: 'Workout deleted', tone: 'info' });
                } },
            ],
        });
    }

    /** Starts a new session with the same exercises; sets are prefilled from the last time. */
    async function repeatWorkout(w) {
        if (Workout.isActive()) {
            UI.alert({ title: 'Workout in progress', message: 'Finish or discard the running workout first.' });
            return;
        }
        closeDetail();
        setTimeout(() => {
            Workout.start();
            Workout.addExercises(w.exercises.map(ex => ex.exerciseId));
        }, 360);
    }

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    function bindDynamic() {
        const root = body();

        root.querySelectorAll('[data-role="mode"] button').forEach(btn => {
            btn.addEventListener('click', () => {
                mode = btn.dataset.mode;
                render();
            });
        });

        const search = root.querySelector('[data-role="search"]');
        if (search) {
            search.addEventListener('input', (e) => {
                query = e.target.value;
                const pos = e.target.selectionStart;
                render();
                const next = body().querySelector('[data-role="search"]');
                if (next) { next.focus(); next.setSelectionRange(pos, pos); }
            });
        }
    }

    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'open-detail': openDetail(btn.dataset.id); break;
                case 'prev-month':
                    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
                    render();
                    break;
                case 'next-month': {
                    const now = new Date();
                    if (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()) return;
                    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                    render();
                    break;
                }
            }
        });

        document.getElementById('btn-detail-back').addEventListener('click', closeDetail);
        document.getElementById('btn-detail-menu').addEventListener('click', detailMenu);
    }

    return { render, bind, openDetail, closeDetail };
})();

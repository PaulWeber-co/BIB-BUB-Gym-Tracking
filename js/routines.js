/* ============================================================
   ROUTINES — reusable workout templates and their editor.
   ============================================================ */

const Routines = (() => {

    let draft = null;   // routine being edited

    const body = () => document.getElementById('routines-body');
    const editorBody = () => document.getElementById('routine-editor-body');

    // ------------------------------------------------------------
    // Tab
    // ------------------------------------------------------------
    function render() {
        const routines = Store.routines();
        const parts = [];

        parts.push(`
            <button class="btn btn-fill btn-block" data-act="start-empty" style="margin-top:6px">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Start Empty Workout
            </button>`);

        parts.push(`
            <div class="section-title">
                <h2>Routines</h2>
                <button class="section-link" data-act="new-routine">New</button>
            </div>`);

        if (routines.length === 0) {
            parts.push(`
                <div class="card">
                    <div class="empty">
                        <strong>No routines yet</strong>
                        Build a routine once, then start it with a single tap — target weights and reps are filled in for you.
                    </div>
                    <button class="btn btn-tint btn-block" data-act="new-routine">Create Routine</button>
                </div>`);
        } else {
            routines.forEach(r => {
                const exCount = r.exercises.length;
                const setCount = r.exercises.reduce((s, ex) => s + (ex.sets ? ex.sets.length : 0), 0);
                const lastUse = lastPerformed(r.id);
                const preview = r.exercises.slice(0, 4)
                    .map(ex => `${ex.sets ? ex.sets.length : 0} × ${Store.exerciseName(ex.exerciseId)}`)
                    .join('\n');
                const more = exCount > 4 ? `\n+${exCount - 4} more` : '';

                parts.push(`
                    <div class="card">
                        <div class="row-between" style="align-items:flex-start">
                            <div class="grow">
                                <div class="hist-name">${UI.esc(r.name)}</div>
                                <div class="hist-date">${exCount} exercises &middot; ${setCount} sets${lastUse ? ` &middot; last ${Stats.fmtRelativeDay(lastUse)}` : ''}</div>
                            </div>
                            <button class="icon-btn" data-act="routine-menu" data-id="${r.id}" aria-label="Routine options">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                            </button>
                        </div>
                        <div class="hist-exercises mt-8" style="white-space:pre-line">${UI.esc(preview + more)}</div>
                        <button class="btn btn-tint btn-block mt-8" data-act="start-routine" data-id="${r.id}">Start Routine</button>
                    </div>`);
            });
        }

        body().innerHTML = parts.join('');
    }

    function lastPerformed(routineId) {
        const w = Store.workouts().find(x => x.routineId === routineId);
        return w ? w.date : null;
    }

    async function startRoutine(id) {
        if (Workout.isActive()) {
            const ok = await UI.confirm({
                title: 'Workout in progress',
                message: 'Finish or discard the running workout first.',
                confirmLabel: 'Open Workout',
            });
            if (ok) Workout.resume();
            return;
        }
        Workout.start(id);
    }

    function openMenu(id) {
        const r = Store.routine(id);
        if (!r) return;
        UI.actionSheet({
            title: r.name,
            actions: [
                { label: 'Start Routine', plain: true, onSelect: () => startRoutine(id) },
                { label: 'Edit', plain: true, onSelect: () => openEditor(id) },
                { label: 'Duplicate', plain: true, onSelect: () => {
                    const copy = JSON.parse(JSON.stringify(r));
                    delete copy.id;
                    copy.name = `${r.name} Copy`;
                    Store.saveRoutine(copy);
                    render();
                    UI.toast({ title: 'Routine duplicated', tone: 'success' });
                } },
                { label: 'Delete Routine', destructive: true, onSelect: async () => {
                    const ok = await UI.confirm({
                        title: `Delete "${r.name}"?`,
                        message: 'Workouts already logged with it are kept.',
                        confirmLabel: 'Delete', destructive: true,
                    });
                    if (!ok) return;
                    Store.deleteRoutine(id);
                    render();
                    App.refreshAll();
                } },
            ],
        });
    }

    // ------------------------------------------------------------
    // Editor
    // ------------------------------------------------------------
    function openEditor(id = null) {
        if (id) {
            const existing = Store.routine(id);
            draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
        }
        if (!draft || !id) draft = { name: '', exercises: [] };

        document.getElementById('routine-editor-title').textContent = id ? 'Edit Routine' : 'New Routine';
        UI.openScreen('screen-routine-editor');
        renderEditor();
    }

    function closeEditor() {
        draft = null;
        UI.closeScreen('screen-routine-editor');
    }

    function renderEditor() {
        if (!draft) return;
        const parts = [];

        parts.push(`
            <div class="field">
                <input class="input" data-act="name" placeholder="Routine name, e.g. Push Day"
                    value="${UI.esc(draft.name)}" autocomplete="off">
            </div>`);

        if (draft.exercises.length === 0) {
            parts.push(`
                <div class="empty">
                    <strong>No exercises</strong>
                    Add exercises and set your target weights and reps.
                </div>`);
        }

        draft.exercises.forEach((ex, i) => {
            const meta = Store.exercise(ex.exerciseId);
            const uni = !!ex.isUnilateral;
            const gridClass = uni ? 'set-grid-2' : 'set-grid-1';

            const header = uni
                ? `<div class="set-head ${gridClass}"><span>Set</span><span>Target</span><span>${Store.unit()}</span><span>L</span><span>R</span><span></span></div>`
                : `<div class="set-head ${gridClass}"><span>Set</span><span>Target</span><span>${Store.unit()}</span><span>Reps</span><span></span></div>`;

            const rows = (ex.sets || []).map((set, j) => {
                const inputs = uni
                    ? `<input class="set-input" inputmode="numeric" data-field="repsL" data-ex="${i}" data-set="${j}" value="${set.repsL ?? ''}" placeholder="0">
                       <input class="set-input" inputmode="numeric" data-field="repsR" data-ex="${i}" data-set="${j}" value="${set.repsR ?? ''}" placeholder="0">`
                    : `<input class="set-input" inputmode="numeric" data-field="reps" data-ex="${i}" data-set="${j}" value="${set.reps ?? ''}" placeholder="0">`;
                return `
                    <div class="set-row ${gridClass}" data-ex="${i}" data-set="${j}">
                        <div class="set-tag">${j + 1}</div>
                        <div class="set-prev">${set.type === 'warmup' ? 'Warm-up' : 'Working'}</div>
                        <input class="set-input" inputmode="decimal" data-field="weight" data-ex="${i}" data-set="${j}" value="${weightValue(set.weight)}" placeholder="0">
                        ${inputs}
                        <button class="set-check" data-act="remove-set" data-ex="${i}" data-set="${j}" aria-label="Remove set">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>`;
            }).join('');

            parts.push(`
                <div class="wex" data-ex="${i}">
                    <div class="wex-head">
                        <div class="wex-title">
                            <div class="wex-name">${UI.esc(meta ? meta.name : 'Unknown exercise')}${uni ? '<span class="badge badge-lr">L/R</span>' : ''}</div>
                            <div class="wex-meta">${(ex.sets || []).length} sets${ex.restSeconds ? ` &middot; rest ${Stats.fmtClock(ex.restSeconds * 1000)}` : ''}</div>
                        </div>
                        <button class="icon-btn" data-act="ex-menu" data-ex="${i}" aria-label="Options">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                        </button>
                    </div>
                    ${header}
                    ${rows}
                    <div class="wex-foot">
                        <button class="btn btn-sm btn-add" data-act="add-set" data-ex="${i}">Add Set</button>
                    </div>
                </div>`);
        });

        parts.push(`
            <button class="btn btn-tint btn-block" data-act="add-exercise">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Exercise
            </button>`);

        editorBody().innerHTML = parts.join('');
    }

    function weightValue(kg) {
        if (kg === '' || kg === null || kg === undefined) return '';
        const v = Store.toDisplay(Number(kg));
        return String(Math.round(v * 100) / 100);
    }

    function addExercises(ids) {
        ids.forEach(id => {
            const meta = Store.exercise(id);
            const last = Stats.lastSession(id);
            const sets = last && last.sets.length
                ? last.sets.slice(0, 6).map(s => ({
                    weight: Stats.setWeight(s) || '',
                    reps: s.reps ?? '',
                    repsL: s.repsL ?? '',
                    repsR: s.repsR ?? '',
                    type: s.type === 'warmup' ? 'warmup' : 'normal',
                }))
                : [{ weight: '', reps: '', repsL: '', repsR: '', type: 'normal' }];

            draft.exercises.push({
                exerciseId: id,
                isUnilateral: meta ? !!meta.isUnilateral : false,
                restSeconds: null,
                sets,
            });
        });
        renderEditor();
    }

    function save() {
        if (!draft) return;
        const name = (draft.name || '').trim();
        if (!name) {
            UI.alert({ title: 'Name missing', message: 'Give the routine a name so you can find it again.' });
            return;
        }
        if (draft.exercises.length === 0) {
            UI.alert({ title: 'No exercises', message: 'Add at least one exercise to the routine.' });
            return;
        }
        draft.name = name;
        Store.saveRoutine(draft);
        closeEditor();
        render();
        App.refreshAll();
        UI.toast({ title: 'Routine saved', tone: 'success' });
    }

    function createFromWorkout(workout, name) {
        const routine = {
            name,
            exercises: workout.exercises.map(ex => ({
                exerciseId: ex.exerciseId,
                isUnilateral: !!ex.isUnilateral,
                restSeconds: null,
                sets: ex.sets.map(s => ({
                    weight: Number(s.weight) || '',
                    reps: s.reps ?? '',
                    repsL: s.repsL ?? '',
                    repsR: s.repsR ?? '',
                    type: s.type || 'normal',
                })),
            })),
        };
        return Store.saveRoutine(routine);
    }

    // ------------------------------------------------------------
    // Events
    // ------------------------------------------------------------
    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            switch (btn.dataset.act) {
                case 'start-empty': App.startEmptyWorkout(); break;
                case 'new-routine': openEditor(); break;
                case 'start-routine': startRoutine(btn.dataset.id); break;
                case 'routine-menu': openMenu(btn.dataset.id); break;
            }
        });

        const ed = editorBody();

        ed.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const i = Number(btn.dataset.ex);
            const j = Number(btn.dataset.set);
            switch (btn.dataset.act) {
                case 'add-exercise': Picker.open({ onPick: addExercises }); break;
                case 'add-set': {
                    const sets = draft.exercises[i].sets;
                    const last = sets[sets.length - 1];
                    sets.push(last ? { ...last } : { weight: '', reps: '', repsL: '', repsR: '', type: 'normal' });
                    renderEditor();
                    break;
                }
                case 'remove-set': {
                    draft.exercises[i].sets.splice(j, 1);
                    if (draft.exercises[i].sets.length === 0) draft.exercises.splice(i, 1);
                    renderEditor();
                    break;
                }
                case 'ex-menu': {
                    const ex = draft.exercises[i];
                    UI.actionSheet({
                        title: Store.exerciseName(ex.exerciseId),
                        actions: [
                            { label: ex.isUnilateral ? 'Track Both Sides Together' : 'Track Left / Right Separately', plain: true, onSelect: () => {
                                ex.isUnilateral = !ex.isUnilateral; renderEditor();
                            } },
                            { label: 'Rest Timer', plain: true, onSelect: () => {
                                UI.actionSheet({
                                    title: 'Rest between sets',
                                    actions: [0, 45, 60, 90, 120, 150, 180, 240].map(sec => ({
                                        label: sec === 0 ? 'Use default' : Stats.fmtClock(sec * 1000),
                                        plain: true,
                                        onSelect: () => { ex.restSeconds = sec || null; renderEditor(); },
                                    })),
                                });
                            } },
                            { label: 'Move Up', plain: true, onSelect: () => {
                                if (i === 0) return;
                                const [item] = draft.exercises.splice(i, 1);
                                draft.exercises.splice(i - 1, 0, item);
                                renderEditor();
                            } },
                            { label: 'Move Down', plain: true, onSelect: () => {
                                if (i >= draft.exercises.length - 1) return;
                                const [item] = draft.exercises.splice(i, 1);
                                draft.exercises.splice(i + 1, 0, item);
                                renderEditor();
                            } },
                            { label: 'Remove Exercise', destructive: true, onSelect: () => {
                                draft.exercises.splice(i, 1); renderEditor();
                            } },
                        ],
                    });
                    break;
                }
            }
        });

        ed.addEventListener('input', (e) => {
            const input = e.target;
            if (input.dataset.act === 'name') { draft.name = input.value; return; }
            if (!input.classList.contains('set-input')) return;
            const set = draft.exercises[Number(input.dataset.ex)].sets[Number(input.dataset.set)];
            const field = input.dataset.field;
            if (field === 'weight') set.weight = input.value === '' ? '' : Store.toBase(UI.num(input.value));
            else set[field] = input.value === '' ? '' : Math.round(UI.num(input.value));
        });

        document.getElementById('btn-new-routine').addEventListener('click', () => openEditor());
        document.getElementById('btn-routine-save').addEventListener('click', save);
        document.getElementById('btn-routine-cancel').addEventListener('click', async () => {
            if (draft && (draft.name || draft.exercises.length)) {
                const ok = await UI.confirm({
                    title: 'Discard changes?',
                    confirmLabel: 'Discard', destructive: true,
                });
                if (!ok) return;
            }
            closeEditor();
        });
    }

    return { render, bind, openEditor, closeEditor, createFromWorkout, startRoutine };
})();

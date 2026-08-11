/* ============================================================
   EXERCISES — Übungsbibliothek, Editor und Übungs-Detailansicht
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Verwaltet die Übungs-Bibliothek ("Exercises"-Tab):
   1. render(): Zeigt die durchsuchbare Übungsliste mit Muskel-Filter
   2. openEditor(): Sheet zum Erstellen/Bearbeiten eigener Übungen
   3. openDetail(): Detailseite einer Übung mit 1RM-Graph & Historie
   4. detailMenu(): Optionen (Trends anzeigen, Bearbeiten, Löschen)
   ============================================================ */

const Exercises = (() => {

    let query = '';       // Aktueller Suchtext
    let muscle = '';      // Aktueller Muskelgruppen-Filter
    let detailId = null;  // ID der Übung, deren Detailansicht offen ist

    const body = () => document.getElementById('exercises-body');
    const detailBody = () => document.getElementById('exercise-detail-body');

    /* ──────────────────────────────────────────────────────────
       LIBRARY — Die Übungsliste im "Exercises"-Tab
       ────────────────────────────────────────────────────────── */

    /**
     * render() — Baut den Exercises-Tab auf.
     *
     * ABLAUF:
     * 1. Alle trainierten Übungs-IDs ermitteln (für "trained" Badge)
     * 2. Suchfeld und Muskelgruppen-Chips rendern
     * 3. Übungen filtern und alphabetisch geordnet mit Buchstaben-Headern (A, B, C...) anzeigen
     */
    function render() {
        const results = Store.searchExercises(query, muscle);
        const trainedCount = new Set();
        Store.workouts().forEach(w => (w.exercises || []).forEach(ex => trainedCount.add(ex.exerciseId)));

        let html = `
            <div class="search-field">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                <input class="input" type="search" data-role="search" placeholder="Search exercises"
                    value="${UI.esc(query)}" autocomplete="off" autocorrect="off" spellcheck="false">
            </div>
            <div class="chips">
                <button class="chip ${muscle === '' ? 'is-active' : ''}" data-muscle="">All</button>
                ${Store.MUSCLES.map(m => `<button class="chip ${muscle === m ? 'is-active' : ''}" data-muscle="${m}">${m}</button>`).join('')}
            </div>`;

        if (results.length === 0) {
            html += `<div class="card"><div class="empty"><strong>Nothing found</strong>
                Create your own exercise with the plus button.</div></div>`;
        } else {
            html += '<div class="list">';
            let letter = '';
            results.forEach(ex => {
                const first = ex.name[0].toUpperCase();
                if (!query && first !== letter) {
                    letter = first;
                    html += `<div class="list-letter">${UI.esc(letter)}</div>`;
                }
                html += `
                    <button class="pick-row" data-act="open-detail" data-id="${ex.id}">
                        ${Picker.avatar(ex)}
                        <div class="pick-main">
                            <div class="pick-name">${UI.esc(ex.name)}${ex.isCustom ? '<span class="badge badge-custom">Custom</span>' : ''}${ex.isUnilateral ? '<span class="badge badge-lr">L/R</span>' : ''}</div>
                            <div class="pick-meta">${UI.esc(ex.muscleGroup)} &middot; ${UI.esc(ex.category)}${trainedCount.has(ex.id) ? ' &middot; trained' : ''}</div>
                        </div>
                        <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>`;
            });
            html += '</div>';
            html += `<p class="tiny muted center">${results.length} exercises</p>`;
        }

        body().innerHTML = html;
        bindDynamic();
    }

    /**
     * bindDynamic() — Verbindet Suchfeld und Muskel-Chips mit Event-Listenern.
     * Beim Eintippen im Suchfeld bleibt die Cursor-Position erhalten.
     */
    function bindDynamic() {
        const search = body().querySelector('[data-role="search"]');
        if (search) {
            search.addEventListener('input', (e) => {
                query = e.target.value;
                const pos = e.target.selectionStart;
                render();
                const next = body().querySelector('[data-role="search"]');
                if (next) { next.focus(); next.setSelectionRange(pos, pos); }
            });
        }
        body().querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => { muscle = chip.dataset.muscle; render(); });
        });
    }

    /* ──────────────────────────────────────────────────────────
       CREATE / EDIT — Übung erstellen oder bearbeiten
       ────────────────────────────────────────────────────────── */

    /**
     * openEditor(id, onDone, prefillName) — Öffnet ein Sheet zum Erstellen/Editieren einer Übung.
     *
     * FELDER:
     * - Name (z.B. "Cable Lateral Raise")
     * - Muscle Group (Chest, Back, Legs, Shoulders, Arms, Core)
     * - Equipment Category (Barbell, Dumbbell, Machine, Cable, Bodyweight, Other)
     * - Unilateral (Toggle für L/R getrenntes Tracking)
     * - Barbell exercise (Toggle für Hantelscheiben-Rechner)
     */
    function openEditor(id = null, onDone = null, prefillName = '') {
        const existing = id ? Store.exercise(id) : null;

        UI.sheet({
            title: existing ? 'Edit Exercise' : 'New Exercise',
            left: 'Cancel',
            right: 'Save',
            onRight: (api) => {
                const name = api.root.querySelector('[data-f="name"]').value.trim();
                const muscleGroup = api.root.querySelector('[data-f="muscle"]').value;
                const category = api.root.querySelector('[data-f="category"]').value;
                const isUnilateral = api.root.querySelector('[data-f="unilateral"]').classList.contains('is-on');
                const isBarbell = api.root.querySelector('[data-f="barbell"]').classList.contains('is-on');

                if (!name) { UI.alert({ title: 'Name missing', message: 'Every exercise needs a name.' }); return; }
                if (!muscleGroup) { UI.alert({ title: 'Muscle group missing', message: 'Pick a muscle group so the exercise shows up in your split.' }); return; }
                if (!category) { UI.alert({ title: 'Category missing', message: 'Pick an equipment category.' }); return; }

                const saved = Store.saveExercise({
                    id: existing && existing.isCustom ? existing.id : undefined,
                    name, muscleGroup, category, isUnilateral, isBarbell,
                });
                api.close();
                render();
                UI.toast({ title: existing ? 'Exercise updated' : 'Exercise created', tone: 'success' });
                if (onDone) onDone(saved);
            },
            onLeft: (api) => { api.close(); if (onDone) onDone(null); },
            build: (el) => {
                el.innerHTML = `
                    <div class="field">
                        <label>Name</label>
                        <input class="input" data-f="name" placeholder="e.g. Cable Lateral Raise"
                            value="${UI.esc(existing ? existing.name : prefillName)}" autocomplete="off">
                    </div>
                    <div class="field">
                        <label>Muscle group</label>
                        <select class="input" data-f="muscle">
                            <option value="">Select</option>
                            ${Store.MUSCLES.map(m => `<option value="${m}" ${existing && existing.muscleGroup === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field">
                        <label>Equipment</label>
                        <select class="input" data-f="category">
                            <option value="">Select</option>
                            ${Store.CATEGORIES.map(c => `<option value="${c}" ${existing && existing.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="list">
                        <div class="switch-row">
                            <div class="switch-row-main">
                                <div class="switch-row-title">Unilateral</div>
                                <div class="switch-row-sub">Log left and right side separately.</div>
                            </div>
                            <button class="switch ${existing && existing.isUnilateral ? 'is-on' : ''}" data-f="unilateral" role="switch"></button>
                        </div>
                        <div class="switch-row">
                            <div class="switch-row-main">
                                <div class="switch-row-title">Barbell exercise</div>
                                <div class="switch-row-sub">Enables the plate calculator during the workout.</div>
                            </div>
                            <button class="switch ${existing && existing.isBarbell ? 'is-on' : ''}" data-f="barbell" role="switch"></button>
                        </div>
                    </div>
                    ${existing && !existing.isCustom
                        ? '<p class="tiny muted center">Built-in exercises are saved as your own copy when edited.</p>'
                        : ''}`;

                el.querySelectorAll('.switch').forEach(sw => {
                    sw.addEventListener('click', () => {
                        sw.classList.toggle('is-on');
                        UI.haptic('tap');
                    });
                });
            },
        });
    }

    /* ──────────────────────────────────────────────────────────
       DETAIL — Vollbild-Detailseite einer Übung
       ────────────────────────────────────────────────────────── */

    /**
     * openDetail(id) — Öffnet die Detailseite einer Übung mit:
     * - Bestleistungen (Best est. 1RM, Heaviest set, Best session, Sessions count)
     * - 1RM-Liniendiagramm über alle absolvierten Sessions
     * - Historie aller früheren Einheiten mit dieser Übung
     */
    function openDetail(id) {
        const ex = Store.exercise(id);
        if (!ex) return;
        detailId = id;

        const series = Stats.exerciseSeries(id);
        const rec = Stats.records(id);
        document.getElementById('exercise-detail-title').textContent = ex.name;

        const points = series.map(s => ({
            y: Store.toDisplay(s.e1rm),
            label: new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        }));

        let html = `
            <div class="card">
                <div class="row" style="gap:14px">
                    ${Muscles.hero(ex)}
                    <div class="grow">
                        <div class="hist-name">${UI.esc(ex.name)}</div>
                        <div class="hist-date">${UI.esc(ex.muscleGroup)} &middot; ${UI.esc(ex.category)}${ex.isUnilateral ? ' &middot; L/R' : ''}</div>
                    </div>
                </div>
            </div>`;

        if (series.length === 0) {
            html += `<div class="card"><div class="empty"><strong>Not trained yet</strong>
                Add this exercise to a workout and your progression appears here.</div></div>`;
        } else {
            html += `
                <div class="tile-grid">
                    <div class="tile">
                        <div class="tile-label">Best est. 1RM</div>
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
                </div>`;

            if (points.length > 1) {
                html += `
                    <div class="card">
                        <div class="card-head"><h3>Estimated 1RM</h3><span class="card-sub">${points.length} sessions</span></div>
                        <div class="chart-wrap">${Charts.line(points, {
                            height: 165,
                            formatValue: v => String(Math.round(v * 10) / 10),
                            ariaLabel: 'Estimated one rep max progression',
                        })}</div>
                    </div>`;
            }

            html += `
                <div class="section-title"><h2 style="font-size:1.0625rem">History</h2></div>
                <div class="list">
                    ${series.slice().reverse().slice(0, 20).map(s => `
                        <button class="list-row" data-act="open-workout" data-id="${s.workoutId}">
                            <div class="list-row-main">
                                <div class="list-row-title">${UI.esc(Stats.fmtRelativeDay(s.date))}</div>
                                <div class="list-row-sub">${s.sets} sets &middot; ${Stats.fmtVolume(s.volume)} ${Store.unit()} &middot; top ${Stats.fmtWeight(s.maxWeight)} ${Store.unit()}</div>
                            </div>
                            <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>`).join('')}
                </div>`;
        }

        detailBody().innerHTML = html;
        UI.openScreen('screen-exercise-detail');
    }

    /** closeDetail() — Schließt den Detailansicht-Screen. */
    function closeDetail() {
        detailId = null;
        UI.closeScreen('screen-exercise-detail');
    }

    /** detailMenu() — ActionSheet für Zusatzaktionen (Trends, Editieren, Löschen). */
    function detailMenu() {
        const ex = Store.exercise(detailId);
        if (!ex) return;
        const actions = [
            { label: 'Show in Trends', plain: true, onSelect: () => { closeDetail(); setTimeout(() => Trends.showExercise(ex.id), 360); } },
            { label: ex.isCustom ? 'Edit Exercise' : 'Duplicate as Custom', plain: true, onSelect: () => {
                openEditor(ex.isCustom ? ex.id : null, (saved) => {
                    if (saved) openDetail(saved.id);
                }, ex.isCustom ? '' : `${ex.name} (variant)`);
            } },
        ];

        if (ex.isCustom) {
            actions.push({ label: 'Delete Exercise', destructive: true, onSelect: async () => {
                const ok = await UI.confirm({
                    title: `Delete "${ex.name}"?`,
                    message: 'Workouts that used it keep their logged sets.',
                    confirmLabel: 'Delete', destructive: true,
                });
                if (!ok) return;
                Store.deleteExercise(ex.id);
                closeDetail();
                render();
            } });
        }

        UI.actionSheet({ title: ex.name, actions });
    }

    /* ──────────────────────────────────────────────────────────
       EVENTS — Event-Binding für Clicks
       ────────────────────────────────────────────────────────── */
    function bind() {
        body().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            if (btn.dataset.act === 'open-detail') openDetail(btn.dataset.id);
        });

        detailBody().addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            if (btn.dataset.act === 'open-workout') {
                closeDetail();
                setTimeout(() => History.openDetail(btn.dataset.id), 360);
            }
        });

        document.getElementById('btn-new-exercise').addEventListener('click', () => openEditor());
        document.getElementById('btn-exercise-detail-back').addEventListener('click', closeDetail);
        document.getElementById('btn-exercise-detail-menu').addEventListener('click', detailMenu);
    }

    return { render, bind, openEditor, openDetail, closeDetail };
})();

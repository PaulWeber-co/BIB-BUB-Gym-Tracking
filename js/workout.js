/* ============================================================
   WORKOUT — Der Live-Trainingsbildschirm
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   workout.js ist das "Herzstück" der App. Hier loggst du dein Training live:
   - Laufende Stoppuhr (Trainingsdauer)
   - Übungen hinzufügen, umsortieren, löschen
   - Sätze loggen: Gewicht, Wiederholungen (oder L/R getrennt bei unilateralen Übungen)
   - Satz-Typen: Normal, Warm-up (W), Drop-Set (D), bis zum Muskelversagen (F)
   - Live PR-Erkennung: Toast-Meldung + Vibration bei neuen Rekorden!
   - Automatischer Pausen-Timer zwischen Sätzen
   - Langhantel-Scheibenrechner (Plate Calculator)
   - "Previous"-Spalte: Zeigt, was du beim letzten Mal geschafft hast
   - Automatisches Speichern im localStorage nach JEDEM Tastendruck
   ============================================================ */

const Workout = (() => {

    let current = null;          // { id, date, startedAt, name, routineId, exercises[], rest }
    let tickTimer = null;        // Sekundentimer für die laufende Uhr
    let bestCache = {};          // exerciseId -> { e1rm, weight } vor diesem Workout (für PR-Prüfung)
    let rest = null;             // { endsAt, total } für den Pausen-Timer

    const body = () => document.getElementById('workout-body');

    /* ──────────────────────────────────────────────────────────
       LIFECYCLE — Workout starten, wiederherstellen, minimieren
       ────────────────────────────────────────────────────────── */

    /**
     * start(routineId) — Startet ein neues Workout.
     * Wenn routineId übergeben wurde → Übungen und Sätze aus der Routine laden.
     */
    function start(routineId = null) {
        const routine = routineId ? Store.routine(routineId) : null;

        current = {
            id: Store.uid('workout'),
            date: new Date().toISOString(),
            startedAt: Date.now(),
            name: routine ? routine.name : '',
            routineId: routineId || null,
            exercises: [],
        };

        if (routine) {
            routine.exercises.forEach(ex => addExerciseObject(ex.exerciseId, {
                isUnilateral: ex.isUnilateral,
                supersetId: ex.supersetId,
                restSeconds: ex.restSeconds,
                sets: (ex.sets || []).map(s => ({
                    weight: s.weight === '' || s.weight === undefined ? '' : Number(s.weight),
                    reps: s.reps === '' || s.reps === undefined ? '' : Number(s.reps),
                    repsL: s.repsL === '' || s.repsL === undefined ? '' : Number(s.repsL),
                    repsR: s.repsR === '' || s.repsR === undefined ? '' : Number(s.repsR),
                    type: s.type || 'normal',
                    completed: false,
                })),
            }));
        }

        primeCache();
        persist();
        openScreen();
        render();
    }

    /**
     * restore() — Stellt ein unterbrochenes Workout wieder her
     * (z.B. nach Reload oder wenn iOS die Seite neu geladen hat).
     */
    function restore() {
        const saved = Store.activeWorkout();
        if (!saved || !saved.startedAt) return false;
        current = saved;
        rest = saved.rest && saved.rest.endsAt > Date.now() ? saved.rest : null;
        primeCache();
        return true;
    }

    /** resume() — Öffnet den Workout-Screen des aktuell laufenden Trainings. */
    function resume() {
        if (!current) return;
        openScreen();
        render();
        if (rest) startRestTicker();
    }

    function isActive() { return current !== null; }
    function startedAt() { return current ? current.startedAt : 0; }

    /** primeCache() — Lädt die Rekorde VOR diesem Workout für die Live-PR-Prüfung. */
    function primeCache() {
        bestCache = {};
        if (!current) return;
        current.exercises.forEach(ex => {
            if (!bestCache[ex.exerciseId]) bestCache[ex.exerciseId] = Stats.bestBefore(ex.exerciseId, current.date);
        });
    }

    /** persist() — Spiegelt den aktuellen Stand nach jedem Klick in den localStorage. */
    function persist() {
        if (!current) { Store.clearActiveWorkout(); return; }
        Store.saveActiveWorkout({ ...current, rest });
    }

    function openScreen() {
        UI.openScreen('screen-workout');
        startTicker();
        UI.bindScrollShadow(body(), null);
    }

    function minimize() {
        UI.closeScreen('screen-workout');
    }

    /* ──────────────────────────────────────────────────────────
       CLOCK — Stoppuhr des laufenden Workouts
       ────────────────────────────────────────────────────────── */
    function startTicker() {
        stopTicker();
        tick();
        tickTimer = setInterval(tick, 1000);
    }

    function stopTicker() {
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    }

    function tick() {
        if (!current) return;
        const elapsed = Date.now() - current.startedAt;
        const clock = document.getElementById('workout-clock');
        if (clock) clock.textContent = Stats.fmtClock(elapsed);

        const totals = Stats.workoutTotals(current);
        const sub = document.getElementById('workout-subline');
        if (sub) {
            sub.textContent = `${Stats.fmtVolume(totals.volume)} ${Store.unit()} · ${totals.sets} ${totals.sets === 1 ? 'set' : 'sets'}`;
        }
        const mini = document.getElementById('mini-workout-time');
        if (mini) mini.textContent = Stats.fmtClock(elapsed);
        tickRest();
    }

    /* ──────────────────────────────────────────────────────────
       MUTATIONS — Hinzufügen, Bearbeiten & Löschen von Übungen & Sätzen
       ────────────────────────────────────────────────────────── */

    /**
     * addExerciseObject(exerciseId, overrides) — Fügt eine Übung hinzu.
     * Kopiert automatisch die Gewichte/Wiederholungen der letzten Einheit,
     * sodass man meistens nur noch auf das Häkchen tippen muss.
     */
    function addExerciseObject(exerciseId, overrides = {}) {
        const meta = Store.exercise(exerciseId);
        const last = Stats.lastSession(exerciseId, current.date);

        let sets = overrides.sets;
        if (!sets) {
            if (last && last.sets.length) {
                sets = last.sets.slice(0, 8).map(s => ({
                    weight: Stats.setWeight(s) || '',
                    reps: s.reps !== undefined && s.reps !== '' ? Number(s.reps) : '',
                    repsL: s.repsL !== undefined && s.repsL !== '' ? Number(s.repsL) : '',
                    repsR: s.repsR !== undefined && s.repsR !== '' ? Number(s.repsR) : '',
                    type: s.type === 'warmup' ? 'warmup' : 'normal',
                    completed: false,
                }));
            } else {
                const log = Store.bodyLog();
                const startWeight = meta && meta.category === 'Bodyweight' && log.length
                    ? Math.round(log[log.length - 1].weight * 10) / 10
                    : '';
                sets = [{ weight: startWeight, reps: '', repsL: '', repsR: '', type: 'normal', completed: false }];
            }
        }

        current.exercises.push({
            exerciseId,
            isUnilateral: overrides.isUnilateral !== undefined
                ? overrides.isUnilateral
                : (meta ? !!meta.isUnilateral : false),
            supersetId: overrides.supersetId || null,
            restSeconds: overrides.restSeconds || null,
            notes: overrides.notes || '',
            notesL: '',
            notesR: '',
            splitNotes: false,
            showNote: !!overrides.notes,
            sets,
        });

        if (!bestCache[exerciseId]) bestCache[exerciseId] = Stats.bestBefore(exerciseId, current.date);
    }

    function addExercises(ids) {
        if (!current) return;
        ids.forEach(id => addExerciseObject(id));
        persist();
        render();
        const nodes = body().querySelectorAll('.wex');
        if (nodes.length) nodes[nodes.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function removeExercise(i) {
        current.exercises.splice(i, 1);
        persist();
        render();
    }

    function moveExercise(i, dir) {
        const j = i + dir;
        if (j < 0 || j >= current.exercises.length) return;
        const [item] = current.exercises.splice(i, 1);
        current.exercises.splice(j, 0, item);
        persist();
        render();
    }

    // ------------------------------------------------------------
    // Supersets — a run of neighbouring exercises sharing an id
    // ------------------------------------------------------------
    /** Contiguous blocks of exercise indices; a block is a superset when it holds more than one. */
    function blocks() {
        const out = [];
        current.exercises.forEach((ex, i) => {
            const prev = out[out.length - 1];
            if (ex.supersetId && prev && prev.supersetId === ex.supersetId) prev.items.push(i);
            else out.push({ supersetId: ex.supersetId || null, items: [i] });
        });
        return out;
    }

    function blockOf(i) {
        return blocks().find(b => b.items.includes(i)) || null;
    }

    /** The next exercise of the same superset round, or null when there is none. */
    function nextInSuperset(i) {
        const block = blockOf(i);
        if (!block || block.items.length < 2) return null;
        const pos = block.items.indexOf(i);
        return pos < block.items.length - 1 ? block.items[pos + 1] : null;
    }

    function linkSuperset(i) {
        const a = current.exercises[i];
        const b = current.exercises[i + 1];
        if (!a || !b) return;
        const id = a.supersetId || b.supersetId || Store.uid('ss');
        a.supersetId = id;
        b.supersetId = id;
        persist();
        render();
        UI.haptic('select');
    }

    function unlinkSuperset(i) {
        const block = blockOf(i);
        current.exercises[i].supersetId = null;
        // a leftover group of one is not a superset
        if (block) {
            const rest = block.items.filter(x => x !== i);
            if (rest.length === 1) current.exercises[rest[0]].supersetId = null;
        }
        persist();
        render();
    }

    function addSet(i) {
        const ex = current.exercises[i];
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push({
            weight: last ? last.weight : '',
            reps: last ? last.reps : '',
            repsL: last ? last.repsL : '',
            repsR: last ? last.repsR : '',
            type: 'normal',
            completed: false,
        });
        persist();
        render();
    }

    function removeSet(i, j) {
        current.exercises[i].sets.splice(j, 1);
        if (current.exercises[i].sets.length === 0) current.exercises.splice(i, 1);
        persist();
        render();
    }

    /**
     * toggleSet(i, j) — Hakt einen Satz ab oder hebt das Häkchen auf.
     * Prüft auf neue Rekorde (PR) und startet automatisch den Pausen-Timer.
     */
    function toggleSet(i, j) {
        const ex = current.exercises[i];
        const set = ex.sets[j];
        set.completed = !set.completed;

        if (set.completed) {
            if (set.weight === '') set.weight = 0;
            UI.haptic(14);
            checkRecord(ex, set);

            // Inside a superset you move straight to the next exercise; the rest
            // timer only starts once the round is finished.
            const next = nextInSuperset(i);
            if (next !== null) {
                const node = body().querySelector(`.wex[data-ex="${next}"]`);
                if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (Store.settings().restAuto && set.type !== 'warmup') {
                startRest(ex.restSeconds || Store.settings().restDefault);
            }
        }

        persist();
        const row = body().querySelector(`.set-row[data-ex="${i}"][data-set="${j}"]`);
        if (row) {
            row.classList.toggle('is-done', set.completed);
            const check = row.querySelector('.set-check');
            if (check) check.classList.toggle('is-done', set.completed);
        }
        updateExerciseMeta(i);
        tick();
    }

    function setField(i, j, field, value) {
        const set = current.exercises[i].sets[j];
        if (field === 'weight') {
            set.weight = value === '' ? '' : Store.toBase(UI.num(value));
        } else {
            set.reps = field === 'reps' ? (value === '' ? '' : Math.round(UI.num(value))) : set.reps;
            set.repsL = field === 'repsL' ? (value === '' ? '' : Math.round(UI.num(value))) : set.repsL;
            set.repsR = field === 'repsR' ? (value === '' ? '' : Math.round(UI.num(value))) : set.repsR;
        }
        persist();
        updateExerciseMeta(i);
    }

    /**
     * checkRecord(ex, set) — Überprüft, ob ein Satz ein neuer persönlicher Rekord ist
     * (höchstes Gewicht oder bestes geschätztes 1RM).
     * Zeigt bei Rekord einen Toast-Hinweis und vibriert!
     */
    function checkRecord(ex, set) {
        const best = bestCache[ex.exerciseId] || { e1rm: 0, weight: 0 };
        const e = Stats.setE1rm(set);
        const w = Stats.setWeight(set);
        if (set.type === 'warmup' || (e <= 0 && w <= 0)) return;

        if (e > best.e1rm + 0.01 && best.e1rm > 0) {
            UI.toast({
                title: 'Personal record',
                sub: `${Store.exerciseName(ex.exerciseId)} · est. 1RM ${Stats.fmtWeight(e, { decimals: 1 })} ${Store.unit()}`,
                tone: 'record',
                duration: 3200,
            });
            UI.haptic('success');
        } else if (w > best.weight + 0.01 && best.weight > 0) {
            UI.toast({
                title: 'Heaviest set yet',
                sub: `${Store.exerciseName(ex.exerciseId)} · ${Stats.fmtWeight(w)} ${Store.unit()}`,
                tone: 'record',
                duration: 3200,
            });
            UI.haptic('success');
        }
        best.e1rm = Math.max(best.e1rm, e);
        best.weight = Math.max(best.weight, w);
        bestCache[ex.exerciseId] = best;
    }

    /* ──────────────────────────────────────────────────────────
       REST TIMER — Automatischer Pausen-Timer mit Fortschrittsbalken
       ────────────────────────────────────────────────────────── */
    let restTimer = null;

    function startRest(seconds) {
        rest = { endsAt: Date.now() + seconds * 1000, total: seconds };
        persist();
        renderRest();
        startRestTicker();
    }

    function startRestTicker() {
        if (restTimer) clearInterval(restTimer);
        renderRest();
        restTimer = setInterval(tickRest, 250);
    }

    function stopRest(silent = false) {
        rest = null;
        if (restTimer) { clearInterval(restTimer); restTimer = null; }
        const bar = document.getElementById('rest-bar');
        if (bar) bar.hidden = true;
        persist();
        if (!silent) UI.haptic('tap');
    }

    function adjustRest(delta) {
        if (!rest) return;
        rest.endsAt += delta * 1000;
        rest.total = Math.max(5, rest.total + delta);
        if (rest.endsAt <= Date.now()) { stopRest(); return; }
        persist();
        tickRest();
        UI.haptic('tap');
    }

    function renderRest() {
        const bar = document.getElementById('rest-bar');
        if (!bar) return;
        bar.hidden = !rest;
        tickRest();
    }

    function tickRest() {
        if (!rest) return;
        const left = rest.endsAt - Date.now();
        const bar = document.getElementById('rest-bar');
        if (!bar) return;

        if (left <= 0) {
            const label = document.getElementById('rest-time');
            if (label) label.textContent = '0:00';
            UI.beep(2);
            UI.haptic('alarm');
            UI.toast({ title: 'Rest complete', sub: 'Next set is up.', tone: 'success', duration: 2200 });
            stopRest(true);
            return;
        }

        bar.hidden = false;
        const label = document.getElementById('rest-time');
        if (label) label.textContent = Stats.fmtClock(left + 999);
        const progress = document.getElementById('rest-progress');
        if (progress) progress.style.width = `${Math.max(0, Math.min(100, (left / (rest.total * 1000)) * 100))}%`;
    }

    /* ──────────────────────────────────────────────────────────
       RENDERING — Baut die Live-Workout Benutzeroberfläche auf
       ────────────────────────────────────────────────────────── */
    function fmtInput(kg) {
        if (kg === '' || kg === null || kg === undefined) return '';
        const v = Store.toDisplay(kg);
        return String(Math.round(v * 100) / 100);
    }

    function prevText(set) {
        if (!set) return '';
        const w = Stats.fmtWeight(Stats.setWeight(set));
        if (Stats.isUnilateralSet(set)) {
            return `${w} × ${set.repsL || 0}/${set.repsR || 0}`;
        }
        return `${w} × ${set.reps || 0}`;
    }

    function setTagLabel(set, workingNumber) {
        if (set.type === 'warmup') return 'W';
        if (set.type === 'drop') return 'D';
        if (set.type === 'failure') return 'F';
        return String(workingNumber);
    }

    function previousFor(sets, lastSession) {
        if (!lastSession) return sets.map(() => null);
        const warm = lastSession.sets.filter(s => s.type === 'warmup');
        const work = lastSession.sets.filter(s => s.type !== 'warmup');
        let wi = 0, ki = 0;
        return sets.map(s => (s.type === 'warmup' ? warm[wi++] : work[ki++]) || null);
    }

    function exerciseMetaText(ex) {
        const done = ex.sets.filter(s => s.completed).length;
        const volume = ex.sets.filter(Stats.isWorkingSet).reduce((sum, s) => sum + Stats.setVolume(s), 0);
        const restLabel = ex.restSeconds ? ` · rest ${Stats.fmtClock(ex.restSeconds * 1000)}` : '';
        return `${done}/${ex.sets.length} sets · ${Stats.fmtVolume(volume)} ${Store.unit()}${restLabel}`;
    }

    function updateExerciseMeta(i) {
        const node = body().querySelector(`.wex[data-ex="${i}"] .wex-meta`);
        if (node) node.textContent = exerciseMetaText(current.exercises[i]);
    }

    /**
     * render() — Erzeugt das HTML für alle Übungen und Sätze des Workouts.
     * Rendert unilaterale Übungen mit zwei Spalten (L und R) und bilateral mit Reps.
     */
    function render() {
        if (!current) { body().innerHTML = ''; return; }

        const parts = [];

        if (current.exercises.length === 0) {
            parts.push(`
                <div class="empty" style="padding-top:60px">
                    <strong>Empty workout</strong>
                    Add your first exercise to start logging sets.
                </div>`);
        }

        const renderExercise = (i) => {
            const ex = current.exercises[i];
            const meta = Store.exercise(ex.exerciseId);
            const name = meta ? meta.name : 'Unknown exercise';
            const uni = !!ex.isUnilateral;
            const last = Stats.lastSession(ex.exerciseId, current.date);

            const head = `
                <div class="wex-head">
                    ${meta ? Muscles.thumb(meta, { size: 26 }) : ''}
                    <div class="wex-title" data-act="exercise-info" data-ex="${i}">
                        <div class="wex-name">${UI.esc(name)}${uni ? '<span class="badge badge-lr">L/R</span>' : ''}</div>
                        <div class="wex-meta">${UI.esc(exerciseMetaText(ex))}</div>
                    </div>
                    <button class="icon-btn" data-act="exercise-menu" data-ex="${i}" aria-label="Exercise options">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </button>
                </div>`;

            const note = noteHtml(ex, i);

            const gridClass = uni ? 'set-grid-2' : 'set-grid-1';
            const header = uni
                ? `<div class="set-head ${gridClass}"><span>Set</span><span>Previous</span><span>${Store.unit()}</span><span>L</span><span>R</span><span></span></div>`
                : `<div class="set-head ${gridClass}"><span>Set</span><span>Previous</span><span>${Store.unit()}</span><span>Reps</span><span></span></div>`;

            const prevSets = previousFor(ex.sets, last);
            let workingNumber = 0;

            const rows = ex.sets.map((set, j) => {
                if (set.type !== 'warmup') workingNumber++;
                const prev = prevSets[j] ? prevText(prevSets[j]) : '';
                const tag = setTagLabel(set, workingNumber);
                const tagClass = set.type === 'warmup' ? 'tag-warmup' : set.type === 'drop' ? 'tag-drop' : set.type === 'failure' ? 'tag-fail' : '';
                const inputs = uni
                    ? `<input class="set-input" inputmode="numeric" data-field="repsL" data-ex="${i}" data-set="${j}" value="${set.repsL === '' || set.repsL === undefined ? '' : set.repsL}" placeholder="0">
                       <input class="set-input" inputmode="numeric" data-field="repsR" data-ex="${i}" data-set="${j}" value="${set.repsR === '' || set.repsR === undefined ? '' : set.repsR}" placeholder="0">`
                    : `<input class="set-input" inputmode="numeric" data-field="reps" data-ex="${i}" data-set="${j}" value="${set.reps === '' || set.reps === undefined ? '' : set.reps}" placeholder="0">`;

                return `
                    <div class="set-row ${gridClass} ${set.completed ? 'is-done' : ''}" data-ex="${i}" data-set="${j}">
                        <button class="set-tag ${tagClass}" data-act="set-menu" data-ex="${i}" data-set="${j}">${tag}</button>
                        <button class="set-prev ${prev ? 'is-tappable' : ''}" data-act="use-prev" data-ex="${i}" data-set="${j}">${prev || '—'}</button>
                        <input class="set-input" inputmode="decimal" data-field="weight" data-ex="${i}" data-set="${j}" value="${fmtInput(set.weight)}" placeholder="0">
                        ${inputs}
                        <button class="set-check ${set.completed ? 'is-done' : ''}" data-act="toggle" data-ex="${i}" data-set="${j}" aria-label="Complete set">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                    </div>`;
            }).join('');

            return `
                <div class="wex" data-ex="${i}">
                    ${head}
                    ${note}
                    ${header}
                    ${rows}
                    <div class="wex-foot">
                        <button class="btn btn-sm btn-add" data-act="add-set" data-ex="${i}">Add Set</button>
                        ${meta && meta.isBarbell ? `<button class="btn btn-sm" data-act="plates" data-ex="${i}">Plates</button>` : ''}
                        <button class="btn btn-sm" data-act="rest-now" data-ex="${i}">Rest</button>
                    </div>
                </div>`;
        };

        let supersetCount = 0;
        blocks().forEach((block) => {
            if (block.items.length > 1) {
                const letter = String.fromCharCode(65 + supersetCount++);
                parts.push(`
                    <div class="superset">
                        <div class="superset-label">
                            <span>Superset ${letter}</span>
                            <span>${block.items.length} exercises</span>
                        </div>
                        ${block.items.map(renderExercise).join('')}
                    </div>`);
            } else {
                parts.push(renderExercise(block.items[0]));
            }
        });

        parts.push(`
            <button class="btn btn-tint btn-block" data-act="add-exercise">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Exercise
            </button>`);

        if (current.exercises.length > 0) {
            parts.push(`<button class="btn btn-danger btn-block" data-act="discard">Discard Workout</button>`);
        }

        body().innerHTML = parts.join('');
        autoSizeNotes();
    }

    function autoSizeNotes() {
        body().querySelectorAll('textarea[data-act="note"]').forEach(t => {
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
        });
    }

    /* ──────────────────────────────────────────────────────────
       MENUS & PLATE CALCULATOR
       ────────────────────────────────────────────────────────── */
    function openExerciseMenu(i) {
        const ex = current.exercises[i];
        const meta = Store.exercise(ex.exerciseId);
        const hasNote = ex.showNote || ex.notes || ex.notesL || ex.notesR;
        const block = blockOf(i);
        const inSuperset = !!(block && block.items.length > 1);

        const actions = [
            { label: hasNote ? 'Hide Note' : 'Add Note', plain: true, onSelect: () => {
                ex.showNote = !hasNote;
                if (!ex.showNote) { ex.notes = ''; ex.notesL = ''; ex.notesR = ''; }
                persist(); render();
            } },
        ];

        if (ex.isUnilateral) {
            actions.push({
                label: ex.splitNotes ? 'Single Note' : 'Separate L / R Notes',
                plain: true,
                onSelect: () => {
                    ex.splitNotes = !ex.splitNotes;
                    ex.showNote = true;
                    persist(); render();
                },
            });
        }

        actions.push(
            { label: `Rest Timer${ex.restSeconds ? ` (${Stats.fmtClock(ex.restSeconds * 1000)})` : ''}`, plain: true, onSelect: () => openRestPicker(i) },
            { label: ex.isUnilateral ? 'Track Both Sides Together' : 'Track Left / Right Separately', plain: true, onSelect: () => {
                ex.isUnilateral = !ex.isUnilateral;
                persist(); render();
            } },
        );

        if (inSuperset) {
            actions.push({ label: 'Remove from Superset', plain: true, onSelect: () => unlinkSuperset(i) });
        } else if (i < current.exercises.length - 1) {
            actions.push({
                label: `Superset with ${Store.exerciseName(current.exercises[i + 1].exerciseId)}`,
                plain: true,
                onSelect: () => linkSuperset(i),
            });
        }

        actions.push(
            { label: 'Exercise History', plain: true, onSelect: () => Exercises.openDetail(ex.exerciseId) },
            { label: 'Move Up', plain: true, onSelect: () => moveExercise(i, -1) },
            { label: 'Move Down', plain: true, onSelect: () => moveExercise(i, 1) },
            { label: 'Remove Exercise', destructive: true, onSelect: async () => {
                const ok = await UI.confirm({
                    title: 'Remove exercise?',
                    message: 'Logged sets for this exercise are discarded.',
                    confirmLabel: 'Remove', destructive: true,
                });
                if (ok) removeExercise(i);
            } },
        );

        UI.actionSheet({ title: meta ? meta.name : 'Exercise', actions });
    }

    function openSetMenu(i, j) {
        const set = current.exercises[i].sets[j];
        const setType = (type) => { set.type = type; persist(); render(); };
        UI.actionSheet({
            title: `Set ${j + 1}`,
            message: 'Warm-up sets are excluded from volume and records.',
            actions: [
                { label: 'Normal Set', plain: set.type !== 'normal', onSelect: () => setType('normal') },
                { label: 'Warm-up Set', plain: set.type !== 'warmup', onSelect: () => setType('warmup') },
                { label: 'Drop Set', plain: set.type !== 'drop', onSelect: () => setType('drop') },
                { label: 'To Failure', plain: set.type !== 'failure', onSelect: () => setType('failure') },
                { label: 'Delete Set', destructive: true, onSelect: () => removeSet(i, j) },
            ],
        });
    }

    function openRestPicker(i) {
        const ex = current.exercises[i];
        const options = [0, 45, 60, 90, 120, 150, 180, 240];
        UI.actionSheet({
            title: 'Rest between sets',
            message: 'Applies to this exercise in this workout.',
            actions: options.map(sec => ({
                label: sec === 0 ? 'Use default' : Stats.fmtClock(sec * 1000),
                plain: true,
                onSelect: () => {
                    ex.restSeconds = sec || null;
                    persist();
                    updateExerciseMeta(i);
                },
            })),
        });
    }

    /** openPlates(i) — Öffnet den Hantelscheiben-Rechner für Langhantel-Übungen. */
    function openPlates(i) {
        const ex = current.exercises[i];
        const lastSet = [...ex.sets].reverse().find(s => Stats.setWeight(s) > 0);
        const target = lastSet ? Stats.setWeight(lastSet) : 60;
        const bar = Store.settings().barWeight;

        const plates = Store.unit() === 'lb'
            ? [45, 35, 25, 10, 5, 2.5].map(lb => lb / Store.LB_PER_KG)
            : [25, 20, 15, 10, 5, 2.5, 1.25];

        const colors = ['#FF453A', '#0A84FF', '#FFD60A', '#30D158', '#FFFFFF', '#8E8E93', '#BF5AF2'];

        let remaining = (target - bar) / 2;
        const used = [];
        if (remaining > 0) {
            plates.forEach((p, idx) => {
                let count = Math.floor((remaining + 0.001) / p);
                if (count > 0) {
                    used.push({ plate: p, count, color: colors[idx % colors.length] });
                    remaining -= count * p;
                }
            });
        }

        const rest = Math.max(0, remaining);

        UI.sheet({
            title: 'Plate Calculator',
            left: 'Done',
            build: (el) => {
                el.innerHTML = `
                    <div class="card center">
                        <div class="tile-label">Target weight</div>
                        <div class="metric-big">${Stats.fmtWeight(target)}<span class="unit"> ${Store.unit()}</span></div>
                        <div class="tiny muted mt-4">Bar ${Stats.fmtWeight(bar)} ${Store.unit()} &middot; per side</div>
                        <div class="plates mt-8">
                            ${used.length === 0
                                ? '<div class="tiny muted">Bar only.</div>'
                                : used.map(u => `
                                    <div class="plate" style="background:${u.color}${u.color === '#FFFFFF' ? '' : 'DD'};color:${u.color === '#FFFFFF' ? '#000' : '#fff'}">
                                        ${Stats.fmtWeight(u.plate, { decimals: u.plate % 1 === 0 ? 0 : 2 })}
                                        <small>&times;${u.count}</small>
                                    </div>`).join('')}
                        </div>
                        ${rest > 0.01 ? `<div class="tiny muted mt-8">${Stats.fmtWeight(rest, { decimals: 2 })} ${Store.unit()} per side cannot be matched with standard plates.</div>` : ''}
                    </div>
                    <p class="tiny muted center">Bar weight can be changed in Settings.</p>`;
            },
        });
    }

    /* ──────────────────────────────────────────────────────────
       FINISH / DISCARD — Workout beenden oder verwerfen
       ────────────────────────────────────────────────────────── */

    /**
     * finish() — Schließt das Workout ab.
     * Nur tatsächlich abgehakte Sätze werden in die dauerhafte Historie übernommen.
     * Zeigt anschließend den Zusammenfassungs-Bildschirm.
     */
    async function finish() {
        if (!current) return;

        const completed = current.exercises.some(ex => ex.sets.some(s => s.completed));
        if (!completed) {
            const ok = await UI.confirm({
                title: 'Nothing logged',
                message: 'No sets were completed. Discard this workout?',
                confirmLabel: 'Discard', destructive: true,
            });
            if (ok) discard(true);
            return;
        }

        const unfinished = current.exercises.reduce(
            (sum, ex) => sum + ex.sets.filter(s => !s.completed).length, 0);
        if (unfinished > 0) {
            const ok = await UI.confirm({
                title: 'Finish workout?',
                message: `${unfinished} set${unfinished === 1 ? '' : 's'} not completed. They will not be saved.`,
                confirmLabel: 'Finish',
            });
            if (!ok) return;
        }

        const duration = Date.now() - current.startedAt;
        const workout = {
            id: current.id,
            date: current.date,
            endTime: new Date().toISOString(),
            duration,
            name: current.name || '',
            routineId: current.routineId || null,
            exercises: current.exercises
                .map(ex => ({
                    exerciseId: ex.exerciseId,
                    isUnilateral: !!ex.isUnilateral,
                    supersetId: ex.supersetId || null,
                    notes: ex.notes || '',
                    notesL: ex.notesL || '',
                    notesR: ex.notesR || '',
                    sets: ex.sets.filter(s => s.completed).map(s => ({
                        weight: s.weight === '' ? 0 : Number(s.weight),
                        reps: s.reps === '' ? undefined : Number(s.reps),
                        repsL: s.repsL === '' ? undefined : Number(s.repsL),
                        repsR: s.repsR === '' ? undefined : Number(s.repsR),
                        type: s.type || 'normal',
                        completed: true,
                    })),
                }))
                .filter(ex => ex.sets.length > 0),
        };

        Store.saveWorkout(workout);
        const records = Stats.workoutRecords(workout);
        UI.haptic([20, 60, 20, 60, 40]);

        stopRest(true);
        stopTicker();
        const wasEmptyStart = !current.routineId;
        current = null;
        Store.clearActiveWorkout();
        UI.closeScreen('screen-workout');
        App.refreshAll();

        setTimeout(() => showSummary(workout, records, wasEmptyStart), 380);
    }

    /** showSummary(workout, records, offerRoutine) — Zeigt den Abschluss-Bildschirm. */
    function showSummary(workout, records, offerRoutine) {
        const t = Stats.workoutTotals(workout);
        const g = Stats.goals();

        UI.sheet({
            title: 'Workout Complete',
            left: 'Done',
            build: (el) => {
                el.innerHTML = `
                    <div class="tile-grid">
                        <div class="tile tile-dark">
                            <div class="tile-label">Volume</div>
                            <div class="tile-value">${Stats.fmtVolume(t.volume)}<span class="unit">${Store.unit()}</span></div>
                        </div>
                        <div class="tile tile-dark">
                            <div class="tile-label">Duration</div>
                            <div class="tile-value">${Stats.fmtDuration(workout.duration)}</div>
                        </div>
                        <div class="tile">
                            <div class="tile-label">Sets</div>
                            <div class="tile-value">${t.sets}</div>
                        </div>
                        <div class="tile">
                            <div class="tile-label">Week</div>
                            <div class="tile-value">${g.workouts.value}<span class="unit">/ ${g.workouts.goal}</span></div>
                        </div>
                    </div>

                    ${records.length ? `
                    <div class="card">
                        <div class="card-head"><h3>New Records</h3><span class="card-sub">${records.length}</span></div>
                        ${records.map(r => `
                            <div class="detail-set">
                                <div class="detail-set-n" style="background:#000;color:#fff">PR</div>
                                <div class="grow">
                                    <div style="font-size:.9375rem">${UI.esc(Store.exerciseName(r.exerciseId))}</div>
                                    <div class="tiny muted">${r.type === 'e1rm' ? 'Estimated 1RM' : 'Heaviest set'} &middot; ${Stats.fmtWeight(r.value, { decimals: 1 })} ${Store.unit()}${r.previous > 0 ? ` (was ${Stats.fmtWeight(r.previous, { decimals: 1 })})` : ''}</div>
                                </div>
                            </div>`).join('')}
                    </div>` : ''}

                    <div class="card">
                        <div class="card-head"><h3>Exercises</h3></div>
                        ${workout.exercises.map(ex => {
                            const vol = ex.sets.filter(Stats.isWorkingSet).reduce((s, x) => s + Stats.setVolume(x), 0);
                            return `<div class="list-row" style="padding-left:0;padding-right:0">
                                <div class="list-row-main">
                                    <div class="list-row-title">${UI.esc(Store.exerciseName(ex.exerciseId))}</div>
                                    <div class="list-row-sub">${ex.sets.length} ${ex.sets.length === 1 ? 'set' : 'sets'} &middot; ${Stats.fmtVolume(vol)} ${Store.unit()}</div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:8px">
                        ${offerRoutine ? '<button class="btn btn-grey btn-block" data-act="save-routine">Save as Routine</button>' : ''}
                        ${Store.settings().healthShortcut ? '<button class="btn btn-grey btn-block" data-act="health">Send to Apple Health</button>' : ''}
                    </div>`;

                const routineBtn = el.querySelector('[data-act="save-routine"]');
                if (routineBtn) {
                    routineBtn.addEventListener('click', async () => {
                        const name = await UI.prompt({
                            title: 'Save as Routine',
                            message: 'Reuse this session as a template.',
                            value: Stats.workoutTitle(workout),
                            placeholder: 'Routine name',
                        });
                        if (name === null || !name.trim()) return;
                        Routines.createFromWorkout(workout, name.trim());
                        routineBtn.textContent = 'Routine Saved';
                        routineBtn.disabled = true;
                        UI.toast({ title: 'Routine saved', tone: 'success' });
                        App.refreshAll();
                    });
                }

                const healthBtn = el.querySelector('[data-act="health"]');
                if (healthBtn) healthBtn.addEventListener('click', () => Settings.sendToHealth(workout));
            },
        });
    }

    async function discard(skipConfirm = false) {
        if (!skipConfirm) {
            const ok = await UI.confirm({
                title: 'Discard workout?',
                message: 'Everything logged in this session will be lost.',
                confirmLabel: 'Discard', destructive: true,
            });
            if (!ok) return;
        }
        stopRest(true);
        stopTicker();
        current = null;
        Store.clearActiveWorkout();
        UI.closeScreen('screen-workout');
        App.refreshAll();
    }

    /* ──────────────────────────────────────────────────────────
       EVENTS — Event-Handler
       ────────────────────────────────────────────────────────── */
    function bind() {
        const container = body();

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const i = Number(btn.dataset.ex);
            const j = Number(btn.dataset.set);

            switch (btn.dataset.act) {
                case 'toggle': toggleSet(i, j); break;
                case 'add-set': addSet(i); break;
                case 'set-menu': openSetMenu(i, j); break;
                case 'exercise-menu': openExerciseMenu(i); break;
                case 'exercise-info': Exercises.openDetail(current.exercises[i].exerciseId); break;
                case 'add-exercise':
                    Picker.open({
                        onPick: (ids) => addExercises(ids),
                    });
                    break;
                case 'plates': openPlates(i); break;
                case 'rest-now': startRest(current.exercises[i].restSeconds || Store.settings().restDefault); break;
                case 'use-prev':
                    const ex = current.exercises[i];
                    const last = Stats.lastSession(ex.exerciseId, current.date);
                    const prevSets = previousFor(ex.sets, last);
                    if (prevSets[j]) {
                        const set = ex.sets[j];
                        set.weight = prevSets[j].weight;
                        set.reps = prevSets[j].reps;
                        set.repsL = prevSets[j].repsL;
                        set.repsR = prevSets[j].repsR;
                        persist(); render();
                    }
                    break;
                case 'discard': discard(); break;
            }
        });

        container.addEventListener('input', (e) => {
            const input = e.target;
            const i = Number(input.dataset.ex);
            const j = Number(input.dataset.set);
            if (input.dataset.act === 'note') {
                current.exercises[i].notes = input.value;
                persist();
                autoSizeNotes();
            } else if (input.dataset.field) {
                setField(i, j, input.dataset.field, input.value);
            }
        });

        container.addEventListener('change', (e) => {
            const input = e.target;
            if (input.dataset.field) {
                const i = Number(input.dataset.ex);
                const j = Number(input.dataset.set);
                render();
            }
        });

        document.getElementById('btn-workout-finish').addEventListener('click', finish);
        document.getElementById('btn-workout-cancel').addEventListener('click', minimize);

        document.querySelector('[data-rest-adjust="15"]').addEventListener('click', () => adjustRest(15));
        document.querySelector('[data-rest-adjust="-15"]').addEventListener('click', () => adjustRest(-15));
        document.getElementById('btn-rest-skip').addEventListener('click', () => stopRest());
    }

    return {
        start, restore, resume, isActive, startedAt, tick,
        addExercises, finish, discard, minimize, bind,
    };
})();

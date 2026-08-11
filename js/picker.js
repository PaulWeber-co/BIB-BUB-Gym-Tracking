/* ============================================================
   PICKER — Übungs-Auswahlmenü mit Suche und Filtern
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Wenn du im Workout auf "Add Exercise" tippst, öffnet sich der
   Picker — ein Vollbild-Sheet mit:
   - Suchfeld (nach Name suchen)
   - Muskelgruppen-Filter (Chips: All, Chest, Back, Legs, ...)
   - "Recent" Sektion (zuletzt benutzte Übungen)
   - Alphabetische Liste aller Übungen
   - Multi-Select-Modus (mehrere Übungen gleichzeitig auswählen)
   - "Create New Exercise" Button am Ende

   WANN WIRD DER PICKER VERWENDET?
   ─────────────────────────────────
   - workout.js:   "Add Exercise" im laufenden Workout
   - routines.js:  "Add Exercise" beim Routine-Editor
   - trends.js:    Übung auswählen für die Fortschrittsgraphen
   - exercises.js: Übung auswählen für die Detailansicht
   ============================================================ */

const Picker = (() => {

    /**
     * initials(name) — Erzeugt 1-2 Buchstaben als Initialen.
     * "Bench Press" → "BP", "Squat" → "SQ"
     * Wird für den farbigen Avatar-Kreis links neben jeder Übung verwendet.
     */
    function initials(name) {
        const words = name.replace(/[()]/g, '').split(/[\s-]+/).filter(Boolean);
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    /**
     * avatar(ex) — Erzeugt den farbigen Kreis mit Initialen.
     * Die Farbe richtet sich nach der Muskelgruppe:
     * Chest = Rot, Back = Blau, Legs = Lila, usw.
     */
    function avatar(ex) {
        const color = Store.MUSCLE_COLORS[ex.muscleGroup] || Store.MUSCLE_COLORS.Other;
        return `<div class="pick-avatar" style="background:${color}22;color:${color}">${UI.esc(initials(ex.name))}</div>`;
    }

    /**
     * recentIds(limit) — Gibt die IDs der zuletzt trainierten Übungen zurück.
     *
     * WIE?
     * Geht durch alle Workouts (neueste zuerst) und sammelt die
     * Übungs-IDs. Die zuerst gefundene ID wird als "neueste" eingestuft.
     * Duplikate werden übersprungen.
     * Ergebnis: z.B. ["ex-bench-press", "ex-squat", "ex-deadlift", ...]
     */
    function recentIds(limit = 6) {
        const seen = [];
        Store.workouts().forEach(w => {
            (w.exercises || []).forEach(ex => {
                if (!seen.includes(ex.exerciseId)) seen.push(ex.exerciseId);
            });
        });
        return seen.slice(0, limit);
    }

    /**
     * open(options) — Öffnet den Exercise Picker.
     *
     * @param {Object} options
     *   - multi:   true = mehrere Übungen auswählen (Standard)
     *              false = nur eine auswählen
     *   - title:   Titel des Sheets
     *   - onPick:  Callback mit Array der ausgewählten IDs
     *
     * ABLAUF:
     * 1. Sheet öffnen mit Suchfeld und Filter-Chips
     * 2. Bei jeder Eingabe/Filter-Änderung → Liste neu rendern
     * 3. Im Multi-Modus: Klick = auswählen/abwählen, "Add (n)" = fertig
     * 4. Im Single-Modus: Klick = sofort auswählen und schließen
     */
    function open(options = {}) {
        const multi = options.multi !== false;
        const picked = [];    // Array der ausgewählten Übungs-IDs
        let query = '';       // Aktueller Suchtext
        let muscle = '';      // Aktueller Muskelgruppen-Filter

        // Sheet (Vollbild-Panel) öffnen
        const sheet = UI.sheet({
            title: options.title || 'Add Exercise',
            left: 'Cancel',
            right: multi ? 'Add' : '',
            full: true,
            noPad: true,
            onRight: (api) => {
                if (picked.length === 0) return;  // Nichts ausgewählt
                api.close();
                if (options.onPick) options.onPick(picked.slice()); // Kopie übergeben
            },
        });

        // ---- Kopfbereich: Suchfeld + Muskelgruppen-Chips ----
        const head = UI.el(`
            <div style="padding:0 16px 10px;display:flex;flex-direction:column;gap:10px">
                <div class="search-field">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                    <input class="input" type="search" placeholder="Search" data-role="q" autocomplete="off" autocorrect="off" spellcheck="false">
                </div>
                <div class="chips" data-role="chips">
                    <button class="chip is-active" data-muscle="">All</button>
                    ${Store.MUSCLES.map(m => `<button class="chip" data-muscle="${m}">${m}</button>`).join('')}
                </div>
            </div>`);

        // ---- Liste der Übungen ----
        const listWrap = UI.el('<div data-role="list"></div>');

        // ---- "Create New Exercise" Button ----
        const foot = UI.el(`
            <div style="padding:10px 16px 4px">
                <button class="btn btn-tint btn-block" data-role="new">Create New Exercise</button>
            </div>`);

        // Alles ins Sheet einfügen
        sheet.body.appendChild(head);
        sheet.body.appendChild(listWrap);
        sheet.body.appendChild(foot);

        const rightBtn = sheet.root.querySelector('[data-role="right"]');

        /** syncRight() — Aktualisiert den "Add (n)"-Button Text. */
        function syncRight() {
            if (!rightBtn || !multi) return;
            rightBtn.textContent = picked.length ? `Add (${picked.length})` : 'Add';
            rightBtn.style.opacity = picked.length ? '1' : '0.4';
        }

        /**
         * row(ex) — Erzeugt eine Zeile für eine Übung.
         * Zeigt: Avatar, Name, Badges (Custom/L/R), Muskelgruppe, Kategorie.
         * Im Multi-Modus: Checkbox rechts. Im Single-Modus: Pfeil rechts.
         */
        function row(ex) {
            const isPicked = picked.includes(ex.id);
            return `
                <button class="pick-row ${isPicked ? 'is-picked' : ''}" data-id="${ex.id}">
                    ${avatar(ex)}
                    <div class="pick-main">
                        <div class="pick-name">${UI.esc(ex.name)}${ex.isCustom ? '<span class="badge badge-custom">Custom</span>' : ''}${ex.isUnilateral ? '<span class="badge badge-lr">L/R</span>' : ''}</div>
                        <div class="pick-meta">${UI.esc(ex.muscleGroup)} &middot; ${UI.esc(ex.category)}</div>
                    </div>
                    ${multi ? `<div class="pick-check">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>` : `<svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`}
                </button>`;
        }

        /**
         * render() — Baut die gesamte Liste neu auf.
         *
         * ABLAUF:
         * 1. Wenn kein Filter aktiv → "Recent" Sektion anzeigen
         * 2. Alle Übungen durchsuchen (Store.searchExercises)
         * 3. Bei Ergebnissen: alphabetisch mit Buchstaben-Gruppierung
         * 4. Keine Ergebnisse: "Nothing found" Hinweis
         * 5. Klick-Handler für jede Zeile registrieren
         */
        function render() {
            const results = Store.searchExercises(query, muscle);
            let html = '';

            // "Recent"-Bereich nur ohne aktive Filter anzeigen
            if (!query && !muscle) {
                const recents = recentIds().map(id => Store.exercise(id)).filter(Boolean);
                if (recents.length) {
                    html += '<div class="list-letter">Recent</div>';
                    html += recents.map(row).join('');
                }
            }

            if (results.length === 0) {
                html += `<div class="empty"><strong>Nothing found</strong>Create "${UI.esc(query)}" as a new exercise.</div>`;
            } else {
                let letter = '';
                html += (!query && !muscle) ? '<div class="list-letter">All Exercises</div>' : '';
                results.forEach(ex => {
                    const first = ex.name[0].toUpperCase();
                    // Buchstaben-Gruppierung (A, B, C, ...)
                    if (query === '' && first !== letter) {
                        letter = first;
                        html += `<div class="list-letter">${UI.esc(letter)}</div>`;
                    }
                    html += row(ex);
                });
            }

            listWrap.innerHTML = html;

            // Klick-Handler für jede Übungs-Zeile
            listWrap.querySelectorAll('.pick-row').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;

                    // Single-Modus: sofort auswählen und schließen
                    if (!multi) {
                        sheet.close();
                        if (options.onPick) options.onPick([id]);
                        return;
                    }

                    // Multi-Modus: auswählen oder abwählen (toggle)
                    const i = picked.indexOf(id);
                    if (i >= 0) picked.splice(i, 1); else picked.push(id);
                    UI.haptic(8);
                    // Visuelles Feedback: alle Zeilen mit dieser ID aktualisieren
                    listWrap.querySelectorAll(`.pick-row[data-id="${id}"]`)
                        .forEach(n => n.classList.toggle('is-picked', picked.includes(id)));
                    syncRight();
                });
            });
        }

        // ---- Event-Listener: Suche ----
        head.querySelector('[data-role="q"]').addEventListener('input', (e) => {
            query = e.target.value;
            render();
        });

        // ---- Event-Listener: Muskelgruppen-Filter ----
        head.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                muscle = chip.dataset.muscle;
                head.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
                render();
            });
        });

        // ---- Event-Listener: Neue Übung erstellen ----
        foot.querySelector('[data-role="new"]').addEventListener('click', () => {
            Exercises.openEditor(null, (created) => {
                if (!created) return;
                if (multi) {
                    picked.push(created.id);
                    syncRight();
                    render();
                } else {
                    sheet.close();
                    if (options.onPick) options.onPick([created.id]);
                }
            }, query);  // Suchtext als Vorschlag für den Namen übergeben
        });

        syncRight();
        render();
        return sheet;
    }

    /* ──────────────────────────────────────────────────────────
       PUBLIC API
       ────────────────────────────────────────────────────────── */
    return { open, avatar, initials, recentIds };
})();

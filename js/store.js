/* ============================================================
   STORE — Die Datenschicht der App (Data Layer)
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Stell dir den Store wie einen Aktenschrank vor:
   - Jede Schublade hat ein Label (z.B. "gym_workouts")
   - In jeder Schublade liegen Dokumente (Workout-Daten, Übungen usw.)
   - Der Store kann Schubladen öffnen (lesen) und neue Dokumente
     hineinlegen (schreiben)

   WOHIN WERDEN DIE DATEN GESPEICHERT?
   ────────────────────────────────────
   Alles wird im "localStorage" des Browsers gespeichert.
   Das ist ein kleiner Speicher (ca. 5 MB), der erhalten bleibt,
   auch wenn du den Browser schließt. Er funktioniert wie ein
   Wörterbuch:  Schlüssel → Wert

   Beispiel:
     localStorage.setItem("name", "Paul")   // speichern
     localStorage.getItem("name")            // → "Paul"

   Da localStorage nur Text speichern kann, wandeln wir unsere
   JavaScript-Objekte mit JSON.stringify() in Text um und mit
   JSON.parse() wieder zurück.

   WAS SIND DIE WICHTIGEN DATEN?
   ─────────────────────────────
   - EXERCISES:  Eigene Übungen, die der Benutzer erstellt hat
   - WORKOUTS:   Alle abgeschlossenen Trainings
   - TEMPLATES:  Routinen/Vorlagen ("Push Day", "Pull Day" usw.)
   - SETTINGS:   Einstellungen (Einheit kg/lb, Wochenziele usw.)
   - BODY:       Körpergewicht-Log
   - ACTIVE:     Das gerade laufende Workout (überlebt einen Seitenneustart)
   - META:       Zusatzdaten (wann zuletzt exportiert usw.)
   ============================================================ */

const Store = (() => {

    /* ──────────────────────────────────────────────────────────
       KEYS — Die Namen (Schlüssel) für jede "Schublade" im localStorage.
       Wir verwenden Konstanten statt Strings, damit ein Tippfehler
       sofort einen Fehler erzeugt statt stillschweigend scheitert.
       ────────────────────────────────────────────────────────── */
    const KEYS = {
        EXERCISES: 'gym_custom_exercises',   // Benutzerdefinierte Übungen
        WORKOUTS: 'gym_workouts',            // Alle fertigen Workouts
        TEMPLATES: 'gym_templates',          // Gespeicherte Routinen
        SETTINGS: 'gym_settings',            // Benutzereinstellungen
        BODY: 'gym_bodyweight',              // Körpergewicht-Einträge
        ACTIVE: 'gym_active_workout',        // Gerade laufendes Workout
        META: 'gym_meta',                    // Zusatzinfos (Backup-Datum etc.)
    };

    /* ──────────────────────────────────────────────────────────
       MUSCLE GROUPS & CATEGORIES — Feste Listen, die die App
       zum Filtern und Sortieren verwendet.
       ────────────────────────────────────────────────────────── */
    const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    const CATEGORIES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other'];

    /* Jede Muskelgruppe bekommt ihre eigene Farbe für Charts und Avatare. */
    const MUSCLE_COLORS = {
        Chest: '#FF375F',
        Back: '#0A84FF',
        Legs: '#BF5AF2',
        Shoulders: '#FF9F0A',
        Arms: '#30D158',
        Core: '#64D2FF',
        Other: '#8E8E93',
    };

    /* ──────────────────────────────────────────────────────────
       BUILT-IN EXERCISES — Die 68 vorinstallierten Übungen.
       Jede Übung hat:
         - id:           Eine eindeutige Kennung (z.B. "ex-bench-press")
         - name:         Der angezeigte Name
         - muscleGroup:  Welche Muskelgruppe wird trainiert
         - category:     Welches Equipment wird benutzt
         - isBarbell:    (optional) true = Langhantel-Übung → Plattenrechner
         - isUnilateral: (optional) true = einseitig (L/R separat tracken)
       ────────────────────────────────────────────────────────── */
    const BUILT_IN = [
        // Chest (Brust)
        { id: 'ex-bench-press', name: 'Bench Press', muscleGroup: 'Chest', category: 'Barbell', isBarbell: true },
        { id: 'ex-incline-bench', name: 'Incline Bench Press', muscleGroup: 'Chest', category: 'Barbell', isBarbell: true },
        { id: 'ex-db-bench', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', category: 'Dumbbell' },
        { id: 'ex-incline-db-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', category: 'Dumbbell' },
        { id: 'ex-db-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', category: 'Dumbbell' },
        { id: 'ex-cable-crossover', name: 'Cable Crossover', muscleGroup: 'Chest', category: 'Cable' },
        { id: 'ex-pec-deck', name: 'Pec Deck', muscleGroup: 'Chest', category: 'Machine' },
        { id: 'ex-pushup', name: 'Push-up', muscleGroup: 'Chest', category: 'Bodyweight' },
        { id: 'ex-dip-chest', name: 'Chest Dip', muscleGroup: 'Chest', category: 'Bodyweight' },
        { id: 'ex-chest-press-machine', name: 'Chest Press (Machine)', muscleGroup: 'Chest', category: 'Machine' },

        // Back (Rücken)
        { id: 'ex-deadlift', name: 'Deadlift', muscleGroup: 'Back', category: 'Barbell', isBarbell: true },
        { id: 'ex-barbell-row', name: 'Barbell Row', muscleGroup: 'Back', category: 'Barbell', isBarbell: true },
        { id: 'ex-pendlay-row', name: 'Pendlay Row', muscleGroup: 'Back', category: 'Barbell', isBarbell: true },
        { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', category: 'Cable' },
        { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', category: 'Cable' },
        { id: 'ex-straight-arm-pulldown', name: 'Straight-Arm Pulldown', muscleGroup: 'Back', category: 'Cable' },
        { id: 'ex-pullup', name: 'Pull-up', muscleGroup: 'Back', category: 'Bodyweight' },
        { id: 'ex-chinup', name: 'Chin-up', muscleGroup: 'Back', category: 'Bodyweight' },
        { id: 'ex-tbar-row', name: 'T-Bar Row', muscleGroup: 'Back', category: 'Barbell' },
        { id: 'ex-db-row', name: 'Dumbbell Row', muscleGroup: 'Back', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-hyperextension', name: 'Back Extension', muscleGroup: 'Back', category: 'Bodyweight' },

        // Legs (Beine)
        { id: 'ex-squat', name: 'Squat', muscleGroup: 'Legs', category: 'Barbell', isBarbell: true },
        { id: 'ex-front-squat', name: 'Front Squat', muscleGroup: 'Legs', category: 'Barbell', isBarbell: true },
        { id: 'ex-leg-press', name: 'Leg Press', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-leg-curl', name: 'Leg Curl', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-lunges', name: 'Lunges', muscleGroup: 'Legs', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-bulgarian-split', name: 'Bulgarian Split Squat', muscleGroup: 'Legs', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-calf-raise', name: 'Calf Raise', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', category: 'Barbell', isBarbell: true },
        { id: 'ex-hack-squat', name: 'Hack Squat', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-hip-thrust', name: 'Hip Thrust', muscleGroup: 'Legs', category: 'Barbell', isBarbell: true },

        // Shoulders (Schultern)
        { id: 'ex-ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'Barbell', isBarbell: true },
        { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-face-pull', name: 'Face Pull', muscleGroup: 'Shoulders', category: 'Cable' },
        { id: 'ex-rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-upright-row', name: 'Upright Row', muscleGroup: 'Shoulders', category: 'Cable' },
        { id: 'ex-shrug', name: 'Shrug', muscleGroup: 'Shoulders', category: 'Dumbbell' },

        // Arms (Arme)
        { id: 'ex-barbell-curl', name: 'Barbell Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-hammer-curl', name: 'Hammer Curl', muscleGroup: 'Arms', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-overhead-tricep', name: 'Overhead Tricep Extension', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-skull-crusher', name: 'Skull Crusher', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-preacher-curl', name: 'Preacher Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-db-curl', name: 'Dumbbell Curl', muscleGroup: 'Arms', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-cable-curl', name: 'Cable Curl', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-tricep-dip', name: 'Tricep Dip', muscleGroup: 'Arms', category: 'Bodyweight' },

        // Core (Bauch)
        { id: 'ex-plank', name: 'Plank', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-crunch', name: 'Crunch', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-russian-twist', name: 'Russian Twist', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', category: 'Cable' },
        { id: 'ex-ab-wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core', category: 'Other' },
    ];

    /* ──────────────────────────────────────────────────────────
       DEFAULT SETTINGS — Standard-Einstellungen für neue Benutzer.
       Wenn der Benutzer noch nichts geändert hat, werden diese Werte
       verwendet. Sobald er etwas ändert, wird nur der geänderte
       Wert überschrieben – der Rest bleibt default.
       ────────────────────────────────────────────────────────── */
    const DEFAULT_SETTINGS = {
        theme: 'dark',              // 'dark' | 'light' | 'system'
        unit: 'kg',                 // kg oder lb (Pfund)
        goalVolume: 20000,          // Wochenziel für Volumen (Gewicht × Wdh.)
        goalWorkouts: 4,            // Wochenziel: Trainings pro Woche
        goalSets: 60,               // Wochenziel: Arbeitssätze pro Woche
        restDefault: 90,            // Standard-Pausenzeit in Sekunden
        restAuto: true,             // Pause automatisch starten nach Satz
        sound: true,                // Ton abspielen wenn Pause vorbei
        haptics: true,              // Vibration bei Aktionen
        barWeight: 20,              // Gewicht der leeren Langhantel (für Plattenrechner)
        weekStart: 1,               // 1 = Montag (0 = Sonntag)
        healthShortcut: '',         // Name eines Apple Shortcuts für Health-Export
    };

    /**
     * applyTheme(themeName) — Aktiviert das gewählte Farbschema (Theme).
     * @param {string} themeName - 'dark', 'light', oder 'system'
     */
    function applyTheme(themeName) {
        const t = themeName || settings().theme || 'dark';
        let effective = t;
        if (t === 'system') {
            effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        if (effective === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }


    /* ──────────────────────────────────────────────────────────
       LOW-LEVEL FUNKTIONEN — Grundbausteine zum Lesen/Schreiben
       ────────────────────────────────────────────────────────── */

    /**
     * read() — Liest einen Wert aus dem localStorage.
     *
     * WIE FUNKTIONIERT DAS?
     * 1. Wir fragen localStorage nach dem Schlüssel (key)
     * 2. Wenn nichts gespeichert ist → gib den Fallback-Wert zurück
     * 3. Wenn etwas da ist → parse den JSON-Text zurück in ein JS-Objekt
     * 4. Wenn beim Parsen etwas schiefgeht → fange den Fehler ab
     *
     * @param {string} key      - Der Schlüssel im localStorage
     * @param {*}      fallback - Was zurückgegeben wird, falls nichts gespeichert ist
     * @returns {*} Der gespeicherte Wert oder der Fallback
     */
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);       // Text aus localStorage holen
            if (raw === null) return fallback;            // Nichts gespeichert? → Fallback
            const parsed = JSON.parse(raw);               // Text → JavaScript-Objekt
            return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (e) {
            console.warn('Store: could not read', key, e);
            return fallback;
        }
    }

    /**
     * write() — Schreibt einen Wert in den localStorage.
     *
     * WIE FUNKTIONIERT DAS?
     * 1. Wir wandeln das JS-Objekt in JSON-Text um (JSON.stringify)
     * 2. Wir speichern den Text unter dem Schlüssel
     * 3. Wenn der Speicher voll ist → Fehlermeldung anzeigen
     *
     * @param {string} key   - Der Schlüssel
     * @param {*}      value - Der zu speichernde Wert (wird automatisch zu JSON)
     * @returns {boolean} true wenn erfolgreich
     */
    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Store: could not write', key, e);
            if (window.UI) UI.toast({ title: 'Storage full', sub: 'Export a backup in Settings.', tone: 'warn' });
            return false;
        }
    }

    /**
     * uid() — Erzeugt eine einzigartige ID.
     *
     * WIE FUNKTIONIERT DAS?
     * Kombiniert den aktuellen Zeitstempel (in Base-36 = Buchstaben+Zahlen)
     * mit einer Zufallszahl. Das Ergebnis sieht so aus: "workout-m2abc-x7yz12"
     * Dadurch ist jede ID praktisch garantiert einzigartig.
     *
     * @param {string} prefix - Vorsilbe, z.B. "workout" oder "custom"
     * @returns {string} Eine eindeutige ID wie "workout-lz3f-a9bc12"
     */
    function uid(prefix = 'id') {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /* ──────────────────────────────────────────────────────────
       EXERCISE FUNCTIONS — Übungen lesen, suchen, erstellen, löschen
       ────────────────────────────────────────────────────────── */

    /**
     * customExercises() — Gibt alle benutzerdefinierten Übungen zurück.
     * Jede wird mit isCustom: true markiert, damit die UI sie von
     * den eingebauten unterscheiden kann.
     */
    function customExercises() {
        return read(KEYS.EXERCISES, []).map(e => ({ ...e, isCustom: true }));
    }

    /**
     * allExercises() — Gibt ALLE Übungen zurück: eingebaute + benutzerdefinierte.
     * Der Spread-Operator (...) vereint beide Arrays zu einem.
     */
    function allExercises() {
        return [...BUILT_IN, ...customExercises()];
    }

    /**
     * exercise(id) — Findet eine einzelne Übung anhand ihrer ID.
     * Array.find() geht die Liste durch und gibt das erste Element zurück,
     * bei dem e.id === id ist. Falls keines gefunden wird → null.
     */
    function exercise(id) {
        return allExercises().find(e => e.id === id) || null;
    }

    /**
     * exerciseName(id) — Gibt nur den Namen einer Übung zurück.
     * Praktisch für Anzeigen, wo man nicht das ganze Objekt braucht.
     */
    function exerciseName(id) {
        const e = exercise(id);
        return e ? e.name : 'Unknown exercise';
    }

    /**
     * searchExercises() — Sucht nach Übungen, die dem Suchbegriff entsprechen.
     *
     * WIE FUNKTIONIERT DIE SUCHE?
     * 1. Wenn ein Muskelgruppen-Filter gesetzt ist → nur diese Gruppe
     * 2. Wenn ein Suchtext eingegeben wurde → Name, Muskelgruppe oder
     *    Kategorie müssen den Text enthalten (case-insensitive)
     * 3. Ergebnis wird alphabetisch sortiert
     *
     * @param {string} query  - Suchtext (z.B. "bench")
     * @param {string} muscle - Muskelgruppe-Filter (z.B. "Chest")
     * @returns {Array} Gefilterte und sortierte Übungsliste
     */
    function searchExercises(query = '', muscle = '') {
        let list = allExercises();
        if (muscle) list = list.filter(e => e.muscleGroup === muscle);
        const q = query.trim().toLowerCase();
        if (q) {
            list = list.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.muscleGroup.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * saveExercise(ex) — Speichert eine Übung (neu oder aktualisiert).
     *
     * WIE FUNKTIONIERT DAS?
     * 1. Alle benutzerdefinierten Übungen aus dem Storage laden
     * 2. Hat die Übung schon eine ID? → Suche sie in der Liste und ersetze sie
     * 3. Hat sie keine ID? → Erzeuge eine neue ID und füge sie hinzu
     * 4. Schreibe die aktualisierte Liste zurück ins Storage
     */
    function saveExercise(ex) {
        const list = read(KEYS.EXERCISES, []);
        if (ex.id) {
            const i = list.findIndex(e => e.id === ex.id);
            if (i >= 0) list[i] = { ...list[i], ...ex };  // Existierend → aktualisieren
            else list.push({ ...ex });                      // Neue ID → anhängen
        } else {
            ex.id = uid('custom');                           // Komplett neu → ID generieren
            list.push({ ...ex });
        }
        write(KEYS.EXERCISES, list);
        return ex;
    }

    /**
     * deleteExercise(id) — Löscht eine benutzerdefinierte Übung.
     * filter() erzeugt ein neues Array OHNE die Übung mit dieser ID.
     */
    function deleteExercise(id) {
        write(KEYS.EXERCISES, read(KEYS.EXERCISES, []).filter(e => e.id !== id));
    }

    /* ──────────────────────────────────────────────────────────
       WORKOUT FUNCTIONS — Abgeschlossene Trainings verwalten
       ────────────────────────────────────────────────────────── */

    /**
     * Cache für Workouts — Weil die Workout-Liste bei jedem Chart-Render
     * gelesen wird, halten wir sie im Speicher, statt jedes Mal den
     * localStorage zu parsen. Der Cache wird ungültig (= null), sobald
     * etwas geschrieben wird.
     */
    let workoutsCache = null;
    function invalidateWorkouts() { workoutsCache = null; }

    /**
     * workouts() — Gibt alle abgeschlossenen Workouts zurück.
     * Sortiert nach Datum: neueste zuerst.
     * Ungültige Einträge (ohne Datum oder Übungen) werden rausgefiltert.
     */
    function workouts() {
        if (!workoutsCache) {
            workoutsCache = read(KEYS.WORKOUTS, [])
                .filter(w => w && w.date && Array.isArray(w.exercises))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return workoutsCache;
    }

    /** workout(id) — Findet ein einzelnes Workout anhand seiner ID. */
    function workout(id) {
        return read(KEYS.WORKOUTS, []).find(w => w.id === id) || null;
    }

    /**
     * saveWorkout(w) — Speichert ein Workout (neu oder aktualisiert).
     * Gleiche Logik wie saveExercise: existiert es schon → ersetzen,
     * sonst anhängen.
     */
    function saveWorkout(w) {
        const list = read(KEYS.WORKOUTS, []);
        if (!w.id) w.id = uid('workout');
        const i = list.findIndex(x => x.id === w.id);
        if (i >= 0) list[i] = w; else list.push(w);
        write(KEYS.WORKOUTS, list);
        invalidateWorkouts();  // Cache leeren, damit nächstes workouts() frisch lädt
        return w;
    }

    /** deleteWorkout(id) — Löscht ein Workout und leert den Cache. */
    function deleteWorkout(id) {
        write(KEYS.WORKOUTS, read(KEYS.WORKOUTS, []).filter(w => w.id !== id));
        invalidateWorkouts();
    }

    /* ──────────────────────────────────────────────────────────
       ROUTINES (TEMPLATES) — Gespeicherte Trainingsvorlagen
       ────────────────────────────────────────────────────────── */

    /** routines() — Gibt alle Routinen zurück. */
    function routines() {
        return read(KEYS.TEMPLATES, []);
    }

    /** routine(id) — Findet eine einzelne Routine anhand ihrer ID. */
    function routine(id) {
        return routines().find(t => t.id === id) || null;
    }

    /** saveRoutine(t) — Speichert eine Routine (gleiche Logik wie oben). */
    function saveRoutine(t) {
        const list = read(KEYS.TEMPLATES, []);
        if (!t.id) t.id = uid('routine');
        const i = list.findIndex(x => x.id === t.id);
        if (i >= 0) list[i] = t; else list.push(t);
        write(KEYS.TEMPLATES, list);
        return t;
    }

    /** deleteRoutine(id) — Löscht eine Routine. */
    function deleteRoutine(id) {
        write(KEYS.TEMPLATES, read(KEYS.TEMPLATES, []).filter(t => t.id !== id));
    }

    /* ──────────────────────────────────────────────────────────
       BODY WEIGHT — Körpergewicht-Tracking
       ────────────────────────────────────────────────────────── */

    /** bodyLog() — Gibt alle Körpergewicht-Einträge zurück, älteste zuerst. */
    function bodyLog() {
        return read(KEYS.BODY, []).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * addBodyEntry(weight, dateISO) — Fügt einen Körpergewicht-Eintrag hinzu.
     * Wenn am gleichen Tag schon einer existiert → überschreiben.
     * So hat man pro Tag maximal einen Eintrag.
     */
    function addBodyEntry(weight, dateISO) {
        const list = read(KEYS.BODY, []);
        const day = (dateISO || new Date().toISOString()).slice(0, 10);  // Nur "2026-08-10"
        const i = list.findIndex(e => e.date.slice(0, 10) === day);
        const entry = { date: dateISO || new Date().toISOString(), weight: Number(weight) };
        if (i >= 0) list[i] = entry; else list.push(entry);
        write(KEYS.BODY, list);
        return entry;
    }

    /** deleteBodyEntry(dateISO) — Löscht einen Körpergewicht-Eintrag. */
    function deleteBodyEntry(dateISO) {
        write(KEYS.BODY, read(KEYS.BODY, []).filter(e => e.date !== dateISO));
    }

    /* ──────────────────────────────────────────────────────────
       SETTINGS — Benutzereinstellungen
       ────────────────────────────────────────────────────────── */

    /** Cache für die Einstellungen (gleiche Idee wie workoutsCache). */
    let settingsCache = null;

    /**
     * settings() — Gibt die aktuellen Einstellungen zurück.
     *
     * Der Spread-Operator { ...DEFAULT_SETTINGS, ...read(...) } bedeutet:
     * "Nimm alle Standard-Werte und überschreibe sie mit dem, was
     *  der Benutzer geändert hat." So bleiben unveränderte Werte
     * bei ihren Defaults.
     */
    function settings() {
        if (!settingsCache) settingsCache = { ...DEFAULT_SETTINGS, ...read(KEYS.SETTINGS, {}) };
        return settingsCache;
    }

    /** setSetting(key, value) — Ändert eine einzelne Einstellung. */
    function setSetting(key, value) {
        const s = settings();
        s[key] = value;
        settingsCache = s;
        write(KEYS.SETTINGS, s);
        return s;
    }

    /* ──────────────────────────────────────────────────────────
       ACTIVE WORKOUT — Das gerade laufende Training.
       Wird nach JEDEM Tastendruck gespeichert, damit ein
       Seitenreload oder iOS das Tab schließt und nichts verloren geht.
       ────────────────────────────────────────────────────────── */

    /** activeWorkout() — Gibt das laufende Workout zurück (oder null). */
    function activeWorkout() {
        return read(KEYS.ACTIVE, null);
    }

    /** saveActiveWorkout(w) — Speichert den aktuellen Stand des Workouts. */
    function saveActiveWorkout(w) {
        if (!w) localStorage.removeItem(KEYS.ACTIVE);
        else write(KEYS.ACTIVE, w);
    }

    /** clearActiveWorkout() — Löscht das laufende Workout (nach Finish/Discard). */
    function clearActiveWorkout() {
        localStorage.removeItem(KEYS.ACTIVE);
    }

    /* ──────────────────────────────────────────────────────────
       META — Zusatzinformationen (z.B. wann zuletzt exportiert)
       ────────────────────────────────────────────────────────── */
    function meta() { return read(KEYS.META, {}); }
    function setMeta(key, value) {
        const m = meta();
        m[key] = value;
        write(KEYS.META, m);
        return m;
    }

    /* ──────────────────────────────────────────────────────────
       BACKUP / RESTORE — Daten exportieren und importieren

       Export: Alles in ein einziges JSON-Objekt packen → herunterladen
       Import: JSON-Datei laden → mit bestehenden Daten zusammenführen
       ────────────────────────────────────────────────────────── */

    /**
     * exportAll() — Erzeugt ein komplettes Backup aller Daten.
     * Das Ergebnis ist ein JavaScript-Objekt, das zu JSON konvertiert
     * und als Datei heruntergeladen werden kann.
     */
    function exportAll() {
        return {
            app: 'bib-bub-gym-tracker',
            version: 2,
            exportedAt: new Date().toISOString(),
            settings: settings(),
            customExercises: read(KEYS.EXERCISES, []),
            workouts: read(KEYS.WORKOUTS, []),
            routines: read(KEYS.TEMPLATES, []),
            bodyLog: read(KEYS.BODY, []),
        };
    }

    /**
     * importAll() — Importiert eine Backup-Datei.
     *
     * @param {Object} data - Das geparste JSON aus der Backup-Datei
     * @param {string} mode - "merge" = vorhandene Daten behalten + neue hinzufügen
     *                        "replace" = alles ersetzen
     * @returns {Object} Zähler: wie viele neue Workouts, Routinen etc.
     *
     * WIE FUNKTIONIERT DAS MERGING?
     * Die mergeById-Funktion geht die bestehende Liste durch und legt
     * jeden Eintrag in eine Map (Schlüssel = ID). Dann geht sie die
     * neue Liste durch: existiert die ID schon → überschreiben,
     * sonst → hinzufügen. So gehen keine Daten verloren.
     */
    function importAll(data, mode = 'merge') {
        if (!data || typeof data !== 'object') throw new Error('Not a valid backup file.');
        if (!Array.isArray(data.workouts) && !Array.isArray(data.routines) && !Array.isArray(data.customExercises)) {
            throw new Error('Not a valid backup file.');
        }

        const counts = { workouts: 0, routines: 0, exercises: 0, body: 0 };

        const mergeById = (existing, incoming) => {
            const byId = new Map(existing.map(x => [x.id, x]));
            let added = 0;
            (incoming || []).forEach(item => {
                if (!item || !item.id) return;
                if (!byId.has(item.id)) added++;
                byId.set(item.id, item);
            });
            return { list: [...byId.values()], added };
        };

        if (mode === 'replace') {
            // Alles ersetzen
            write(KEYS.WORKOUTS, data.workouts || []);
            write(KEYS.TEMPLATES, data.routines || data.templates || []);
            write(KEYS.EXERCISES, data.customExercises || []);
            write(KEYS.BODY, data.bodyLog || []);
            counts.workouts = (data.workouts || []).length;
            counts.routines = (data.routines || data.templates || []).length;
            counts.exercises = (data.customExercises || []).length;
            counts.body = (data.bodyLog || []).length;
        } else {
            // Zusammenführen (merge)
            let r = mergeById(read(KEYS.WORKOUTS, []), data.workouts);
            write(KEYS.WORKOUTS, r.list); counts.workouts = r.added;

            r = mergeById(read(KEYS.TEMPLATES, []), data.routines || data.templates);
            write(KEYS.TEMPLATES, r.list); counts.routines = r.added;

            r = mergeById(read(KEYS.EXERCISES, []), data.customExercises);
            write(KEYS.EXERCISES, r.list); counts.exercises = r.added;

            const bodyByDay = new Map(read(KEYS.BODY, []).map(e => [e.date.slice(0, 10), e]));
            (data.bodyLog || []).forEach(e => {
                if (!e || !e.date) return;
                if (!bodyByDay.has(e.date.slice(0, 10))) counts.body++;
                bodyByDay.set(e.date.slice(0, 10), e);
            });
            write(KEYS.BODY, [...bodyByDay.values()]);
        }

        if (data.settings) {
            settingsCache = { ...DEFAULT_SETTINGS, ...data.settings };
            write(KEYS.SETTINGS, settingsCache);
        }
        invalidateWorkouts();
        return counts;
    }

    /** clearAll() — Löscht ALLE Daten aus dem localStorage. Vorsicht! */
    function clearAll() {
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
        settingsCache = null;
        invalidateWorkouts();
    }

    /**
     * storageSize() — Berechnet wie viel Speicherplatz die App benutzt.
     * JavaScript-Strings nehmen 2 Bytes pro Zeichen ein.
     */
    function storageSize() {
        let bytes = 0;
        Object.values(KEYS).forEach(k => {
            const v = localStorage.getItem(k);
            if (v) bytes += v.length * 2;
        });
        return bytes;
    }

    /* ──────────────────────────────────────────────────────────
       UNIT CONVERSION — Umrechnung zwischen kg und lb

       Intern werden ALLE Gewichte in Kilogramm gespeichert.
       Nur bei der Anzeige wird umgerechnet. So kann der Benutzer
       jederzeit zwischen kg und lb wechseln, ohne dass Daten
       verloren gehen oder Rundungsfehler entstehen.
       ────────────────────────────────────────────────────────── */
    const LB_PER_KG = 2.2046226218;  // 1 kg = 2.2046 Pfund

    /**
     * toDisplay(kg) — Wandelt gespeicherte kg in die Anzeige-Einheit um.
     * Wenn der Benutzer "lb" gewählt hat → multipliziere mit 2.2046
     * Sonst → zeige kg direkt an.
     */
    function toDisplay(kg) {
        const n = Number(kg) || 0;
        return settings().unit === 'lb' ? n * LB_PER_KG : n;
    }

    /**
     * toBase(value) — Wandelt eine Benutzereingabe zurück in kg.
     * Wenn der Benutzer "lb" eingestellt hat → dividiere durch 2.2046
     * Sonst → der Wert ist schon in kg.
     */
    function toBase(value) {
        const n = Number(value) || 0;
        return settings().unit === 'lb' ? n / LB_PER_KG : n;
    }

    /** unit() — Gibt die aktuelle Einheit zurück ("kg" oder "lb"). */
    function unit() { return settings().unit; }

    /* ──────────────────────────────────────────────────────────
       CROSS-TAB SYNC — Wenn ein anderer Tab die Daten ändert
       (z.B. die App ist in zwei Tabs offen), bekommen wir ein
       'storage' Event. Dann leeren wir den Cache, damit der
       nächste Zugriff die frischen Daten bekommt.
       ────────────────────────────────────────────────────────── */
    window.addEventListener('storage', (e) => {
        if (e.key === KEYS.WORKOUTS) invalidateWorkouts();
        if (e.key === KEYS.SETTINGS) settingsCache = null;
    });

    /* ──────────────────────────────────────────────────────────
       PUBLIC API — Was andere Module von Store verwenden können.
       Alles, was hier NICHT aufgelistet ist, ist privat und
       kann von außen nicht aufgerufen werden. Das nennt man
       das "Module Pattern" (Revealing Module Pattern).
       ────────────────────────────────────────────────────────── */
    return {
        KEYS, MUSCLES, CATEGORIES, MUSCLE_COLORS, BUILT_IN, DEFAULT_SETTINGS, LB_PER_KG,
        uid,
        customExercises, allExercises, exercise, exerciseName, searchExercises, saveExercise, deleteExercise,
        workouts, workout, saveWorkout, deleteWorkout,
        routines, routine, saveRoutine, deleteRoutine,
        bodyLog, addBodyEntry, deleteBodyEntry,
        settings, setSetting,
        activeWorkout, saveActiveWorkout, clearActiveWorkout,
        meta, setMeta,
        exportAll, importAll, clearAll, storageSize,
        toDisplay, toBase, unit, applyTheme,
    };
})();

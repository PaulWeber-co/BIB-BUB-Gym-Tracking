/* ============================================================
   STORE — persistence, exercise database, settings
   All data lives in localStorage. Existing keys are kept so
   workouts logged with earlier versions keep working.
   ============================================================ */

const Store = (() => {

    const KEYS = {
        EXERCISES: 'gym_custom_exercises',
        WORKOUTS: 'gym_workouts',
        TEMPLATES: 'gym_templates',
        SETTINGS: 'gym_settings',
        BODY: 'gym_bodyweight',
        PROTEIN: 'gym_protein',
        ACTIVE: 'gym_active_workout',
        META: 'gym_meta',
    };

    const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    const CATEGORIES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other'];

    // A single blue ramp, dark to light, so charts stay on brand and
    // remain distinguishable when printed or seen in bright sunlight.
    const MUSCLE_COLORS = {
        Chest: '#16386E',
        Back: '#2C68C8',
        Legs: '#0A2340',
        Shoulders: '#5B95D6',
        Arms: '#7FB4DA',
        Core: '#A9C9E4',
        Other: '#8A8A82',
    };

    const BUILT_IN = [
        // Chest
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

        // Back
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

        // Legs
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

        // Shoulders
        { id: 'ex-ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'Barbell', isBarbell: true },
        { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-face-pull', name: 'Face Pull', muscleGroup: 'Shoulders', category: 'Cable' },
        { id: 'ex-rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-upright-row', name: 'Upright Row', muscleGroup: 'Shoulders', category: 'Cable' },
        { id: 'ex-shrug', name: 'Shrug', muscleGroup: 'Shoulders', category: 'Dumbbell' },

        // Arms
        { id: 'ex-barbell-curl', name: 'Barbell Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-hammer-curl', name: 'Hammer Curl', muscleGroup: 'Arms', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-overhead-tricep', name: 'Overhead Tricep Extension', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-skull-crusher', name: 'Skull Crusher', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-preacher-curl', name: 'Preacher Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-db-curl', name: 'Dumbbell Curl', muscleGroup: 'Arms', category: 'Dumbbell', isUnilateral: true },
        { id: 'ex-cable-curl', name: 'Cable Curl', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-tricep-dip', name: 'Tricep Dip', muscleGroup: 'Arms', category: 'Bodyweight' },

        // Core
        { id: 'ex-plank', name: 'Plank', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-crunch', name: 'Crunch', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-russian-twist', name: 'Russian Twist', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', category: 'Cable' },
        { id: 'ex-ab-wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core', category: 'Other' },
    ];

    const DEFAULT_SETTINGS = {
        unit: 'kg',                 // kg | lb
        proteinPerKg: 1.8,          // grams of protein per kg of body weight, per day
        proteinManual: 0,           // overrides the computed target when > 0
        goalVolume: 20000,          // per week, in kg — drives the volume chart target
        goalWorkouts: 4,            // per week
        goalSets: 48,               // per week
        restDefault: 90,            // seconds
        restAuto: true,             // start rest timer when a set is checked
        sound: true,
        haptics: true,
        barWeight: 20,              // for the plate calculator
        weekStart: 1,               // 1 = Monday
        healthShortcut: '',         // name of an Apple Shortcut to hand the workout to
    };

    // ---------- low level ----------
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            const parsed = JSON.parse(raw);
            return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (e) {
            console.warn('Store: could not read', key, e);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Store: could not write', key, e);
            // top level `const` bindings are not window properties, so probe the binding itself
            if (typeof UI !== 'undefined') {
                UI.toast({ title: 'Storage full', sub: 'Export a backup in Settings.', tone: 'warn' });
            }
            return false;
        }
    }

    function uid(prefix = 'id') {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // ---------- exercises ----------
    function customExercises() {
        return read(KEYS.EXERCISES, []).map(e => ({ ...e, isCustom: true }));
    }

    function allExercises() {
        return [...BUILT_IN, ...customExercises()];
    }

    function exercise(id) {
        return allExercises().find(e => e.id === id) || null;
    }

    function exerciseName(id) {
        const e = exercise(id);
        return e ? e.name : 'Unknown exercise';
    }

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

    function saveExercise(ex) {
        const list = read(KEYS.EXERCISES, []);
        if (ex.id) {
            const i = list.findIndex(e => e.id === ex.id);
            if (i >= 0) list[i] = { ...list[i], ...ex };
            else list.push({ ...ex });
        } else {
            ex.id = uid('custom');
            list.push({ ...ex });
        }
        write(KEYS.EXERCISES, list);
        return ex;
    }

    function deleteExercise(id) {
        write(KEYS.EXERCISES, read(KEYS.EXERCISES, []).filter(e => e.id !== id));
    }

    // ---------- workouts ----------
    // The log is read very often (every chart re-derives from it), so keep the
    // parsed and sorted list around until something writes to it.
    let workoutsCache = null;

    function invalidateWorkouts() { workoutsCache = null; }

    function workouts() {
        if (!workoutsCache) {
            workoutsCache = read(KEYS.WORKOUTS, [])
                .filter(w => w && w.date && Array.isArray(w.exercises))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return workoutsCache;
    }

    function workout(id) {
        return read(KEYS.WORKOUTS, []).find(w => w.id === id) || null;
    }

    function saveWorkout(w) {
        const list = read(KEYS.WORKOUTS, []);
        if (!w.id) w.id = uid('workout');
        const i = list.findIndex(x => x.id === w.id);
        if (i >= 0) list[i] = w; else list.push(w);
        write(KEYS.WORKOUTS, list);
        invalidateWorkouts();
        return w;
    }

    function deleteWorkout(id) {
        write(KEYS.WORKOUTS, read(KEYS.WORKOUTS, []).filter(w => w.id !== id));
        invalidateWorkouts();
    }

    // ---------- routines (templates) ----------
    function routines() {
        return read(KEYS.TEMPLATES, []);
    }

    function routine(id) {
        return routines().find(t => t.id === id) || null;
    }

    function saveRoutine(t) {
        const list = read(KEYS.TEMPLATES, []);
        if (!t.id) t.id = uid('routine');
        const i = list.findIndex(x => x.id === t.id);
        if (i >= 0) list[i] = t; else list.push(t);
        write(KEYS.TEMPLATES, list);
        return t;
    }

    function deleteRoutine(id) {
        write(KEYS.TEMPLATES, read(KEYS.TEMPLATES, []).filter(t => t.id !== id));
    }

    // ---------- body weight ----------
    function bodyLog() {
        return read(KEYS.BODY, []).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function addBodyEntry(weight, dateISO) {
        const list = read(KEYS.BODY, []);
        const day = (dateISO || new Date().toISOString()).slice(0, 10);
        const i = list.findIndex(e => e.date.slice(0, 10) === day);
        const entry = { date: dateISO || new Date().toISOString(), weight: Number(weight) };
        if (i >= 0) list[i] = entry; else list.push(entry);
        write(KEYS.BODY, list);
        return entry;
    }

    function deleteBodyEntry(dateISO) {
        write(KEYS.BODY, read(KEYS.BODY, []).filter(e => e.date !== dateISO));
    }

    function latestBodyWeight() {
        const log = bodyLog();
        return log.length ? log[log.length - 1].weight : null;
    }

    // ---------- protein ----------
    // One entry per day: { day: 'YYYY-MM-DD', grams: n }
    function proteinLog() {
        return read(KEYS.PROTEIN, []).sort((a, b) => a.day.localeCompare(b.day));
    }

    function dayString(date = new Date()) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function proteinOn(date = new Date()) {
        const day = dayString(date);
        const entry = read(KEYS.PROTEIN, []).find(e => e.day === day);
        return entry ? Number(entry.grams) || 0 : 0;
    }

    function setProtein(grams, date = new Date()) {
        const day = dayString(date);
        const list = read(KEYS.PROTEIN, []).filter(e => e.day !== day);
        const value = Math.max(0, Math.round(Number(grams) || 0));
        if (value > 0) list.push({ day, grams: value });
        write(KEYS.PROTEIN, list);
        return value;
    }

    function addProtein(grams, date = new Date()) {
        return setProtein(proteinOn(date) + (Number(grams) || 0), date);
    }

    /** Daily protein target in grams, derived from the latest body weight. */
    function proteinTarget() {
        const s = settings();
        if (s.proteinManual > 0) return Math.round(s.proteinManual);
        const weight = latestBodyWeight();
        if (!weight) return null;
        return Math.round(weight * s.proteinPerKg);
    }

    // ---------- settings ----------
    let settingsCache = null;

    function settings() {
        if (!settingsCache) settingsCache = { ...DEFAULT_SETTINGS, ...read(KEYS.SETTINGS, {}) };
        return settingsCache;
    }

    function setSetting(key, value) {
        const s = settings();
        s[key] = value;
        settingsCache = s;
        write(KEYS.SETTINGS, s);
        return s;
    }

    // ---------- active workout (survives reload / Safari eviction of the tab) ----------
    function activeWorkout() {
        return read(KEYS.ACTIVE, null);
    }

    function saveActiveWorkout(w) {
        if (!w) localStorage.removeItem(KEYS.ACTIVE);
        else write(KEYS.ACTIVE, w);
    }

    function clearActiveWorkout() {
        localStorage.removeItem(KEYS.ACTIVE);
    }

    // ---------- meta (last export etc.) ----------
    function meta() { return read(KEYS.META, {}); }
    function setMeta(key, value) {
        const m = meta();
        m[key] = value;
        write(KEYS.META, m);
        return m;
    }

    // ---------- backup ----------
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
            proteinLog: read(KEYS.PROTEIN, []),
        };
    }

    /** Merges a backup into the current data. Returns a per-collection count. */
    function importAll(data, mode = 'merge') {
        if (!data || typeof data !== 'object') throw new Error('Not a valid backup file.');
        if (!Array.isArray(data.workouts) && !Array.isArray(data.routines) && !Array.isArray(data.customExercises)) {
            throw new Error('Not a valid backup file.');
        }

        const counts = { workouts: 0, routines: 0, exercises: 0, body: 0, protein: 0 };

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
            write(KEYS.WORKOUTS, data.workouts || []);
            write(KEYS.TEMPLATES, data.routines || data.templates || []);
            write(KEYS.EXERCISES, data.customExercises || []);
            write(KEYS.BODY, data.bodyLog || []);
            write(KEYS.PROTEIN, data.proteinLog || []);
            counts.workouts = (data.workouts || []).length;
            counts.routines = (data.routines || data.templates || []).length;
            counts.exercises = (data.customExercises || []).length;
            counts.body = (data.bodyLog || []).length;
            counts.protein = (data.proteinLog || []).length;
        } else {
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

            const proteinByDay = new Map(read(KEYS.PROTEIN, []).map(e => [e.day, e]));
            (data.proteinLog || []).forEach(e => {
                if (!e || !e.day) return;
                if (!proteinByDay.has(e.day)) counts.protein++;
                proteinByDay.set(e.day, e);
            });
            write(KEYS.PROTEIN, [...proteinByDay.values()]);
        }

        if (data.settings) {
            settingsCache = { ...DEFAULT_SETTINGS, ...data.settings };
            write(KEYS.SETTINGS, settingsCache);
        }
        invalidateWorkouts();
        return counts;
    }

    function clearAll() {
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
        settingsCache = null;
        invalidateWorkouts();
    }

    function storageSize() {
        let bytes = 0;
        Object.values(KEYS).forEach(k => {
            const v = localStorage.getItem(k);
            if (v) bytes += v.length * 2;
        });
        return bytes;
    }

    // ---------- units ----------
    const LB_PER_KG = 2.2046226218;

    /** Stored weights are always kg. Convert for display. */
    function toDisplay(kg) {
        const n = Number(kg) || 0;
        return settings().unit === 'lb' ? n * LB_PER_KG : n;
    }

    /** Convert a user-entered value back to kg for storage. */
    function toBase(value) {
        const n = Number(value) || 0;
        return settings().unit === 'lb' ? n / LB_PER_KG : n;
    }

    function unit() { return settings().unit; }

    // another tab of the same app wrote something
    window.addEventListener('storage', (e) => {
        if (e.key === KEYS.WORKOUTS) invalidateWorkouts();
        if (e.key === KEYS.SETTINGS) settingsCache = null;
    });

    return {
        KEYS, MUSCLES, CATEGORIES, MUSCLE_COLORS, BUILT_IN, DEFAULT_SETTINGS, LB_PER_KG,
        uid,
        customExercises, allExercises, exercise, exerciseName, searchExercises, saveExercise, deleteExercise,
        workouts, workout, saveWorkout, deleteWorkout,
        routines, routine, saveRoutine, deleteRoutine,
        bodyLog, addBodyEntry, deleteBodyEntry, latestBodyWeight,
        proteinLog, proteinOn, setProtein, addProtein, proteinTarget, dayString,
        settings, setSetting,
        activeWorkout, saveActiveWorkout, clearActiveWorkout,
        meta, setMeta,
        exportAll, importAll, clearAll, storageSize,
        toDisplay, toBase, unit,
    };
})();

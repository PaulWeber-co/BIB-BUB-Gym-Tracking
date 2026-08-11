/* ============================================================
   STATS — Berechnungen aus den gespeicherten Workout-Daten
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Stats ist der "Taschenrechner" der App. Es nimmt die rohen
   Workout-Daten aus dem Store und berechnet daraus nützliche Zahlen:

   - Volumen (Gewicht × Wiederholungen)
   - Geschätztes 1RM (das Maximalgewicht für eine Wiederholung)
   - Persönliche Rekorde
   - Wochenstatistiken, Serien (Streaks), Muskelverteilung
   - Körpergewicht-Trends

   WARUM IST DAS GETRENNT VOM STORE?
   ──────────────────────────────────
   Store speichert und liest nur Rohdaten.
   Stats berechnet abgeleitete Werte aus diesen Rohdaten.
   Diese Trennung macht den Code übersichtlicher:
   Store = Aktenschrank, Stats = Taschenrechner

   ALLE GEWICHTE SIND IN KILOGRAMM!
   ────────────────────────────────
   Die Umrechnung in die Anzeige-Einheit (kg oder lb) passiert
   erst in den View-Modulen (summary.js, trends.js usw.).
   ============================================================ */

const Stats = (() => {

    /** Millisekunden in einem Tag. Hilft beim Rechnen mit Datums-Differenzen. */
    const DAY = 86400000; // 24 * 60 * 60 * 1000

    /* ──────────────────────────────────────────────────────────
       DATUMS-HILFSFUNKTIONEN
       Diese werden überall gebraucht, um Tage, Wochen und
       Zeiträume zu berechnen.
       ────────────────────────────────────────────────────────── */

    /**
     * startOfDay(d) — Setzt die Uhrzeit auf 00:00:00.
     * Beispiel: "2026-08-10 14:35:22" → "2026-08-10 00:00:00"
     * Damit kann man zwei Datumswerte tagesgenau vergleichen.
     */
    function startOfDay(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    /**
     * dayKey(d) — Macht aus einem Datum einen String "2026-08-10".
     * Wird als Schlüssel in Maps verwendet, um pro Tag genau einen
     * Eintrag zu haben.
     */
    function dayKey(d) {
        const x = new Date(d);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    }

    /** addDays(d, n) — Addiert n Tage zu einem Datum. n kann auch negativ sein. */
    function addDays(d, n) {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
    }

    /**
     * startOfWeek(d) — Findet den Montag (oder den konfigurierten Wochenstart)
     * der Woche, in der das Datum liegt.
     * Beispiel: Mittwoch 2026-08-13 → Montag 2026-08-11
     */
    function startOfWeek(d = new Date()) {
        const first = Store.settings().weekStart;  // 1 = Montag
        const x = startOfDay(d);
        const diff = (x.getDay() - first + 7) % 7; // Tage seit Wochenstart
        return addDays(x, -diff);
    }

    /** sameDay(a, b) — Prüft ob zwei Datumswerte am gleichen Tag sind. */
    function sameDay(a, b) { return dayKey(a) === dayKey(b); }

    /* ──────────────────────────────────────────────────────────
       SET-HILFSFUNKTIONEN — Berechnungen pro einzelnem Satz

       Ein "Set" (Satz) ist ein Objekt wie:
       { weight: 80, reps: 8, type: "normal", completed: true }

       Bei unilateralen Übungen:
       { weight: 14, repsL: 12, repsR: 10, type: "normal", completed: true }
       ────────────────────────────────────────────────────────── */

    /**
     * isUnilateralSet(set) — Prüft ob ein Satz unilateral ist.
     * Ein Satz ist unilateral, wenn repsL oder repsR einen Wert haben.
     */
    function isUnilateralSet(set) {
        return (set.repsL !== undefined && set.repsL !== '' && set.repsL !== null) ||
               (set.repsR !== undefined && set.repsR !== '' && set.repsR !== null);
    }

    /**
     * setReps(set) — Gesamtzahl der Wiederholungen eines Satzes.
     * Bei unilateral: links + rechts addieren.
     * Bei bilateral: einfach die reps.
     */
    function setReps(set) {
        if (isUnilateralSet(set)) return (Number(set.repsL) || 0) + (Number(set.repsR) || 0);
        return Number(set.reps) || 0;
    }

    /**
     * setTopReps(set) — Wiederholungen der stärkeren Seite.
     * Wird für die 1RM-Schätzung verwendet, weil wir das
     * schwerere Seitenergebnis nehmen wollen.
     */
    function setTopReps(set) {
        if (isUnilateralSet(set)) return Math.max(Number(set.repsL) || 0, Number(set.repsR) || 0);
        return Number(set.reps) || 0;
    }

    /** setWeight(set) — Das Gewicht des Satzes als Zahl. */
    function setWeight(set) { return Number(set.weight) || 0; }

    /**
     * setVolume(set) — Das Volumen eines Satzes = Gewicht × Wiederholungen.
     * Volumen ist die wichtigste Metrik für Trainingsfortschritt.
     * Beispiel: 80 kg × 8 Wdh = 640 kg Volumen
     */
    function setVolume(set) { return setWeight(set) * setReps(set); }

    /**
     * isWorkingSet(set) — Ist dieser Satz ein "Arbeitssatz"?
     * Nur abgeschlossene Sätze, die KEIN Aufwärmsatz sind, zählen
     * für Volumen, Rekorde und Statistiken.
     */
    function isWorkingSet(set) { return !!set.completed && set.type !== 'warmup'; }

    /**
     * e1rm(weight, reps) — Geschätztes 1RM nach der Epley-Formel.
     *
     * DIE EPLEY-FORMEL:
     * 1RM = weight × (1 + reps / 30)
     *
     * Beispiel: 80 kg × 8 Wiederholungen
     * → 1RM = 80 × (1 + 8/30) = 80 × 1.267 = 101.3 kg
     *
     * Das bedeutet: Wenn du 80 kg für 8 Wdh schaffst,
     * könntest du theoretisch einmal 101 kg heben.
     *
     * Bei 1 Wiederholung = das Gewicht IS das 1RM.
     * Bei >20 Wdh. wird die Formel ungenau → wir deckeln bei 20.
     */
    function e1rm(weight, reps) {
        const w = Number(weight) || 0;
        const r = Number(reps) || 0;
        if (w <= 0 || r <= 0) return 0;
        if (r === 1) return w;
        if (r > 20) return w * (1 + 20 / 30);  // Deckelung
        return w * (1 + r / 30);
    }

    /** setE1rm(set) — Geschätztes 1RM für einen einzelnen Satz. */
    function setE1rm(set) { return e1rm(setWeight(set), setTopReps(set)); }

    /* ──────────────────────────────────────────────────────────
       WORKOUT-LEVEL BERECHNUNGEN — Statistiken pro Workout
       ────────────────────────────────────────────────────────── */

    /**
     * workoutTotals(w) — Berechnet die Gesamtwerte eines Workouts.
     *
     * Geht durch ALLE Übungen und deren Sätze:
     * - Summiert Volumen, Sätze, Wiederholungen
     * - Findet das höchste Gewicht
     * - Gruppiert Volumen nach Muskelgruppe
     *
     * @returns { volume, sets, reps, topWeight, muscles, exercises, duration }
     */
    function workoutTotals(w) {
        let volume = 0, sets = 0, reps = 0, topWeight = 0;
        const muscles = {};

        (w.exercises || []).forEach(ex => {
            const meta = Store.exercise(ex.exerciseId);
            const group = meta ? meta.muscleGroup : 'Other';
            (ex.sets || []).forEach(s => {
                if (!isWorkingSet(s)) return;  // Aufwärmsätze ignorieren
                const v = setVolume(s);
                volume += v;
                sets += 1;
                reps += setReps(s);
                topWeight = Math.max(topWeight, setWeight(s));
                muscles[group] = (muscles[group] || 0) + v; // Pro Muskelgruppe addieren
            });
        });

        return {
            volume,       // Gesamtvolumen in kg
            sets,         // Anzahl Arbeitssätze
            reps,         // Gesamtwiederholungen
            topWeight,    // Höchstes Gewicht
            muscles,      // { Chest: 1200, Back: 800, ... }
            exercises: (w.exercises || []).length,
            duration: w.duration || 0,
        };
    }

    /**
     * workoutTitle(w) — Erzeugt einen automatischen Titel für ein Workout.
     * Wenn der Benutzer keinen Namen vergeben hat, werden die
     * meisttrainierten Muskelgruppen als Name verwendet.
     * Beispiel: "Chest & Back" oder "Legs Workout"
     */
    function workoutTitle(w) {
        if (w.name) return w.name;
        const groups = {};
        (w.exercises || []).forEach(ex => {
            const meta = Store.exercise(ex.exerciseId);
            if (meta) groups[meta.muscleGroup] = (groups[meta.muscleGroup] || 0) + 1;
        });
        const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        if (sorted.length === 0) return 'Workout';
        if (sorted.length === 1) return `${sorted[0]} Workout`;
        return `${sorted[0]} & ${sorted[1]}`;
    }

    /* ──────────────────────────────────────────────────────────
       ZEITRAUM-BERECHNUNGEN — Statistiken über mehrere Workouts
       ────────────────────────────────────────────────────────── */

    /** Alle Workouts in einem Zeitraum [from, to). */
    function workoutsBetween(from, to) {
        return Store.workouts().filter(w => {
            const d = new Date(w.date);
            return d >= from && d < to;
        });
    }

    /** Gesamtwerte für einen Zeitraum (Volumen, Sätze, Dauer usw.). */
    function rangeTotals(from, to) {
        const list = workoutsBetween(from, to);
        let volume = 0, sets = 0, reps = 0, duration = 0;
        const muscles = {};
        list.forEach(w => {
            const t = workoutTotals(w);
            volume += t.volume; sets += t.sets; reps += t.reps; duration += t.duration;
            Object.entries(t.muscles).forEach(([g, v]) => { muscles[g] = (muscles[g] || 0) + v; });
        });
        return { workouts: list.length, volume, sets, reps, duration, muscles, list };
    }

    /** weekTotals() — Gesamtwerte der aktuellen Woche. */
    function weekTotals(anchor = new Date()) {
        const from = startOfWeek(anchor);
        return { from, to: addDays(from, 7), ...rangeTotals(from, addDays(from, 7)) };
    }

    /**
     * goals() — Der Fortschritt für die drei Bänder auf dem Summary-Screen:
     * 1. Protein heute vs. Tagesziel (aus dem Körpergewicht berechnet)
     * 2. Workouts diese Woche vs. Ziel
     * 3. Arbeitssätze diese Woche vs. Ziel
     *
     * Jedes Ziel hat: value (aktuell), goal (Ziel), pct (Anteil).
     * pct = 0.75 bedeutet "75 % des Ziels erreicht".
     * Beim Protein kann goal null sein — dann ist noch kein
     * Körpergewicht eingetragen.
     */
    function goals(anchor = new Date()) {
        const s = Store.settings();
        const t = weekTotals(anchor);
        const proteinGoal = Store.proteinTarget();

        return {
            protein: {
                value: Store.proteinOn(anchor),
                goal: proteinGoal,
                pct: proteinGoal ? Store.proteinOn(anchor) / proteinGoal : 0,
            },
            workouts: {
                value: t.workouts,
                goal: s.goalWorkouts || 1,
                pct: s.goalWorkouts > 0 ? t.workouts / s.goalWorkouts : 0,
            },
            sets: {
                value: t.sets,
                goal: s.goalSets || 1,
                pct: s.goalSets > 0 ? t.sets / s.goalSets : 0,
            },
            totals: t,
        };
    }

    /**
     * weekDays() — Ein Eintrag pro Tag der aktuellen Woche.
     * Wird für den "This Week"-Streifen auf dem Summary-Screen benutzt.
     */
    function weekDays(anchor = new Date()) {
        const from = startOfWeek(anchor);
        const today = startOfDay(new Date());
        const out = [];
        for (let i = 0; i < 7; i++) {
            const day = addDays(from, i);
            const t = rangeTotals(day, addDays(day, 1));
            out.push({
                date: day,
                isToday: sameDay(day, today),
                isFuture: day > today,
                ...t,
            });
        }
        return out;
    }

    /** dailySeries(days) — Tageswerte der letzten n Tage, älteste zuerst. */
    function dailySeries(days = 14) {
        const today = startOfDay(new Date());
        const out = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = addDays(today, -i);
            out.push({ date: day, ...rangeTotals(day, addDays(day, 1)) });
        }
        return out;
    }

    /** weeklySeries(weeks) — Wochenwerte der letzten n Wochen, älteste zuerst. */
    function weeklySeries(weeks = 12) {
        const current = startOfWeek(new Date());
        const out = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const from = addDays(current, -7 * i);
            out.push({ date: from, ...rangeTotals(from, addDays(from, 7)) });
        }
        return out;
    }

    /**
     * muscleSplit(days) — Volumenanteil pro Muskelgruppe.
     * Beispiel: Chest 30%, Back 25%, Legs 20%, ...
     * Wird als Balkendiagramm auf dem Trends-Screen angezeigt.
     */
    function muscleSplit(days = 30) {
        const to = addDays(startOfDay(new Date()), 1);
        const from = addDays(to, -days);
        const t = rangeTotals(from, to);
        const total = Object.values(t.muscles).reduce((a, b) => a + b, 0);
        return Store.MUSCLES
            .map(m => ({ muscle: m, volume: t.muscles[m] || 0, pct: total ? (t.muscles[m] || 0) / total : 0 }))
            .filter(x => x.volume > 0)
            .sort((a, b) => b.volume - a.volume);
    }

    /**
     * activityCalendar(weeks) — Trainingsaktivität pro Tag.
     * Wird für die Heatmap im History-Kalender verwendet.
     * Jede Zelle enthält: Volumen, Sätze, Anzahl Trainings.
     */
    function activityCalendar(weeks = 17) {
        const today = startOfDay(new Date());
        const end = startOfWeek(today);
        const start = addDays(end, -7 * (weeks - 1));
        const byDay = new Map();
        Store.workouts().forEach(w => {
            const k = dayKey(w.date);
            const t = workoutTotals(w);
            const prev = byDay.get(k) || { volume: 0, sets: 0, count: 0 };
            byDay.set(k, { volume: prev.volume + t.volume, sets: prev.sets + t.sets, count: prev.count + 1 });
        });

        const cells = [];
        for (let i = 0; i < weeks * 7; i++) {
            const day = addDays(start, i);
            const entry = byDay.get(dayKey(day));
            cells.push({
                date: day,
                volume: entry ? entry.volume : 0,
                sets: entry ? entry.sets : 0,
                count: entry ? entry.count : 0,
                isFuture: day > today,
            });
        }
        return { cells, start, weeks };
    }

    /* ──────────────────────────────────────────────────────────
       STREAKS — Wie viele Wochen in Folge das Ziel erreicht wurde
       ────────────────────────────────────────────────────────── */

    /**
     * weekStreak() — Zählt aufeinanderfolgende Wochen, in denen
     * das Workout-Ziel erreicht wurde (z.B. 4× pro Woche).
     *
     * Geht von der aktuellen Woche rückwärts:
     * - Woche hat genug Workouts? → streak++
     * - Aktuelle Woche hat zu wenig? → ignorieren (noch nicht vorbei)
     * - Ältere Woche hat zu wenig? → Streak ist vorbei
     */
    function weekStreak() {
        const goal = Store.settings().goalWorkouts || 1;
        let streak = 0;
        const current = startOfWeek(new Date());
        for (let i = 0; i < 260; i++) {  // max 5 Jahre zurück
            const from = addDays(current, -7 * i);
            const count = workoutsBetween(from, addDays(from, 7)).length;
            if (count >= goal) {
                streak++;
            } else if (i === 0) {
                continue; // Aktuelle Woche darf noch offen sein
            } else {
                break;    // Streak gebrochen
            }
        }
        return streak;
    }

    /** daysSinceLastWorkout() — Tage seit dem letzten Training (oder null). */
    function daysSinceLastWorkout() {
        const list = Store.workouts();
        if (list.length === 0) return null;
        const last = startOfDay(list[0].date);
        return Math.round((startOfDay(new Date()) - last) / DAY);
    }

    /** allTime() — Gesamtstatistiken über alle Workouts aller Zeiten. */
    function allTime() {
        const list = Store.workouts();
        let volume = 0, sets = 0, duration = 0, reps = 0;
        list.forEach(w => {
            const t = workoutTotals(w);
            volume += t.volume; sets += t.sets; duration += t.duration; reps += t.reps;
        });
        return { workouts: list.length, volume, sets, reps, duration, first: list.length ? list[list.length - 1].date : null };
    }

    /* ──────────────────────────────────────────────────────────
       PRO-ÜBUNG-ANALYSE — Fortschritt für eine einzelne Übung
       ────────────────────────────────────────────────────────── */

    /**
     * exerciseSeries(exerciseId) — Alle Trainings-Sessions dieser Übung.
     *
     * Für jede Session berechnet:
     * - maxWeight:  Höchstes Gewicht
     * - volume:     Gesamtvolumen
     * - reps:       Gesamtwiederholungen
     * - e1rm:       Bestes geschätztes 1RM
     * - bestSet:    Der Satz mit dem besten 1RM
     *
     * Ergebnis: Array sortiert älteste → neueste
     * Wird für die Fortschrittsgraphen verwendet.
     */
    function exerciseSeries(exerciseId) {
        const out = [];
        Store.workouts().forEach(w => {
            (w.exercises || []).forEach(ex => {
                if (ex.exerciseId !== exerciseId) return;
                const working = (ex.sets || []).filter(isWorkingSet);
                if (working.length === 0) return;

                let maxWeight = 0, volume = 0, reps = 0, best1rm = 0, bestSet = null;
                working.forEach(s => {
                    maxWeight = Math.max(maxWeight, setWeight(s));
                    volume += setVolume(s);
                    reps += setReps(s);
                    const e = setE1rm(s);
                    if (e > best1rm) { best1rm = e; bestSet = s; }
                });

                out.push({
                    workoutId: w.id,
                    date: w.date,
                    sets: working.length,
                    maxWeight,
                    volume,
                    reps,
                    e1rm: Math.round(best1rm * 10) / 10,
                    bestSet,
                    rawSets: ex.sets || [],
                });
            });
        });
        return out.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /** records(exerciseId) — Allzeit-Bestleistungen einer Übung. */
    function records(exerciseId) {
        const series = exerciseSeries(exerciseId);
        const rec = { weight: 0, e1rm: 0, volume: 0, reps: 0, sessions: series.length, lastDate: null };
        series.forEach(s => {
            rec.weight = Math.max(rec.weight, s.maxWeight);
            rec.e1rm = Math.max(rec.e1rm, s.e1rm);
            rec.volume = Math.max(rec.volume, s.volume);
            rec.reps = Math.max(rec.reps, s.reps);
            rec.lastDate = s.date;
        });
        return rec;
    }

    /**
     * lastSession(exerciseId, beforeDate) — Die Sätze des letzten Trainings
     * mit dieser Übung. Wird für die "Previous"-Spalte im Workout verwendet,
     * damit du siehst, was du beim letzten Mal gemacht hast.
     */
    function lastSession(exerciseId, beforeDate = null) {
        const list = Store.workouts();
        for (const w of list) {
            if (beforeDate && new Date(w.date) >= new Date(beforeDate)) continue;
            const ex = (w.exercises || []).find(e => e.exerciseId === exerciseId);
            if (!ex) continue;
            const working = (ex.sets || []).filter(s => s.completed);
            if (working.length === 0) continue;
            return { date: w.date, sets: working, workoutId: w.id };
        }
        return null;
    }

    /**
     * bestBefore(exerciseId, beforeDate) — Bester 1RM/Gewicht VOR einem Datum.
     * Wird für die Live-PR-Erkennung während des Trainings verwendet.
     */
    function bestBefore(exerciseId, beforeDate) {
        let best = { e1rm: 0, weight: 0, volume: 0 };
        Store.workouts().forEach(w => {
            if (beforeDate && new Date(w.date) >= new Date(beforeDate)) return;
            (w.exercises || []).forEach(ex => {
                if (ex.exerciseId !== exerciseId) return;
                let volume = 0;
                (ex.sets || []).filter(isWorkingSet).forEach(s => {
                    best.e1rm = Math.max(best.e1rm, setE1rm(s));
                    best.weight = Math.max(best.weight, setWeight(s));
                    volume += setVolume(s);
                });
                best.volume = Math.max(best.volume, volume);
            });
        });
        return best;
    }

    /**
     * workoutRecords(w) — Welche Rekorde wurden in diesem Workout aufgestellt?
     * Vergleicht jede Übung mit dem besten Wert VOR diesem Workout.
     * Gibt ein Array mit { exerciseId, type, value, previous } zurück.
     */
    function workoutRecords(w) {
        const out = [];
        (w.exercises || []).forEach(ex => {
            const working = (ex.sets || []).filter(isWorkingSet);
            if (working.length === 0) return;
            const before = bestBefore(ex.exerciseId, w.date);
            let best1rm = 0, bestWeight = 0;
            working.forEach(s => {
                best1rm = Math.max(best1rm, setE1rm(s));
                bestWeight = Math.max(bestWeight, setWeight(s));
            });
            if (best1rm > before.e1rm + 0.01) {
                out.push({ exerciseId: ex.exerciseId, type: 'e1rm', value: best1rm, previous: before.e1rm });
            } else if (bestWeight > before.weight + 0.01) {
                out.push({ exerciseId: ex.exerciseId, type: 'weight', value: bestWeight, previous: before.weight });
            }
        });
        return out;
    }

    /** recentRecords() — Die neuesten persönlichen Rekorde über alle Übungen. */
    function recentRecords(limit = 5, scan = 20) {
        const out = [];
        const seen = new Set();
        const list = Store.workouts().slice(0, scan);
        list.forEach(w => {
            workoutRecords(w).forEach(r => {
                const key = r.exerciseId + r.type;
                if (seen.has(key)) return;
                seen.add(key);
                out.push({ ...r, date: w.date });
            });
        });
        return out.slice(0, limit);
    }

    /* ──────────────────────────────────────────────────────────
       PROTEIN — Auswertung der täglichen Eiweißaufnahme
       ────────────────────────────────────────────────────────── */

    /**
     * proteinSeries(days) — Ein Eintrag pro Tag der letzten n Tage,
     * ältester zuerst. Tage ohne Eintrag kommen mit 0 Gramm, damit
     * das Balkendiagramm eine lückenlose Zeitachse hat.
     */
    function proteinSeries(days = 14) {
        const log = new Map(Store.proteinLog().map(e => [e.day, Number(e.grams) || 0]));
        const today = startOfDay(new Date());
        const out = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = addDays(today, -i);
            out.push({ date, grams: log.get(Store.dayString(date)) || 0 });
        }
        return out;
    }

    /**
     * proteinStreak() — Wie viele Tage am Stück wurde das Ziel erreicht?
     * Der heutige Tag zählt nicht als Abbruch, solange er noch läuft —
     * sonst stünde die Serie jeden Morgen auf 0.
     */
    function proteinStreak() {
        const target = Store.proteinTarget();
        if (!target) return 0;
        const log = new Map(Store.proteinLog().map(e => [e.day, Number(e.grams) || 0]));
        const today = startOfDay(new Date());
        let streak = 0;
        for (let i = 0; i < 400; i++) {
            const grams = log.get(Store.dayString(addDays(today, -i))) || 0;
            if (grams >= target) streak++;
            else if (i === 0) continue;      // heute kann noch voll werden
            else break;
        }
        return streak;
    }

    /** proteinAverage(days) — Durchschnitt über die Tage mit Eintrag. */
    function proteinAverage(days = 7) {
        const series = proteinSeries(days).filter(d => d.grams > 0);
        if (series.length === 0) return 0;
        return series.reduce((sum, d) => sum + d.grams, 0) / series.length;
    }

    /* ──────────────────────────────────────────────────────────
       BODY WEIGHT — Körpergewicht-Analyse
       ────────────────────────────────────────────────────────── */

    /** bodySeries(days) — Körpergewicht-Einträge der letzten n Tage. */
    function bodySeries(days = 180) {
        const from = addDays(startOfDay(new Date()), -days);
        return Store.bodyLog().filter(e => new Date(e.date) >= from);
    }

    /**
     * bodyTrend() — Vergleicht das neueste Körpergewicht mit dem Wert
     * von vor 30 Tagen. Gibt { latest, delta, refDate, count } zurück.
     */
    function bodyTrend() {
        const log = Store.bodyLog();
        if (log.length === 0) return null;
        const latest = log[log.length - 1];
        const monthAgo = addDays(new Date(latest.date), -30);
        let ref = null;
        for (const e of log) {
            if (new Date(e.date) <= monthAgo) ref = e;
        }
        if (!ref) ref = log[0];
        return { latest, delta: latest.weight - ref.weight, refDate: ref.date, count: log.length };
    }

    /* ──────────────────────────────────────────────────────────
       FORMATIERUNG — Zahlen hübsch darstellen
       ────────────────────────────────────────────────────────── */

    /**
     * fmtWeight(kg) — Formatiert ein Gewicht für die Anzeige.
     * Konvertiert zuerst in die Benutzereinheit (kg oder lb).
     * Beispiel: 80 kg → "80" oder → "176.4" (lb)
     */
    function fmtWeight(kg, opts = {}) {
        const v = Store.toDisplay(kg);
        const decimals = opts.decimals !== undefined ? opts.decimals : (v % 1 === 0 ? 0 : 1);
        return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    /**
     * fmtVolume(kg) — Formatiert Volumen kompakt.
     * Ab 10.000 → "10k", ab 100.000 → "100k"
     * Dadurch passen die Zahlen besser in kleine Kacheln.
     */
    function fmtVolume(kg) {
        const v = Store.toDisplay(kg);
        if (v >= 100000) return Math.round(v / 1000) + 'k';
        if (v >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return Math.round(v).toLocaleString();
    }

    /**
     * fmtDuration(ms) — Formatiert Millisekunden als "1h 23m" oder "45m".
     */
    function fmtDuration(ms) {
        const total = Math.floor((ms || 0) / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    /**
     * fmtClock(ms) — Formatiert Millisekunden als "1:23" (Timer-Format).
     */
    function fmtClock(ms) {
        const total = Math.max(0, Math.floor((ms || 0) / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    /** fmtDate(d) — Datum als "Mon, 10 Aug" formatieren. */
    function fmtDate(d, opts) {
        return new Date(d).toLocaleDateString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short' });
    }

    /**
     * fmtRelativeDay(d) — Datum relativ zum heute:
     * "Today", "Yesterday", "Monday", oder "Mon, 10 Aug"
     */
    function fmtRelativeDay(d) {
        const day = startOfDay(d);
        const today = startOfDay(new Date());
        const diff = Math.round((today - day) / DAY);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7 && diff > 0) return new Date(d).toLocaleDateString(undefined, { weekday: 'long' });
        return fmtDate(d);
    }

    /* ──────────────────────────────────────────────────────────
       PUBLIC API — Was andere Module verwenden können
       ────────────────────────────────────────────────────────── */
    return {
        DAY,
        startOfDay, startOfWeek, addDays, dayKey, sameDay,
        isUnilateralSet, setReps, setTopReps, setWeight, setVolume, isWorkingSet, e1rm, setE1rm,
        workoutTotals, workoutTitle, workoutsBetween, rangeTotals, weekTotals, goals, weekDays,
        dailySeries, weeklySeries, muscleSplit, activityCalendar,
        weekStreak, daysSinceLastWorkout, allTime,
        exerciseSeries, records, lastSession, bestBefore, workoutRecords, recentRecords,
        proteinSeries, proteinStreak, proteinAverage,
        bodySeries, bodyTrend,
        fmtWeight, fmtVolume, fmtDuration, fmtClock, fmtDate, fmtRelativeDay,
    };
})();

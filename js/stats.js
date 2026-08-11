/* ============================================================
   STATS — everything derived from the raw workout log.
   All weights are kilograms; conversion happens in the views.
   ============================================================ */

const Stats = (() => {

    const DAY = 86400000;

    // ---------- dates ----------
    function startOfDay(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    function dayKey(d) {
        const x = new Date(d);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    }

    function addDays(d, n) {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
    }

    /** Monday-based week start (Store.settings().weekStart). */
    function startOfWeek(d = new Date()) {
        const first = Store.settings().weekStart;
        const x = startOfDay(d);
        const diff = (x.getDay() - first + 7) % 7;
        return addDays(x, -diff);
    }

    function sameDay(a, b) { return dayKey(a) === dayKey(b); }

    // ---------- set helpers ----------
    function isUnilateralSet(set) {
        return (set.repsL !== undefined && set.repsL !== '' && set.repsL !== null) ||
               (set.repsR !== undefined && set.repsR !== '' && set.repsR !== null);
    }

    /** Total reps of a set — both sides count for unilateral work. */
    function setReps(set) {
        if (isUnilateralSet(set)) return (Number(set.repsL) || 0) + (Number(set.repsR) || 0);
        return Number(set.reps) || 0;
    }

    /** Reps of the heavier side — used for 1RM estimates. */
    function setTopReps(set) {
        if (isUnilateralSet(set)) return Math.max(Number(set.repsL) || 0, Number(set.repsR) || 0);
        return Number(set.reps) || 0;
    }

    function setWeight(set) { return Number(set.weight) || 0; }

    function setVolume(set) { return setWeight(set) * setReps(set); }

    function isWorkingSet(set) { return !!set.completed && set.type !== 'warmup'; }

    /** Estimated one rep max (Epley). */
    function e1rm(weight, reps) {
        const w = Number(weight) || 0;
        const r = Number(reps) || 0;
        if (w <= 0 || r <= 0) return 0;
        if (r === 1) return w;
        if (r > 20) return w * (1 + 20 / 30);
        return w * (1 + r / 30);
    }

    function setE1rm(set) { return e1rm(setWeight(set), setTopReps(set)); }

    // ---------- workout level ----------
    function workoutTotals(w) {
        let volume = 0, sets = 0, reps = 0, topWeight = 0;
        const muscles = {};

        (w.exercises || []).forEach(ex => {
            const meta = Store.exercise(ex.exerciseId);
            const group = meta ? meta.muscleGroup : 'Other';
            (ex.sets || []).forEach(s => {
                if (!isWorkingSet(s)) return;
                const v = setVolume(s);
                volume += v;
                sets += 1;
                reps += setReps(s);
                topWeight = Math.max(topWeight, setWeight(s));
                muscles[group] = (muscles[group] || 0) + v;
            });
        });

        return {
            volume,
            sets,
            reps,
            topWeight,
            muscles,
            exercises: (w.exercises || []).length,
            duration: w.duration || 0,
        };
    }

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

    // ---------- ranges ----------
    function workoutsBetween(from, to) {
        return Store.workouts().filter(w => {
            const d = new Date(w.date);
            return d >= from && d < to;
        });
    }

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

    function weekTotals(anchor = new Date()) {
        const from = startOfWeek(anchor);
        return { from, to: addDays(from, 7), ...rangeTotals(from, addDays(from, 7)) };
    }

    /**
     * The three headline goals on the summary.
     * Protein is a daily target, workouts and sets are weekly.
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

    /** Per-day totals for the current week (7 entries, week-start first). */
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

    /** Totals per day for the last n days, oldest first. */
    function dailySeries(days = 14) {
        const today = startOfDay(new Date());
        const out = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = addDays(today, -i);
            out.push({ date: day, ...rangeTotals(day, addDays(day, 1)) });
        }
        return out;
    }

    /** Totals per week for the last n weeks, oldest first. */
    function weeklySeries(weeks = 12) {
        const current = startOfWeek(new Date());
        const out = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const from = addDays(current, -7 * i);
            out.push({ date: from, ...rangeTotals(from, addDays(from, 7)) });
        }
        return out;
    }

    /** Volume share per muscle group over the last n days. */
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

    /** Day-by-day activity for a heat map, oldest first. */
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

    // ---------- streaks ----------
    /** Consecutive weeks (ending with the current or last week) that met the workout goal. */
    function weekStreak() {
        const goal = Store.settings().goalWorkouts || 1;
        let streak = 0;
        const current = startOfWeek(new Date());
        for (let i = 0; i < 260; i++) {
            const from = addDays(current, -7 * i);
            const count = workoutsBetween(from, addDays(from, 7)).length;
            if (count >= goal) {
                streak++;
            } else if (i === 0) {
                continue; // the running week may still be completed
            } else {
                break;
            }
        }
        return streak;
    }

    function daysSinceLastWorkout() {
        const list = Store.workouts();
        if (list.length === 0) return null;
        const last = startOfDay(list[0].date);
        return Math.round((startOfDay(new Date()) - last) / DAY);
    }

    function allTime() {
        const list = Store.workouts();
        let volume = 0, sets = 0, duration = 0, reps = 0;
        list.forEach(w => {
            const t = workoutTotals(w);
            volume += t.volume; sets += t.sets; duration += t.duration; reps += t.reps;
        });
        return { workouts: list.length, volume, sets, reps, duration, first: list.length ? list[list.length - 1].date : null };
    }

    // ---------- per exercise ----------
    /** One entry per session in which the exercise was trained, oldest first. */
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

    /** Best ever values for an exercise. */
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
     * The sets of the most recent session with this exercise — powers the
     * "previous" column while training. `beforeDate` excludes the running workout.
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

    /** Best e1RM / weight before a point in time — used for live PR detection. */
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

    /** Records set during a stored workout (compared with everything before it). */
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
                out.push({
                    exerciseId: ex.exerciseId,
                    type: 'e1rm',
                    value: best1rm,
                    previous: before.e1rm,
                });
            } else if (bestWeight > before.weight + 0.01) {
                out.push({
                    exerciseId: ex.exerciseId,
                    type: 'weight',
                    value: bestWeight,
                    previous: before.weight,
                });
            }
        });
        return out;
    }

    /**
     * Most recent personal records across all exercises. Only the newest
     * sessions are scanned — record detection is quadratic in the log size.
     */
    function recentRecords(limit = 5, scan = 20) {
        const out = [];
        const seen = new Set();
        const list = Store.workouts().slice(0, scan); // newest first
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

    // ---------- protein ----------
    /** Intake per day for the last n days, oldest first. */
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

    /** Consecutive days up to today on which the target was met. */
    function proteinStreak() {
        const target = Store.proteinTarget();
        if (!target) return 0;
        const log = new Map(Store.proteinLog().map(e => [e.day, Number(e.grams) || 0]));
        const today = startOfDay(new Date());
        let streak = 0;
        for (let i = 0; i < 400; i++) {
            const day = Store.dayString(addDays(today, -i));
            const grams = log.get(day) || 0;
            if (grams >= target) {
                streak++;
            } else if (i === 0) {
                continue;   // today can still be completed
            } else {
                break;
            }
        }
        return streak;
    }

    /** Average intake over the last n days, ignoring days with no entry. */
    function proteinAverage(days = 7) {
        const series = proteinSeries(days).filter(d => d.grams > 0);
        if (series.length === 0) return 0;
        return series.reduce((sum, d) => sum + d.grams, 0) / series.length;
    }

    // ---------- body weight ----------
    function bodySeries(days = 180) {
        const from = addDays(startOfDay(new Date()), -days);
        return Store.bodyLog().filter(e => new Date(e.date) >= from);
    }

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

    // ---------- formatting ----------
    function fmtWeight(kg, opts = {}) {
        const v = Store.toDisplay(kg);
        const decimals = opts.decimals !== undefined ? opts.decimals : (v % 1 === 0 ? 0 : 1);
        return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    /** Compact volume: 12.4k instead of 12,431 */
    function fmtVolume(kg) {
        const v = Store.toDisplay(kg);
        if (v >= 100000) return Math.round(v / 1000) + 'k';
        if (v >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return Math.round(v).toLocaleString();
    }

    function fmtDuration(ms) {
        const total = Math.floor((ms || 0) / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function fmtClock(ms) {
        const total = Math.max(0, Math.floor((ms || 0) / 1000));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function fmtDate(d, opts) {
        return new Date(d).toLocaleDateString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function fmtRelativeDay(d) {
        const day = startOfDay(d);
        const today = startOfDay(new Date());
        const diff = Math.round((today - day) / DAY);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7 && diff > 0) return new Date(d).toLocaleDateString(undefined, { weekday: 'long' });
        return fmtDate(d);
    }

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

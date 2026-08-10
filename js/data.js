/* ============================================
   DATA LAYER – Exercise DB & localStorage
   ============================================ */

const GymData = (() => {

    // ---------- Built-in Exercise Database ----------
    const BUILT_IN_EXERCISES = [
        // Chest
        { id: 'ex-bench-press', name: 'Bench Press', muscleGroup: 'Chest', category: 'Barbell' },
        { id: 'ex-incline-bench', name: 'Incline Bench Press', muscleGroup: 'Chest', category: 'Barbell' },
        { id: 'ex-db-bench', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', category: 'Dumbbell' },
        { id: 'ex-db-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', category: 'Dumbbell' },
        { id: 'ex-cable-crossover', name: 'Cable Crossover', muscleGroup: 'Chest', category: 'Cable' },
        { id: 'ex-pushup', name: 'Push-up', muscleGroup: 'Chest', category: 'Bodyweight' },
        { id: 'ex-chest-press-machine', name: 'Chest Press (Machine)', muscleGroup: 'Chest', category: 'Machine' },

        // Back
        { id: 'ex-deadlift', name: 'Deadlift', muscleGroup: 'Back', category: 'Barbell' },
        { id: 'ex-barbell-row', name: 'Barbell Row', muscleGroup: 'Back', category: 'Barbell' },
        { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', category: 'Cable' },
        { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', category: 'Cable' },
        { id: 'ex-pullup', name: 'Pull-up', muscleGroup: 'Back', category: 'Bodyweight' },
        { id: 'ex-tbar-row', name: 'T-Bar Row', muscleGroup: 'Back', category: 'Barbell' },
        { id: 'ex-db-row', name: 'Dumbbell Row', muscleGroup: 'Back', category: 'Dumbbell' },

        // Legs
        { id: 'ex-squat', name: 'Squat', muscleGroup: 'Legs', category: 'Barbell' },
        { id: 'ex-leg-press', name: 'Leg Press', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-leg-curl', name: 'Leg Curl', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-lunges', name: 'Lunges', muscleGroup: 'Legs', category: 'Dumbbell' },
        { id: 'ex-calf-raise', name: 'Calf Raise', muscleGroup: 'Legs', category: 'Machine' },
        { id: 'ex-rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', category: 'Barbell' },
        { id: 'ex-hack-squat', name: 'Hack Squat', muscleGroup: 'Legs', category: 'Machine' },

        // Shoulders
        { id: 'ex-ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'Barbell' },
        { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-face-pull', name: 'Face Pull', muscleGroup: 'Shoulders', category: 'Cable' },
        { id: 'ex-rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', category: 'Dumbbell' },
        { id: 'ex-db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', category: 'Dumbbell' },

        // Arms
        { id: 'ex-barbell-curl', name: 'Barbell Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-hammer-curl', name: 'Hammer Curl', muscleGroup: 'Arms', category: 'Dumbbell' },
        { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', category: 'Cable' },
        { id: 'ex-skull-crusher', name: 'Skull Crusher', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-preacher-curl', name: 'Preacher Curl', muscleGroup: 'Arms', category: 'Barbell' },
        { id: 'ex-db-curl', name: 'Dumbbell Curl', muscleGroup: 'Arms', category: 'Dumbbell' },
        { id: 'ex-tricep-dip', name: 'Tricep Dip', muscleGroup: 'Arms', category: 'Bodyweight' },

        // Core
        { id: 'ex-plank', name: 'Plank', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-crunch', name: 'Crunch', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-russian-twist', name: 'Russian Twist', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', category: 'Bodyweight' },
        { id: 'ex-cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', category: 'Cable' },
    ];

    // ---------- localStorage Keys ----------
    const KEYS = {
        CUSTOM_EXERCISES: 'gym_custom_exercises',
        WORKOUTS: 'gym_workouts',
        TEMPLATES: 'gym_templates',
    };

    // ---------- Helper: Generate unique ID ----------
    function generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    // ---------- localStorage Helpers ----------
    function load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading data:', e);
            return [];
        }
    }

    function save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    // ========== EXERCISES ==========

    function getAllExercises() {
        const custom = getCustomExercises();
        return [...BUILT_IN_EXERCISES, ...custom];
    }

    function getExerciseById(id) {
        return getAllExercises().find(ex => ex.id === id) || null;
    }

    function getExercisesByMuscleGroup(group) {
        return getAllExercises().filter(ex => ex.muscleGroup === group);
    }

    function searchExercises(query, muscleGroup = '') {
        let exercises = getAllExercises();
        if (muscleGroup) {
            exercises = exercises.filter(ex => ex.muscleGroup === muscleGroup);
        }
        if (query) {
            const q = query.toLowerCase();
            exercises = exercises.filter(ex =>
                ex.name.toLowerCase().includes(q) ||
                ex.muscleGroup.toLowerCase().includes(q) ||
                ex.category.toLowerCase().includes(q)
            );
        }
        return exercises.sort((a, b) => a.name.localeCompare(b.name));
    }

    // ========== CUSTOM EXERCISES ==========

    function getCustomExercises() {
        return load(KEYS.CUSTOM_EXERCISES);
    }

    function saveCustomExercise(exercise) {
        const customs = getCustomExercises();
        if (exercise.id) {
            // Update existing
            const idx = customs.findIndex(e => e.id === exercise.id);
            if (idx >= 0) {
                customs[idx] = { ...customs[idx], ...exercise, isCustom: true };
            }
        } else {
            // Create new
            exercise.id = generateId('custom');
            exercise.isCustom = true;
            customs.push(exercise);
        }
        save(KEYS.CUSTOM_EXERCISES, customs);
        return exercise;
    }

    function deleteCustomExercise(id) {
        const customs = getCustomExercises().filter(e => e.id !== id);
        save(KEYS.CUSTOM_EXERCISES, customs);
    }

    // ========== WORKOUTS ==========

    function getWorkouts() {
        return load(KEYS.WORKOUTS).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function getWorkoutById(id) {
        return load(KEYS.WORKOUTS).find(w => w.id === id) || null;
    }

    function saveWorkout(workout) {
        const workouts = load(KEYS.WORKOUTS);
        if (!workout.id) {
            workout.id = generateId('workout');
        }
        workouts.push(workout);
        save(KEYS.WORKOUTS, workouts);
        return workout;
    }

    function deleteWorkout(id) {
        const workouts = load(KEYS.WORKOUTS).filter(w => w.id !== id);
        save(KEYS.WORKOUTS, workouts);
    }

    // ========== TEMPLATES ==========

    function getTemplates() {
        return load(KEYS.TEMPLATES);
    }

    function getTemplateById(id) {
        return load(KEYS.TEMPLATES).find(t => t.id === id) || null;
    }

    function saveTemplate(template) {
        const templates = load(KEYS.TEMPLATES);
        if (template.id) {
            // Update
            const idx = templates.findIndex(t => t.id === template.id);
            if (idx >= 0) {
                templates[idx] = template;
            } else {
                templates.push(template);
            }
        } else {
            template.id = generateId('tmpl');
            templates.push(template);
        }
        save(KEYS.TEMPLATES, templates);
        return template;
    }

    function deleteTemplate(id) {
        const templates = load(KEYS.TEMPLATES).filter(t => t.id !== id);
        save(KEYS.TEMPLATES, templates);
    }

    // ========== EXERCISE HISTORY (for charts) ==========

    function getExerciseHistory(exerciseId) {
        const workouts = getWorkouts();
        const history = [];

        workouts.forEach(workout => {
            workout.exercises.forEach(ex => {
                if (ex.exerciseId === exerciseId && ex.sets && ex.sets.length > 0) {
                    const completedSets = ex.sets.filter(s => s.completed);
                    if (completedSets.length === 0) return;

                    const maxWeight = Math.max(...completedSets.map(s => Number(s.weight) || 0));
                    const totalVolume = completedSets.reduce((sum, s) =>
                        sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

                    // Estimated 1RM using Brzycki formula: weight × (36 / (37 - reps))
                    let est1rm = 0;
                    completedSets.forEach(s => {
                        const w = Number(s.weight) || 0;
                        const r = Number(s.reps) || 0;
                        if (r > 0 && r < 37 && w > 0) {
                            const e1rm = w * (36 / (37 - r));
                            if (e1rm > est1rm) est1rm = e1rm;
                        }
                    });

                    history.push({
                        date: workout.date,
                        maxWeight,
                        totalVolume,
                        est1rm: Math.round(est1rm * 10) / 10,
                    });
                }
            });
        });

        // Sort chronologically
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        return history;
    }

    // ========== UTILITY ==========

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    }

    function formatDuration(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    }

    function formatDurationShort(ms) {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ========== PUBLIC API ==========
    return {
        generateId,
        getAllExercises,
        getExerciseById,
        getExercisesByMuscleGroup,
        searchExercises,
        getCustomExercises,
        saveCustomExercise,
        deleteCustomExercise,
        getWorkouts,
        getWorkoutById,
        saveWorkout,
        deleteWorkout,
        getTemplates,
        getTemplateById,
        saveTemplate,
        deleteTemplate,
        getExerciseHistory,
        formatDate,
        formatDuration,
        formatDurationShort,
    };
})();

/* ============================================
   WORKOUT TRACKING – Start, track sets, finish
   ============================================ */

const Workout = (() => {
    let currentWorkout = null;
    let workoutStartTime = null;
    let durationInterval = null;

    // ---------- Start Workout ----------
    function startWorkout(templateId = null) {
        currentWorkout = {
            exercises: [],
            date: new Date().toISOString(),
        };
        workoutStartTime = Date.now();

        // If starting from template, pre-fill exercises
        if (templateId) {
            const template = GymData.getTemplateById(templateId);
            if (template) {
                currentWorkout.exercises = template.exercises.map(ex => ({
                    exerciseId: ex.exerciseId,
                    notes: '',
                    sets: ex.sets.map(s => ({
                        weight: s.weight || '',
                        reps: s.reps || '',
                        completed: false,
                    })),
                }));
            }
        }

        showWorkoutView();
        startDurationTimer();
        renderWorkout();
    }

    // ---------- Show/Hide Workout View ----------
    function showWorkoutView() {
        document.getElementById('view-workout').classList.add('active');
        document.getElementById('bottom-nav').style.display = 'none';
    }

    function hideWorkoutView() {
        document.getElementById('view-workout').classList.remove('active');
        document.getElementById('bottom-nav').style.display = 'flex';
    }

    // ---------- Duration Timer ----------
    function startDurationTimer() {
        updateDurationDisplay();
        durationInterval = setInterval(updateDurationDisplay, 1000);
    }

    function updateDurationDisplay() {
        if (!workoutStartTime) return;
        const elapsed = Date.now() - workoutStartTime;
        document.getElementById('workout-duration').textContent =
            GymData.formatDurationShort(elapsed);
    }

    function stopDurationTimer() {
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }
    }

    // ---------- Add Exercise ----------
    function addExercise(exerciseId) {
        if (!currentWorkout) return;
        const exercise = GymData.getExerciseById(exerciseId);
        const isUnilateral = exercise ? !!exercise.isUnilateral : false;
        currentWorkout.exercises.push({
            exerciseId,
            isUnilateral,
            notes: '',
            sets: [{ weight: '', reps: '', repsL: '', repsR: '', completed: false }],
        });
        renderWorkout();
    }

    // ---------- Remove Exercise ----------
    function removeExercise(exIndex) {
        if (!currentWorkout) return;
        currentWorkout.exercises.splice(exIndex, 1);
        renderWorkout();
    }

    // ---------- Add Set ----------
    function addSet(exIndex) {
        if (!currentWorkout) return;
        const sets = currentWorkout.exercises[exIndex].sets;
        // Copy weight/reps from last set as suggestion
        const lastSet = sets[sets.length - 1];
        sets.push({
            weight: lastSet ? lastSet.weight : '',
            reps: lastSet ? lastSet.reps : '',
            repsL: lastSet ? lastSet.repsL : '',
            repsR: lastSet ? lastSet.repsR : '',
            completed: false,
        });
        renderWorkout();
    }

    // ---------- Remove Set ----------
    function removeSet(exIndex, setIndex) {
        if (!currentWorkout) return;
        currentWorkout.exercises[exIndex].sets.splice(setIndex, 1);
        renderWorkout();
    }

    // ---------- Update Set Data ----------
    function updateSetData(exIndex, setIndex, field, value) {
        if (!currentWorkout) return;
        currentWorkout.exercises[exIndex].sets[setIndex][field] = value;
    }

    // ---------- Toggle Set Complete ----------
    function toggleSetComplete(exIndex, setIndex) {
        if (!currentWorkout) return;
        const set = currentWorkout.exercises[exIndex].sets[setIndex];
        set.completed = !set.completed;
        renderWorkout();

        // Auto-open timer when set is completed
        if (set.completed) {
            Timer.openTimerModal();
        }
    }

    // ---------- Update Notes ----------
    function updateNotes(exIndex, notes) {
        if (!currentWorkout) return;
        currentWorkout.exercises[exIndex].notes = notes;
    }

    // ---------- Finish Workout ----------
    function finishWorkout() {
        if (!currentWorkout) return;

        // Check if there are any completed sets
        const hasCompletedSets = currentWorkout.exercises.some(
            ex => ex.sets.some(s => s.completed)
        );

        if (!hasCompletedSets) {
            App.showConfirm(
                'No Completed Sets',
                'You haven\'t completed any sets. Discard this workout?',
                () => {
                    cancelWorkout();
                }
            );
            return;
        }

        const duration = Date.now() - workoutStartTime;
        const workout = {
            ...currentWorkout,
            endTime: new Date().toISOString(),
            duration,
        };

        // Only save exercises that have at least one completed set
        workout.exercises = workout.exercises.filter(
            ex => ex.sets.some(s => s.completed)
        );

        GymData.saveWorkout(workout);

        stopDurationTimer();
        currentWorkout = null;
        workoutStartTime = null;
        hideWorkoutView();

        // Refresh dashboard
        App.refreshDashboard();
        App.showView('view-dashboard');
    }

    // ---------- Cancel Workout ----------
    function cancelWorkout() {
        stopDurationTimer();
        currentWorkout = null;
        workoutStartTime = null;
        hideWorkoutView();
    }

    // ---------- Render Workout ----------
    function renderWorkout() {
        const container = document.getElementById('workout-exercise-list');
        if (!currentWorkout) {
            container.innerHTML = '';
            return;
        }

        if (currentWorkout.exercises.length === 0) {
            container.innerHTML = '<p class="empty-state" style="margin-top:60px;">Tap "Add Exercise" to get started!</p>';
            return;
        }

        container.innerHTML = currentWorkout.exercises.map((ex, exIndex) => {
            const exercise = GymData.getExerciseById(ex.exerciseId);
            const name = exercise ? exercise.name : 'Unknown Exercise';
            const isUnilateral = ex.isUnilateral !== undefined ? ex.isUnilateral : (exercise ? !!exercise.isUnilateral : false);

            const setsHtml = ex.sets.map((set, setIndex) => {
                if (isUnilateral) {
                    return `
                        <tr class="${set.completed ? 'set-completed' : ''}">
                            <td><span class="set-number">${setIndex + 1}</span></td>
                            <td>
                                <input type="number" class="set-input" value="${set.weight || ''}"
                                    placeholder="0" inputmode="decimal"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-field="weight">
                            </td>
                            <td>
                                <input type="number" class="set-input set-input-lr" value="${set.repsL || ''}"
                                    placeholder="L" inputmode="numeric"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-field="repsL">
                            </td>
                            <td>
                                <input type="number" class="set-input set-input-lr" value="${set.repsR || ''}"
                                    placeholder="R" inputmode="numeric"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-field="repsR">
                            </td>
                            <td>
                                <button class="set-check-btn ${set.completed ? 'checked' : ''}"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-action="toggle-set">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                } else {
                    return `
                        <tr class="${set.completed ? 'set-completed' : ''}">
                            <td><span class="set-number">${setIndex + 1}</span></td>
                            <td>
                                <input type="number" class="set-input" value="${set.weight || ''}"
                                    placeholder="0" inputmode="decimal"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-field="weight">
                            </td>
                            <td>
                                <input type="number" class="set-input" value="${set.reps || ''}"
                                    placeholder="0" inputmode="numeric"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-field="reps">
                            </td>
                            <td>
                                <button class="set-check-btn ${set.completed ? 'checked' : ''}"
                                    data-ex="${exIndex}" data-set="${setIndex}" data-action="toggle-set">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }
            }).join('');

            return `
                <div class="workout-exercise-block">
                    <div class="workout-exercise-header">
                        <div class="header-left-title">
                            <h3>${name}</h3>
                            <button class="btn-toggle-unilateral ${isUnilateral ? 'active' : ''}"
                                data-action="toggle-unilateral" data-ex="${exIndex}"
                                title="Toggle Left/Right tracking">
                                L/R
                            </button>
                        </div>
                        <button class="btn-icon danger" data-action="remove-exercise" data-ex="${exIndex}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4
                                    a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="workout-exercise-notes">
                        <textarea placeholder="Add notes... (e.g. wide grip, go slow)"
                            data-ex="${exIndex}" data-action="update-notes"
                            rows="1">${ex.notes || ''}</textarea>
                    </div>
                    <table class="set-table ${isUnilateral ? 'set-table-unilateral' : ''}">
                        <thead>
                            <tr>
                                <th>Set</th>
                                <th>kg</th>
                                ${isUnilateral ? '<th>L Reps</th><th>R Reps</th>' : '<th>Reps</th>'}
                                <th>✓</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${setsHtml}
                        </tbody>
                    </table>
                    <div class="workout-exercise-footer">
                        <button class="btn btn-ghost btn-small" data-action="add-set" data-ex="${exIndex}">
                            + Add Set
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        attachWorkoutListeners(container);
    }

    // ---------- Event Listeners ----------
    function attachWorkoutListeners(container) {
        // Toggle unilateral mode
        container.querySelectorAll('[data-action="toggle-unilateral"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = Number(e.currentTarget.dataset.ex);
                const currentVal = currentWorkout.exercises[exIndex].isUnilateral;
                const exercise = GymData.getExerciseById(currentWorkout.exercises[exIndex].exerciseId);
                const defaultVal = exercise ? !!exercise.isUnilateral : false;
                const activeVal = currentVal !== undefined ? currentVal : defaultVal;
                currentWorkout.exercises[exIndex].isUnilateral = !activeVal;
                renderWorkout();
            });
        });

        // Set inputs
        container.querySelectorAll('.set-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const { ex, set, field } = e.target.dataset;
                updateSetData(Number(ex), Number(set), field, e.target.value);
            });
        });

        // Toggle set complete
        container.querySelectorAll('[data-action="toggle-set"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const { ex, set } = e.currentTarget.dataset;
                toggleSetComplete(Number(ex), Number(set));
            });
        });

        // Add set
        container.querySelectorAll('[data-action="add-set"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                addSet(Number(e.currentTarget.dataset.ex));
            });
        });

        // Remove exercise
        container.querySelectorAll('[data-action="remove-exercise"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exIndex = Number(e.currentTarget.dataset.ex);
                App.showConfirm('Remove Exercise', 'Remove this exercise from the workout?', () => {
                    removeExercise(exIndex);
                });
            });
        });

        // Notes
        container.querySelectorAll('[data-action="update-notes"]').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                updateNotes(Number(e.target.dataset.ex), e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            });
        });
    }

    // ---------- Open Exercise Picker for Workout ----------
    function openExercisePickerForWorkout() {
        App.openExercisePicker((exerciseId) => {
            addExercise(exerciseId);
        });
    }

    function isActive() {
        return currentWorkout !== null;
    }

    return {
        startWorkout,
        addExercise,
        finishWorkout,
        cancelWorkout,
        openExercisePickerForWorkout,
        renderWorkout,
        isActive,
    };
})();

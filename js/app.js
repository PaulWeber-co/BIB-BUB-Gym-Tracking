/* ============================================
   APP – Main navigation & initialization
   ============================================ */

const App = (() => {
    let exercisePickerCallback = null;
    let confirmCallback = null;
    let isTemplateEditorActive = false;

    // ---------- Show View (Bottom Nav) ----------
    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(viewId);
        if (view) view.classList.add('active');

        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewId);
        });

        // Refresh view content
        switch (viewId) {
            case 'view-dashboard':
                refreshDashboard();
                break;
            case 'view-templates':
                Templates.renderTemplates();
                break;
            case 'view-exercises':
                Exercises.renderExerciseList();
                break;
            case 'view-history':
                History.renderHistory();
                break;
            case 'view-progress':
                Charts.renderProgressView();
                break;
        }
    }

    // ---------- Refresh Dashboard ----------
    function refreshDashboard() {
        Templates.renderDashboardTemplates();
        History.renderRecentWorkouts();
    }

    // ---------- Exercise Picker Modal ----------
    function openExercisePicker(callback) {
        exercisePickerCallback = callback;
        document.getElementById('picker-search').value = '';
        document.getElementById('picker-filter-muscle').value = '';
        renderPickerExercises();
        document.getElementById('modal-exercise-picker').classList.add('active');
    }

    function closeExercisePicker() {
        document.getElementById('modal-exercise-picker').classList.remove('active');
        exercisePickerCallback = null;
    }

    function renderPickerExercises() {
        const query = document.getElementById('picker-search').value;
        const muscle = document.getElementById('picker-filter-muscle').value;
        const exercises = GymData.searchExercises(query, muscle);
        const container = document.getElementById('picker-exercise-list');

        container.innerHTML = exercises.map(ex => `
            <div class="exercise-item" data-id="${ex.id}" data-action="pick-exercise">
                <div class="exercise-item-info">
                    <div class="exercise-item-name">
                        ${ex.name}
                        ${ex.isCustom ? '<span class="badge-custom">Custom</span>' : ''}
                    </div>
                    <div class="exercise-item-meta">${ex.muscleGroup} · ${ex.category}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('[data-action="pick-exercise"]').forEach(item => {
            item.addEventListener('click', () => {
                if (exercisePickerCallback) {
                    exercisePickerCallback(item.dataset.id);
                }
                closeExercisePicker();
            });
        });
    }

    // ---------- Confirm Dialog ----------
    function showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        confirmCallback = onConfirm;
        document.getElementById('modal-confirm').classList.add('active');
    }

    function closeConfirm() {
        document.getElementById('modal-confirm').classList.remove('active');
        confirmCallback = null;
    }

    // ---------- Initialize App ----------
    function init() {
        // Bottom Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                showView(tab.dataset.view);
            });
        });

        // Dashboard: Start empty workout
        document.getElementById('btn-start-empty-workout').addEventListener('click', () => {
            Workout.startWorkout();
        });

        // Workout: Cancel
        document.getElementById('btn-cancel-workout').addEventListener('click', () => {
            if (Workout.isActive()) {
                showConfirm(
                    'Discard Workout',
                    'Are you sure you want to discard this workout?',
                    () => { Workout.cancelWorkout(); }
                );
            }
        });

        // Workout: Finish
        document.getElementById('btn-finish-workout').addEventListener('click', () => {
            Workout.finishWorkout();
        });

        // Workout: Add exercise
        document.getElementById('btn-add-exercise-to-workout').addEventListener('click', () => {
            openExercisePicker((exerciseId) => {
                Workout.addExercise(exerciseId);
            });
        });

        // Templates: Create new
        document.getElementById('btn-create-template').addEventListener('click', () => {
            isTemplateEditorActive = true;
            Templates.openTemplateEditor();
        });

        // Template Editor: Cancel
        document.getElementById('btn-cancel-template-edit').addEventListener('click', () => {
            isTemplateEditorActive = false;
            Templates.closeTemplateEditor();
        });

        // Template Editor: Save
        document.getElementById('btn-save-template').addEventListener('click', () => {
            isTemplateEditorActive = false;
            Templates.saveTemplate();
        });

        // Template Editor: Add exercise
        document.getElementById('btn-add-exercise-to-template').addEventListener('click', () => {
            openExercisePicker((exerciseId) => {
                Templates.addExerciseToTemplate(exerciseId);
            });
        });

        // Exercises Tab: Open create exercise
        document.getElementById('btn-open-create-exercise').addEventListener('click', () => {
            Exercises.openCreateExerciseForm();
        });

        // Exercise Picker: Create new exercise from picker
        document.getElementById('btn-picker-create-exercise').addEventListener('click', () => {
            Exercises.openCreateExerciseForm();
        });

        // Create Exercise Modal: Save
        document.getElementById('btn-save-exercise').addEventListener('click', () => {
            Exercises.saveExercise();
            // Also refresh picker if it's open
            if (document.getElementById('modal-exercise-picker').classList.contains('active')) {
                renderPickerExercises();
            }
        });

        // Create Exercise Modal: Close
        document.getElementById('btn-close-create-exercise').addEventListener('click', () => {
            Exercises.closeCreateExerciseModal();
        });

        // Exercise Picker: Close
        document.getElementById('btn-close-exercise-picker').addEventListener('click', () => {
            closeExercisePicker();
        });

        // Exercise Picker: Search & Filter
        document.getElementById('picker-search').addEventListener('input', renderPickerExercises);
        document.getElementById('picker-filter-muscle').addEventListener('change', renderPickerExercises);

        // Exercise List: Search & Filter
        document.getElementById('exercises-search').addEventListener('input', () => {
            Exercises.renderExerciseList();
        });
        document.getElementById('exercises-filter-muscle').addEventListener('change', () => {
            Exercises.renderExerciseList();
        });

        // Workout Detail: Close
        document.getElementById('btn-close-workout-detail').addEventListener('click', () => {
            History.closeWorkoutDetail();
        });

        // Workout Detail: Delete
        document.getElementById('btn-delete-workout').addEventListener('click', () => {
            History.deleteWorkoutFromDetail();
        });

        // Progress: Exercise select
        document.getElementById('progress-exercise-select').addEventListener('change', (e) => {
            Charts.updateChart(e.target.value);
        });

        // Progress: Metric tabs
        document.querySelectorAll('.metric-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const exerciseId = document.getElementById('progress-exercise-select').value;
                Charts.updateChart(exerciseId, tab.dataset.metric);
            });
        });

        // Timer: Presets
        document.querySelectorAll('.timer-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                Timer.selectDuration(Number(btn.dataset.seconds));
            });
        });

        // Timer: Start/Stop/Close
        document.getElementById('btn-timer-start').addEventListener('click', Timer.startTimer);
        document.getElementById('btn-timer-stop').addEventListener('click', Timer.stopTimer);
        document.getElementById('btn-close-timer').addEventListener('click', Timer.closeTimerModal);

        // Confirm Dialog
        document.getElementById('btn-confirm-ok').addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            closeConfirm();
        });
        document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);

        // Initial render
        refreshDashboard();
    }

    // ---------- Start ----------
    document.addEventListener('DOMContentLoaded', init);

    return {
        showView,
        refreshDashboard,
        openExercisePicker,
        showConfirm,
    };
})();

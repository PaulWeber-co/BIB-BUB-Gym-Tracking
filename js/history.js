/* ============================================
   HISTORY – Past workouts
   ============================================ */

const History = (() => {

    // ---------- Render History List ----------
    function renderHistory() {
        const workouts = GymData.getWorkouts();
        const container = document.getElementById('history-list');

        if (workouts.length === 0) {
            container.innerHTML = '<p class="empty-state">No workout history yet.<br>Complete a workout to see it here!</p>';
            return;
        }

        container.innerHTML = workouts.map(w => {
            const exerciseNames = w.exercises.map(ex => {
                const exercise = GymData.getExerciseById(ex.exerciseId);
                return exercise ? exercise.name : 'Unknown';
            }).join(', ');

            const totalSets = w.exercises.reduce((sum, ex) =>
                sum + ex.sets.filter(s => s.completed).length, 0);

            const totalVolume = w.exercises.reduce((sum, ex) =>
                sum + ex.sets.filter(s => s.completed).reduce((setSum, s) =>
                    setSum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0), 0);

            return `
                <div class="history-card" data-action="show-detail" data-id="${w.id}">
                    <div class="history-date">${GymData.formatDate(w.date)}</div>
                    <div class="history-title">${exerciseNames}</div>
                    <div class="history-stats">
                        <div class="history-stat"><strong>${w.exercises.length}</strong> exercises</div>
                        <div class="history-stat"><strong>${totalSets}</strong> sets</div>
                        <div class="history-stat"><strong>${totalVolume.toLocaleString()}</strong> kg vol</div>
                        ${w.duration ? `<div class="history-stat"><strong>${GymData.formatDuration(w.duration)}</strong></div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-action="show-detail"]').forEach(card => {
            card.addEventListener('click', () => {
                showWorkoutDetail(card.dataset.id);
            });
        });
    }

    // ---------- Render Dashboard Recent Workouts ----------
    function renderRecentWorkouts() {
        const workouts = GymData.getWorkouts().slice(0, 3);
        const container = document.getElementById('dashboard-recent-list');

        if (workouts.length === 0) {
            container.innerHTML = '<p class="empty-state">No workouts yet. Start your first one!</p>';
            return;
        }

        container.innerHTML = workouts.map(w => {
            const exerciseNames = w.exercises.map(ex => {
                const exercise = GymData.getExerciseById(ex.exerciseId);
                return exercise ? exercise.name : 'Unknown';
            }).slice(0, 3).join(', ');

            const totalSets = w.exercises.reduce((sum, ex) =>
                sum + ex.sets.filter(s => s.completed).length, 0);

            return `
                <div class="recent-workout-card" data-action="show-detail" data-id="${w.id}">
                    <div class="workout-date">${GymData.formatDate(w.date)}</div>
                    <div class="workout-summary">${exerciseNames}</div>
                    <div class="workout-stats">${totalSets} sets · ${w.duration ? GymData.formatDuration(w.duration) : ''}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-action="show-detail"]').forEach(card => {
            card.addEventListener('click', () => {
                showWorkoutDetail(card.dataset.id);
            });
        });
    }

    // ---------- Show Workout Detail ----------
    function showWorkoutDetail(workoutId) {
        const workout = GymData.getWorkoutById(workoutId);
        if (!workout) return;

        const container = document.getElementById('workout-detail-content');

        let html = `
            <div class="detail-header-card">
                <div class="detail-date">${GymData.formatDate(workout.date)}</div>
                ${workout.duration ? `<div class="detail-duration">Duration: ${GymData.formatDuration(workout.duration)}</div>` : ''}
            </div>
        `;

        workout.exercises.forEach(ex => {
            const exercise = GymData.getExerciseById(ex.exerciseId);
            const name = exercise ? exercise.name : 'Unknown';
            const completedSets = ex.sets.filter(s => s.completed);

            html += `
                <div class="detail-exercise-block">
                    <div class="detail-exercise-name">${name}</div>
                    ${ex.notes ? `<div class="detail-exercise-notes">"${ex.notes}"</div>` : ''}
                    ${completedSets.map((s, i) => `
                        <div class="detail-set-row">
                            <span class="detail-set-label">Set ${i + 1}</span>
                            <span>${s.weight || 0} kg</span>
                            <span>×</span>
                            <span>${s.reps || 0} reps</span>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        container.innerHTML = html;

        // Store current workout ID for delete
        document.getElementById('btn-delete-workout').dataset.id = workoutId;
        document.getElementById('view-workout-detail').classList.add('active');
    }

    function closeWorkoutDetail() {
        document.getElementById('view-workout-detail').classList.remove('active');
    }

    function deleteWorkoutFromDetail() {
        const id = document.getElementById('btn-delete-workout').dataset.id;
        App.showConfirm(
            'Delete Workout',
            'Delete this workout? This cannot be undone.',
            () => {
                GymData.deleteWorkout(id);
                closeWorkoutDetail();
                renderHistory();
                App.refreshDashboard();
            }
        );
    }

    return {
        renderHistory,
        renderRecentWorkouts,
        showWorkoutDetail,
        closeWorkoutDetail,
        deleteWorkoutFromDetail,
    };
})();

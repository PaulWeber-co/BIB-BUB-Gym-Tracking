/* ============================================
   EXERCISES – Custom exercise management
   ============================================ */

const Exercises = (() => {

    // ---------- Render Exercise List (Exercises Tab) ----------
    function renderExerciseList() {
        const searchQuery = document.getElementById('exercises-search').value;
        const muscleFilter = document.getElementById('exercises-filter-muscle').value;
        const exercises = GymData.searchExercises(searchQuery, muscleFilter);
        const container = document.getElementById('exercises-list');

        if (exercises.length === 0) {
            container.innerHTML = '<p class="empty-state">No exercises found.</p>';
            return;
        }

        container.innerHTML = exercises.map(ex => `
            <div class="exercise-item" data-id="${ex.id}">
                <div class="exercise-item-info">
                    <div class="exercise-item-name">
                        ${ex.name}
                        ${ex.isCustom ? '<span class="badge-custom">Custom</span>' : ''}
                        ${ex.isUnilateral ? '<span class="badge-unilateral">L/R</span>' : ''}
                    </div>
                    <div class="exercise-item-meta">${ex.muscleGroup} · ${ex.category}</div>
                </div>
                ${ex.isCustom ? `
                    <div class="exercise-item-actions">
                        <button class="btn-icon" data-action="edit-exercise" data-id="${ex.id}" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" data-action="delete-exercise" data-id="${ex.id}" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        attachExerciseListListeners(container);
    }

    function attachExerciseListListeners(container) {
        container.querySelectorAll('[data-action="edit-exercise"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditExerciseForm(e.currentTarget.dataset.id);
            });
        });

        container.querySelectorAll('[data-action="delete-exercise"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                const ex = GymData.getExerciseById(id);
                App.showConfirm(
                    'Delete Exercise',
                    `Delete "${ex.name}"? This cannot be undone.`,
                    () => {
                        GymData.deleteCustomExercise(id);
                        renderExerciseList();
                    }
                );
            });
        });
    }

    // ---------- Open Create Exercise Modal ----------
    function openCreateExerciseForm() {
        document.getElementById('create-exercise-title').textContent = 'New Exercise';
        document.getElementById('exercise-name-input').value = '';
        document.getElementById('exercise-muscle-select').value = '';
        document.getElementById('exercise-category-select').value = '';
        document.getElementById('exercise-unilateral-checkbox').checked = false;
        document.getElementById('exercise-edit-id').value = '';
        document.getElementById('modal-create-exercise').classList.add('active');
    }

    // ---------- Open Edit Exercise Modal ----------
    function openEditExerciseForm(id) {
        const ex = GymData.getExerciseById(id);
        if (!ex || !ex.isCustom) return;

        document.getElementById('create-exercise-title').textContent = 'Edit Exercise';
        document.getElementById('exercise-name-input').value = ex.name;
        document.getElementById('exercise-muscle-select').value = ex.muscleGroup;
        document.getElementById('exercise-category-select').value = ex.category;
        document.getElementById('exercise-unilateral-checkbox').checked = !!ex.isUnilateral;
        document.getElementById('exercise-edit-id').value = ex.id;
        document.getElementById('modal-create-exercise').classList.add('active');
    }

    // ---------- Save Exercise ----------
    function saveExercise() {
        const name = document.getElementById('exercise-name-input').value.trim();
        const muscleGroup = document.getElementById('exercise-muscle-select').value;
        const category = document.getElementById('exercise-category-select').value;
        const isUnilateral = document.getElementById('exercise-unilateral-checkbox').checked;
        const editId = document.getElementById('exercise-edit-id').value;

        if (!name) {
            alert('Please enter an exercise name.');
            return;
        }
        if (!muscleGroup) {
            alert('Please select a muscle group.');
            return;
        }
        if (!category) {
            alert('Please select a category.');
            return;
        }

        const exercise = {
            name,
            muscleGroup,
            category,
            isUnilateral,
        };

        if (editId) {
            exercise.id = editId;
        }

        GymData.saveCustomExercise(exercise);
        closeCreateExerciseModal();
        renderExerciseList();
    }

    // ---------- Close Modal ----------
    function closeCreateExerciseModal() {
        document.getElementById('modal-create-exercise').classList.remove('active');
    }

    return {
        renderExerciseList,
        openCreateExerciseForm,
        openEditExerciseForm,
        saveExercise,
        closeCreateExerciseModal,
    };
})();

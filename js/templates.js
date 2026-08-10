/* ============================================
   TEMPLATES – Workout routines
   ============================================ */

const Templates = (() => {
    let currentTemplate = null;

    // ---------- Render Templates List ----------
    function renderTemplates() {
        const templates = GymData.getTemplates();
        const container = document.getElementById('templates-list');

        if (templates.length === 0) {
            container.innerHTML = '<p class="empty-state">No templates yet.<br>Tap + to create your first routine!</p>';
            return;
        }

        container.innerHTML = templates.map(tmpl => {
            const exerciseNames = tmpl.exercises.map(ex => {
                const exercise = GymData.getExerciseById(ex.exerciseId);
                const setCount = ex.sets ? ex.sets.length : 0;
                return exercise ? `${setCount}× ${exercise.name}` : 'Unknown';
            }).join(', ');

            return `
                <div class="template-card" data-id="${tmpl.id}">
                    <div class="template-card-header">
                        <h3>${tmpl.name}</h3>
                    </div>
                    <div class="template-card-exercises">${exerciseNames}</div>
                    <div class="template-card-actions">
                        <button class="btn btn-primary btn-small" data-action="start-template" data-id="${tmpl.id}">
                            Start Workout
                        </button>
                        <button class="btn btn-outline btn-small" data-action="edit-template" data-id="${tmpl.id}">
                            Edit
                        </button>
                        <button class="btn btn-ghost btn-small" data-action="delete-template" data-id="${tmpl.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        attachTemplateListeners(container);
    }

    function attachTemplateListeners(container) {
        container.querySelectorAll('[data-action="start-template"]').forEach(btn => {
            btn.addEventListener('click', () => {
                Workout.startWorkout(btn.dataset.id);
            });
        });

        container.querySelectorAll('[data-action="edit-template"]').forEach(btn => {
            btn.addEventListener('click', () => {
                openTemplateEditor(btn.dataset.id);
            });
        });

        container.querySelectorAll('[data-action="delete-template"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tmpl = GymData.getTemplateById(btn.dataset.id);
                App.showConfirm(
                    'Delete Template',
                    `Delete "${tmpl.name}"? This cannot be undone.`,
                    () => {
                        GymData.deleteTemplate(btn.dataset.id);
                        renderTemplates();
                        App.refreshDashboard();
                    }
                );
            });
        });
    }

    // ---------- Render Dashboard Templates ----------
    function renderDashboardTemplates() {
        const templates = GymData.getTemplates();
        const container = document.getElementById('dashboard-templates-list');

        if (templates.length === 0) {
            container.innerHTML = '<p class="empty-state">No templates yet. Create one in the Templates tab!</p>';
            return;
        }

        container.innerHTML = templates.map(tmpl => {
            const exerciseCount = tmpl.exercises.length;
            return `
                <div class="template-quick-card" data-action="start-template" data-id="${tmpl.id}">
                    <div>
                        <div class="template-name">${tmpl.name}</div>
                        <div class="template-info">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}</div>
                    </div>
                    <button class="play-btn" data-action="start-template" data-id="${tmpl.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-action="start-template"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                Workout.startWorkout(el.dataset.id);
            });
        });
    }

    // ---------- Template Editor ----------
    function openTemplateEditor(templateId = null) {
        if (templateId) {
            const existing = GymData.getTemplateById(templateId);
            if (existing) {
                currentTemplate = JSON.parse(JSON.stringify(existing)); // deep clone
                document.getElementById('template-editor-title').textContent = 'Edit Template';
            }
        } else {
            currentTemplate = {
                name: '',
                exercises: [],
            };
            document.getElementById('template-editor-title').textContent = 'New Template';
        }

        document.getElementById('template-name-input').value = currentTemplate.name;
        document.getElementById('view-template-editor').classList.add('active');
        document.getElementById('bottom-nav').style.display = 'none';
        renderTemplateExercises();
    }

    function closeTemplateEditor() {
        document.getElementById('view-template-editor').classList.remove('active');
        document.getElementById('bottom-nav').style.display = 'flex';
        currentTemplate = null;
    }

    function renderTemplateExercises() {
        const container = document.getElementById('template-exercise-list');
        if (!currentTemplate || currentTemplate.exercises.length === 0) {
            container.innerHTML = '<p class="empty-state">Add exercises to your template.</p>';
            return;
        }

        container.innerHTML = currentTemplate.exercises.map((ex, exIndex) => {
            const exercise = GymData.getExerciseById(ex.exerciseId);
            const name = exercise ? exercise.name : 'Unknown';

            const setsHtml = ex.sets.map((set, setIndex) => `
                <tr>
                    <td><span class="set-number">${setIndex + 1}</span></td>
                    <td>
                        <input type="number" class="set-input" value="${set.weight}"
                            placeholder="0" inputmode="decimal"
                            data-ex="${exIndex}" data-set="${setIndex}" data-field="weight">
                    </td>
                    <td>
                        <input type="number" class="set-input" value="${set.reps}"
                            placeholder="0" inputmode="numeric"
                            data-ex="${exIndex}" data-set="${setIndex}" data-field="reps">
                    </td>
                    <td>
                        <button class="btn-icon danger" data-action="remove-tmpl-set"
                            data-ex="${exIndex}" data-set="${setIndex}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `).join('');

            return `
                <div class="workout-exercise-block">
                    <div class="workout-exercise-header">
                        <h3>${name}</h3>
                        <button class="btn-icon danger" data-action="remove-tmpl-exercise" data-ex="${exIndex}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4
                                    a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                    <table class="set-table">
                        <thead>
                            <tr>
                                <th>Set</th>
                                <th>kg</th>
                                <th>Reps</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${setsHtml}</tbody>
                    </table>
                    <div class="workout-exercise-footer">
                        <button class="btn btn-ghost btn-small" data-action="add-tmpl-set" data-ex="${exIndex}">
                            + Add Set
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        attachTemplateEditorListeners(container);
    }

    function attachTemplateEditorListeners(container) {
        // Set inputs
        container.querySelectorAll('.set-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const { ex, set, field } = e.target.dataset;
                currentTemplate.exercises[Number(ex)].sets[Number(set)][field] = e.target.value;
            });
        });

        // Add set
        container.querySelectorAll('[data-action="add-tmpl-set"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const exIndex = Number(btn.dataset.ex);
                const sets = currentTemplate.exercises[exIndex].sets;
                const lastSet = sets[sets.length - 1];
                sets.push({
                    weight: lastSet ? lastSet.weight : '',
                    reps: lastSet ? lastSet.reps : '',
                });
                renderTemplateExercises();
            });
        });

        // Remove set
        container.querySelectorAll('[data-action="remove-tmpl-set"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const exIndex = Number(btn.dataset.ex);
                const setIndex = Number(btn.dataset.set);
                currentTemplate.exercises[exIndex].sets.splice(setIndex, 1);
                if (currentTemplate.exercises[exIndex].sets.length === 0) {
                    currentTemplate.exercises.splice(exIndex, 1);
                }
                renderTemplateExercises();
            });
        });

        // Remove exercise
        container.querySelectorAll('[data-action="remove-tmpl-exercise"]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTemplate.exercises.splice(Number(btn.dataset.ex), 1);
                renderTemplateExercises();
            });
        });
    }

    // ---------- Add Exercise to Template ----------
    function addExerciseToTemplate(exerciseId) {
        if (!currentTemplate) return;
        currentTemplate.exercises.push({
            exerciseId,
            sets: [{ weight: '', reps: '' }],
        });
        renderTemplateExercises();
    }

    // ---------- Save Template ----------
    function saveTemplate() {
        if (!currentTemplate) return;

        const name = document.getElementById('template-name-input').value.trim();
        if (!name) {
            alert('Please enter a template name.');
            return;
        }

        if (currentTemplate.exercises.length === 0) {
            alert('Please add at least one exercise.');
            return;
        }

        currentTemplate.name = name;
        GymData.saveTemplate(currentTemplate);
        closeTemplateEditor();
        renderTemplates();
        App.refreshDashboard();
    }

    return {
        renderTemplates,
        renderDashboardTemplates,
        openTemplateEditor,
        closeTemplateEditor,
        addExerciseToTemplate,
        saveTemplate,
    };
})();

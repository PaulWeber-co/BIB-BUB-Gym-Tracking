/* ============================================================
   PICKER — exercise selection sheet.
   Multi select, search, muscle filter and a "recent" section so
   the exercises you actually train are one tap away.
   ============================================================ */

const Picker = (() => {

    function initials(name) {
        const words = name.replace(/[()]/g, '').split(/[\s-]+/).filter(Boolean);
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    function avatar(ex) {
        const color = Store.MUSCLE_COLORS[ex.muscleGroup] || Store.MUSCLE_COLORS.Other;
        return `<div class="pick-avatar" style="background:${color}22;color:${color}">${UI.esc(initials(ex.name))}</div>`;
    }

    /** Exercise ids ordered by how recently they were trained. */
    function recentIds(limit = 6) {
        const seen = [];
        Store.workouts().forEach(w => {
            (w.exercises || []).forEach(ex => {
                if (!seen.includes(ex.exerciseId)) seen.push(ex.exerciseId);
            });
        });
        return seen.slice(0, limit);
    }

    /**
     * options: { multi = true, title, onPick(ids) }
     */
    function open(options = {}) {
        const multi = options.multi !== false;
        const picked = [];
        let query = '';
        let muscle = '';

        const sheet = UI.sheet({
            title: options.title || 'Add Exercise',
            left: 'Cancel',
            right: multi ? 'Add' : '',
            full: true,
            noPad: true,
            onRight: (api) => {
                if (picked.length === 0) return;
                api.close();
                if (options.onPick) options.onPick(picked.slice());
            },
        });

        const head = UI.el(`
            <div style="padding:0 16px 10px;display:flex;flex-direction:column;gap:10px">
                <div class="search-field">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
                    <input class="input" type="search" placeholder="Search" data-role="q" autocomplete="off" autocorrect="off" spellcheck="false">
                </div>
                <div class="chips" data-role="chips">
                    <button class="chip is-active" data-muscle="">All</button>
                    ${Store.MUSCLES.map(m => `<button class="chip" data-muscle="${m}">${m}</button>`).join('')}
                </div>
            </div>`);

        const listWrap = UI.el('<div data-role="list"></div>');
        const foot = UI.el(`
            <div style="padding:10px 16px 4px">
                <button class="btn btn-tint btn-block" data-role="new">Create New Exercise</button>
            </div>`);

        sheet.body.appendChild(head);
        sheet.body.appendChild(listWrap);
        sheet.body.appendChild(foot);

        const rightBtn = sheet.root.querySelector('[data-role="right"]');

        function syncRight() {
            if (!rightBtn || !multi) return;
            rightBtn.textContent = picked.length ? `Add (${picked.length})` : 'Add';
            rightBtn.style.opacity = picked.length ? '1' : '0.4';
        }

        function row(ex) {
            const isPicked = picked.includes(ex.id);
            return `
                <button class="pick-row ${isPicked ? 'is-picked' : ''}" data-id="${ex.id}">
                    ${avatar(ex)}
                    <div class="pick-main">
                        <div class="pick-name">${UI.esc(ex.name)}${ex.isCustom ? '<span class="badge badge-custom">Custom</span>' : ''}${ex.isUnilateral ? '<span class="badge badge-lr">L/R</span>' : ''}</div>
                        <div class="pick-meta">${UI.esc(ex.muscleGroup)} &middot; ${UI.esc(ex.category)}</div>
                    </div>
                    ${multi ? `<div class="pick-check">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>` : `<svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`}
                </button>`;
        }

        function render() {
            const results = Store.searchExercises(query, muscle);
            let html = '';

            if (!query && !muscle) {
                const recents = recentIds().map(id => Store.exercise(id)).filter(Boolean);
                if (recents.length) {
                    html += '<div class="list-letter">Recent</div>';
                    html += recents.map(row).join('');
                }
            }

            if (results.length === 0) {
                html += `<div class="empty"><strong>Nothing found</strong>Create "${UI.esc(query)}" as a new exercise.</div>`;
            } else {
                let letter = '';
                html += (!query && !muscle) ? '<div class="list-letter">All Exercises</div>' : '';
                results.forEach(ex => {
                    const first = ex.name[0].toUpperCase();
                    if (query === '' && first !== letter) {
                        letter = first;
                        html += `<div class="list-letter">${UI.esc(letter)}</div>`;
                    }
                    html += row(ex);
                });
            }

            listWrap.innerHTML = html;
            listWrap.querySelectorAll('.pick-row').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    if (!multi) {
                        sheet.close();
                        if (options.onPick) options.onPick([id]);
                        return;
                    }
                    const i = picked.indexOf(id);
                    if (i >= 0) picked.splice(i, 1); else picked.push(id);
                    UI.haptic(8);
                    listWrap.querySelectorAll(`.pick-row[data-id="${id}"]`)
                        .forEach(n => n.classList.toggle('is-picked', picked.includes(id)));
                    syncRight();
                });
            });
        }

        head.querySelector('[data-role="q"]').addEventListener('input', (e) => {
            query = e.target.value;
            render();
        });

        head.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                muscle = chip.dataset.muscle;
                head.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
                render();
            });
        });

        foot.querySelector('[data-role="new"]').addEventListener('click', () => {
            Exercises.openEditor(null, (created) => {
                if (!created) return;
                if (multi) {
                    picked.push(created.id);
                    syncRight();
                    render();
                } else {
                    sheet.close();
                    if (options.onPick) options.onPick([created.id]);
                }
            }, query);
        });

        syncRight();
        render();
        return sheet;
    }

    return { open, avatar, initials, recentIds };
})();

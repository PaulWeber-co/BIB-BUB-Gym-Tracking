/* ============================================================
   NUTRITION — daily protein target derived from body weight,
   quick logging and a 14 day view.
   ============================================================ */

const Nutrition = (() => {

    const QUICK = [20, 30, 40];

    /** Grams per kg with a plain-language label. */
    const LEVELS = [
        { value: 1.4, label: 'Maintain' },
        { value: 1.6, label: 'Build' },
        { value: 1.8, label: 'Build+' },
        { value: 2.0, label: 'Lean gain' },
        { value: 2.2, label: 'Cutting' },
    ];

    function openSheet() {
        UI.sheet({
            title: 'Protein',
            left: 'Done',
            build: (el, api) => render(el, api),
        });
    }

    function render(el, api) {
        const target = Store.proteinTarget();
        const today = Store.proteinOn();
        const weight = Store.latestBodyWeight();
        const s = Store.settings();
        const series = Stats.proteinSeries(14);
        const streak = Stats.proteinStreak();
        const average = Stats.proteinAverage(7);

        const remaining = target ? Math.max(0, target - today) : null;

        el.innerHTML = `
            <div class="protein-hero">
                <div class="metric-big">${today}<span class="unit"> / ${target === null ? '—' : target} g</span></div>
                <div class="metric-caption">
                    ${target === null
                        ? 'No body weight logged yet'
                        : (remaining > 0 ? `${remaining} g to go today` : 'Target reached')}
                </div>
                ${Charts.progress(target ? today / target : 0, { color: '#FFFFFF', height: 8 })}
            </div>

            ${target === null ? `
                <div class="card">
                    <div class="empty">
                        <strong>Body weight missing</strong>
                        The daily target is your body weight times ${s.proteinPerKg} g. Log your weight once and the
                        target keeps itself up to date.
                    </div>
                    <button class="btn btn-fill btn-block" data-act="weight">Log Body Weight</button>
                </div>` : ''}

            <div class="protein-grid">
                ${QUICK.map(g => `<button class="protein-quick" data-add="${g}">+${g} g</button>`).join('')}
            </div>
            <div class="btn-pair">
                <button class="btn btn-tint btn-sm" data-act="custom">Enter Amount</button>
                <button class="btn btn-tint btn-sm" data-act="reset" ${today === 0 ? 'disabled style="opacity:.4"' : ''}>Reset Today</button>
            </div>

            <div class="section-title"><h2>Last 14 days</h2></div>
            <div class="chart-wrap">${Charts.bars(series.map((d, i) => ({
                value: d.grams,
                label: d.date.toLocaleDateString(undefined, { weekday: 'narrow' }),
                highlight: i === series.length - 1,
            })), {
                height: 130,
                barWidth: 16,
                goal: target || 0,
                labels: false,
                ariaLabel: 'Protein intake over the last 14 days',
            })}</div>
            <div class="chart-legend">
                <div class="chart-legend-item"><span class="chart-legend-dot" style="background:#2C68C8"></span>Daily intake</div>
                ${target ? '<div class="chart-legend-item"><span class="chart-legend-dot" style="background:#8A8A82"></span>Target</div>' : ''}
            </div>

            <div class="tile-grid">
                <div class="tile">
                    <div class="tile-label">Streak</div>
                    <div class="tile-value">${streak}<span class="unit">${streak === 1 ? 'day' : 'days'}</span></div>
                    <div class="tile-foot">at or above target</div>
                </div>
                <div class="tile">
                    <div class="tile-label">7 day average</div>
                    <div class="tile-value">${Math.round(average)}<span class="unit">g</span></div>
                    <div class="tile-foot">${weight ? `${Stats.fmtWeight(weight, { decimals: 1 })} ${Store.unit()} body weight` : 'no body weight'}</div>
                </div>
            </div>

            <div class="section-title"><h2>Target</h2></div>
            <div class="list">
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Grams per kg</div>
                        <div class="switch-row-sub">${weight
                            ? `${Stats.fmtWeight(weight, { decimals: 1 })} kg &times; ${s.proteinPerKg} = ${Math.round(weight * s.proteinPerKg)} g`
                            : 'Applied to your latest body weight'}</div>
                    </div>
                    <button class="btn btn-sm btn-grey" data-act="level">${s.proteinPerKg}</button>
                </div>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Fixed target</div>
                        <div class="switch-row-sub">Overrides the calculation when set.</div>
                    </div>
                    <button class="btn btn-sm btn-grey" data-act="manual">${s.proteinManual > 0 ? `${s.proteinManual} g` : 'Off'}</button>
                </div>
            </div>
            <p class="tiny muted">Body weight is tracked under Trends &rarr; Body. The target follows it automatically.</p>`;

        bind(el, api);
    }

    function bind(el, api) {
        const refresh = () => { render(el, api); App.refreshAll(); };

        el.querySelectorAll('[data-add]').forEach(btn => {
            btn.addEventListener('click', () => {
                Store.addProtein(Number(btn.dataset.add));
                UI.haptic('impact');
                refresh();
            });
        });

        el.querySelectorAll('[data-act]').forEach(btn => {
            btn.addEventListener('click', async () => {
                switch (btn.dataset.act) {
                    case 'custom': {
                        const value = await UI.prompt({
                            title: 'Add protein',
                            message: 'Grams to add to today.',
                            placeholder: 'g',
                            inputmode: 'numeric',
                            confirmLabel: 'Add',
                        });
                        if (value === null) return;
                        const grams = UI.num(value);
                        if (grams > 0) { Store.addProtein(grams); UI.haptic('impact'); refresh(); }
                        break;
                    }
                    case 'reset':
                        Store.setProtein(0);
                        refresh();
                        break;
                    case 'level':
                        UI.actionSheet({
                            title: 'Protein per kg body weight',
                            actions: LEVELS.map(l => ({
                                label: `${l.value} g/kg — ${l.label}`,
                                plain: true,
                                onSelect: () => { Store.setSetting('proteinPerKg', l.value); refresh(); },
                            })),
                        });
                        break;
                    case 'manual': {
                        const value = await UI.prompt({
                            title: 'Fixed daily target',
                            message: 'Grams per day. Enter 0 to go back to the calculation.',
                            value: String(Store.settings().proteinManual || ''),
                            inputmode: 'numeric',
                        });
                        if (value === null) return;
                        Store.setSetting('proteinManual', Math.max(0, Math.round(UI.num(value))));
                        refresh();
                        break;
                    }
                    case 'weight':
                        api.close();
                        setTimeout(() => Trends.openWeightPrompt(), 320);
                        break;
                }
            });
        });
    }

    return { openSheet, LEVELS };
})();

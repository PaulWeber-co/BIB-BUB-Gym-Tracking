/* ============================================================
   SETTINGS — Einstellungen, Wochenziele, Einheiten, Backup & Health
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Verwaltet das Einstellungen-Sheet:
   1. Wochenziele (Volumen, Workouts, Arbeitssätze)
   2. Einheiten-Umschaltung (kg / lb)
   3. Trainings-Einstellungen (Pause-Timer, Ton, Vibration, Hantelstangen-Gewicht)
   4. Apple Health Hand-off Erklärung & Shortcut-Verknüpfung
   5. Daten-Backup (JSON Export / Import) und Daten löschen
   6. App zur Hülle / Home-Screen hinzufügen Erklärung
   ============================================================ */

const Settings = (() => {

    function open() {
        UI.sheet({
            title: 'Settings',
            left: 'Done',
            full: true,
            build: (el, api) => {
                render(el, api);
            },
        });
    }

    /** render(el, api) — Baut die Einstellungen-Benutzeroberfläche auf. */
    function render(el, api) {
        const s = Store.settings();
        const bytes = Store.storageSize();
        const lastExport = Store.meta().lastExport;

        const proteinTarget = Store.proteinTarget();

        el.innerHTML = `
            <div class="section-title"><h2>Appearance</h2></div>
            <div class="segmented" data-role="theme">
                <button data-theme-mode="system" class="${Theme.mode() === 'system' ? 'is-active' : ''}">System</button>
                <button data-theme-mode="light" class="${Theme.mode() === 'light' ? 'is-active' : ''}">Light</button>
                <button data-theme-mode="dark" class="${Theme.mode() === 'dark' ? 'is-active' : ''}">Dark</button>
            </div>
            <p class="tiny muted">Dark hält Leisten und Overlays dunkel — für schlecht beleuchtete Studios.</p>

            <div class="section-title"><h2 style="font-size:1.0625rem">Weekly Goals</h2></div>
            <div class="list">
                <button class="list-row" data-act="protein">
                    <div class="list-row-main">
                        <div class="list-row-title">Protein</div>
                        <div class="list-row-sub">${proteinTarget === null
                            ? 'Log a body weight to set a target'
                            : `${proteinTarget} g per day &middot; ${s.proteinManual > 0 ? 'fixed' : `${s.proteinPerKg} g per kg`}`}</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                ${stepperRow('Workouts', 'goalWorkouts', String(s.goalWorkouts), 'Sessions per week.')}
                ${stepperRow('Sets', 'goalSets', String(s.goalSets), 'Working sets per week.')}
                ${stepperRow('Volume', 'goalVolume', Stats.fmtVolume(s.goalVolume) + ' ' + Store.unit(), 'Weekly reference for the volume charts.')}
            </div>
            <p class="tiny muted">Protein, workouts and sets are the three bands on the summary screen.</p>

            <div class="section-title"><h2>Units</h2></div>
            <div class="segmented" data-role="unit">
                <button data-unit="kg" class="${s.unit === 'kg' ? 'is-active' : ''}">Kilograms</button>
                <button data-unit="lb" class="${s.unit === 'lb' ? 'is-active' : ''}">Pounds</button>
            </div>
            <p class="tiny muted">Weights are stored in kilograms and converted for display, so switching back and forth is lossless.</p>

            <div class="section-title"><h2>Training</h2></div>
            <div class="list">
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Auto rest timer</div>
                        <div class="switch-row-sub">Starts when you check off a set.</div>
                    </div>
                    <button class="switch ${s.restAuto ? 'is-on' : ''}" data-toggle="restAuto" role="switch"></button>
                </div>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Default rest</div>
                        <div class="switch-row-sub">Used when an exercise has no own timer.</div>
                    </div>
                    <button class="btn btn-sm btn-grey" data-act="rest-default">${Stats.fmtClock(s.restDefault * 1000)}</button>
                </div>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Bar weight</div>
                        <div class="switch-row-sub">Basis for the plate calculator.</div>
                    </div>
                    <button class="btn btn-sm btn-grey" data-act="bar-weight">${Stats.fmtWeight(s.barWeight)} ${Store.unit()}</button>
                </div>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Sound</div>
                        <div class="switch-row-sub">Tone when the rest timer ends.</div>
                    </div>
                    <button class="switch ${s.sound ? 'is-on' : ''}" data-toggle="sound" role="switch"></button>
                </div>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Haptics</div>
                        <div class="switch-row-sub">${UI.hasVibration()
                            ? 'Vibration on set completion and timers.'
                            : 'Uses the iOS system haptic (17.4 and later). Safari has no vibration API.'}</div>
                    </div>
                    <button class="switch ${s.haptics ? 'is-on' : ''}" data-toggle="haptics" role="switch"></button>
                </div>
            </div>

            <div class="section-title"><h2>Apple Health</h2></div>
            <div class="list">
                <button class="list-row" data-act="health-info">
                    <div class="list-row-main">
                        <div class="list-row-title">How this works</div>
                        <div class="list-row-sub">${s.healthShortcut ? `Shortcut: ${UI.esc(s.healthShortcut)}` : 'Not set up'}</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="list-row" data-act="health-name">
                    <div class="list-row-main">
                        <div class="list-row-title">Shortcut name</div>
                        <div class="list-row-sub">Name of the Shortcut that writes to Health.</div>
                    </div>
                    <span class="list-row-value">${s.healthShortcut ? UI.esc(s.healthShortcut) : 'None'}</span>
                </button>
            </div>

            <div class="section-title"><h2>Data</h2></div>
            <div class="list">
                <button class="list-row" data-act="export">
                    <div class="list-row-main">
                        <div class="list-row-title">Export backup</div>
                        <div class="list-row-sub">${lastExport ? `Last export ${UI.esc(Stats.fmtRelativeDay(lastExport))}` : 'Never exported'}</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="list-row" data-act="import">
                    <div class="list-row-main">
                        <div class="list-row-title">Import backup</div>
                        <div class="list-row-sub">Merges a previously exported file.</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Stored locally</div>
                        <div class="switch-row-sub">${Store.workouts().length} workouts &middot; ${(bytes / 1024).toFixed(0)} KB</div>
                    </div>
                </div>
                <button class="list-row" data-act="reset">
                    <div class="list-row-main">
                        <div class="list-row-title" style="color:var(--danger)">Delete all data</div>
                        <div class="list-row-sub">Workouts, routines, exercises and settings.</div>
                    </div>
                </button>
            </div>
            <p class="tiny muted">Everything lives in this browser only. iOS clears the storage of websites you have not opened for a while — add the app to your home screen and export a backup now and then.</p>

            <div class="section-title"><h2>About</h2></div>
            <div class="list">
                <button class="list-row" data-act="install">
                    <div class="list-row-main">
                        <div class="list-row-title">Add to home screen</div>
                        <div class="list-row-sub">Run it full screen like a native app.</div>
                    </div>
                    <svg class="chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div class="switch-row">
                    <div class="switch-row-main">
                        <div class="switch-row-title">Version</div>
                        <div class="switch-row-sub">Offline capable, no account, no server.</div>
                    </div>
                    <span class="list-row-value">2.0</span>
                </div>
            </div>`;

        bind(el, api);
    }

    function stepperRow(title, key, valueLabel, sub) {
        return `
            <div class="switch-row">
                <div class="switch-row-main">
                    <div class="switch-row-title">${title}</div>
                    <div class="switch-row-sub">${sub}</div>
                </div>
                <div class="stepper">
                    <button class="stepper-btn" data-goal="${key}" data-dir="-1" aria-label="Decrease">&minus;</button>
                    <span class="stepper-value">${valueLabel}</span>
                    <button class="stepper-btn" data-goal="${key}" data-dir="1" aria-label="Increase">+</button>
                </div>
            </div>`;
    }

    /* ──────────────────────────────────────────────────────────
       EVENTS — Interaktionen in den Einstellungen
       ────────────────────────────────────────────────────────── */
    function bind(el, api) {
        const rerender = () => { render(el, api); App.refreshAll(); };

        el.querySelectorAll('.switch[data-toggle]').forEach(sw => {
            sw.addEventListener('click', () => {
                const key = sw.dataset.toggle;
                Store.setSetting(key, !Store.settings()[key]);
                sw.classList.toggle('is-on');
                UI.haptic('select');
                if (key === 'sound' && Store.settings().sound) { UI.unlockAudio(); UI.beep(); }
            });
        });

        el.querySelectorAll('[data-goal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.goal;
                const dir = Number(btn.dataset.dir);
                const s = Store.settings();
                if (key === 'goalVolume') {
                    const step = Store.unit() === 'lb' ? Store.toBase(2500) : 1000;
                    Store.setSetting(key, Math.max(1000, Math.round(s.goalVolume + dir * step)));
                } else if (key === 'goalWorkouts') {
                    Store.setSetting(key, Math.min(14, Math.max(1, s.goalWorkouts + dir)));
                } else {
                    Store.setSetting(key, Math.min(300, Math.max(5, s.goalSets + dir * 5)));
                }
                UI.haptic('tap');
                rerender();
            });
        });

        el.querySelectorAll('[data-role="theme"] button').forEach(btn => {
            btn.addEventListener('click', () => {
                Theme.set(btn.dataset.themeMode);
                UI.haptic('select');
                rerender();      // Charts und Diagramme lesen die Palette neu
            });
        });

        el.querySelectorAll('[data-role="unit"] button').forEach(btn => {
            btn.addEventListener('click', () => {
                Store.setSetting('unit', btn.dataset.unit);
                rerender();
            });
        });

        el.querySelectorAll('[data-act]').forEach(btn => {
            btn.addEventListener('click', () => {
                switch (btn.dataset.act) {
                    case 'rest-default':
                        UI.actionSheet({
                            title: 'Default rest',
                            actions: [30, 45, 60, 90, 120, 150, 180, 240].map(sec => ({
                                label: Stats.fmtClock(sec * 1000), plain: true,
                                onSelect: () => { Store.setSetting('restDefault', sec); rerender(); },
                            })),
                        });
                        break;

                    case 'bar-weight':
                        UI.prompt({
                            title: 'Bar weight',
                            message: `Weight of the empty bar in ${Store.unit()}.`,
                            value: String(Math.round(Store.toDisplay(Store.settings().barWeight) * 10) / 10),
                            inputmode: 'decimal',
                        }).then(v => {
                            if (v === null) return;
                            const n = UI.num(v);
                            if (n > 0) { Store.setSetting('barWeight', Store.toBase(n)); rerender(); }
                        });
                        break;

                    case 'protein': Nutrition.openSheet(); break;

                    case 'health-info': healthInfo(); break;

                    case 'health-name':
                        UI.prompt({
                            title: 'Shortcut name',
                            message: 'Exactly as it is named in the Shortcuts app.',
                            value: Store.settings().healthShortcut,
                            placeholder: 'Log Gym Workout',
                        }).then(v => {
                            if (v === null) return;
                            Store.setSetting('healthShortcut', v.trim());
                            rerender();
                        });
                        break;

                    case 'export': exportBackup(); break;
                    case 'import': importBackup(rerender); break;
                    case 'install': installInfo(); break;

                    case 'reset':
                        UI.confirm({
                            title: 'Delete all data?',
                            message: 'Every workout, routine and custom exercise is removed from this browser. Export a backup first if you are not sure.',
                            confirmLabel: 'Delete', destructive: true,
                        }).then(ok => {
                            if (!ok) return;
                            Store.clearAll();
                            api.close();
                            App.refreshAll();
                            UI.toast({ title: 'All data deleted', tone: 'warn' });
                        });
                        break;
                }
            });
        });
    }

    /* ──────────────────────────────────────────────────────────
       BACKUP & HEALTH
       ────────────────────────────────────────────────────────── */
    function exportBackup() {
        const data = Store.exportAll();
        const stamp = new Date().toISOString().slice(0, 10);
        UI.download(`gym-backup-${stamp}.json`, JSON.stringify(data, null, 2));
        Store.setMeta('lastExport', new Date().toISOString());
        UI.toast({ title: 'Backup exported', sub: 'Keep the file somewhere safe.', tone: 'success' });
    }

    function importBackup(onDone) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                let parsed;
                try {
                    parsed = JSON.parse(String(reader.result));
                } catch (e) {
                    UI.alert({ title: 'Could not read file', message: 'That does not look like a backup file.' });
                    return;
                }
                try {
                    const counts = Store.importAll(parsed, 'merge');
                    UI.alert({
                        title: 'Backup imported',
                        message: `${counts.workouts} workouts, ${counts.routines} routines, ${counts.exercises} exercises and ${counts.body} body weight entries added.`,
                    });
                    if (onDone) onDone();
                    App.refreshAll();
                } catch (e) {
                    UI.alert({ title: 'Import failed', message: e.message });
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    function healthInfo() {
        UI.sheet({
            title: 'Apple Health',
            left: 'Done',
            build: (el) => {
                el.innerHTML = `
                    <div class="card">
                        <div class="card-head"><h3>Why there is no direct connection</h3></div>
                        <p class="tiny muted">
                            HealthKit is only available to native apps that Apple signs and installs through the App Store.
                            Safari exposes no HealthKit interface — not even for a web app added to the home screen — so a page
                            hosted on GitHub Pages can never read or write Health data by itself. That limit is deliberate on
                            Apple's side and no browser flag changes it.
                        </p>
                    </div>

                    <div class="card">
                        <div class="card-head"><h3>What does work: Shortcuts</h3></div>
                        <p class="tiny muted">
                            The Shortcuts app can write to Health, and a website is allowed to run a shortcut. This app can
                            therefore hand a finished workout over to a shortcut that logs it for you.
                        </p>
                        <ol class="tiny muted" style="padding-left:18px;margin-top:10px;line-height:1.7">
                            <li>Open Shortcuts and create a new shortcut named e.g. <strong>Log Gym Workout</strong>.</li>
                            <li>Add the action <strong>Log Health Sample</strong> or <strong>Log Workout</strong> and choose
                                <em>Traditional Strength Training</em>.</li>
                            <li>Set duration and start date from <strong>Shortcut Input</strong> (the app passes JSON with
                                <code>start</code>, <code>end</code>, <code>durationMinutes</code>, <code>volume</code> and <code>sets</code>).</li>
                            <li>Enter the shortcut name in Settings under <em>Shortcut name</em>.</li>
                        </ol>
                        <p class="tiny muted mt-8">
                            After finishing a workout you then get a <em>Send to Apple Health</em> button on the summary screen.
                        </p>
                    </div>

                    <div class="card">
                        <div class="card-head"><h3>The other direction</h3></div>
                        <p class="tiny muted">
                            Reading data out of Health (body weight, for instance) works the same way in reverse: a shortcut
                            reads the value and you enter it under Trends → Body. A fully automatic sync would require a native
                            app wrapper such as a WKWebView container, which is outside what GitHub Pages can host.
                        </p>
                    </div>`;
            },
        });
    }

    function sendToHealth(workout) {
        const name = Store.settings().healthShortcut;
        if (!name) {
            healthInfo();
            return;
        }
        const t = Stats.workoutTotals(workout);
        const payload = {
            start: workout.date,
            end: workout.endTime || new Date().toISOString(),
            durationMinutes: Math.round((workout.duration || 0) / 60000),
            volumeKg: Math.round(t.volume),
            sets: t.sets,
            reps: t.reps,
            title: Stats.workoutTitle(workout),
            exercises: (workout.exercises || []).map(ex => Store.exerciseName(ex.exerciseId)),
        };
        const url = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(JSON.stringify(payload))}`;
        window.location.href = url;
    }

    function installInfo() {
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        UI.sheet({
            title: 'Add to Home Screen',
            left: 'Done',
            build: (el) => {
                el.innerHTML = `
                    <div class="card">
                        ${isStandalone
                            ? '<p class="tiny muted">The app is already running from your home screen. Storage is more durable in this mode and the browser interface stays out of the way.</p>'
                            : `<ol class="tiny muted" style="padding-left:18px;line-height:1.8">
                                <li>Open this page in Safari.</li>
                                <li>Tap the share button in the toolbar.</li>
                                <li>Choose <strong>Add to Home Screen</strong>.</li>
                               </ol>
                               <p class="tiny muted mt-8">
                                 Installed this way the app opens full screen without the address bar, keeps working without a
                                 connection, and iOS is far less likely to clear its stored data.
                               </p>`}
                    </div>`;
            },
        });
    }

    return { open, sendToHealth, exportBackup, healthInfo };
})();

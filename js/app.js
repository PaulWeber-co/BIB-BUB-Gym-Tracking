/* ============================================================
   APP — Hauptsteuerung, Tab-Navigation und Initialisierung
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   app.js ist der "Dirigent" der App. Es:
   1. Startet alles, wenn die Seite geladen wird (init)
   2. Steuert die Tab-Navigation (Summary, Workout, History usw.)
   3. Verbindet alle Module miteinander ("wiring")
   4. Registriert den Service Worker für Offline-Nutzung
   5. Behandelt die "Zurück"-Geste auf iOS

   WARUM IST DAS EINE EIGENE DATEI?
   ────────────────────────────────
   Jedes Modul (summary.js, workout.js usw.) kümmert sich nur
   um seinen eigenen Bereich. app.js ist der einzige Ort, der
   weiß, welche Module es gibt und wie sie zusammenarbeiten.
   ============================================================ */

const App = (() => {

    /**
     * activeTab — Welcher Tab gerade sichtbar ist.
     * Mögliche Werte: 'summary', 'routines', 'history', 'trends', 'exercises'
     */
    let activeTab = 'summary';

    /**
     * scrollPos — Merkt sich die Scroll-Position jedes Tabs.
     * Wenn du z.B. in History nach unten scrollst, dann zu Summary
     * wechselst und wieder zurück zu History gehst, bist du an
     * der gleichen Stelle wie vorher.
     */
    const scrollPos = {};

    /**
     * VIEWS — Zuordnung: Tab-Name → HTML-Element-ID und Render-Funktion.
     * Jeder Tab hat ein <section>-Element im HTML und eine render()-Funktion
     * im zugehörigen Modul, die den Inhalt neu zeichnet.
     */
    const VIEWS = {
        summary: { id: 'view-summary', render: () => Summary.render() },
        routines: { id: 'view-routines', render: () => Routines.render() },
        history: { id: 'view-history', render: () => History.render() },
        trends: { id: 'view-trends', render: () => Trends.render() },
        exercises: { id: 'view-exercises', render: () => Exercises.render() },
    };

    /* ──────────────────────────────────────────────────────────
       NAVIGATION — Zwischen Tabs wechseln
       ────────────────────────────────────────────────────────── */

    /**
     * showTab(name) — Zeigt einen Tab an und versteckt alle anderen.
     *
     * WIE FUNKTIONIERT DAS?
     * 1. Gleicher Tab nochmal angetippt? → Nur neu rendern + nach oben scrollen
     * 2. Anderer Tab? →
     *    a) Scroll-Position des alten Tabs merken
     *    b) CSS-Klasse 'is-active' beim alten Tab entfernen, beim neuen setzen
     *    c) Auch die Tab-Buttons unten aktualisieren
     *    d) Neuen Tab rendern (= Inhalt erzeugen)
     *    e) Zur gemerkten Scroll-Position des neuen Tabs springen
     */
    function showTab(name) {
        if (!VIEWS[name]) return;

        // Gleicher Tab? → Nur refresh + smooth scroll nach oben
        if (name === activeTab) {
            renderView(name);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Scroll-Position merken, bevor wir wechseln
        scrollPos[activeTab] = window.scrollY;
        activeTab = name;

        // Alle Views: 'is-active' nur beim ausgewählten setzen
        Object.entries(VIEWS).forEach(([key, view]) => {
            document.getElementById(view.id).classList.toggle('is-active', key === name);
        });

        // Tab-Buttons unten: den aktiven hervorheben
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('is-active', tab.dataset.tab === name);
        });

        // Inhalt des neuen Tabs rendern
        renderView(name);

        // Zur gespeicherten Scroll-Position springen (oder ganz oben)
        window.scrollTo(0, scrollPos[name] || 0);

        // Schatten unter der Nav-Bar aktualisieren
        updateNavShadow();
    }

    /**
     * renderView(name) — Zeichnet einen Tab und fängt Fehler dabei ab.
     *
     * WARUM DER TRY/CATCH?
     * Wirft eine render()-Funktion einen Fehler, bricht das Zeichnen
     * mittendrin ab und der Bildschirm bleibt leer — ohne jeden Hinweis,
     * was los ist. Genau das ist nach einem Release passiert, als der
     * Browser noch alte Skripte im Cache hatte. Statt einer weißen Seite
     * gibt es jetzt eine Meldung und einen Knopf, der die App sauber neu lädt.
     */
    function renderView(name) {
        try {
            VIEWS[name].render();
        } catch (err) {
            console.error('Render failed for', name, err);
            showRenderError(name, err);
        }
    }

    /** Zeigt die Fehlermeldung samt Ausweg im betroffenen Tab an. */
    function showRenderError(name, err) {
        const host = document.getElementById(VIEWS[name].id).querySelector('.view-body');
        if (!host) return;
        host.innerHTML = `
            <div class="card" style="margin-top:16px">
                <div class="empty">
                    <strong>Something went wrong</strong>
                    This screen could not be drawn. Reloading usually fixes it — your training
                    data is untouched.
                </div>
                <button class="btn btn-fill btn-block" data-act="hard-reload">Reload App</button>
                <p class="tiny muted mt-8" style="word-break:break-word">${UI.esc(String(err && err.message || err))}</p>
            </div>`;
        const btn = host.querySelector('[data-act="hard-reload"]');
        if (btn) btn.addEventListener('click', hardReload);
    }

    /**
     * hardReload() — Wirft alle Caches und Service Worker weg und lädt neu.
     * Der Notausgang, wenn doch einmal alte und neue Dateien zusammenkommen.
     * Die Trainingsdaten liegen im localStorage und bleiben unberührt.
     */
    async function hardReload() {
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch (e) {
            console.warn('Cache cleanup failed', e);
        }
        location.reload();
    }

    /**
     * refreshAll() — Rendert den aktuellen Tab neu.
     * Wird aufgerufen, wenn sich Daten geändert haben
     * (z.B. nach einem Workout-Finish oder Routine-Speichern).
     */
    function refreshAll() {
        renderView(activeTab);
        refreshMiniBar();
    }

    /**
     * refreshMiniBar() — Aktualisiert die kleine grüne Leiste
     * "Workout in progress", die erscheint, wenn ein Workout
     * läuft und du auf einem anderen Tab bist.
     */
    function refreshMiniBar() {
        const mini = document.getElementById('mini-workout');
        const anyScreen = document.querySelector('.screen.is-open');
        const show = Workout.isActive() && !anyScreen;
        mini.hidden = !show;
        document.body.classList.toggle('has-mini', show);
        if (show) {
            document.getElementById('mini-workout-time').textContent =
                Stats.fmtClock(Date.now() - Workout.startedAt());
        }
    }

    /**
     * startEmptyWorkout() — Startet ein leeres Workout.
     * Wenn schon eins läuft → zeige es stattdessen an.
     */
    async function startEmptyWorkout() {
        if (Workout.isActive()) {
            Workout.resume();
            return;
        }
        UI.unlockAudio();   // iOS braucht eine User-Geste, bevor Sound geht
        Workout.start();
    }

    /**
     * updateNavShadow() — Zeigt einen feinen Schatten unter der
     * Navigationsleiste, sobald der Benutzer nach unten scrollt.
     * Das ist ein subtiler visueller Hinweis, dass Inhalt
     * "unter" der Leiste liegt.
     */
    function updateNavShadow() {
        const view = document.querySelector('.view.is-active .nav-bar');
        if (view) view.classList.toggle('is-scrolled', window.scrollY > 4);
    }

    /* ──────────────────────────────────────────────────────────
       INIT — Wird einmal beim Laden der Seite ausgeführt

       Das ist der Startpunkt der gesamten App! Alles beginnt hier.
       ────────────────────────────────────────────────────────── */

    function init() {
        // Das Theme setzt sich selbst in theme.js, schon vor dem ersten Zeichnen.

        // ---- Schritt 1: Alle Module "binden" (Event-Listener setzen) ----
        // Jedes Modul hat eine bind()-Funktion, die Klick-Handler
        // und andere Event-Listener an ihre HTML-Elemente hängt.
        Summary.bind();
        Routines.bind();
        History.bind();
        Trends.bind();
        Exercises.bind();
        Workout.bind();

        // ---- Schritt 2: Tab-Bar Klick-Handler ----
        // Wenn ein Tab-Button geklickt wird → zu diesem Tab wechseln
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                UI.haptic('tap');              // Kurze Vibration als Feedback
                showTab(tab.dataset.tab);  // data-tab="summary" usw.
            });
        });

        // ---- Schritt 3: Mini-Workout-Bar ----
        // Die grüne "Workout in progress"-Leiste: Klick → Workout öffnen
        document.getElementById('mini-workout').addEventListener('click', () => Workout.resume());

        // ---- Schritt 4: Scroll-Schatten ----
        // Bei jedem Scroll-Event prüfen, ob ein Schatten gezeigt werden soll
        window.addEventListener('scroll', updateNavShadow, { passive: true });

        // ---- Schritt 5: Audio & Haptik für iOS vorbereiten ----
        // iOS Safari blockiert Sound, bis der Benutzer einmal tippt.
        // Bei der ersten Berührung "entsperren" wir den Audio-Kontext.
        document.addEventListener('pointerdown', () => UI.unlockAudio(), { once: true });

        // ---- Schritt 6: Globales haptisches Feedback für ALLE Buttons ----
        // Sobald irgendein Button, eine Karte oder ein Chip angetippt wird,
        // geben wir eine kurze körperliche Vibration als Rückmeldung.
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('button, .btn, .card-tap, .chip, .list-row, .bar-btn, .action-item, [data-act]');
            if (btn) UI.haptic('tap');
        }, { passive: true });

        // ---- Schritt 6: Laufendes Workout wiederherstellen ----
        // Falls die Seite neu geladen wurde (oder iOS den Tab gelöscht hat),
        // prüfen wir, ob ein Workout im localStorage gespeichert ist.
        if (Workout.restore()) {
            refreshMiniBar();
            // Jede Sekunde die Mini-Bar aktualisieren (zeigt die laufende Zeit)
            setInterval(() => { if (!UI.screenOpen('screen-workout')) refreshMiniBar(); }, 1000);
        }

        // ---- Schritt 7: Hintergrund → Vordergrund ----
        // Wenn der Tab im Hintergrund war und wieder sichtbar wird,
        // aktualisieren wir die Uhren (sonst zeigen sie die falsche Zeit).
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return;
            if (Workout.isActive()) Workout.tick();
            refreshMiniBar();
        });

        // ---- Schritt 8: "Zurück"-Geste behandeln ----
        // Auf iOS wischt man vom Rand, um "zurück" zu gehen.
        // Normalerweise verlässt man damit die App – wir fangen das ab
        // und schließen stattdessen das oberste offene Element:
        // Zuerst: offene Sheets/Modals → dann: Fullscreen-Screens →
        // dann: zurück zum Summary-Tab → erst dann: Browser-Zurück
        history.replaceState({ app: true }, '');
        window.addEventListener('popstate', () => {
            let handled = UI.closeTop();  // Offenes Sheet/Modal schließen?
            if (!handled) {
                const screen = document.querySelector('.screen.is-open');
                if (screen) {
                    if (screen.id === 'screen-workout') Workout.minimize();
                    else UI.closeScreen(screen.id);
                    handled = true;
                }
            }
            if (!handled && activeTab !== 'summary') {
                showTab('summary');        // Zurück zum Home-Screen
                handled = true;
            }
            if (handled) history.pushState({ app: true }, '');
        });
        history.pushState({ app: true }, '');

        // ---- Schritt 9: App starten! ----
        showTab('summary');    // Den Summary-Tab anzeigen
        refreshMiniBar();      // Mini-Bar prüfen

        // ---- Schritt 10: Extras ----
        registerServiceWorker();  // Offline-Fähigkeit
        backupReminder();         // Erinnerung an Backup
    }

    /**
     * registerServiceWorker() — Registriert den Service Worker (sw.js).
     *
     * WAS IST EIN SERVICE WORKER?
     * Ein kleines Skript, das im Hintergrund läuft und Netzwerk-Anfragen
     * abfangen kann. Es cached die App-Dateien, sodass die App auch
     * ohne Internet funktioniert. Funktioniert nur über HTTPS oder localhost.
     */
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;  // Browser unterstützt es nicht
        if (location.protocol === 'file:') return;     // Lokale Datei, kein Server

        // Übernimmt ein neuer Service Worker, läuft im Tab womöglich noch Code
        // aus der vorigen Version. Einmal neu laden, damit nie altes und neues
        // JavaScript zusammen laufen. Das sessionStorage-Flag verhindert eine
        // Endlosschleife aus Reloads.
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            if (sessionStorage.getItem('gym_sw_reloaded') === '1') return;
            reloading = true;
            sessionStorage.setItem('gym_sw_reloaded', '1');
            location.reload();
        });

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => reg.update())
                .catch(() => { /* optional */ });
        });
    }

    /**
     * backupReminder() — Zeigt einen Toast "Back up your training log",
     * wenn der Benutzer mehr als 6 Workouts hat und seit >30 Tagen
     * kein Backup exportiert hat. Maximal alle 14 Tage.
     *
     * WARUM?
     * iOS löscht manchmal den Speicher von Websites, die man länger
     * nicht besucht hat. Ein regelmäßiges Backup schützt davor.
     */
    function backupReminder() {
        const workouts = Store.workouts().length;
        if (workouts < 6) return;  // Zu wenig Daten, um sich Sorgen zu machen
        const meta = Store.meta();
        const last = meta.lastExport ? new Date(meta.lastExport) : null;
        const daysSince = last ? (Date.now() - last.getTime()) / 86400000 : Infinity;
        const remindedAt = meta.lastBackupReminder ? new Date(meta.lastBackupReminder) : null;
        const daysSinceReminder = remindedAt ? (Date.now() - remindedAt.getTime()) / 86400000 : Infinity;

        if (daysSince > 30 && daysSinceReminder > 14) {
            Store.setMeta('lastBackupReminder', new Date().toISOString());
            setTimeout(() => {
                UI.toast({
                    title: 'Back up your training log',
                    sub: 'Settings → Export backup',
                    tone: 'warn',
                    duration: 5000,
                });
            }, 1500);
        }
    }

    /* ──────────────────────────────────────────────────────────
       AUTO-START — Sobald der HTML-Inhalt geladen ist, starte init().
       'DOMContentLoaded' feuert, wenn das HTML fertig geparst ist
       (aber bevor Bilder geladen sind). Das ist der früheste sichere
       Zeitpunkt, um auf DOM-Elemente zuzugreifen.
       ────────────────────────────────────────────────────────── */
    /** Auch ein Fehler beim Start darf nicht in einer leeren Seite enden. */
    function boot() {
        try {
            init();
        } catch (err) {
            console.error('Startup failed', err);
            const host = document.getElementById('summary-body');
            if (host) {
                host.innerHTML = `
                    <div class="card" style="margin-top:16px">
                        <div class="empty">
                            <strong>App could not start</strong>
                            Reloading clears out cached files from an older version. Your training
                            data stays where it is.
                        </div>
                        <button class="btn btn-fill btn-block" id="btn-boot-reload">Reload App</button>
                        <p class="tiny muted mt-8" style="word-break:break-word">${String(err && err.message || err)}</p>
                    </div>`;
                const btn = document.getElementById('btn-boot-reload');
                if (btn) btn.addEventListener('click', hardReload);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', boot);

    /* ──────────────────────────────────────────────────────────
       PUBLIC API — Was andere Module von App verwenden können.
       ────────────────────────────────────────────────────────── */
    return { showTab, refreshAll, refreshMiniBar, startEmptyWorkout, hardReload };
})();

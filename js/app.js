/* ============================================================
   APP — bootstrap, tab navigation and global wiring.
   ============================================================ */

const App = (() => {

    let activeTab = 'summary';
    const scrollPos = {};

    const VIEWS = {
        summary: { id: 'view-summary', render: () => Summary.render() },
        routines: { id: 'view-routines', render: () => Routines.render() },
        history: { id: 'view-history', render: () => History.render() },
        trends: { id: 'view-trends', render: () => Trends.render() },
        exercises: { id: 'view-exercises', render: () => Exercises.render() },
    };

    // ------------------------------------------------------------
    // Navigation
    // ------------------------------------------------------------
    function showTab(name) {
        if (!VIEWS[name]) return;
        if (name === activeTab) {
            VIEWS[name].render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        scrollPos[activeTab] = window.scrollY;
        activeTab = name;

        Object.entries(VIEWS).forEach(([key, view]) => {
            document.getElementById(view.id).classList.toggle('is-active', key === name);
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('is-active', tab.dataset.tab === name);
        });

        VIEWS[name].render();
        window.scrollTo(0, scrollPos[name] || 0);
        updateNavShadow();
    }

    function refreshAll() {
        VIEWS[activeTab].render();
        refreshMiniBar();
    }

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

    async function startEmptyWorkout() {
        if (Workout.isActive()) {
            Workout.resume();
            return;
        }
        UI.unlockAudio();
        Workout.start();
    }

    function updateNavShadow() {
        const view = document.querySelector('.view.is-active .nav-bar');
        if (view) view.classList.toggle('is-scrolled', window.scrollY > 4);
    }

    // ------------------------------------------------------------
    // Init
    // ------------------------------------------------------------
    function init() {
        // module wiring
        Summary.bind();
        Routines.bind();
        History.bind();
        Trends.bind();
        Exercises.bind();
        Workout.bind();

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                UI.haptic(6);
                showTab(tab.dataset.tab);
            });
        });

        document.getElementById('mini-workout').addEventListener('click', () => Workout.resume());

        window.addEventListener('scroll', updateNavShadow, { passive: true });

        // audio needs a gesture before it can play the rest timer tone
        document.addEventListener('pointerdown', () => UI.unlockAudio(), { once: true });

        // restore a workout that was interrupted by a reload or by iOS
        if (Workout.restore()) {
            refreshMiniBar();
            setInterval(() => { if (!UI.screenOpen('screen-workout')) refreshMiniBar(); }, 1000);
        }

        // keep clocks honest after the tab was in the background
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return;
            if (Workout.isActive()) Workout.tick();
            refreshMiniBar();
        });

        // A back gesture should close the top layer rather than leave the app.
        // Only when nothing is open and we are already on Summary do we let the
        // browser navigate away.
        history.replaceState({ app: true }, '');
        window.addEventListener('popstate', () => {
            let handled = UI.closeTop();
            if (!handled) {
                const screen = document.querySelector('.screen.is-open');
                if (screen) {
                    if (screen.id === 'screen-workout') Workout.minimize();
                    else UI.closeScreen(screen.id);
                    handled = true;
                }
            }
            if (!handled && activeTab !== 'summary') {
                showTab('summary');
                handled = true;
            }
            if (handled) history.pushState({ app: true }, '');
        });
        history.pushState({ app: true }, '');

        showTab('summary');
        refreshMiniBar();

        registerServiceWorker();
        backupReminder();
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (location.protocol === 'file:') return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
        });
    }

    /** iOS clears storage of rarely used sites, so nudge towards a backup. */
    function backupReminder() {
        const workouts = Store.workouts().length;
        if (workouts < 6) return;
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

    document.addEventListener('DOMContentLoaded', init);

    return { showTab, refreshAll, refreshMiniBar, startEmptyWorkout };
})();

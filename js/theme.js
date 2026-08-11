/* ============================================================
   THEME — light, dark or follow the system.
   Applied as data-theme on <html> before first paint so there is
   no flash of the wrong palette.
   ============================================================ */

const Theme = (() => {

    const KEY = 'gym_theme';
    const MODES = ['system', 'light', 'dark'];

    // Matches the --bar token of each palette, used for the iOS status bar.
    const BAR_COLOR = { light: '#000000', dark: '#17171A' };

    let media = null;

    function stored() {
        try {
            const value = localStorage.getItem(KEY);
            return MODES.includes(value) ? value : 'system';
        } catch (e) {
            return 'system';
        }
    }

    function prefersDark() {
        return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /** The palette actually in use: light or dark. */
    function resolved(mode = stored()) {
        if (mode === 'dark') return 'dark';
        if (mode === 'light') return 'light';
        return prefersDark() ? 'dark' : 'light';
    }

    function apply(mode = stored()) {
        const theme = resolved(mode);
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', BAR_COLOR[theme]);
        const scheme = document.querySelector('meta[name="color-scheme"]');
        if (scheme) scheme.setAttribute('content', theme);

        return theme;
    }

    function set(mode) {
        if (!MODES.includes(mode)) mode = 'system';
        try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode */ }
        return apply(mode);
    }

    function mode() { return stored(); }

    function init() {
        apply();
        if (typeof matchMedia !== 'function') return;
        media = matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => { if (stored() === 'system') apply(); };
        if (media.addEventListener) media.addEventListener('change', onChange);
        else if (media.addListener) media.addListener(onChange);
    }

    // Run immediately: this script sits in <head> order before the views render.
    init();

    return { apply, set, mode, resolved, MODES };
})();

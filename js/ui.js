/* ============================================================
   UI — sheets, alerts, action sheets, toasts, feedback.
   Everything is built on the same backdrop element so that a
   single Escape / back gesture closes the top-most layer.
   ============================================================ */

const UI = (() => {

    const host = () => document.getElementById('sheet-host');
    const layers = [];

    function esc(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    function lockScroll(lock) {
        document.body.style.overflow = lock ? 'hidden' : '';
    }

    // ---------- generic layer ----------
    function openLayer(node, { onClose, dismissible = true, wrapClass = '' } = {}) {
        const backdrop = el(`<div class="backdrop ${wrapClass}"></div>`);
        backdrop.appendChild(node);
        host().appendChild(backdrop);
        lockScroll(true);

        // next frame so the transition runs
        requestAnimationFrame(() => backdrop.classList.add('is-open'));

        const layer = {
            backdrop,
            close(result) {
                const i = layers.indexOf(layer);
                if (i >= 0) layers.splice(i, 1);
                backdrop.classList.remove('is-open');
                setTimeout(() => {
                    backdrop.remove();
                    if (layers.length === 0) lockScroll(false);
                }, 320);
                if (onClose) onClose(result);
            },
        };
        layers.push(layer);

        if (dismissible) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) layer.close();
            });
        }
        return layer;
    }

    function closeTop() {
        if (layers.length) {
            layers[layers.length - 1].close();
            return true;
        }
        return false;
    }

    // ---------- sheet ----------
    /**
     * options: { title, left, right, full, onRight, onLeft, build(bodyEl, sheet), noPad }
     * Returns { close, body, root }
     */
    function sheet(options = {}) {
        const node = el(`
            <div class="sheet ${options.full ? 'sheet-full' : ''}">
                ${options.title || options.left || options.right ? `
                <div class="sheet-bar">
                    <button class="bar-btn" data-role="left">${esc(options.left || 'Cancel')}</button>
                    <h2 class="sheet-title">${esc(options.title || '')}</h2>
                    <button class="bar-btn ${options.right ? 'bar-btn-strong' : ''}" data-role="right"
                        ${options.right ? '' : 'style="visibility:hidden"'}>${esc(options.right || '')}</button>
                </div>` : '<div class="sheet-grip"></div>'}
                <div class="sheet-body ${options.noPad ? 'no-pad' : ''}" data-role="body"></div>
            </div>`);

        const layer = openLayer(node, { onClose: options.onClose });
        const body = node.querySelector('[data-role="body"]');

        const api = { close: (r) => layer.close(r), body, root: node };

        const leftBtn = node.querySelector('[data-role="left"]');
        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                if (options.onLeft) options.onLeft(api);
                else api.close();
            });
        }
        const rightBtn = node.querySelector('[data-role="right"]');
        if (rightBtn && options.right) {
            rightBtn.addEventListener('click', () => options.onRight && options.onRight(api));
        }

        if (options.build) options.build(body, api);
        return api;
    }

    // ---------- action sheet ----------
    /** actions: [{ label, onSelect, destructive, plain }] */
    function actionSheet({ title, message, actions = [], cancelLabel = 'Cancel' } = {}) {
        const node = el(`
            <div class="action-sheet">
                <div class="action-group">
                    ${title || message ? `<div class="action-head">
                        ${title ? `<div class="action-head-title">${esc(title)}</div>` : ''}
                        ${message ? `<div class="action-head-msg">${esc(message)}</div>` : ''}
                    </div>` : ''}
                    ${actions.map((a, i) => `<button class="action-item ${a.destructive ? 'is-destructive' : ''} ${a.plain ? 'is-plain' : ''}"
                        data-i="${i}">${esc(a.label)}</button>`).join('')}
                </div>
                <button class="action-cancel" data-role="cancel">${esc(cancelLabel)}</button>
            </div>`);

        const layer = openLayer(node);
        node.querySelectorAll('.action-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = actions[Number(btn.dataset.i)];
                layer.close();
                if (action && action.onSelect) setTimeout(() => action.onSelect(), 180);
            });
        });
        node.querySelector('[data-role="cancel"]').addEventListener('click', () => layer.close());
        return layer;
    }

    // ---------- alert / confirm ----------
    function alertBox({ title, message, okLabel = 'OK' } = {}) {
        return new Promise(resolve => {
            const node = el(`
                <div class="alert">
                    <div class="alert-content">
                        <div class="alert-title">${esc(title || '')}</div>
                        ${message ? `<div class="alert-msg">${esc(message)}</div>` : ''}
                    </div>
                    <div class="alert-actions">
                        <button class="is-strong" data-role="ok">${esc(okLabel)}</button>
                    </div>
                </div>`);
            const layer = openLayer(node, { wrapClass: 'alert-wrap', onClose: () => resolve(true) });
            node.querySelector('[data-role="ok"]').addEventListener('click', () => layer.close());
        });
    }

    function confirm({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false } = {}) {
        return new Promise(resolve => {
            let result = false;
            const node = el(`
                <div class="alert">
                    <div class="alert-content">
                        <div class="alert-title">${esc(title || 'Are you sure?')}</div>
                        ${message ? `<div class="alert-msg">${esc(message)}</div>` : ''}
                    </div>
                    <div class="alert-actions">
                        <button data-role="cancel">${esc(cancelLabel)}</button>
                        <button class="is-strong ${destructive ? 'is-destructive' : ''}" data-role="ok">${esc(confirmLabel)}</button>
                    </div>
                </div>`);
            const layer = openLayer(node, { wrapClass: 'alert-wrap', onClose: () => resolve(result) });
            node.querySelector('[data-role="ok"]').addEventListener('click', () => { result = true; layer.close(); });
            node.querySelector('[data-role="cancel"]').addEventListener('click', () => layer.close());
        });
    }

    function prompt({ title, message, value = '', placeholder = '', inputmode = 'text', confirmLabel = 'Save' } = {}) {
        return new Promise(resolve => {
            let result = null;
            const node = el(`
                <div class="alert">
                    <div class="alert-content">
                        <div class="alert-title">${esc(title || '')}</div>
                        ${message ? `<div class="alert-msg">${esc(message)}</div>` : ''}
                        <input class="input mt-8" data-role="input" value="${esc(value)}"
                            placeholder="${esc(placeholder)}" inputmode="${esc(inputmode)}"
                            style="text-align:center;font-size:1rem">
                    </div>
                    <div class="alert-actions">
                        <button data-role="cancel">Cancel</button>
                        <button class="is-strong" data-role="ok">${esc(confirmLabel)}</button>
                    </div>
                </div>`);
            const layer = openLayer(node, { wrapClass: 'alert-wrap', onClose: () => resolve(result) });
            const input = node.querySelector('[data-role="input"]');
            setTimeout(() => { input.focus(); input.select(); }, 320);
            const submit = () => { result = input.value; layer.close(); };
            node.querySelector('[data-role="ok"]').addEventListener('click', submit);
            node.querySelector('[data-role="cancel"]').addEventListener('click', () => layer.close());
            input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        });
    }

    // ---------- toast ----------
    const TONES = {
        info: { color: '#7FB4DA', icon: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.6" x2="12" y2="7.7"/>' },
        success: { color: '#7FB4DA', icon: '<polyline points="20 6 9 17 4 12"/>' },
        record: { color: '#FFFFFF', icon: '<polygon points="12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.5"/>' },
        warn: { color: '#F2C14E', icon: '<path d="M12 3 2.5 20h19z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.1"/>' },
    };

    function toast({ title, sub, tone = 'info', duration = 2600 } = {}) {
        const t = TONES[tone] || TONES.info;
        const node = el(`
            <div class="toast">
                <div class="toast-icon" style="color:${t.color}">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
                </div>
                <div class="toast-text">
                    <div class="toast-title">${esc(title)}</div>
                    ${sub ? `<div class="toast-sub">${esc(sub)}</div>` : ''}
                </div>
            </div>`);
        document.getElementById('toast-host').appendChild(node);
        setTimeout(() => {
            node.classList.add('is-out');
            setTimeout(() => node.remove(), 300);
        }, duration);
        return node;
    }

    // ---------- feedback ----------
    let audioCtx = null;
    let hapticLabel = null;

    function ensureAudio() {
        if (audioCtx) return audioCtx;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try { audioCtx = new Ctx(); } catch (e) { return null; }
        return audioCtx;
    }

    /** Short tone. iOS needs a preceding user gesture, which unlocking handles. */
    function beep(times = 1) {
        if (!Store.settings().sound) return;
        const ctx = ensureAudio();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        for (let i = 0; i < times; i++) {
            const t0 = ctx.currentTime + i * 0.22;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t0);
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.2);
        }
    }

    /* ---------- haptics ----------
       Two mechanisms, both no-ops where unsupported:
       - navigator.vibrate covers Android and desktop Chrome.
       - Safari has no Vibration API. Toggling a `switch` checkbox is the one
         control iOS gives a system haptic to (17.4+), so a hidden one is
         driven from a real user gesture. Sound is never used as a stand-in.  */
    const PATTERNS = {
        tap: 8,
        select: 12,
        impact: 20,
        success: [14, 60, 14],
        warn: [26, 70, 26],
        alarm: [180, 90, 180],
    };

    function hapticSwitch() {
        if (hapticLabel) return hapticLabel;
        const wrap = el(`<div aria-hidden="true" style="position:fixed;left:-20px;top:-20px;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:0">
            <input type="checkbox" switch id="ui-haptic-input" tabindex="-1">
            <label for="ui-haptic-input" id="ui-haptic-label"></label>
        </div>`);
        document.body.appendChild(wrap);
        hapticLabel = wrap.querySelector('#ui-haptic-label');
        return hapticLabel;
    }

    /** intent: tap | select | impact | success | warn | alarm */
    function haptic(intent = 'tap') {
        if (!Store.settings().haptics) return;
        const pattern = typeof intent === 'string' ? (PATTERNS[intent] || PATTERNS.tap) : intent;

        if (typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
        }
        try { hapticSwitch().click(); } catch (e) { /* unsupported */ }
    }

    /** True when the browser exposes a real vibration motor. */
    function hasVibration() {
        return typeof navigator.vibrate === 'function';
    }

    function unlockAudio() {
        const ctx = ensureAudio();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // ---------- full screen helpers ----------
    function openScreen(id) {
        const node = document.getElementById(id);
        if (!node) return;
        node.classList.add('is-open', 'is-mounting');
        void node.offsetHeight;
        node.classList.remove('is-mounting');
        document.getElementById('tab-bar').hidden = true;
        document.getElementById('mini-workout').hidden = true;
        lockScroll(true);
    }

    function closeScreen(id) {
        const node = document.getElementById(id);
        if (!node || !node.classList.contains('is-open')) return;
        node.classList.add('is-mounting');
        setTimeout(() => {
            node.classList.remove('is-open', 'is-mounting');
            const anyOpen = document.querySelector('.screen.is-open');
            if (!anyOpen) {
                document.getElementById('tab-bar').hidden = false;
                lockScroll(false);
                // top level `const` bindings are not window properties, so probe the binding itself
                if (typeof App !== 'undefined') App.refreshMiniBar();
            }
        }, 340);
    }

    function screenOpen(id) {
        const node = document.getElementById(id);
        return !!node && node.classList.contains('is-open');
    }

    // ---------- misc ----------
    /** Parses "82,5" as well as "82.5". */
    function num(value) {
        if (value === null || value === undefined) return 0;
        const n = parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }

    function download(filename, text, type = 'application/json') {
        const blob = new Blob([text], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    }

    /** Adds the hairline under a nav bar once its view is scrolled. */
    function bindScrollShadow(scroller, bar) {
        if (!scroller || !bar) return;
        const onScroll = () => bar.classList.toggle('is-scrolled', scroller.scrollTop > 4);
        scroller.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    return {
        esc, el, sheet, actionSheet, alert: alertBox, confirm, prompt, toast,
        beep, haptic, hasVibration, unlockAudio, openScreen, closeScreen, screenOpen, closeTop,
        num, download, bindScrollShadow, layers,
    };
})();

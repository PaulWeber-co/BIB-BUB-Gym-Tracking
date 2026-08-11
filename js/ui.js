/* ============================================================
   UI — Benutzeroberflächen-Bausteine (Sheets, Alerts, Toasts)
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   UI stellt wiederverwendbare "Bauteile" bereit, die von allen
   anderen Modulen benutzt werden:

   - Sheet:        Ein Panel, das von unten hochfährt (wie in iOS)
   - Action Sheet: Eine Liste mit Auswahlmöglichkeiten
   - Alert:        "OK"-Dialog mit einer Nachricht
   - Confirm:      "Ja/Nein"-Dialog
   - Prompt:       Dialog mit Texteingabe
   - Toast:        Kurze Nachricht, die automatisch verschwindet
   - Haptic:       Vibration als Feedback
   - Beep:         Kurzer Ton (Rest-Timer Ende)

   WIE FUNKTIONIERT DAS LAYER-SYSTEM?
   ──────────────────────────────────
   Jedes Sheet/Alert/ActionSheet ist ein "Layer" (Schicht).
   Wenn du ein Sheet öffnest, wird ein halbtransparenter Hintergrund
   (Backdrop) erzeugt und darüber das Sheet gelegt. Mehrere Sheets
   können übereinander gestapelt werden. Ein Klick auf den Hintergrund
   oder die Escape-Taste schließt die oberste Schicht.
   ============================================================ */

const UI = (() => {

    /** host() — Das <div> im HTML, in das alle Sheets/Alerts eingefügt werden. */
    const host = () => document.getElementById('sheet-host');

    /** layers — Ein Array aller offenen Schichten (Stack: letzter = oberster). */
    const layers = [];

    /**
     * esc(value) — "Escaped" einen String für sicheres HTML.
     *
     * WARUM?
     * Wenn ein Benutzer eine Übung "Bench <script>hack</script>" nennt,
     * würde das ohne Escaping als echtes HTML/JavaScript interpretiert.
     * Diese Funktion ersetzt alle gefährlichen Zeichen:
     *   & → &amp;   < → &lt;   > → &gt;   " → &quot;   ' → &#39;
     *
     * So wird der Text immer als reiner Text angezeigt, nie als Code.
     */
    function esc(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /**
     * el(html) — Wandelt einen HTML-String in ein echtes DOM-Element um.
     *
     * WIE?
     * 1. Erstelle ein <template>-Element (unsichtbar)
     * 2. Setze den HTML-String als innerHTML
     * 3. Der Browser parst es automatisch in echte Elemente
     * 4. Gib das erste Kind-Element zurück
     *
     * Beispiel: el('<div class="test">Hallo</div>') → ein <div>-Element
     */
    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    /**
     * lockScroll(lock) — Verhindert oder erlaubt Scrollen im Hintergrund.
     * Wenn ein Sheet offen ist, soll man nicht im Hintergrund scrollen können.
     */
    function lockScroll(lock) {
        document.body.style.overflow = lock ? 'hidden' : '';
    }

    /* ──────────────────────────────────────────────────────────
       GENERIC LAYER — Die Basis für Sheets, Alerts und Action Sheets.
       Erzeugt einen Backdrop (halbtransparenten Hintergrund) und
       legt das übergebene Element darüber.
       ────────────────────────────────────────────────────────── */

    /**
     * openLayer(node, options) — Öffnet eine neue UI-Schicht.
     *
     * @param {Element} node         - Das HTML-Element, das angezeigt werden soll
     * @param {Object}  options
     *   - onClose:      Callback wenn die Schicht geschlossen wird
     *   - dismissible:  Kann durch Klick auf den Hintergrund geschlossen werden?
     *   - wrapClass:    Zusätzliche CSS-Klasse für den Backdrop
     *
     * @returns {{ close(result) }} Ein Objekt mit einer close()-Methode
     */
    function openLayer(node, { onClose, dismissible = true, wrapClass = '' } = {}) {
        // Backdrop erstellen (der dunkle Hintergrund)
        const backdrop = el(`<div class="backdrop ${wrapClass}"></div>`);
        backdrop.appendChild(node);
        host().appendChild(backdrop);
        lockScroll(true);

        // requestAnimationFrame wartet einen Frame ab, damit die
        // CSS-Transition (Einblenden) korrekt läuft.
        requestAnimationFrame(() => backdrop.classList.add('is-open'));

        // Layer-Objekt mit close()-Methode
        const layer = {
            backdrop,
            close(result) {
                // Aus dem Stack entfernen
                const i = layers.indexOf(layer);
                if (i >= 0) layers.splice(i, 1);

                // Ausblende-Animation starten
                backdrop.classList.remove('is-open');

                // Nach der Animation aus dem DOM entfernen
                setTimeout(() => {
                    backdrop.remove();
                    if (layers.length === 0) lockScroll(false); // Scrollen wieder erlauben
                }, 320);

                if (onClose) onClose(result);
            },
        };
        layers.push(layer);

        // Klick auf den Backdrop → oberste Schicht schließen
        if (dismissible) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) layer.close();
            });
        }
        return layer;
    }

    /**
     * closeTop() — Schließt die oberste offene Schicht.
     * Wird von app.js für die "Zurück"-Geste verwendet.
     * @returns {boolean} true wenn etwas geschlossen wurde
     */
    function closeTop() {
        if (layers.length) {
            layers[layers.length - 1].close();
            return true;
        }
        return false;
    }

    /* ──────────────────────────────────────────────────────────
       SHEET — Panel, das von unten hochfährt (wie ein iOS Sheet).
       Wird für: Übung erstellen, Settings, Workout-Summary usw.
       ────────────────────────────────────────────────────────── */

    /**
     * sheet(options) — Öffnet ein Sheet (Slide-Up Panel).
     *
     * @param {Object} options
     *   - title:   Titel in der Leiste
     *   - left:    Text des linken Buttons (z.B. "Cancel")
     *   - right:   Text des rechten Buttons (z.B. "Save")
     *   - full:    true = Sheet nimmt den ganzen Bildschirm ein
     *   - onRight: Callback wenn der rechte Button geklickt wird
     *   - onLeft:  Callback wenn der linke Button geklickt wird
     *   - build:   Funktion, die den Inhalt des Sheets erzeugt
     *   - noPad:   true = kein Padding im Body
     *
     * @returns {{ close, body, root }} API zum Steuern des Sheets
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

        // API-Objekt, das der Aufrufer zurückbekommt
        const api = { close: (r) => layer.close(r), body, root: node };

        // Linker Button (meist "Cancel" oder "Done")
        const leftBtn = node.querySelector('[data-role="left"]');
        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                if (options.onLeft) options.onLeft(api);
                else api.close();
            });
        }

        // Rechter Button (meist "Save" oder "Add")
        const rightBtn = node.querySelector('[data-role="right"]');
        if (rightBtn && options.right) {
            rightBtn.addEventListener('click', () => options.onRight && options.onRight(api));
        }

        // build() erzeugt den eigentlichen Inhalt
        if (options.build) options.build(body, api);
        return api;
    }

    /* ──────────────────────────────────────────────────────────
       ACTION SHEET — Liste mit Auswahlmöglichkeiten (wie iOS).
       Wird für: Übungs-Menü, Satz-Typ wählen, Routine-Optionen usw.
       ────────────────────────────────────────────────────────── */

    /**
     * actionSheet(options) — Zeigt eine Auswahlliste von unten.
     *
     * @param {Object} options
     *   - title:   Überschrift
     *   - message: Erklärungstext
     *   - actions: Array von { label, onSelect, destructive, plain }
     */
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

        // Jede Aktion bekommt einen Klick-Handler
        node.querySelectorAll('.action-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = actions[Number(btn.dataset.i)];
                layer.close();
                // setTimeout damit die Schließ-Animation fertig ist
                if (action && action.onSelect) setTimeout(() => action.onSelect(), 180);
            });
        });

        node.querySelector('[data-role="cancel"]').addEventListener('click', () => layer.close());
        return layer;
    }

    /* ──────────────────────────────────────────────────────────
       ALERT / CONFIRM / PROMPT — Standard-Dialoge
       ────────────────────────────────────────────────────────── */

    /**
     * alert() — Zeigt eine Nachricht mit einem "OK"-Button.
     * Gibt ein Promise zurück, das resolved wenn OK geklickt wird.
     */
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

    /**
     * confirm() — "Bist du sicher?"-Dialog mit Cancel und Confirm.
     * Gibt ein Promise zurück: true = bestätigt, false = abgebrochen.
     */
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

    /**
     * prompt() — Dialog mit Texteingabefeld.
     * Gibt ein Promise zurück: der eingegebene Text oder null bei Cancel.
     */
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

    /* ──────────────────────────────────────────────────────────
       TOAST — Kurze Benachrichtigung, die automatisch verschwindet.
       Erscheint oben am Bildschirm (z.B. "Personal Record!" oder
       "Routine saved").
       ────────────────────────────────────────────────────────── */

    /** TONES — Voreinstellungen für verschiedene Toast-Typen (Farbe + Icon). */
    const TONES = {
        info:    { bg: 'rgba(10,132,255,0.22)',  color: '#5AC8FA', icon: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/>' },
        success: { bg: 'rgba(48,209,88,0.22)',   color: '#30D158', icon: '<polyline points="20 6 9 17 4 12"/>' },
        record:  { bg: 'rgba(255,214,10,0.2)',   color: '#FFD60A', icon: '<polygon points="12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.5 12 17.4 6.2 20.5 7.3 14 2.6 9.4 9.1 8.5"/>' },
        warn:    { bg: 'rgba(255,159,10,0.2)',   color: '#FF9F0A', icon: '<path d="M12 3 2.5 20h19z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/>' },
    };

    /**
     * toast() — Zeigt eine kurze Nachricht an, die nach 'duration' ms
     * automatisch verschwindet.
     */
    function toast({ title, sub, tone = 'info', duration = 2600 } = {}) {
        const t = TONES[tone] || TONES.info;
        const node = el(`
            <div class="toast">
                <div class="toast-icon" style="background:${t.bg};color:${t.color}">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
                </div>
                <div class="toast-text">
                    <div class="toast-title">${esc(title)}</div>
                    ${sub ? `<div class="toast-sub">${esc(sub)}</div>` : ''}
                </div>
            </div>`);
        document.getElementById('toast-host').appendChild(node);

        // Nach 'duration' ms die Ausblende-Animation starten
        setTimeout(() => {
            node.classList.add('is-out');
            setTimeout(() => node.remove(), 300);  // Dann aus dem DOM entfernen
        }, duration);
        return node;
    }

    /* ──────────────────────────────────────────────────────────
       FEEDBACK — Sound und Vibration
       ────────────────────────────────────────────────────────── */

    let audioCtx = null;     // Web Audio API Kontext (für Töne)
    let hapticLabel = null;  // Verstecktes Element für iOS-Haptik

    /**
     * ensureAudio() — Erstellt den Audio-Kontext (falls noch nicht vorhanden).
     * Der Web Audio API Kontext ist wie ein Mischpult, über das wir
     * programmatisch Töne erzeugen können.
     */
    function ensureAudio() {
        if (audioCtx) return audioCtx;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try { audioCtx = new Ctx(); } catch (e) { return null; }
        return audioCtx;
    }

    /**
     * beep(times) — Spielt einen kurzen Ton ab (880 Hz Sinuswelle).
     * Wird verwendet, wenn der Rest-Timer abgelaufen ist.
     *
     * WIE FUNKTIONIERT DAS?
     * 1. Erstelle einen Oszillator (erzeugt eine Tonwelle)
     * 2. Erstelle einen Gain-Node (regelt die Lautstärke)
     * 3. Verbinde: Oszillator → Gain → Lautsprecher
     * 4. Starte den Ton und stoppe ihn nach 0.2 Sekunden
     */
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

    /**
     * haptic(pattern) — Erzeugt eine Vibration.
     *
     * Auf Android: navigator.vibrate() funktioniert direkt.
     * Auf iOS: Die Vibration-API ist nicht verfügbar. Stattdessen
     * klicken wir ein verstecktes <input type="checkbox" switch>,
     * was auf iOS 17.4+ eine System-Haptik auslöst.
     *
     * @param {number|number[]} pattern - Dauer in ms (oder Array für Muster)
     */
    function haptic(pattern = 12) {
        if (!Store.settings().haptics) return;
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
        }
        // iOS Workaround: versteckten Switch klicken
        if (!hapticLabel) {
            const wrap = el(`<div style="position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px">
                <input type="checkbox" switch id="ui-haptic-input">
                <label for="ui-haptic-input" id="ui-haptic-label"></label>
            </div>`);
            document.body.appendChild(wrap);
            hapticLabel = document.getElementById('ui-haptic-label');
        }
        try { hapticLabel.click(); } catch (e) { /* ignore */ }
    }

    /**
     * unlockAudio() — "Entsperrt" den Audio-Kontext.
     * iOS Safari erlaubt Sound nur nach einer Benutzer-Interaktion.
     * Diese Funktion wird beim ersten Tippen aufgerufen.
     */
    function unlockAudio() {
        const ctx = ensureAudio();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    /* ──────────────────────────────────────────────────────────
       FULLSCREEN HELPERS — Für Screens, die den ganzen Bildschirm
       einnehmen (Workout, Routine-Editor, Workout-Detail usw.)
       ────────────────────────────────────────────────────────── */

    /**
     * openScreen(id) — Öffnet einen Fullscreen-Screen mit Slide-Animation.
     * Versteckt gleichzeitig die Tab-Bar und die Mini-Workout-Bar.
     */
    function openScreen(id) {
        const node = document.getElementById(id);
        if (!node) return;
        node.classList.add('is-open', 'is-mounting');
        void node.offsetHeight;  // "Force reflow" damit die CSS-Transition startet
        node.classList.remove('is-mounting');
        document.getElementById('tab-bar').hidden = true;
        document.getElementById('mini-workout').hidden = true;
        lockScroll(true);
    }

    /**
     * closeScreen(id) — Schließt einen Fullscreen-Screen mit Slide-Animation.
     * Wenn kein anderer Screen mehr offen ist → Tab-Bar wieder anzeigen.
     */
    function closeScreen(id) {
        const node = document.getElementById(id);
        if (!node || !node.classList.contains('is-open')) return;
        node.classList.add('is-mounting');  // Slide-Out Animation
        setTimeout(() => {
            node.classList.remove('is-open', 'is-mounting');
            const anyOpen = document.querySelector('.screen.is-open');
            if (!anyOpen) {
                document.getElementById('tab-bar').hidden = false;
                lockScroll(false);
                if (window.App) App.refreshMiniBar();
            }
        }, 340);
    }

    /** screenOpen(id) — Prüft ob ein bestimmter Screen gerade offen ist. */
    function screenOpen(id) {
        const node = document.getElementById(id);
        return !!node && node.classList.contains('is-open');
    }

    /* ──────────────────────────────────────────────────────────
       MISC — Sonstige Hilfsfunktionen
       ────────────────────────────────────────────────────────── */

    /**
     * num(value) — Parst einen String zu einer Zahl.
     * Unterstützt sowohl Punkt als auch Komma als Dezimaltrenner.
     * "82,5" → 82.5 (nützlich für deutsche Eingabe)
     */
    function num(value) {
        if (value === null || value === undefined) return 0;
        const n = parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }

    /**
     * download(filename, text) — Erzeugt eine Datei und lädt sie herunter.
     * Wird für den Backup-Export verwendet.
     *
     * WIE?
     * 1. Erstelle einen Blob (Binärdaten-Objekt) aus dem Text
     * 2. Erzeuge eine temporäre URL dafür
     * 3. Erstelle einen unsichtbaren <a>-Link mit download-Attribut
     * 4. Klicke den Link programmatisch → Browser lädt die Datei herunter
     * 5. Räume auf (URL freigeben, Link entfernen)
     */
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

    /**
     * bindScrollShadow(scroller, bar) — Zeigt einen Schatten unter
     * einer Navigationsleiste, wenn der Inhalt gescrollt wird.
     */
    function bindScrollShadow(scroller, bar) {
        if (!scroller || !bar) return;
        const onScroll = () => bar.classList.toggle('is-scrolled', scroller.scrollTop > 4);
        scroller.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ──────────────────────────────────────────────────────────
       PUBLIC API
       ────────────────────────────────────────────────────────── */
    return {
        esc, el, sheet, actionSheet, alert: alertBox, confirm, prompt, toast,
        beep, haptic, unlockAudio, openScreen, closeScreen, screenOpen, closeTop,
        num, download, bindScrollShadow, layers,
    };
})();

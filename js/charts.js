/* ============================================================
   CHARTS — Handgezeichnete SVG-Diagramme (ohne Chart-Bibliothek)
   ============================================================

   WAS MACHT DIESE DATEI?
   ─────────────────────
   Zeichnet alle Diagramme in der App:
   - Activity Rings (wie Apple Watch) — Ringe für Wochenziele
   - Mini Rings — Kleine Ringe für den Wochen-Streifen
   - Day Rings — Einzelne Ringe für den Kalender
   - Bar Charts — Balkendiagramme für Volumen/Workouts
   - Line Charts — Liniendiagramme für Fortschrittskurven
   - Month Calendar — Kalender mit Trainingsringen pro Tag

   WARUM SVG?
   ──────────
   SVG (Scalable Vector Graphics) ist ein Format für Grafiken,
   das sich perfekt skaliert — egal ob auf einem kleinen Handy
   oder einem großen Monitor. Es wird direkt im HTML eingebettet
   und braucht keine externen Bibliotheken (Chart.js, D3 usw.).

   WIE FUNKTIONIERT EIN SVG-RING?
   ──────────────────────────────
   Ein Ring ist ein <circle> mit stroke-dasharray und stroke-dashoffset:
   - stroke-dasharray = Umfang des Kreises (= volle Länge)
   - stroke-dashoffset = wie viel davon unsichtbar ist
   Wenn dashoffset = 0 → Ring ist voll (100%)
   Wenn dashoffset = Umfang/2 → Ring ist halb voll (50%)
   ============================================================ */

const Charts = (() => {

    /** seq + uid() — Erzeugt eindeutige IDs für SVG-Gradienten.
     *  Jeder Gradient braucht eine ID, und wenn mehrere Charts
     *  auf einer Seite sind, dürfen die sich nicht überschneiden. */
    let seq = 0;
    const uid = () => `c${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

    /** esc() — Escaped Sonderzeichen für sicheres SVG-HTML. */
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /**
     * RING_COLORS — Die drei Farben für die Activity Rings:
     * - Rot → Volumen
     * - Grün → Workouts
     * - Blau → Sätze
     * Jeder Ring hat einen Farbverlauf (from → to).
     */
    const RING_COLORS = [
        { from: '#FA114F', to: '#FF7597' },   // Rot (Volumen)
        { from: '#5CD000', to: '#C8FF3D' },   // Grün (Workouts)
        { from: '#00B8D4', to: '#5AF3FF' },   // Blau (Sätze)
    ];

    /* ──────────────────────────────────────────────────────────
       ACTIVITY RINGS — Drei ineinander geschachtelte Ringe
       (wie auf der Apple Watch Fitness-App)
       ────────────────────────────────────────────────────────── */

    /**
     * rings(values, opts) — Zeichnet die großen Activity Rings.
     *
     * @param {number[]} values - Fortschritt pro Ring als Anteil (0.0 bis 1.0+)
     *                            [0.75, 1.0, 0.5] = 75%, 100%, 50%
     *                            Werte über 1.0 bedeuten "Ziel übertroffen"
     * @param {Object}   opts   - size, stroke, gap
     * @returns {string} SVG-HTML-String
     *
     * WIE WERDEN DIE RINGE GEZEICHNET?
     * 1. Für jeden Ring: Berechne den Radius (äußerer Ring = groß, innerer = klein)
     * 2. Zeichne einen Track-Kreis (dunkle Spur im Hintergrund)
     * 3. Zeichne den Fortschritts-Kreis darüber
     *    - stroke-dashoffset bestimmt, wie weit der Ring gefüllt ist
     *    - Bei > 100% wird eine zweite "Überlauf"-Runde gezeichnet
     */
    function rings(values, opts = {}) {
        const size = opts.size || 132;
        const stroke = opts.stroke || 10.5;
        const gap = opts.gap || 2.5;
        const id = uid();
        const cx = 50, cy = 50;             // Mittelpunkt (SVG viewBox = 100×100)
        const outer = 50 - stroke / 2 - 1;  // Radius des äußersten Rings

        let defs = '';   // SVG <defs> für Gradienten
        let body = '';   // SVG Shapes

        values.slice(0, 3).forEach((pct, i) => {
            const color = RING_COLORS[i];
            const r = outer - i * (stroke + gap);  // Jeder Ring ist kleiner
            const circ = 2 * Math.PI * r;            // Umfang des Kreises
            const p = Math.max(0, pct || 0);
            const main = Math.min(p, 1);              // Hauptring: max 100%
            const over = Math.min(Math.max(p - 1, 0), 1); // Überlauf: 0-100%
            const gid = `${id}g${i}`;

            // Farbverlauf für diesen Ring definieren
            defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0" stop-color="${color.to}"/><stop offset="1" stop-color="${color.from}"/>
            </linearGradient>`;

            // Hintergrund-Track (dunkle Spur)
            body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color.from}"
                stroke-opacity="0.20" stroke-width="${stroke}"/>`;

            // Hauptring (Fortschritt)
            if (main > 0.001) {
                body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gid})"
                    stroke-width="${stroke}" stroke-linecap="round"
                    stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - main)}"
                    transform="rotate(-90 ${cx} ${cy})"
                    style="transition:stroke-dashoffset .9s cubic-bezier(.32,.72,0,1)"/>`;
            }

            // Überlauf-Ring (wenn > 100% des Ziels)
            if (over > 0.001) {
                body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color.to}"
                    stroke-width="${stroke}" stroke-linecap="round"
                    stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - over)}"
                    transform="rotate(-90 ${cx} ${cy})" opacity="0.92"/>`;
            }
        });

        return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img"
            aria-label="Weekly goal rings"><defs>${defs}</defs>${body}</svg>`;
    }

    /**
     * miniRing(values, size) — Kleiner Drei-Ring, einer pro Wochentag.
     * Gleiche Logik wie rings(), aber ohne Gradienten und Animation.
     */
    function miniRing(values, size = 26) {
        const stroke = 11, gap = 3;
        const outer = 50 - stroke / 2 - 1;
        let body = '';
        values.slice(0, 3).forEach((pct, i) => {
            const color = RING_COLORS[i];
            const r = outer - i * (stroke + gap);
            const circ = 2 * Math.PI * r;
            const p = Math.min(Math.max(pct || 0, 0), 1);
            body += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color.from}" stroke-opacity="0.24" stroke-width="${stroke}"/>`;
            if (p > 0.001) {
                body += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color.to}"
                    stroke-width="${stroke}" stroke-linecap="round"
                    stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - p)}"
                    transform="rotate(-90 50 50)"/>`;
            }
        });
        return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
    }

    /**
     * dayRing(pct, size, colorIndex) — Einzelner Ring für den Kalender.
     * Zeigt an, wie aktiv ein bestimmter Tag war.
     */
    function dayRing(pct, size = 30, colorIndex = 0) {
        const color = RING_COLORS[colorIndex];
        const stroke = 11;
        const r = 50 - stroke / 2 - 1;
        const circ = 2 * Math.PI * r;
        const p = Math.min(Math.max(pct || 0, 0), 1);
        return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color.from}" stroke-opacity="0.25" stroke-width="${stroke}"/>
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color.to}" stroke-width="${stroke}"
                stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - p)}"
                transform="rotate(-90 50 50)"/>
        </svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       BAR CHART — Balkendiagramm
       Zeigt z.B. das wöchentliche Volumen als Balken.
       ────────────────────────────────────────────────────────── */

    /**
     * bars(data, opts) — Zeichnet ein Balkendiagramm.
     *
     * @param {Array} data - Array von { value, label, sub, highlight, top }
     * @param {Object} opts - height, barWidth, goal, color, colorTo, labels
     * @returns {string} SVG-HTML-String
     *
     * WIE WIRD EIN BALKEN GEZEICHNET?
     * - Die Höhe jedes Balkens ist proportional zum Wert
     * - Der höchste Wert (oder das Ziel) bestimmt die Skalierung
     * - Jeder Balken ist ein <rect> mit abgerundeten Ecken
     * - Optional: gestrichelte Ziellinie bei opts.goal
     */
    function bars(data, opts = {}) {
        const W = 340;                       // Breite des Diagramms
        const H = opts.height || 150;        // Höhe
        const labelH = opts.labels === false ? 6 : 20;  // Platz für Labels
        const plotH = H - labelH;            // Plottfläche
        const n = Math.max(data.length, 1);  // Anzahl Balken
        const slot = W / n;                  // Platz pro Balken
        const barW = Math.min(opts.barWidth || 22, slot * 0.62); // Balkenbreite
        const radius = barW / 2;             // Eckenradius
        const id = uid();

        // Skalierung: Der höchste Wert wird zum höchsten Balken
        const max = Math.max(...data.map(d => d.value || 0), opts.goal || 0, 1);
        const scale = (v) => (v / max) * (plotH - 10);

        let body = '';

        // Ziellinie zeichnen (gestrichelt)
        if (opts.goal) {
            const y = plotH - scale(opts.goal);
            body += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(235,235,245,0.3)"
                stroke-width="1" stroke-dasharray="4 4"/>`;
        }

        // Farbverlauf definieren
        let defs = `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${opts.colorTo || '#FF7597'}"/>
            <stop offset="1" stop-color="${opts.color || '#FA114F'}"/>
        </linearGradient>`;

        // Jeden Balken zeichnen
        data.forEach((d, i) => {
            const x = i * slot + (slot - barW) / 2;  // X-Position (zentriert)
            const h = Math.max(d.value > 0 ? 4 : 2.5, scale(d.value || 0));  // Mindesthöhe
            const y = plotH - h;                       // Y-Position (von unten nach oben)
            const dim = d.value > 0 ? '' : ' opacity="0.30"';
            const fill = d.value > 0
                ? (d.highlight ? (opts.colorTo || '#FF7597') : `url(#${id}b)`)
                : 'rgba(120,120,128,0.35)';

            // Balken als abgerundetes Rechteck
            body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
                height="${h.toFixed(1)}" rx="${Math.min(radius, h / 2).toFixed(1)}" fill="${fill}"${dim}/>`;

            // Wert über dem Balken
            if (d.top) {
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
                    font-size="9" font-weight="700" fill="rgba(235,235,245,0.62)">${esc(d.top)}</text>`;
            }

            // Label unter dem Balken
            if (opts.labels !== false && d.label) {
                const strong = d.highlight ? '#fff' : 'rgba(235,235,245,0.45)';
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(plotH + 14).toFixed(1)}" text-anchor="middle"
                    font-size="10" font-weight="${d.highlight ? 700 : 500}" fill="${strong}">${esc(d.label)}</text>`;
            }
        });

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Bar chart')}"><defs>${defs}</defs>${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       LINE CHART — Liniendiagramm mit Flächenfüllung
       Zeigt z.B. die 1RM-Entwicklung über die Zeit.
       ────────────────────────────────────────────────────────── */

    /**
     * line(points, opts) — Zeichnet ein Liniendiagramm.
     *
     * @param {Array}  points - Array von { x, y, label }
     * @param {Object} opts   - height, color, colorSoft, formatValue, labels
     * @returns {string} SVG-HTML-String
     *
     * WIE WIRD DIE KURVE GEZEICHNET?
     * 1. Alle Y-Werte auf die verfügbare Höhe skalieren
     * 2. Punkte gleichmäßig auf der X-Achse verteilen
     * 3. Zwischen den Punkten: sanfte Kurven mit Catmull-Rom Splines
     *    (das ist eine mathematische Methode, um Kurven durch Punkte zu legen)
     * 4. Unter der Kurve: halbtransparente Flächenfüllung
     * 5. Punkte als kleine Kreise markieren
     * 6. Den letzten Wert als Zahl anzeigen
     */
    function line(points, opts = {}) {
        const W = 340;
        const H = opts.height || 170;
        const padL = 4, padR = 4, padT = 16, padB = 22;
        const id = uid();
        const color = opts.color || '#FF4E77';
        const colorSoft = opts.colorSoft || 'rgba(250,17,79,0.28)';

        if (!points.length) return '';

        // Min/Max der Y-Werte berechnen (mit etwas Polster oben und unten)
        const ys = points.map(p => p.y);
        let min = Math.min(...ys);
        let max = Math.max(...ys);
        if (max === min) { max = max + Math.max(1, Math.abs(max) * 0.1); min = min - Math.max(1, Math.abs(min) * 0.1); }
        const span = max - min;
        min = Math.max(0, min - span * 0.15);
        max = max + span * 0.18;

        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        const n = points.length;

        // Koordinaten berechnen: Index → X-Position, Wert → Y-Position
        const px = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const py = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

        const coords = points.map((p, i) => [px(i), py(p.y)]);

        // Pfad mit Catmull-Rom Splines (sanfte Kurven zwischen Punkten)
        let path = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[i - 1] || coords[i];
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const p3 = coords[i + 2] || p2;
            const t = 0.22;  // Tension (wie stark die Kurve gebogen wird)
            let c1y = p1[1] + (p2[1] - p0[1]) * t;
            let c2y = p2[1] - (p3[1] - p1[1]) * t;
            // Clamping: Kurve darf nicht über/unter die Punkte hinausschießen
            const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
            c1y = Math.min(hi, Math.max(lo, c1y));
            c2y = Math.min(hi, Math.max(lo, c2y));
            const c1x = p1[0] + (p2[0] - p1[0]) * 0.4;
            const c2x = p2[0] - (p2[0] - p1[0]) * 0.4;
            path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        }

        // Flächenpfad (gleiche Kurve, aber unten geschlossen)
        const areaPath = `${path} L ${coords[coords.length - 1][0].toFixed(1)} ${(padT + plotH).toFixed(1)}
            L ${coords[0][0].toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

        let body = '';
        // Basislinie
        body += `<line x1="0" y1="${padT + plotH}" x2="${W}" y2="${padT + plotH}" stroke="rgba(84,84,88,0.5)" stroke-width="1"/>`;
        // Halbtransparente Fläche unter der Kurve
        body += `<path d="${areaPath}" fill="url(#${id}a)"/>`;
        // Die Linie selbst
        body += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.6"
            stroke-linecap="round" stroke-linejoin="round"/>`;

        // Punkt-Marker (bei vielen Punkten nur jeden n-ten zeigen)
        const step = n > 26 ? Math.ceil(n / 26) : 1;
        coords.forEach((c, i) => {
            const isLast = i === n - 1;
            if (!isLast && i % step !== 0) return;
            body += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${isLast ? 4.6 : 2.8}"
                fill="${isLast ? color : '#1C1C1E'}" stroke="${color}" stroke-width="${isLast ? 2.4 : 2}"/>`;
        });

        // Letzter Wert als Zahl anzeigen
        if (opts.showLast !== false) {
            const last = coords[n - 1];
            const text = opts.formatValue ? opts.formatValue(points[n - 1].y) : String(Math.round(points[n - 1].y));
            const anchor = last[0] > W - 60 ? 'end' : 'middle';
            body += `<text x="${last[0].toFixed(1)}" y="${Math.max(11, last[1] - 12).toFixed(1)}" text-anchor="${anchor}"
                font-size="11" font-weight="700" fill="#fff">${esc(text)}</text>`;
        }

        // X-Achsen-Labels (Anfang, Mitte, Ende)
        if (opts.labels !== false) {
            const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
            [...new Set(idxs)].forEach(i => {
                const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
                const x = i === 0 ? 0 : (i === n - 1 ? W : px(i));
                body += `<text x="${x.toFixed(1)}" y="${H - 5}" text-anchor="${anchor}" font-size="10"
                    fill="rgba(235,235,245,0.45)">${esc(points[i].label || '')}</text>`;
            });
        }

        // Gradient für die Flächenfüllung
        const defs = `<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${colorSoft}"/>
            <stop offset="1" stop-color="${colorSoft}" stop-opacity="0"/>
        </linearGradient>`;

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Line chart')}"><defs>${defs}</defs>${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       MONTH CALENDAR — Monatskalender mit einem Ring pro Trainingstag
       ────────────────────────────────────────────────────────── */

    /**
     * monthCalendar(year, month, dayData, opts) — Zeichnet einen Monatskalender.
     *
     * @param {number} year     - Jahr (2026)
     * @param {number} month    - Monat (0-11, 0 = Januar)
     * @param {Map}    dayData  - Map von "2026-08-10" → { pct, count }
     *
     * WIE FUNKTIONIERT DER KALENDER?
     * 1. Berechne welcher Wochentag der 1. des Monats ist
     * 2. Berechne den Offset (leere Zellen am Anfang)
     * 3. Für jeden Tag: Ring zeichnen wenn trainiert, Punkt wenn nicht
     * 4. Darunter die Tageszahl
     */
    function monthCalendar(year, month, dayData, opts = {}) {
        const first = new Date(year, month, 1);
        const weekStart = Store.settings().weekStart;
        const offset = (first.getDay() - weekStart + 7) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const rows = Math.ceil((offset + daysInMonth) / 7);

        const W = 340;
        const cell = W / 7;
        const ringSize = Math.min(cell - 8, 34);
        const rowH = ringSize + 18;
        const H = rows * rowH + 18;

        // Wochentag-Abkürzungen (M, T, W, ...)
        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(2024, 0, 7 + ((weekStart + i) % 7));
            dayNames.push(d.toLocaleDateString(undefined, { weekday: 'narrow' }));
        }

        let body = '';
        // Kopfzeile mit Wochentag-Labels
        dayNames.forEach((name, i) => {
            body += `<text x="${(i * cell + cell / 2).toFixed(1)}" y="10" text-anchor="middle" font-size="10"
                font-weight="600" fill="rgba(235,235,245,0.34)">${esc(name)}</text>`;
        });

        const today = Stats.startOfDay(new Date());
        for (let d = 1; d <= daysInMonth; d++) {
            const idx = offset + d - 1;
            const col = idx % 7;
            const row = Math.floor(idx / 7);
            const cx = col * cell + cell / 2;
            const cy = 18 + row * rowH + ringSize / 2;
            const date = new Date(year, month, d);
            const info = dayData.get(Stats.dayKey(date));
            const isToday = Stats.sameDay(date, today);

            if (info && info.pct > 0) {
                // Trainingstag → Ring zeichnen
                const r = ringSize / 2 - 2;
                const circ = 2 * Math.PI * r;
                const pct = Math.min(info.pct, 1);
                body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none"
                    stroke="#FA114F" stroke-opacity="0.25" stroke-width="4"/>`;
                body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none"
                    stroke="#FF6C8F" stroke-width="4" stroke-linecap="round"
                    stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ * (1 - pct)).toFixed(1)}"
                    transform="rotate(-90 ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
            } else {
                // Kein Training → kleiner Punkt
                body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.4" fill="rgba(235,235,245,0.18)"/>`;
            }

            // Tageszahl
            body += `<text x="${cx.toFixed(1)}" y="${(cy + ringSize / 2 + 11).toFixed(1)}" text-anchor="middle"
                font-size="10" font-weight="${isToday ? 700 : 500}"
                fill="${isToday ? '#fff' : 'rgba(235,235,245,0.45)'}">${d}</text>`;
        }

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Training calendar')}">${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       PUBLIC API
       ────────────────────────────────────────────────────────── */
    return { rings, miniRing, dayRing, bars, line, monthCalendar, RING_COLORS };
})();

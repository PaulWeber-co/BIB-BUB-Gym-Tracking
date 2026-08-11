/* ============================================================
   CHARTS — Diagramme, von Hand als SVG gezeichnet
   ============================================================

   WARUM KEINE CHART-BIBLIOTHEK?
   ─────────────────────────────
   Chart.js & Co. wären ~200 KB extra, müssten nachgeladen werden
   und bringen ein eigenes Design mit. Die App braucht genau drei
   Diagrammtypen, und die sind als SVG-String schneller gebaut als
   eine Bibliothek konfiguriert. Ergebnis: keine Abhängigkeiten,
   funktioniert offline, und das Aussehen passt exakt zum Rest.

   WIE FUNKTIONIERT DAS?
   ─────────────────────
   Jede Funktion gibt einen fertigen SVG-String zurück, den das
   aufrufende Modul per innerHTML in die Seite schreibt. Die
   Koordinaten werden in einem festen viewBox-Raster (340 breit)
   berechnet; CSS skaliert das SVG dann auf die Bildschirmbreite.

   FARBEN
   ──────
   Alle Farben kommen aus den CSS-Variablen (siehe palette()).
   Dadurch folgen die Diagramme automatisch dem hellen oder
   dunklen Modus, ohne dass es hier zwei Codepfade braucht.
   ============================================================ */

const Charts = (() => {

    let seq = 0;
    const uid = () => `c${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* Die Farben werden bei jedem Zeichnen frisch aus dem Stylesheet
       gelesen. Ein Theme-Wechsel rendert alle Views neu, dadurch
       stimmen die Diagrammfarben ohne Extraarbeit. */
    function token(name, fallback) {
        if (typeof getComputedStyle !== 'function') return fallback;
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    const palette = () => ({
        ink: token('--chart-ink', '#000000'),
        muted: token('--chart-muted', '#8A8A82'),
        tile: token('--chart-tile', '#D7D6D1'),
        blue: token('--blue', '#2C68C8'),
        navy: token('--navy', '#16386E'),
        sky: token('--sky', '#7FB4DA'),
    });

    /** Die Balken wechseln reihum durch Blau, Navy und Hellblau. */
    const barCycle = (p) => [p.blue, p.navy, p.sky];

    /* ──────────────────────────────────────────────────────────
       BALKENDIAGRAMM

       data: [{ value, label, highlight, top }]
         value     — die Höhe des Balkens
         label     — Beschriftung unter dem Balken (optional)
         highlight — hebt den Balken hervor (z.B. "heute")
         top       — kleine Zahl über dem Balken (optional)

       opts.goal zeichnet zusätzlich eine gestrichelte Ziellinie.
       ────────────────────────────────────────────────────────── */
    function bars(data, opts = {}) {
        const P = palette();
        const W = 340;
        const H = opts.height || 150;
        const labelH = opts.labels === false ? 4 : 18;
        const plotH = H - labelH;
        const n = Math.max(data.length, 1);
        const slot = W / n;
        const barW = Math.min(opts.barWidth || 22, slot * 0.74);

        const max = Math.max(...data.map(d => d.value || 0), opts.goal || 0, 1);
        const scale = (v) => (v / max) * (plotH - 8);

        let body = '';

        // baseline
        body += `<line x1="0" y1="${plotH}" x2="${W}" y2="${plotH}" stroke="${P.ink}" stroke-width="1"/>`;

        if (opts.goal) {
            const y = plotH - scale(opts.goal);
            body += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}"
                stroke="${P.ink}" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"/>`;
        }

        data.forEach((d, i) => {
            const x = i * slot + (slot - barW) / 2;
            const value = d.value || 0;
            const h = value > 0 ? Math.max(3, scale(value)) : 2;
            const y = plotH - h;
            const fill = value > 0
                ? (d.highlight ? P.ink : (opts.color || barCycle(P)[i % 3]))
                : P.tile;

            body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
                height="${h.toFixed(1)}" fill="${fill}"/>`;

            if (d.top) {
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
                    font-size="9" font-weight="700" fill="${P.muted}">${esc(d.top)}</text>`;
            }
            if (opts.labels !== false && d.label) {
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(plotH + 13).toFixed(1)}" text-anchor="middle"
                    font-size="9" font-weight="${d.highlight ? 800 : 600}" letter-spacing="0.5"
                    fill="${d.highlight ? P.ink : P.muted}">${esc(String(d.label).toUpperCase())}</text>`;
            }
        });

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Bar chart')}">${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       LINIENDIAGRAMM mit gefüllter Fläche

       Die Kurve wird als Catmull-Rom-Spline gezeichnet und in
       Bézier-Kurven umgerechnet. Die Kontrollpunkte werden dabei
       begrenzt ("geclampt"), damit die Linie nie über einen
       Messpunkt hinausschwingt und so Werte vortäuscht, die es
       nicht gibt.
       ────────────────────────────────────────────────────────── */
    function line(points, opts = {}) {
        const P = palette();
        const W = 340;
        const H = opts.height || 170;
        const padL = 4, padR = 4, padT = 18, padB = 20;
        const id = uid();
        const color = opts.color || P.blue;
        const soft = opts.colorSoft || 'rgba(44,104,200,0.18)';

        if (!points.length) return '';

        const ys = points.map(p => p.y);
        let min = Math.min(...ys);
        let max = Math.max(...ys);
        if (max === min) { max += Math.max(1, Math.abs(max) * 0.1); min -= Math.max(1, Math.abs(min) * 0.1); }
        const span = max - min;
        min = Math.max(0, min - span * 0.15);
        max += span * 0.18;

        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        const n = points.length;
        const px = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const py = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;
        const coords = points.map((p, i) => [px(i), py(p.y)]);

        // Catmull-Rom to cubic, clamped so the curve never overshoots a data point
        let path = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[i - 1] || coords[i];
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const p3 = coords[i + 2] || p2;
            const t = 0.22;
            let c1y = p1[1] + (p2[1] - p0[1]) * t;
            let c2y = p2[1] - (p3[1] - p1[1]) * t;
            const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
            c1y = Math.min(hi, Math.max(lo, c1y));
            c2y = Math.min(hi, Math.max(lo, c2y));
            const c1x = p1[0] + (p2[0] - p1[0]) * 0.4;
            const c2x = p2[0] - (p2[0] - p1[0]) * 0.4;
            path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        }

        const area = `${path} L ${coords[n - 1][0].toFixed(1)} ${(padT + plotH).toFixed(1)}
            L ${coords[0][0].toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

        let body = `<line x1="0" y1="${padT + plotH}" x2="${W}" y2="${padT + plotH}" stroke="${P.ink}" stroke-width="1"/>`;
        body += `<path d="${area}" fill="url(#${id}a)"/>`;
        body += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;

        const step = n > 26 ? Math.ceil(n / 26) : 1;
        coords.forEach((c, i) => {
            const isLast = i === n - 1;
            if (!isLast && i % step !== 0) return;
            const size = isLast ? 5 : 3.4;
            body += `<rect x="${(c[0] - size / 2).toFixed(1)}" y="${(c[1] - size / 2).toFixed(1)}"
                width="${size}" height="${size}" fill="${isLast ? P.ink : color}"/>`;
        });

        if (opts.showLast !== false) {
            const last = coords[n - 1];
            const text = opts.formatValue ? opts.formatValue(points[n - 1].y) : String(Math.round(points[n - 1].y));
            const anchor = last[0] > W - 60 ? 'end' : 'middle';
            body += `<text x="${last[0].toFixed(1)}" y="${Math.max(12, last[1] - 11).toFixed(1)}" text-anchor="${anchor}"
                font-size="11" font-weight="800" fill="${P.ink}">${esc(text)}</text>`;
        }

        if (opts.labels !== false) {
            const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
            [...new Set(idxs)].forEach(i => {
                const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
                const x = i === 0 ? 0 : (i === n - 1 ? W : px(i));
                body += `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="${anchor}" font-size="9"
                    font-weight="600" letter-spacing="0.5" fill="${P.muted}">${esc(String(points[i].label || '').toUpperCase())}</text>`;
            });
        }

        const defs = `<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${soft}"/>
            <stop offset="1" stop-color="${soft}" stop-opacity="0"/>
        </linearGradient>`;

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Line chart')}"><defs>${defs}</defs>${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       MONATSKALENDER — ein Block pro Tag

       Die Farbe zeigt die Trainingslast des Tages:
       hellblau = wenig, blau = mittel, navy = Tagesziel erreicht,
       grau = kein Training. Heute bekommt zusätzlich einen Rahmen.
       ────────────────────────────────────────────────────────── */
    function monthCalendar(year, month, dayData, opts = {}) {
        const P = palette();
        const first = new Date(year, month, 1);
        const weekStart = Store.settings().weekStart;
        const offset = (first.getDay() - weekStart + 7) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const rows = Math.ceil((offset + daysInMonth) / 7);

        const W = 340;
        const gap = 5;
        const cell = (W - gap * 6) / 7;
        const rowH = cell + gap;
        const headH = 16;
        const H = headH + rows * rowH;

        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(2024, 0, 7 + ((weekStart + i) % 7));   // 2024-01-07 is a Sunday
            dayNames.push(d.toLocaleDateString(undefined, { weekday: 'narrow' }));
        }

        let body = '';
        dayNames.forEach((name, i) => {
            body += `<text x="${(i * (cell + gap) + cell / 2).toFixed(1)}" y="8" text-anchor="middle"
                font-size="9" font-weight="800" letter-spacing="0.8" fill="${P.muted}">${esc(name.toUpperCase())}</text>`;
        });

        const today = Stats.startOfDay(new Date());
        for (let d = 1; d <= daysInMonth; d++) {
            const idx = offset + d - 1;
            const x = (idx % 7) * (cell + gap);
            const y = headH + Math.floor(idx / 7) * rowH;
            const date = new Date(year, month, d);
            const info = dayData.get(Stats.dayKey(date));
            const isToday = Stats.sameDay(date, today);

            let fill = P.tile;
            let text = P.muted;
            if (info && info.pct > 0) {
                fill = info.pct >= 1 ? P.navy : (info.pct >= 0.6 ? P.blue : P.sky);
                text = info.pct >= 0.6 ? '#FFFFFF' : '#0A2340';
            }

            body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell.toFixed(1)}"
                height="${cell.toFixed(1)}" fill="${fill}"/>`;
            if (isToday) {
                body += `<rect x="${(x + 0.75).toFixed(1)}" y="${(y + 0.75).toFixed(1)}"
                    width="${(cell - 1.5).toFixed(1)}" height="${(cell - 1.5).toFixed(1)}"
                    fill="none" stroke="${P.ink}" stroke-width="1.5"/>`;
            }
            body += `<text x="${(x + cell / 2).toFixed(1)}" y="${(y + cell / 2 + 3.4).toFixed(1)}"
                text-anchor="middle" font-size="10" font-weight="${isToday ? 800 : 600}" fill="${text}">${d}</text>`;
        }

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Training calendar')}">${body}</svg>`;
    }

    /* ──────────────────────────────────────────────────────────
       FORTSCHRITTSBALKEN — schlichter Balken für Ziele in Karten
       ────────────────────────────────────────────────────────── */
    function progress(pct, opts = {}) {
        const value = Math.max(0, Math.min(pct || 0, 1));
        const color = opts.color || P.blue;
        return `<div class="dist-track" style="height:${opts.height || 10}px">
            <div class="dist-fill" style="width:${(value * 100).toFixed(1)}%;background:${color}"></div>
        </div>`;
    }

    return { bars, line, monthCalendar, progress, palette };
})();

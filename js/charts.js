/* ============================================================
   CHARTS — hand rolled SVG. No chart library, works offline,
   and matches the ring / bar language of the Fitness app.
   ============================================================ */

const Charts = (() => {

    let seq = 0;
    const uid = () => `c${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const RING_COLORS = [
        { from: '#FA114F', to: '#FF7597' },   // volume
        { from: '#5CD000', to: '#C8FF3D' },   // workouts
        { from: '#00B8D4', to: '#5AF3FF' },   // sets
    ];

    /* ------------------------------------------------------------
       Activity rings
       ------------------------------------------------------------ */
    function rings(values, opts = {}) {
        const size = opts.size || 132;
        const stroke = opts.stroke || 10.5;
        const gap = opts.gap || 2.5;
        const id = uid();
        const cx = 50, cy = 50;
        const outer = 50 - stroke / 2 - 1;

        let defs = '';
        let body = '';

        values.slice(0, 3).forEach((pct, i) => {
            const color = RING_COLORS[i];
            const r = outer - i * (stroke + gap);
            const circ = 2 * Math.PI * r;
            const p = Math.max(0, pct || 0);
            const main = Math.min(p, 1);
            const over = Math.min(Math.max(p - 1, 0), 1);
            const gid = `${id}g${i}`;

            defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0" stop-color="${color.to}"/><stop offset="1" stop-color="${color.from}"/>
            </linearGradient>`;

            // track
            body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color.from}"
                stroke-opacity="0.20" stroke-width="${stroke}"/>`;

            if (main > 0.001) {
                body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gid})"
                    stroke-width="${stroke}" stroke-linecap="round"
                    stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - main)}"
                    transform="rotate(-90 ${cx} ${cy})"
                    style="transition:stroke-dashoffset .9s cubic-bezier(.32,.72,0,1)"/>`;
            }
            // second lap for anything above the goal
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

    /** Small three-ring glyph, e.g. one per weekday. */
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

    /** Single ring, used inside the history calendar. */
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

    /* ------------------------------------------------------------
       Bar chart
       data: [{ value, label, sub, highlight }]
       ------------------------------------------------------------ */
    function bars(data, opts = {}) {
        const W = 340;
        const H = opts.height || 150;
        const labelH = opts.labels === false ? 6 : 20;
        const plotH = H - labelH;
        const n = Math.max(data.length, 1);
        const slot = W / n;
        const barW = Math.min(opts.barWidth || 22, slot * 0.62);
        const radius = barW / 2;
        const id = uid();

        const max = Math.max(
            ...data.map(d => d.value || 0),
            opts.goal || 0,
            1
        );
        const scale = (v) => (v / max) * (plotH - 10);

        let body = '';

        // goal line
        if (opts.goal) {
            const y = plotH - scale(opts.goal);
            body += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(235,235,245,0.3)"
                stroke-width="1" stroke-dasharray="4 4"/>`;
        }

        let defs = `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${opts.colorTo || '#FF7597'}"/>
            <stop offset="1" stop-color="${opts.color || '#FA114F'}"/>
        </linearGradient>`;

        data.forEach((d, i) => {
            const x = i * slot + (slot - barW) / 2;
            const h = Math.max(d.value > 0 ? 4 : 2.5, scale(d.value || 0));
            const y = plotH - h;
            const dim = d.value > 0 ? '' : ' opacity="0.30"';
            const fill = d.value > 0
                ? (d.highlight ? (opts.colorTo || '#FF7597') : `url(#${id}b)`)
                : 'rgba(120,120,128,0.35)';
            body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
                height="${h.toFixed(1)}" rx="${Math.min(radius, h / 2).toFixed(1)}" fill="${fill}"${dim}/>`;

            if (d.top) {
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
                    font-size="9" font-weight="700" fill="rgba(235,235,245,0.62)">${esc(d.top)}</text>`;
            }
            if (opts.labels !== false && d.label) {
                const strong = d.highlight ? '#fff' : 'rgba(235,235,245,0.45)';
                body += `<text x="${(x + barW / 2).toFixed(1)}" y="${(plotH + 14).toFixed(1)}" text-anchor="middle"
                    font-size="10" font-weight="${d.highlight ? 700 : 500}" fill="${strong}">${esc(d.label)}</text>`;
            }
        });

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Bar chart')}"><defs>${defs}</defs>${body}</svg>`;
    }

    /* ------------------------------------------------------------
       Line chart with area fill
       points: [{ x: Date|number, y: number, label }]
       ------------------------------------------------------------ */
    function line(points, opts = {}) {
        const W = 340;
        const H = opts.height || 170;
        const padL = 4, padR = 4, padT = 16, padB = 22;
        const id = uid();
        const color = opts.color || '#FF4E77';
        const colorSoft = opts.colorSoft || 'rgba(250,17,79,0.28)';

        if (!points.length) return '';

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
        const px = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const py = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

        const coords = points.map((p, i) => [px(i), py(p.y)]);

        // Catmull-Rom converted to cubic bezier, clamped so it never overshoots
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

        const areaPath = `${path} L ${coords[coords.length - 1][0].toFixed(1)} ${(padT + plotH).toFixed(1)}
            L ${coords[0][0].toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

        let body = '';
        // baseline
        body += `<line x1="0" y1="${padT + plotH}" x2="${W}" y2="${padT + plotH}" stroke="rgba(84,84,88,0.5)" stroke-width="1"/>`;
        body += `<path d="${areaPath}" fill="url(#${id}a)"/>`;
        body += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.6"
            stroke-linecap="round" stroke-linejoin="round"/>`;

        // point markers (thinned out when the series gets long)
        const step = n > 26 ? Math.ceil(n / 26) : 1;
        coords.forEach((c, i) => {
            const isLast = i === n - 1;
            if (!isLast && i % step !== 0) return;
            body += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${isLast ? 4.6 : 2.8}"
                fill="${isLast ? color : '#1C1C1E'}" stroke="${color}" stroke-width="${isLast ? 2.4 : 2}"/>`;
        });

        // last value callout
        if (opts.showLast !== false) {
            const last = coords[n - 1];
            const text = opts.formatValue ? opts.formatValue(points[n - 1].y) : String(Math.round(points[n - 1].y));
            const anchor = last[0] > W - 60 ? 'end' : 'middle';
            body += `<text x="${last[0].toFixed(1)}" y="${Math.max(11, last[1] - 12).toFixed(1)}" text-anchor="${anchor}"
                font-size="11" font-weight="700" fill="#fff">${esc(text)}</text>`;
        }

        // x labels: first / middle / last
        if (opts.labels !== false) {
            const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
            [...new Set(idxs)].forEach(i => {
                const anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
                const x = i === 0 ? 0 : (i === n - 1 ? W : px(i));
                body += `<text x="${x.toFixed(1)}" y="${H - 5}" text-anchor="${anchor}" font-size="10"
                    fill="rgba(235,235,245,0.45)">${esc(points[i].label || '')}</text>`;
            });
        }

        const defs = `<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${colorSoft}"/>
            <stop offset="1" stop-color="${colorSoft}" stop-opacity="0"/>
        </linearGradient>`;

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Line chart')}"><defs>${defs}</defs>${body}</svg>`;
    }

    /* ------------------------------------------------------------
       Month calendar with one ring per training day
       ------------------------------------------------------------ */
    function monthCalendar(year, month, dayData, opts = {}) {
        // dayData: Map dayKey -> { pct, count }
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

        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(2024, 0, 7 + ((weekStart + i) % 7)); // 2024-01-07 is a Sunday
            dayNames.push(d.toLocaleDateString(undefined, { weekday: 'narrow' }));
        }

        let body = '';
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
                body += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.4" fill="rgba(235,235,245,0.18)"/>`;
            }

            body += `<text x="${cx.toFixed(1)}" y="${(cy + ringSize / 2 + 11).toFixed(1)}" text-anchor="middle"
                font-size="10" font-weight="${isToday ? 700 : 500}"
                fill="${isToday ? '#fff' : 'rgba(235,235,245,0.45)'}">${d}</text>`;
        }

        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
            aria-label="${esc(opts.ariaLabel || 'Training calendar')}">${body}</svg>`;
    }

    return { rings, miniRing, dayRing, bars, line, monthCalendar, RING_COLORS };
})();

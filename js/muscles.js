/* ============================================================
   MUSCLES — a minimal body silhouette used as an exercise
   thumbnail. The trained group is filled, everything else stays
   as a light ghost, so the shape reads at 34 px.
   ============================================================ */

const Muscles = (() => {

    /* Body parts of a front/back combined stick figure, drawn in a
       36 x 44 viewBox. Each entry is a list of SVG shapes. */
    const PARTS = {
        head:      '<circle cx="18" cy="5.4" r="3.4"/>',
        neck:      '<rect x="16.4" y="8.4" width="3.2" height="2.2" rx="1"/>',
        shoulders: '<path d="M10.6 11.6c1.4-.9 3-1.3 4.4-1.4v3.4c-1.4.1-2.7.5-3.8 1.2-.9.5-2 .1-2.2-.9-.2-.9.2-1.7.8-2.1zM25.4 11.6c-1.4-.9-3-1.3-4.4-1.4v3.4c1.4.1 2.7.5 3.8 1.2.9.5 2 .1 2.2-.9.2-.9-.2-1.7-.8-2.1z"/>',
        chest:     '<path d="M14.6 12.4h6.8c1 0 1.8.7 1.9 1.7l.3 3c.1 1.1-.8 2-1.9 1.9l-2.9-.3a1.9 1.9 0 0 0-1.6 0l-2.9.3c-1.1.1-2-.8-1.9-1.9l.3-3c.1-1 .9-1.7 1.9-1.7z"/>',
        back:      '<path d="M14.4 12.6h7.2c1 0 1.8.8 1.9 1.8l.5 4.4c.1 1-.6 1.9-1.6 2l-3 .4-3-.4c-1-.1-1.7-1-1.6-2l.5-4.4c.1-1 .9-1.8 1.9-1.8z"/><path d="M12.6 15.2l1.2 5.4-2-1.4z"/><path d="M23.4 15.2l-1.2 5.4 2-1.4z"/>',
        arms:      '<path d="M11.4 14.8c1 .5 1.5 1.6 1.2 2.7l-1.3 4.6c-.3 1-1.3 1.6-2.3 1.4-1-.3-1.6-1.3-1.4-2.3l1.3-4.9c.3-1.1 1.5-1.8 2.5-1.5zM24.6 14.8c-1 .5-1.5 1.6-1.2 2.7l1.3 4.6c.3 1 1.3 1.6 2.3 1.4 1-.3 1.6-1.3 1.4-2.3l-1.3-4.9c-.3-1.1-1.5-1.8-2.5-1.5z"/><circle cx="8.7" cy="25.6" r="1.9"/><circle cx="27.3" cy="25.6" r="1.9"/>',
        core:      '<path d="M15 19.6h6c.9 0 1.6.7 1.6 1.6l-.3 4.2c-.1.9-.8 1.5-1.7 1.5h-5.2c-.9 0-1.6-.6-1.7-1.5l-.3-4.2c0-.9.7-1.6 1.6-1.6z"/>',
        legs:      '<path d="M14.6 27.4h2.6l-.5 6.2-.6 6.4c-.1 1.1-1 1.9-2.1 1.8-1.1-.1-1.9-1-1.8-2.1l.6-6.5zM21.4 27.4h-2.6l.5 6.2.6 6.4c.1 1.1 1 1.9 2.1 1.8 1.1-.1 1.9-1 1.8-2.1l-.6-6.5z"/>',
    };

    /* Which parts light up for a muscle group. */
    const HIGHLIGHT = {
        Chest: ['chest'],
        Back: ['back'],
        Shoulders: ['shoulders'],
        Arms: ['arms'],
        Core: ['core'],
        Legs: ['legs'],
    };

    /* The silhouette shown behind the highlight. Chest and back are
       mutually exclusive so the torso never doubles up. */
    function ghostParts(group) {
        const base = ['head', 'neck', 'shoulders', 'arms', 'core', 'legs'];
        const torso = group === 'Back' ? 'back' : 'chest';
        return [...base.slice(0, 2), torso, ...base.slice(2)];
    }

    /**
     * options: { size = 34, active = 'currentColor', ghost = 'rgba(0,0,0,.16)' }
     */
    function figure(muscleGroup, options = {}) {
        const size = options.size || 34;
        const active = options.active || 'currentColor';
        const ghost = options.ghost || 'rgba(0,0,0,0.16)';
        const highlight = HIGHLIGHT[muscleGroup] || [];

        const ghosts = ghostParts(muscleGroup)
            .filter(name => !highlight.includes(name))
            .map(name => PARTS[name])
            .join('');

        const actives = highlight.map(name => PARTS[name]).join('');

        return `<svg class="muscle-figure" viewBox="0 0 36 44" width="${size * 36 / 44}" height="${size}"
            role="img" aria-label="${escapeAttr(muscleGroup || 'Body')}">
            <g fill="${ghost}">${ghosts}</g>
            <g fill="${active}">${actives}</g>
        </svg>`;
    }

    function escapeAttr(value) {
        return String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    /* Tints are written as 8 digit hex rather than color-mix() so that older
       Safari versions render them too. */
    function tile(exercise, size, className) {
        const group = exercise ? exercise.muscleGroup : '';
        const color = Store.muscleColor(group);
        const ghost = typeof getComputedStyle === 'function'
            ? (getComputedStyle(document.documentElement).getPropertyValue('--figure-ghost').trim() || 'rgba(0,0,0,0.20)')
            : 'rgba(0,0,0,0.20)';
        return `<div class="${className}" style="background:${color}22;border-color:${color}4D">
            ${figure(group, { size, active: color, ghost })}
        </div>`;
    }

    /** Thumbnail used in exercise lists. */
    function thumb(exercise, options = {}) {
        return tile(exercise, options.size || 30, 'ex-thumb');
    }

    /** Bigger version for the exercise detail header. */
    function hero(exercise) {
        return tile(exercise, 48, 'ex-thumb ex-thumb-lg');
    }

    return { figure, thumb, hero, HIGHLIGHT };
})();

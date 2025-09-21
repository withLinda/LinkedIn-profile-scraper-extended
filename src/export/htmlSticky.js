(function () {
  'use strict';

  // Lightweight resolver (pattern shared across modules)
  function getModResolver() {
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('../shared/modResolver'); } catch (_) {}
    }
    const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
    const mods = root.LinkedInScraperModules || {};
    return mods.modResolver || { resolve: function () { return {}; } };
  }

  const modResolver = getModResolver();

  // Per-column width map (moved from html.js)
  // Keep these widths identical to the original exporter.  :contentReference[oaicite:11]{index=11}
  const COL_WIDTHS = {
    // Core
    name: '180px',
    profileUrl: '260px',
    headline: '220px',
    location: '150px',
    current: '220px',
    followers: '120px',
    urnCode: '160px',
    about: '520px',
    // Experience (1–3)
    exp1: '520px',
    exp2: '520px',
    exp3: '520px',
    exp1_company: '220px',
    exp1_position: '220px',
    exp1_duration: '180px',
    exp1_position_duration: '180px',
    exp1_description: '360px',
    exp2_company: '220px',
    exp2_position: '220px',
    exp2_duration: '180px',
    exp2_position_duration: '180px',
    exp2_description: '360px',
    exp3_company: '220px',
    exp3_position: '220px',
    exp3_duration: '180px',
    exp3_position_duration: '180px',
    exp3_description: '360px',
    // Education (1–3)
    edu1: '420px',
    edu2: '420px',
    edu3: '420px',
    edu1_institution: '220px',
    edu1_degree: '180px',
    edu1_grade: '140px',
    edu1_description: '280px',
    edu2_institution: '220px',
    edu2_degree: '180px',
    edu2_grade: '140px',
    edu2_description: '280px',
    edu3_institution: '220px',
    edu3_degree: '180px',
    edu3_grade: '140px',
    edu3_description: '280px'
  };

  function renderColGroup(columns, widths) {
    const W = widths || COL_WIDTHS;
    return '<colgroup>' + columns.map(function (c) {
      var w = W[c.key];
      return w ? '<col style="width:' + w + ';" />' : '<col />';
    }).join('') + '</colgroup>';
  }

  // Defaults: freeze Name and Profile URL (same behavior as before).  :contentReference[oaicite:12]{index=12}
  const DEFAULT_STICKY_KEYS = ['name', 'profileUrl'];

  function parsePx(v) {
    const n = parseInt(String(v || '').replace('px', ''), 10);
    return Number.isFinite(n) ? n : 0;
  }

  // Compute left offsets from ordered columns + width map, limited to sticky keys.
  function computeStickyOffsets(columns, widths, stickyKeys) {
    const W = widths || COL_WIDTHS;
    const keys = stickyKeys || DEFAULT_STICKY_KEYS;
    const map = {};
    let left = 0;
    for (const col of columns) {
      const k = col && col.key;
      if (k && keys.indexOf(k) !== -1) {
        map[k] = { left: left + 'px' };
        left += parsePx(W[k]);
      }
    }
    return map;
  }

  // Sticky CSS (moved out of BASE_STYLES in html.js).  :contentReference[oaicite:13]{index=13}
  const STICKY_CSS = [
    '.sticky-col { position: sticky; z-index: 1; background: inherit; box-shadow: 1px 0 0 rgba(15, 23, 42, 0.06) inset; }',
    'thead th.sticky-col { z-index: 5; background: var(--ef-bg2, #f2efdf); }'
  ].join('\n');

  // Factory returning everything html.js needs in one go.
  function createSticky(columns, opts) {
    const widths = (opts && opts.widths) || COL_WIDTHS;
    const stickyKeys = (opts && opts.stickyKeys) || DEFAULT_STICKY_KEYS;
    const offsets = computeStickyOffsets(columns, widths, stickyKeys);
    const orderedSticky = stickyKeys.filter(k => k in offsets);

    function stickyAttrsFor(column) {
      const key = column && column.key;
      if (!key || !(key in offsets)) return { cls: '', style: '' };
      const idx = orderedSticky.indexOf(key) + 1; // 1-based like before
      return { cls: ' sticky-col sticky-col-' + idx, style: 'left:' + offsets[key].left + ';' };
    }

    return {
      colgroup: renderColGroup(columns, widths),
      stickyAttrsFor,
      css: STICKY_CSS,
      widths,
      stickyKeys
    };
  }

  const mod = {
    COL_WIDTHS,
    DEFAULT_STICKY_KEYS,
    renderColGroup,
    createSticky
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportHtmlSticky = mod;
})();

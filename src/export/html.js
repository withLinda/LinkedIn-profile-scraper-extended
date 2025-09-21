(function () {
  'use strict';

  function getModResolver() {
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('../shared/modResolver'); } catch (_) { /* ignore */ }
    }
    const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
    const mods = root.LinkedInScraperModules || {};
    return mods.modResolver || { resolve: function () { return {}; } };
  }

  const modResolver = getModResolver();
  const shared = modResolver.resolve('../export/shared', 'exportShared') || {};
  const theme = modResolver.resolve('../theme/index', 'theme') || {};

  const getColumns = typeof shared.getPersonColumns === 'function'
    ? shared.getPersonColumns.bind(shared)
    : function () { return []; };

  const getDisplayValue = typeof shared.getDisplayValue === 'function'
    ? shared.getDisplayValue.bind(shared)
    : function (person, key) {
        if (!person) return null;
        const value = person[key];
        if (value == null) return null;
        const text = String(value).trim();
        return text ? text : null;
      };

  const escapeHTML = typeof shared.escapeHTML === 'function'
    ? function (value) { return shared.escapeHTML(value); }
    : function (value) {
        if (value === null || value === undefined) return '';
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

  const downloadFile = typeof shared.downloadFile === 'function'
    ? shared.downloadFile
    : function (content, filename, mimeType) {
        if (typeof document === 'undefined') return;
        const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(function () {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      };

  const fallbackTokens = (theme && theme.DEFAULT_THEME) ? theme.DEFAULT_THEME : {};
  function getThemeTokens() {
    if (theme && typeof theme.getActiveTokens === 'function') {
      try {
        const tokens = theme.getActiveTokens();
        if (tokens && typeof tokens === 'object') return tokens;
      } catch (_) { /* ignore */ }
    }
    return fallbackTokens;
  }

  function buildThemeCss() {
    const tokens = getThemeTokens();
    const entries = Object.entries(tokens || {});
    if (!entries.length) return '';
    const lines = entries.map(function ([key, value]) { return '  ' + key + ': ' + value + ';'; });
    return ':root {\n' + lines.join('\n') + '\n}';
  }

  // --- NEW: per-column width map + <colgroup/> renderer --------------------
  // Tweak these widths as desired; the table uses table-layout: fixed
  // so the browser respects them and wraps text.
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

  function renderColGroup(columns) {
    return '<colgroup>' + columns.map(function (c) {
      var w = COL_WIDTHS[c.key];
      return w ? '<col style="width:' + w + ';" />' : '<col />';
    }).join('') + '</colgroup>';
  }

  // --- NEW: sticky (frozen) columns config ---------------------------------
  // We freeze "Name" and "Profile URL". Their keys are assumed to be
  // `name` and `profileUrl` (adjust if your column keys differ).
  // Offsets are computed from COL_WIDTHS so they always align.
  const NAME_W = (COL_WIDTHS && COL_WIDTHS.name) || '180px';
  const STICKY_CONFIG = {
    name: { idx: 1, left: '0px' },
    profileUrl: { idx: 2, left: String(parseInt(NAME_W, 10) || 180) + 'px' }
  };

  function stickyAttrsFor(col) {
    var s = STICKY_CONFIG[col && col.key];
    if (!s) return { cls: '', style: '' };
    return {
      cls: ' sticky-col sticky-col-' + s.idx,
      style: 'left:' + s.left + ';'
    };
  }

  const BASE_STYLES = [
    '*, *::before, *::after { box-sizing: border-box; }',
    'body { margin: 0; background: var(--ef-bg0, #ffffff); color: var(--ef-fg, #1f2933); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; }',
    'a { color: var(--ef-blue, #2563eb); text-decoration: none; }',
    'a:hover { color: var(--ef-aqua, #14b8a6); text-decoration: underline; }',
    '.page { padding: 32px clamp(16px, 5vw, 64px) 56px; background: var(--ef-bg0, #ffffff); min-height: 100vh; display: flex; flex-direction: column; gap: 24px; }',
    '.header { display: flex; flex-direction: column; gap: 4px; }',
    '.header h1 { margin: 0; font-size: 24px; font-weight: 600; color: var(--ef-blue, #2563eb); }',
    '.header .meta { margin: 0; color: var(--ef-grey1, #64748b); font-size: 13px; }',
    '.table-shell { border: 1px solid var(--ef-bg3, #d7d3c5); border-radius: 12px; background: var(--ef-bg0, #ffffff); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); overflow: hidden; }',
    '.table-scroll { max-height: 70vh; overflow: auto; background: inherit; position: relative; }',
    '.table-scroll::-webkit-scrollbar { width: 10px; }',
    '.table-scroll::-webkit-scrollbar-track { background: var(--ef-bg1, #f8f5e4); }',
    '.table-scroll::-webkit-scrollbar-thumb { background: var(--ef-bg3, #e2e8f0); border-radius: 6px; }',
    'table { width: 100%; border-collapse: collapse; min-width: 1280px; table-layout: fixed; }',
    'thead th { position: sticky; top: 0; z-index: 3; background: var(--ef-bg2, #f2efdf); color: var(--ef-statusline3, #f85552); padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; letter-spacing: 0.01em; border-bottom: 1px solid var(--ef-bg4, #e8e5d5); box-shadow: 0 1px 0 rgba(15, 23, 42, 0.05); }',
    '/* Make both zebra stripes explicit so <td> can inherit a real color */',
    'tbody tr:nth-child(odd) { background: var(--ef-bg0, #ffffff); }',
    'tbody tr:nth-child(even) { background: var(--ef-bg1, #f8f5e4); }',
    'tbody tr:hover { background: var(--ef-visual, #f0f2d4); }',
    'td { padding: 12px 16px; border-bottom: 1px solid var(--ef-bg3, #d7d3c5); white-space: pre-wrap; overflow-wrap: anywhere; color: inherit; vertical-align: top; }',
    'tbody tr:last-child td { border-bottom: none; }',
    'td.numeric { text-align: right; font-variant-numeric: tabular-nums; }',
    'td.empty { color: var(--ef-grey1, #64748b); font-style: italic; text-align: center; }',
    'a.profile-link { word-break: break-word; }',
    // Sticky columns: keep background in sync with zebra striping and
    // draw a subtle divider on the right edge.
    '.sticky-col { position: sticky; z-index: 1; background: inherit; box-shadow: 1px 0 0 rgba(15, 23, 42, 0.06) inset; }',
    'thead th.sticky-col { z-index: 5; background: var(--ef-bg2, #f2efdf); }',
    '.export-meta { font-size: 12px; color: var(--ef-grey1, #64748b); }',
    '@media (max-width: 768px) { .page { padding: 24px 16px 48px; } thead th, td { padding: 10px 12px; } }',
    '@media print { .page { padding: 24px; box-shadow: none; } .table-shell { box-shadow: none; } .table-scroll { max-height: none; overflow: visible; } thead th { position: static; box-shadow: none; } }'
  ].join('\n');

  const EN_DASH = '\u2013';

  function formatFollowers(value) {
    if (value == null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      try { return value.toLocaleString(); } catch (_) { return String(value); }
    }
    return null;
  }

  function buildCell(content, classes, sticky) {
    const baseClasses = Array.isArray(classes) ? classes.slice() : [];
    if (sticky && sticky.cls) {
      const stickyClasses = sticky.cls.trim().split(/\s+/);
      Array.prototype.push.apply(baseClasses, stickyClasses.filter(Boolean));
    }
    const classAttr = baseClasses.length ? ' class="' + baseClasses.join(' ') + '"' : '';
    const styleAttr = sticky && sticky.style ? ' style="' + sticky.style + '"' : '';
    return '<td' + classAttr + styleAttr + '>' + content + '</td>';
  }

  function renderCell(person, column) {
    const key = column.key;
    const stickyAttrs = stickyAttrsFor(column);
    const displayValue = getDisplayValue(person, key);

    if (key === 'profileUrl') {
      if (!displayValue) {
        return buildCell(EN_DASH, ['empty'], stickyAttrs);
      }
      const safe = escapeHTML(displayValue);
      const link = '<a class="profile-link" href="' + safe + '" target="_blank" rel="noopener noreferrer">' + safe + '</a>';
      return buildCell(link, [], stickyAttrs);
    }

    if (key === 'followers') {
      const formatted = formatFollowers(displayValue);
      if (!formatted) {
        return buildCell(EN_DASH, ['empty'], stickyAttrs);
      }
      const safeText = escapeHTML(formatted);
      const classes = typeof displayValue === 'number' ? ['numeric'] : [];
      return buildCell(safeText, classes, stickyAttrs);
    }

    if (displayValue == null) {
      return buildCell(EN_DASH, ['empty'], stickyAttrs);
    }

    const safeValue = escapeHTML(displayValue);
    return buildCell(safeValue, [], stickyAttrs);
  }

  function renderRows(people, columns) {
    return people.map(function (person) {
      const cells = columns.map(function (column) { return renderCell(person, column); });
      return '<tr>' + cells.join('') + '</tr>';
    }).join('\n');
  }

  function renderHeaders(columns) {
    return columns.map(function (column) {
      const sticky = stickyAttrsFor(column);
      const classes = sticky && sticky.cls ? sticky.cls.trim() : '';
      const classAttr = classes ? ' class="' + classes + '"' : '';
      const styleAttr = sticky && sticky.style ? ' style="' + sticky.style + '"' : '';
      const label = column && column.label ? column.label : column.key;
      return '<th' + classAttr + styleAttr + '>' + escapeHTML(label) + '</th>';
    }).join('');
  }

  function exportToHtml(people) {
    if (!Array.isArray(people) || people.length === 0) {
      if (typeof alert === 'function') alert('No data to export');
      return;
    }

    const columns = getColumns();
    if (!Array.isArray(columns) || columns.length === 0) {
      if (typeof alert === 'function') alert('No columns available for export');
      return;
    }

    const headers = renderHeaders(columns);
    const colgroup = renderColGroup(columns);
    const rows = renderRows(people, columns);
    const themeCss = buildThemeCss();
    const styles = themeCss ? themeCss + '\n\n' + BASE_STYLES : BASE_STYLES;
    const now = new Date();
    const metaText = people.length + ' profile' + (people.length === 1 ? '' : 's') + ' • exported ' + now.toLocaleString();

    const htmlContent = '<!doctype html>\n'
      + '<html lang="en">\n'
      + '<head>\n'
      + '  <meta charset="utf-8" />\n'
      + '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
      + '  <title>LinkedIn Profiles</title>\n'
      + '  <style>\n' + styles + '\n  </style>\n'
      + '</head>\n'
      + '<body>\n'
      + '  <div class="page">\n'
      + '    <header class="header">\n'
      + '      <h1>LinkedIn Profiles</h1>\n'
      + '      <p class="meta">' + escapeHTML(metaText) + '</p>\n'
      + '    </header>\n'
      + '    <div class="table-shell">\n'
      + '      <div class="table-scroll">\n'
      + '        <table>\n'
      + colgroup + '\n'
      + '          <thead>\n'
      + '            <tr>' + headers + '</tr>\n'
      + '          </thead>\n'
      + '          <tbody>\n'
      + rows + '\n'
      + '          </tbody>\n'
      + '        </table>\n'
      + '      </div>\n'
      + '    </div>\n'
      + '    <div class="export-meta">Generated on ' + escapeHTML(now.toDateString()) + '</div>\n'
      + '  </div>\n'
      + '</body>\n'
      + '</html>';

    const timestamp = now.toISOString().split('T')[0];
    downloadFile(htmlContent, 'linkedin_profiles_' + timestamp + '.html', 'text/html;charset=utf-8');
  }

  const mod = { exportToHtml };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }

  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportHtml = mod;
  if (typeof window !== 'undefined') window.exportToHtml = exportToHtml;
})();

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
  // NEW: sticky helpers module (optional at runtime)
  const stickyMod = modResolver.resolve('../export/htmlSticky', 'exportHtmlSticky') || {};
  const stylesMod = modResolver.resolve('../export/htmlStyles', 'exportHtmlStyles') || {};

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

  // ---------------------------------------------------------------------------
  // THEME CSS (unchanged)
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

  // sticky attrs function is provided by sticky module (set at export time).
  // default no-op so existing code can call it safely.
  var stickyAttrsFor = function () { return { cls: '', style: '' }; };

  // Base CSS now lives in src/export/htmlStyles.js
  const HTML_BASE_CSS = typeof stylesMod.HTML_BASE_CSS === 'string' ? stylesMod.HTML_BASE_CSS : '';
  const composeExportStyles = (typeof stylesMod.composeExportStyles === 'function')
    ? stylesMod.composeExportStyles
    : function (themeCss, stickyCss) {
        const parts = [];
        if (themeCss) parts.push(themeCss);
        if (HTML_BASE_CSS) parts.push(HTML_BASE_CSS);
        if (stickyCss) parts.push(stickyCss);
        return parts.join('\n');
      };

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

    // Prepare sticky helpers for this set of columns
    var stickyHelpers = (stickyMod && typeof stickyMod.createSticky === 'function')
      ? stickyMod.createSticky(columns)
      : { colgroup: '', stickyAttrsFor: function(){ return { cls:'', style:'' }; }, css: '' };
    stickyAttrsFor = stickyHelpers.stickyAttrsFor;

    const headers = renderHeaders(columns);
    const colgroup = stickyHelpers.colgroup;
    const rows = renderRows(people, columns);
    const themeCss = buildThemeCss();
    const styles = composeExportStyles(themeCss, stickyHelpers.css);
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

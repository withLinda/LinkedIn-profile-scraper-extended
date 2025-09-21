(function(){
  'use strict';

  function getResolver(){
    if (typeof module!=='undefined' && module.exports) {
      try { return require('../shared/modResolver'); } catch(_) { return null; }
    }
    const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
    return (r.LinkedInScraperModules||{}).modResolver || null;
  }
  function getShared(){ const res=getResolver(); if (res && res.resolve) return res.resolve('../export/shared','exportShared');
    try { if (typeof module!=='undefined' && module.exports) return require('./shared'); } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    return (root.LinkedInScraperModules||{}).exportShared || {};
  }
  function getTheme(){ const res=getResolver(); if (res && res.resolve) return res.resolve('../theme','theme');
    try { if (typeof module!=='undefined' && module.exports) return require('../theme'); } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    return (root.LinkedInScraperModules||{}).theme || {};
  }
  function getUiStyles(){ const res=getResolver(); if (res && res.resolve) return res.resolve('../ui/styles','uiStyles');
    try { if (typeof module!=='undefined' && module.exports) return require('../ui/styles'); } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    return (root.LinkedInScraperModules||{}).uiStyles || {};
  }

  const shared = getShared();
  const themeModule = getTheme();
  const uiStylesModule = getUiStyles();

  function exportToHtml(people) {
    if (!people || people.length===0) {
      alert('No data to export');
      return;
    }
    const columns = shared.getPersonColumns();
    const cssVars = (themeModule && typeof themeModule.getCssVariablesCss === 'function')
      ? themeModule.getCssVariablesCss(':root', themeModule.getActiveTokens ? themeModule.getActiveTokens() : undefined)
      : '';
    const baseCss = (uiStylesModule && uiStylesModule.UI_BASE_CSS) ? uiStylesModule.UI_BASE_CSS : '';
    const scopedBaseCss = baseCss
        .replace(/#linkedin-scraper-ui\s*\{[\s\S]*?\}/g, '')
        .replace(/#linkedin-scraper-ui\s*\*\s*\{[\s\S]*?\}/g, '');

    const renderHtmlCell = (person, column) => {
      const value = shared.getDisplayValue(person, column.key);
      if (column.key === 'profileUrl') {
        if (!value) return '<span class="no-data">-</span>';
        const safeUrl = shared.escapeHTML(String(value));
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="profile-link">${safeUrl}</a>`;
      }
      if (column.key === 'followers') {
        if (typeof value === 'string' && value.trim()) return shared.escapeHTML(value);
        if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString();
        return '<span class="no-data">-</span>';
      }
      if (!value) return '<span class="no-data">-</span>';
      return shared.escapeHTML(String(value));
    };
    // Add per-column classes so we can size columns in CSS
    const headerCells = columns.map(c => `<th class="col-${c.key}">${shared.escapeHTML(c.label)}</th>`).join('');
    const bodyRows = people.map(p => {
      const cells = columns.map(c => {
        const content = renderHtmlCell(p, c);
        const classes = ['col-' + c.key];
        if (c.key === 'followers') classes.push('followers');
        return `<td class="${classes.join(' ')}">${content}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>LinkedIn Profiles Export</title>
  <style>
    ${cssVars}
    html{ color-scheme: light; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body{ background:var(--ef-bg0); padding:20px; color:var(--ef-fg); }
    .export-scope, .export-scope *{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;
      color:var(--ef-fg); /* use body fg for text; accents handled below */
      box-sizing:border-box;
    }
    .container{
      max-width:1400px; margin:0 auto; background:var(--ef-bg1);
      border:1px solid var(--ef-bg3); border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.4); overflow:hidden;
    }
    h1{ background:var(--ef-bg0); color:var(--ef-blue); padding:20px; font-size:24px; }
    .meta{ padding:15px 20px; background:var(--ef-bg0); border-bottom:1px solid var(--ef-bg3); font-size:14px; color:var(--ef-grey1); }
    /* Table container for scroll + visual parity with popup */
    .results-table-container{ max-height:70vh; overflow:auto; background:var(--ef-bg0); }
    table{ width:100%; border-collapse:collapse; table-layout:fixed; }
    ${scopedBaseCss}
    /* Ensure ellipsis everywhere by default, then override per-column as needed */
    .results-table th, .results-table td { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .followers{ text-align:right; font-variant-numeric: tabular-nums; color:var(--ef-fg); white-space:nowrap; }
    /* Column sizing for sanity */
    .col-name{ width:180px; }
    .col-profileUrl{ width:260px; }
    .col-headline{ width:220px; }
    .col-location{ width:150px; }
    .col-current{ width:220px; }
    .col-followers{ width:110px; }
    .col-urnCode{ width:260px; }
    /* About column: multi-line clamp instead of single-line ellipsis */
    .col-about{
      white-space:normal;
      line-height:1.35;
      display:-webkit-box;
      -webkit-line-clamp:4;
      -webkit-box-orient:vertical;
    }
    .no-data{ color:var(--ef-grey1); font-style:italic; }
  </style>
</head>
<body>
  <div class="export-scope container">
    <h1>LinkedIn Profiles Export</h1>
    <div class="meta"><strong>Export Date:</strong> ${new Date().toLocaleDateString()} | <strong>Total Profiles:</strong> ${people.length}</div>
    <div class="results-table-container">
      <table class="results-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
    </div>
  </div>
</body>
</html>`;
    const timestamp = new Date().toISOString().split('T')[0];
    shared.downloadFile(htmlContent, `linkedin_profiles_${timestamp}.html`, 'text/html;charset=utf-8');
  }

  const mod = { exportToHtml };
  if (typeof module!=='undefined' && module.exports) module.exports = mod;
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportHtml = mod;
  if (typeof window!=='undefined') window.exportToHtml = exportToHtml;
})();

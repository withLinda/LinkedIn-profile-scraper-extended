(function () {
  'use strict';

  // Base CSS used by the HTML exporter (moved from src/export/html.js)
  const HTML_BASE_CSS = [
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
    '.export-meta { font-size: 12px; color: var(--ef-grey1, #64748b); }',
    '@media (max-width: 768px) { .page { padding: 24px 16px 48px; } thead th, td { padding: 10px 12px; } }',
    '@media print { .page { padding: 24px; box-shadow: none; } .table-shell { box-shadow: none; } .table-scroll { max-height: none; overflow: visible; } thead th { position: static; box-shadow: none; } }'
  ].join('\n');

  // Compose the final <style> payload exactly as the exporter expects.
  function composeExportStyles(themeCss, stickyCss) {
    const parts = [];
    if (themeCss) parts.push(themeCss);
    parts.push(HTML_BASE_CSS);
    if (stickyCss) parts.push(stickyCss);
    return parts.join('\n');
  }

  const mod = { HTML_BASE_CSS, composeExportStyles };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }

  const root = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof window !== 'undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportHtmlStyles = mod;
})();


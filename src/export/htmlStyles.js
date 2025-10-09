(function () {
  'use strict';

  // Beautiful dark theme CSS for HTML export with glassmorphism
  const HTML_BASE_CSS = [
    '*, *::before, *::after { box-sizing: border-box; }',
    'body { margin: 0; background: var(--ef-bg-dim); color: var(--ef-fg); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; }',
    'a { color: var(--ef-blue); text-decoration: none; font-weight: 500; transition: all 0.2s ease; }',
    'a:hover { color: var(--ef-aqua); text-shadow: var(--ef-glow-blue); }',
    '.page { padding: 32px clamp(16px, 5vw, 64px) 56px; background: transparent; min-height: 100vh; display: flex; flex-direction: column; gap: 32px; position: relative; }',
    '.page::before { content: ""; position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: none; }',
    '.header { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 1; }',
    '.header h1 { margin: 0; font-size: var(--ef-font-export-h1, 28px); font-weight: 700; background: var(--ef-gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }',
    '.header .meta { margin: 0; color: var(--ef-grey1); font-size: 13px; font-weight: 500; }',
    '.table-shell { border: 1px solid var(--ef-glass-border); border-radius: 16px; background: var(--ef-panel-bg); backdrop-filter: var(--ef-glass-blur); -webkit-backdrop-filter: var(--ef-glass-blur); box-shadow: var(--ef-glass-shadow), var(--ef-glow-blue); overflow: hidden; position: relative; z-index: 1; }',
    '.table-scroll { max-height: 70vh; overflow: auto; background: transparent; position: relative; scrollbar-color: var(--ef-aqua) rgba(46, 56, 60, 0.3); }',
    '.table-scroll::-webkit-scrollbar { width: 12px; height: 12px; }',
    '.table-scroll::-webkit-scrollbar-track { background: rgba(46, 56, 60, 0.3); border-radius: 8px; }',
    '.table-scroll::-webkit-scrollbar-thumb { background: linear-gradient(135deg, var(--ef-blue), var(--ef-aqua)); border-radius: 8px; border: 2px solid rgba(46, 56, 60, 0.3); box-shadow: var(--ef-glow-blue); }',
    '.table-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(135deg, var(--ef-aqua), var(--ef-green)); box-shadow: var(--ef-glow-green); }',
    'table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1280px; table-layout: fixed; }',
    'thead th { position: sticky; top: 0; z-index: 3; background: linear-gradient(135deg, rgba(55, 65, 69, 0.95), rgba(65, 75, 80, 0.95)); backdrop-filter: blur(12px); color: var(--ef-yellow); padding: 14px 18px; text-align: left; font-weight: 700; font-size: var(--ef-font-export-th, 13px); letter-spacing: 0.2px; text-transform: none !important; border-bottom: 2px solid var(--ef-glass-border); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }',
    'thead th:first-child { border-top-left-radius: 16px; }',
    'thead th:last-child { border-top-right-radius: 16px; }',
    'tbody tr:nth-child(odd) { background: var(--ef-bg1); }',
    'tbody tr:nth-child(even) { background: var(--ef-bg0); }',
    'tbody tr { transition: all 0.2s ease; }',
    'tbody tr:hover { background: var(--ef-hover-row-bg); transform: scale(1.002); }',
    'td { padding: 14px 18px; border-bottom: 1px solid rgba(65, 75, 80, 0.3); white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ef-fg); vertical-align: top; }',
    'tbody tr:last-child td { border-bottom: none; }',
    'td.numeric { text-align: right; font-variant-numeric: tabular-nums; color: var(--ef-aqua); }',
    'td.empty { color: var(--ef-grey1); font-style: italic; text-align: center; }',
    'a.profile-link { word-break: break-word; color: var(--ef-blue); font-weight: 600; }',
    'a.profile-link:hover { color: var(--ef-aqua); }',
    '.export-meta { font-size: 12px; color: var(--ef-grey1); position: relative; z-index: 1; }',
    '@media (max-width: 768px) { .page { padding: 24px 16px 48px; } thead th, td { padding: 10px 12px; } }',
    '@media print { .page { padding: 24px; box-shadow: none; } .page::before { display: none; } .table-shell { box-shadow: none; backdrop-filter: none; background: var(--ef-bg0); } .table-scroll { max-height: none; overflow: visible; } thead th { position: static; box-shadow: none; backdrop-filter: none; text-transform: none !important; } }'
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

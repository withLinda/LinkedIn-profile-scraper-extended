(function(){
  'use strict';

  function getResolver(){
    if (typeof module!=='undefined' && module.exports) {
      try { return require('../shared/modResolver'); } catch(_) { return null; }
    }
    const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
    return (r.LinkedInScraperModules||{}).modResolver || null;
  }

  function getShared(){
    const res=getResolver();
    if (res && res.resolve) return res.resolve('../export/shared','exportShared');
    try { if (typeof module!=='undefined' && module.exports) return require('./shared'); } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    return (root.LinkedInScraperModules||{}).exportShared || {};
  }

  const shared = getShared();

  function exportToHtml(people) {
    if (!people || !people.length) {
      alert('No data to export');
      return;
    }

    const columns = shared.getPersonColumns();
    const escape = shared.escapeHTML;
    const getVal = shared.getDisplayValue;

    const headers = columns.map(c => `<th>${escape(c.label)}</th>`).join('');
    const rows = people.map(p => {
      return '<tr>' + columns.map(c => {
        const raw = getVal(p, c.key);
        if (c.key === 'profileUrl' && raw) {
          const safe = escape(raw);
          return `<td><a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a></td>`;
        }
        return `<td>${escape(raw)}</td>`;
      }).join('') + '</tr>';
    }).join('');

    const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LinkedIn Profiles</title>
  <style>
    :root{ --bg:#fff; --fg:#333; --muted:#e5e7eb; --muted-2:#f3f4f6; --link:#2563eb; }
    body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;}
    .page{padding:24px 24px 48px;}
    h1{margin:0 0 16px 0;font-size:18px;color:var(--link)}
    .table-wrap{border:1px solid var(--muted);border-radius:8px;overflow:auto;max-height:80vh;background:var(--bg)}
    table{border-collapse:collapse;width:100%;min-width:900px}
    th,td{padding:10px 12px;border-bottom:1px solid var(--muted);vertical-align:top; text-wrap:pretty;}
    th{position:sticky;top:0;background:var(--muted-2);z-index:1;text-align:left}
    tr:hover td{background:#fafafa}
    a{color:var(--link);text-decoration:none}
    a:hover{text-decoration:underline}
    .meta{margin:8px 0 16px 0;color:#6b7280}
  </style>
</head>
<body>
  <div class="page">
    <h1>LinkedIn Profiles</h1>
    <div class="meta">${people.length} profiles • exported ${new Date().toLocaleString()}</div>
    <div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>
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

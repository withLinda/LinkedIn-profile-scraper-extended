(function(){
  'use strict';

  function getShared() {
    // Prefer shared resolver, then fallback to legacy paths
    function getResolver(){
      if (typeof module!=='undefined' && module.exports) {
        try { return require('../shared/modResolver'); } catch(_) { return null; }
      }
      const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
      return (r.LinkedInScraperModules||{}).modResolver || null;
    }
    const res = getResolver();
    if (res && typeof res.resolve==='function') return res.resolve('../export/shared','exportShared');
    try { if (typeof module!=='undefined' && module.exports) return require('./shared'); } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    return (root.LinkedInScraperModules||{}).exportShared || {};
  }

  function exportToCsv(people) {
    if (!people || people.length===0) {
      alert('No data to export');
      return;
    }
    const columns = shared.getPersonColumns();
    const BOM = '\uFEFF';
    const headerRow = columns.map(c => shared.escapeCSV(c.label)).join(',');
    const bodyRows = people.map(p => columns.map(c => shared.escapeCSV(shared.getCsvValue(p, c.key))).join(',')).join('\n');
    const csvContent = BOM + headerRow + '\n' + bodyRows;
    const timestamp = new Date().toISOString().split('T')[0];
    shared.downloadFile(csvContent, `linkedin_profiles_${timestamp}.csv`, 'text/csv;charset=utf-8');
  }

  const shared = getShared();
  const mod = { exportToCsv };
  if (typeof module!=='undefined' && module.exports) {
    module.exports = mod;
  }
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportCsv = mod;
  if (typeof window!=='undefined') window.exportToCsv = exportToCsv;
})();

(function(){
  'use strict';

  function getShared() {
    if (typeof module!=='undefined' && module.exports) {
      try { return require('./shared'); } catch(_) { return {}; }
    }
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    const mods = root.LinkedInScraperModules || {};
    return mods.exportShared || {};
  }

  const shared = getShared();

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

  const mod = { exportToCsv };
  if (typeof module!=='undefined' && module.exports) {
    module.exports = mod;
  }
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportCsv = mod;
  if (typeof window!=='undefined') window.exportToCsv = exportToCsv;
})();


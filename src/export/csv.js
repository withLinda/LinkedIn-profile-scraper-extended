(function(){
  'use strict';

  function getModResolver(){
    if (typeof module!=='undefined' && module.exports){
      try { return require('../shared/modResolver'); } catch(_) { /* ignore */ }
    }
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    const mods = root.LinkedInScraperModules || {};
    return mods.modResolver || { resolve: function(){ return {}; } };
  }

  const modResolver = getModResolver();
  const shared = modResolver.resolve('../export/shared','exportShared') || {};

  const getColumns = typeof shared.getPersonColumns === 'function'
    ? shared.getPersonColumns.bind(shared)
    : function(){ return []; };

  const escapeCSV = typeof shared.escapeCSV === 'function'
    ? shared.escapeCSV
    : function(value){
        if (value === null || value === undefined) return '';
        const str = String(value);
        return (/,|"|\n|\r/.test(str)) ? '"' + str.replace(/"/g,'""') + '"' : str;
      };

  const getCsvValue = typeof shared.getCsvValue === 'function'
    ? shared.getCsvValue
    : function(person, key){
        if (!person) return '';
        const value = person[key];
        return value == null ? '' : String(value);
      };

  const downloadFile = typeof shared.downloadFile === 'function'
    ? shared.downloadFile
    : function(content, filename, mimeType){
        if (typeof document === 'undefined') return;
        const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(function(){
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      };

  function exportToCsv(people) {
    if (!Array.isArray(people) || people.length===0) {
      if (typeof alert === 'function') alert('No data to export');
      return;
    }
    const columns = getColumns();
    if (!Array.isArray(columns) || columns.length === 0) {
      if (typeof alert === 'function') alert('No columns available for export');
      return;
    }
    const BOM = '\uFEFF';
    const headerRow = columns.map(function(c){ return escapeCSV(c.label); }).join(',');
    const bodyRows = people.map(function(p){
      return columns.map(function(c){ return escapeCSV(getCsvValue(p, c.key)); }).join(',');
    }).join('\n');
    const csvContent = BOM + headerRow + '\n' + bodyRows;
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, 'linkedin_profiles_' + timestamp + '.csv', 'text/csv;charset=utf-8');
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

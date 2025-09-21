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
  const shared = modResolver.resolve('../export/shared', 'exportShared') || {};

  const getColumns = typeof shared.getPersonColumns === 'function'
    ? shared.getPersonColumns.bind(shared)
    : function(){ return []; };

  const getDisplayValue = typeof shared.getDisplayValue === 'function'
    ? shared.getDisplayValue.bind(shared)
    : function(person, key){
        if (!person) return null;
        const value = person[key];
        if (value == null) return null;
        const text = String(value).trim();
        return text ? text : null;
      };

  const downloadFile = typeof shared.downloadFile === 'function'
    ? shared.downloadFile
    : function(content, filename, mimeType){
        if (typeof document === 'undefined') return;
        const blob = new Blob([content], { type: mimeType || 'application/json;charset=utf-8' });
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

  function exportToJson(people){
    if (!Array.isArray(people) || people.length === 0) {
      if (typeof alert === 'function') alert('No data to export');
      return;
    }

    const columns = getColumns();
    if (!Array.isArray(columns) || columns.length === 0) {
      if (typeof alert === 'function') alert('No columns available for export');
      return;
    }

    const rows = people.map(function(person){
      const row = {};
      columns.forEach(function(column){
        row[column.key] = getDisplayValue(person, column.key);
      });
      return row;
    });

    const payload = {
      columns: columns.map(function(column){
        return {
          key: column.key,
          label: column.label != null ? column.label : column.key
        };
      }),
      count: rows.length,
      generatedAt: new Date().toISOString(),
      rows: rows
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(jsonContent, 'linkedin_profiles_' + timestamp + '.json', 'application/json;charset=utf-8');
  }

  const mod = { exportToJson };

  if (typeof module!=='undefined' && module.exports) {
    module.exports = mod;
  }

  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportJson = mod;

  if (typeof window!=='undefined') window.exportToJson = exportToJson;
})();

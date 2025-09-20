(function(){
  'use strict';

  function getPersonColumns() {
    try {
      if (typeof module!=='undefined' && module.exports) {
        const schema = require('../schema/columns');
        if (schema && Array.isArray(schema.PERSON_COLUMNS)) return schema.PERSON_COLUMNS;
      }
    } catch(_) {}
    const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
    const mods = root.LinkedInScraperModules || {};
    const schema = mods.schema || {};
    return Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : [];
  }

  function getCsvValue(person, key) {
    if (!person) return '';
    if (key === 'followers') {
      const f = person.followers;
      if (typeof f === 'string') return f;
      if (typeof f === 'number' && Number.isFinite(f)) return String(f);
      return '';
    }
    const value = person[key];
    return value == null ? '' : String(value);
  }

  function getDisplayValue(person, key) {
    if (!person) return '';
    if (key === 'followers') {
      const f = person.followers;
      if (typeof f === 'string' && f.trim()) return f;
      if (typeof f === 'number' && Number.isFinite(f)) return f;
      return null;
    }
    const value = person[key];
    if (value == null) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  const mod = {
    getPersonColumns, getCsvValue, getDisplayValue, escapeCSV, downloadFile
  };

  if (typeof module!=='undefined' && module.exports) {
    module.exports = mod;
  }
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportShared = mod;
})();


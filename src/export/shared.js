(function(){
  'use strict';

  // --- Columns --------------------------------------------------------------
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

  // --- Value accessors ------------------------------------------------------
  function joinNonEmptyLines(parts) {
    return parts
      .map(function (part) {
        var text = part == null ? '' : String(part).trim();
        return text ? text : null;
      })
      .filter(Boolean)
      .join('\n');
  }

  function makeExperienceString(person, idx) {
    var prefix = 'exp' + idx + '_';
    return joinNonEmptyLines([
      person[prefix + 'company'],
      person[prefix + 'duration'],
      person[prefix + 'position'],
      person[prefix + 'position_duration'],
      person[prefix + 'description']
    ]);
  }

  function makeEducationString(person, idx) {
    var prefix = 'edu' + idx + '_';
    return joinNonEmptyLines([
      person[prefix + 'institution'],
      person[prefix + 'degree'],
      person[prefix + 'grade'],
      person[prefix + 'description']
    ]);
  }

  function getCsvValue(person, key) {
    if (!person) return '';
    if (/^exp[1-3]$/.test(key)) {
      var expIndex = Number(key.replace('exp', ''));
      return makeExperienceString(person, expIndex);
    }
    if (/^edu[1-3]$/.test(key)) {
      var eduIndex = Number(key.replace('edu', ''));
      return makeEducationString(person, eduIndex);
    }
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
    if (/^exp[1-3]$/.test(key)) {
      var expIndex = Number(key.replace('exp', ''));
      var expValue = makeExperienceString(person, expIndex);
      return expValue ? expValue : null;
    }
    if (/^edu[1-3]$/.test(key)) {
      var eduIndex = Number(key.replace('edu', ''));
      var eduValue = makeEducationString(person, eduIndex);
      return eduValue ? eduValue : null;
    }
    if (key === 'followers') {
      const f = person.followers;
      if (typeof f === 'string' && f.trim()) return f;
      if (typeof f === 'number' && Number.isFinite(f)) return f;
      return null;
    }
    // Back-compat: if schema key is 'languages' but data still has 'programmingLanguages'
    if (key === 'languages' && (person.languages == null || String(person.languages).trim() === '')) {
      const legacy = person.programmingLanguages;
      if (legacy != null && String(legacy).trim()) return legacy;
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

  // Make HTML-escape available to all exporters/UIs
  function escapeHTML(value){
    if (value === null || value === undefined) return '';
    // If no DOM (Node), fallback to naive escape
    if (typeof document === 'undefined') {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const div = document.createElement('div'); div.textContent = String(value);
    return div.innerHTML;
  }
  // Back-compat alias: older bundles call `escapeHtml` (lowercase "H").
  function escapeHtml(value){
    return escapeHTML(value);
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
    getPersonColumns, getCsvValue, getDisplayValue, escapeCSV, escapeHTML, escapeHtml, downloadFile
  };

  if (typeof module!=='undefined' && module.exports) {
    module.exports = mod;
  }
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.exportShared = mod;
  // Expose a global alias for legacy callers that reference escapeHtml()
  const g = (typeof globalThis!=='undefined') ? globalThis : (typeof window!=='undefined' ? window : {});
  if (g && typeof g.escapeHtml !== 'function' && typeof mod.escapeHTML === 'function') {
    g.escapeHtml = mod.escapeHTML;
  }
})();

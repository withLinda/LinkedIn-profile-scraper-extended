/**
 * Utilities module re-exporting exporters and shared helpers
 */
(function() {
    'use strict';

    function getResolver(){
        if (typeof module!=='undefined' && module.exports) {
            try { return require('./shared/modResolver'); } catch(_) { return null; }
        }
        const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
        return (r.LinkedInScraperModules||{}).modResolver || null;
    }
    // Export helpers come from export/shared.js + export/{csv,html}.js
    function getExportShared() {
        const res = getResolver();
        if (res && res.resolve) return res.resolve('./export/shared','exportShared');
        try { if (typeof module !== 'undefined' && module.exports) return require('./export/shared'); } catch (e) { /* ignore */ }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportShared || {};
    }

    // Re-export shared helpers and exporters to keep back-compat
    const shared = getExportShared();
    const downloadFile = typeof shared.downloadFile === 'function' ? shared.downloadFile : function(){};
    function getExportCsv() {
        const res = getResolver();
        if (res && res.resolve) return res.resolve('./export/csv','exportCsv');
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./export/csv'); } catch (e) { return {}; }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportCsv || {};
    }
    function getExportHtml() {
        const res = getResolver();
        if (res && res.resolve) return res.resolve('./export/html','exportHtml');
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./export/html'); } catch (e) { return {}; }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportHtml || {};
    }

    const utilsModule = {
        getPersonColumns: shared.getPersonColumns,
        downloadFile,
        // Surface escapers for callers that used to import from utils
        escapeHTML: shared.escapeHTML,
        // Back-compat alias (older code used utils.escapeHtml)
        escapeHtml: shared.escapeHTML,
        // Back-compat re-exports so UI keeps working
        exportToCsv: getExportCsv().exportToCsv || null,
        exportToHtml: getExportHtml().exportToHtml || null
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = utilsModule;
    }

    const utilsRoot = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : {});

    utilsRoot.LinkedInScraperModules = utilsRoot.LinkedInScraperModules || {};
    utilsRoot.LinkedInScraperModules.utils = utilsModule;

    if (typeof window !== 'undefined') {
        const csv = getExportCsv().exportToCsv;
        const html = getExportHtml().exportToHtml;
        if (typeof csv === 'function') window.exportToCsv = csv;
        if (typeof html === 'function') window.exportToHtml = html;
        window.downloadFile = downloadFile;
        // Provide a global alias for legacy bundles that call escapeHtml() directly.
        if (!window.escapeHtml && typeof shared.escapeHTML === 'function') {
            window.escapeHtml = shared.escapeHTML;
        }
    }

})();

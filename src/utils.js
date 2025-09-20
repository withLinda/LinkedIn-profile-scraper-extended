/**
 * Utilities module re-exporting exporters and shared helpers
 */
(function() {
    'use strict';

    function getThemeModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./theme'); } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const modules = root.LinkedInScraperModules || {};
        return modules.theme || {};
    }

    // Export helpers come from export/shared.js + export/{csv,html}.js
    function getExportShared() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./export/shared'); } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportShared || {};
    }

    function getPersonColumns() {
        try {
            if (typeof module !== 'undefined' && module.exports) {
                const schema = require('./schema/columns');
                if (schema && Array.isArray(schema.PERSON_COLUMNS)) return schema.PERSON_COLUMNS;
            }
        } catch (error) { /* ignore */ }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const modules = root.LinkedInScraperModules || {};
        const schema = modules.schema || {};
        return Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : [];
    }

    // Re-export shared helpers and exporters to keep back-compat
    const shared = getExportShared();
    const downloadFile = typeof shared.downloadFile === 'function' ? shared.downloadFile : function(){};
    function getExportCsv() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./export/csv'); } catch (e) { return {}; }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportCsv || {};
    }
    function getExportHtml() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./export/html'); } catch (e) { return {}; }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportHtml || {};
    }

    const utilsModule = {
        getPersonColumns,
        downloadFile,
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
    }

})();

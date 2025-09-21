(function() {
    'use strict';

    function getTokensModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                return require('./tokens');
            } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.themeTokens || {};
    }

    const { DEFAULT_THEME = {} } = getTokensModule();

    function clone(obj) {
        return Object.assign({}, obj);
    }

    function mergeTokens(base, patch) {
        return Object.assign({}, base || {}, patch || {});
    }

    function getActiveTokens() {
        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
        const override = (root.LinkedInScraperTheme && root.LinkedInScraperTheme.tokens) || null;
        return mergeTokens(DEFAULT_THEME, override);
    }

    // Build CSS variable declarations for a given scope.
    function getCssVariablesCss(scope, tokens) {
        const t = tokens || getActiveTokens();
        const body = Object.entries(t).map(([k, v]) => `${k}: ${v};`).join(' ');
        return `${scope}{ ${body} }`;
    }

    // Apply theme variables to the in-page UI container.
    function applyTheme(container) {
        const doc = (typeof document !== 'undefined') ? document : null;
        if (!doc) return;
        // Expose tokens both on :root and on the UI container.
        // This ensures pseudo-elements like ::-webkit-scrollbar can resolve vars,
        // matching the exported HTML behavior.
        const scope = ':root, #linkedin-scraper-ui';
        let styleEl = doc.getElementById('linkedin-scraper-theme');
        if (!styleEl) {
            styleEl = doc.createElement('style');
            styleEl.id = 'linkedin-scraper-theme';
            doc.head.appendChild(styleEl);
        }
        styleEl.textContent = getCssVariablesCss(scope, getActiveTokens());
    }

    // Replace current theme tokens at runtime.
    function setTheme(partialTokens) {
        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
        root.LinkedInScraperTheme = root.LinkedInScraperTheme || {};
        root.LinkedInScraperTheme.tokens = mergeTokens(DEFAULT_THEME, partialTokens);
        applyTheme(null);
    }

    const themeModule = {
        getActiveTokens,
        getCssVariablesCss,
        applyTheme,
        setTheme,
        DEFAULT_THEME: clone(DEFAULT_THEME)
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = themeModule;
    }

    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : {});
    root.LinkedInScraperModules = root.LinkedInScraperModules || {};
    root.LinkedInScraperModules.theme = themeModule;
})();

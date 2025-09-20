(function() {
    'use strict';

    // Default theme tokens (Everforest Light Hard, previously hardcoded)
    const DEFAULT_THEME = {
        '--ef-bg0': '#FFFBEF',
        '--ef-bg1': '#F8F5E4',
        '--ef-bg2': '#F2EFDF',
        '--ef-bg3': '#EDEADA',
        '--ef-bg4': '#E8E5D5',
        '--ef-visual': '#F0F2D4',
        '--ef-fg': '#5C6A72',
        '--ef-grey1': '#939F91',
        '--ef-blue': '#3A94C5',
        '--ef-aqua': '#35A77C',
        '--ef-green': '#8DA101',
        '--ef-red': '#F85552',
        '--ef-yellow': '#DFA000',
        '--ef-statusline3': '#E66868'
    };

    const themeTokensModule = {
        DEFAULT_THEME
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = themeTokensModule;
    }

    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : {});
    root.LinkedInScraperModules = root.LinkedInScraperModules || {};
    root.LinkedInScraperModules.themeTokens = themeTokensModule;
})();


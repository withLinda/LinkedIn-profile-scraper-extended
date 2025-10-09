(function() {
    'use strict';

    // Default theme tokens (Everforest Dark Hard - Beautiful Edition)
    const DEFAULT_THEME = {
        // Base background colors
        '--ef-bg-dim': '#1E2326',
        '--ef-bg0': '#272E33',
        '--ef-bg1': '#2E383C',
        '--ef-bg2': '#374145',
        '--ef-bg3': '#414B50',
        '--ef-bg4': '#495156',
        '--ef-bg5': '#4F5B58',

        // Accent backgrounds
        '--ef-bg-visual': '#4C3743',
        '--ef-bg-red': '#493B40',
        '--ef-bg-yellow': '#45443c',
        '--ef-bg-green': '#3C4841',
        '--ef-bg-blue': '#384B55',
        '--ef-bg-purple': '#463F48',

        // Foreground colors
        '--ef-fg': '#D3C6AA',
        '--ef-red': '#E67E80',
        '--ef-orange': '#E69875',
        '--ef-yellow': '#DBBC7F',
        '--ef-green': '#A7C080',
        '--ef-aqua': '#83C092',
        '--ef-blue': '#7FBBB3',
        '--ef-purple': '#D699B6',

        // Grey scale
        '--ef-grey0': '#7A8478',
        '--ef-grey1': '#859289',
        '--ef-grey2': '#9DA9A0',

        // Status line
        '--ef-statusline1': '#A7C080',
        '--ef-statusline2': '#D3C6AA',
        '--ef-statusline3': '#E67E80',

        // Scrollbar
        '--ef-scrollbar-thumb': 'var(--ef-orange)',
        '--ef-scrollbar-track': 'var(--ef-bg1)',

        // Gradients for beautiful effects
        '--ef-gradient-primary': 'linear-gradient(135deg, #7FBBB3 0%, #83C092 50%, #A7C080 100%)',
        '--ef-gradient-accent': 'linear-gradient(135deg, #D699B6 0%, #E69875 50%, #DBBC7F 100%)',
        '--ef-gradient-warm': 'linear-gradient(135deg, #E67E80 0%, #E69875 100%)',
        '--ef-gradient-cool': 'linear-gradient(135deg, #7FBBB3 0%, #83C092 100%)',
        '--ef-gradient-bg': 'linear-gradient(135deg, #1E2326 0%, #2E383C 50%, #374145 100%)',

        // Glassmorphism effects
        '--ef-glass-bg': 'rgba(46, 56, 60, 0.75)',
        '--ef-glass-border': 'rgba(125, 187, 179, 0.2)',
        '--ef-glass-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        '--ef-glass-blur': 'blur(12px)',

        // Panel backgrounds with translucency
        '--ef-panel-bg': 'rgba(39, 46, 51, 0.95)',
        '--ef-panel-glass': 'rgba(46, 56, 60, 0.8)',

        // UI hover backgrounds
        '--ef-hover-row-bg': 'rgba(79, 91, 88, 0.35)',

        // Glow effects
        '--ef-glow-green': '0 0 20px rgba(167, 192, 128, 0.3)',
        '--ef-glow-blue': '0 0 20px rgba(127, 187, 179, 0.3)',
        '--ef-glow-purple': '0 0 20px rgba(214, 153, 182, 0.3)',
        '--ef-glow-orange': '0 0 20px rgba(230, 152, 117, 0.3)',

        // === Font size tokens ===
        // Exported HTML
        '--ef-font-export-h1': '28px',
        '--ef-font-export-th': '13px',
        // In-page UI
        '--ef-font-ui-title': '20px',
        '--ef-font-ui-th': '13px'
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

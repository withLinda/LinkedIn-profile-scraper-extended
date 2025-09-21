(function() {
    'use strict';

    // Base UI CSS without theme tokens. Colors/etc. come from CSS variables.
    const UI_BASE_CSS = `
        #linkedin-scraper-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 720px;
            max-height: 80vh;
            background: var(--ef-panel-bg, var(--ef-bg0));
            border: 1px solid var(--ef-bg4);
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.45);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            color: var(--ef-fg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        #linkedin-scraper-ui * {
            box-sizing: border-box;
            font-family: inherit;
        }

        .scraper-header {
            padding: 16px;
            border-bottom: 1px solid var(--ef-bg3);
            background: var(--ef-bg1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .scraper-title {
            font-size: var(--ef-font-ui-title, 18px);
            font-weight: 600;
            color: var(--ef-blue);
        }

        .scraper-close {
            background: transparent;
            border: none;
            color: var(--ef-grey1);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
        }
        .scraper-close:hover { color: var(--ef-statusline3); }

        .scraper-progress {
            padding: 16px;
            border-bottom: 1px solid var(--ef-bg3);
            background: var(--ef-bg1);
        }

        .progress-bar-container {
            background: var(--ef-bg2);
            border-radius: 4px;
            height: 8px;
            margin-bottom: 8px;
            overflow: hidden;
            border: 1px solid var(--ef-bg3);
        }
        .progress-bar {
            background: var(--ef-green);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text {
            font-size: 14px;
            color: var(--ef-grey1);
            text-align: center;
        }

        .results-counter {
            padding: 8px 16px;
            background: var(--ef-bg1);
            font-size: 14px;
            font-weight: 500;
            border-bottom: 1px solid var(--ef-bg3);
            color: var(--ef-fg);
        }

        .results-table-container {
            max-height: 400px;
            /* scroll both axes so the horizontal bar belongs to this element */
            overflow: auto;
            flex: 1;
            background: var(--ef-bg0);
        }

        .results-table {
            width: 100%;
            font-size: 13px;
            border-spacing: 0;
            color: var(--ef-fg);
        }
        .results-table th {
            background: var(--ef-bg2);
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 1;
            color: var(--ef-statusline3);
            border-bottom: 1px solid var(--ef-bg4);
            font-size: var(--ef-font-ui-th, 13px);
        }
        .results-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--ef-bg3);
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--ef-fg);
        }
        .results-table td.numeric { text-align: right; font-variant-numeric: tabular-nums; }
        .results-table td.empty { color: var(--ef-grey1); font-style: italic; }
        .results-table a.profile-link { color: var(--ef-blue); text-decoration: none; }
        .results-table a.profile-link:hover { color: var(--ef-aqua); text-decoration: underline; }
        .results-table tr:hover { background: var(--ef-visual); }

        .export-section {
            padding: 16px;
            border-top: 1px solid var(--ef-bg3);
            background: var(--ef-bg1);
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .export-button {
            background: var(--ef-green);
            color: var(--ef-bg0);
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.2s ease, transform 0.2s ease;
        }
        .export-button:hover:not(:disabled) {
            background: var(--ef-aqua);
            transform: translateY(-1px);
        }
        .export-button:disabled {
            background: var(--ef-bg3);
            color: var(--ef-grey1);
            cursor: not-allowed;
            opacity: 0.7;
            transform: none;
        }

        .error-message {
            position: absolute;
            bottom: 70px;
            left: 16px;
            right: 16px;
            background: var(--ef-statusline3);
            color: var(--ef-bg0);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            display: none;
            animation: slideUp 0.3s ease;
            border: 1px solid var(--ef-bg4);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Scrollbars (Firefox + WebKit), deduplicated and tokenized */
        .results-table-container,
        .results-table {
            scrollbar-color:
              var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26))
              var(--ef-scrollbar-track, var(--ef-bg1, #F8F5E4));
        }
        .results-table-container::-webkit-scrollbar,
        .results-table::-webkit-scrollbar { width: 8px; height: 8px; }
        .results-table-container::-webkit-scrollbar-track,
        .results-table::-webkit-scrollbar-track {
            background: var(--ef-scrollbar-track, var(--ef-bg1, #F8F5E4)) !important;
        }
        .results-table-container::-webkit-scrollbar-thumb,
        .results-table::-webkit-scrollbar-thumb {
            background: var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26)) !important;
            border-radius: 4px;
        }
        .results-table-container::-webkit-scrollbar-thumb:hover,
        .results-table-container::-webkit-scrollbar-thumb:active,
        .results-table::-webkit-scrollbar-thumb:hover,
        .results-table::-webkit-scrollbar-thumb:active {
            background: var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26)) !important;
        }
    `;

    function injectUiBaseStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('linkedin-scraper-ui-base')) return;
        const style = document.createElement('style');
        style.id = 'linkedin-scraper-ui-base';
        style.textContent = UI_BASE_CSS;
        document.head.appendChild(style);
    }

    const uiStylesModule = {
        UI_BASE_CSS,
        injectUiBaseStyles
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = uiStylesModule;
    }

    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : {});
    root.LinkedInScraperModules = root.LinkedInScraperModules || {};
    root.LinkedInScraperModules.uiStyles = uiStylesModule;
})();

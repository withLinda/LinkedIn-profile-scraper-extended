(function() {
    'use strict';

    // Base UI CSS with glassmorphism and beautiful effects
    const UI_BASE_CSS = `
        #linkedin-scraper-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 720px;
            max-height: 80vh;
            background: var(--ef-panel-bg);
            backdrop-filter: var(--ef-glass-blur);
            -webkit-backdrop-filter: var(--ef-glass-blur);
            border: 1px solid var(--ef-glass-border);
            border-radius: 16px;
            box-shadow: var(--ef-glass-shadow), var(--ef-glow-blue);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            color: var(--ef-fg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%) scale(0.8);
                opacity: 0;
            }
            to {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
        }

        #linkedin-scraper-ui * {
            box-sizing: border-box;
            font-family: inherit;
        }

        .scraper-header {
            padding: 20px;
            border-bottom: 1px solid var(--ef-glass-border);
            background: linear-gradient(180deg, var(--ef-bg2), var(--ef-bg1));
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .scraper-header::before { display: none; }

        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        .scraper-title {
            font-size: var(--ef-font-ui-title, 20px);
            font-weight: 700;
            color: var(--ef-fg);
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
        }

        .scraper-close {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--ef-bg0);
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            z-index: 1;
        }
        .scraper-close:hover {
            background: var(--ef-red);
            color: var(--ef-bg0);
            box-shadow: var(--ef-glow-orange);
            transform: rotate(90deg) scale(1.1);
        }

        .scraper-progress {
            padding: 20px;
            border-bottom: 1px solid var(--ef-glass-border);
            background: var(--ef-bg1);
            backdrop-filter: blur(8px);
        }

        .progress-bar-container {
            background: rgba(30, 35, 38, 0.5);
            border-radius: 12px;
            height: 12px;
            margin-bottom: 12px;
            overflow: hidden;
            border: 1px solid var(--ef-glass-border);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            position: relative;
        }
        .progress-bar {
            background: linear-gradient(90deg, var(--ef-green), var(--ef-aqua));
            height: 100%;
            width: 0%;
            transition: width 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
            box-shadow: var(--ef-glow-green);
            position: relative;
            overflow: hidden;
        }
        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: progressShine 2s infinite;
        }
        @keyframes progressShine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .progress-text {
            font-size: 14px;
            color: var(--ef-aqua);
            text-align: center;
            font-weight: 500;
        }

        .results-counter {
            padding: 12px 20px;
            background: var(--ef-bg1);
            font-size: 14px;
            font-weight: 600;
            border-bottom: 1px solid var(--ef-glass-border);
            color: var(--ef-yellow);
            backdrop-filter: blur(4px);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .results-table-container {
            max-height: 400px;
            overflow: auto;
            flex: 1;
            background: rgba(30, 35, 38, 0.3);
            backdrop-filter: blur(4px);
        }

        .results-table {
            width: 100%;
            font-size: 13px;
            border-spacing: 0;
            color: var(--ef-fg);
        }
        .results-table th {
            background: linear-gradient(135deg, rgba(55, 65, 69, 0.9), rgba(65, 75, 80, 0.9));
            padding: 12px 16px;
            text-align: left;
            font-weight: 700;
            position: sticky;
            top: 0;
            z-index: 1;
            color: var(--ef-yellow);
            border-bottom: 2px solid var(--ef-glass-border);
            font-size: var(--ef-font-ui-th, 13px);
            text-transform: none !important;
            letter-spacing: 0.2px;
            backdrop-filter: blur(8px);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .results-table th:first-child { border-top-left-radius: 12px; }
        .results-table th:last-child { border-top-right-radius: 12px; }
        .results-table td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(65, 75, 80, 0.3);
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--ef-fg);
            transition: all 0.2s ease;
        }
        .results-table td.numeric { text-align: right; font-variant-numeric: tabular-nums; }
        .results-table td.empty { color: var(--ef-grey1); font-style: italic; }
        .results-table a.profile-link {
            color: var(--ef-blue);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .results-table a.profile-link:hover {
            color: var(--ef-aqua);
            text-decoration: none;
            text-shadow: var(--ef-glow-blue);
        }
        .results-table tr:hover {
            background: var(--ef-hover-row-bg);
            transform: scale(1.01);
        }
        .results-table tbody tr {
            transition: all 0.2s ease;
        }

        .export-section {
            padding: 20px;
            border-top: 1px solid var(--ef-glass-border);
            background: var(--ef-bg1);
            backdrop-filter: blur(8px);
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .export-button {
            background: var(--ef-bg2);
            color: var(--ef-fg);
            padding: 12px 24px;
            border-radius: 10px;
            border: 1px solid var(--ef-glass-border);
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
            box-shadow: none;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .export-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        .export-button:hover::before {
            width: 300px;
            height: 300px;
        }
        .export-button:hover:not(:disabled) {
            background: linear-gradient(180deg, var(--ef-bg2), var(--ef-bg1));
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .export-button:active:not(:disabled) {
            transform: translateY(0) scale(0.98);
        }
        .export-button:disabled {
            background: rgba(65, 75, 80, 0.3);
            color: var(--ef-grey1);
            cursor: not-allowed;
            opacity: 0.5;
            transform: none;
            box-shadow: none;
        }

        .error-message {
            position: absolute;
            bottom: 85px;
            left: 20px;
            right: 20px;
            background: var(--ef-gradient-warm);
            color: var(--ef-bg0);
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            display: none;
            animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: var(--ef-glow-orange), 0 8px 24px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        @keyframes slideUpBounce {
            from {
                transform: translateY(30px) scale(0.9);
                opacity: 0;
            }
            to {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Beautiful scrollbars with gradients */
        .results-table-container,
        .results-table {
            scrollbar-color: var(--ef-aqua) rgba(46, 56, 60, 0.3);
        }
        .results-table-container::-webkit-scrollbar,
        .results-table::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }
        .results-table-container::-webkit-scrollbar-track,
        .results-table::-webkit-scrollbar-track {
            background: rgba(46, 56, 60, 0.3) !important;
            border-radius: 6px;
        }
        .results-table-container::-webkit-scrollbar-thumb,
        .results-table::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, var(--ef-blue), var(--ef-aqua)) !important;
            border-radius: 6px;
            border: 2px solid rgba(46, 56, 60, 0.3);
            box-shadow: var(--ef-glow-blue);
        }
        .results-table-container::-webkit-scrollbar-thumb:hover,
        .results-table::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, var(--ef-aqua), var(--ef-green)) !important;
            box-shadow: var(--ef-glow-green);
        }
        .results-table-container::-webkit-scrollbar-thumb:active,
        .results-table::-webkit-scrollbar-thumb:active {
            background: var(--ef-gradient-primary) !important;
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

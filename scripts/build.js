const fs = require('fs');
const path = require('path');

// NOTE: keep concatenation order: tokens -> theme -> shared/modResolver -> libs(auth,url,buildUrl,profile) -> core -> exporters/shared -> exporters -> utils -> styles -> ui

function readFile(filePath) {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

function readModule(filePath) {
    return readFile(filePath).trim();
}

function writeFile(filePath, content) {
    const fullPath = path.join(__dirname, '..', filePath);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
}

function injectModule(code, indent = '    ') {
    const trimmed = code.trim();
    const lines = trimmed.split('\n').map(line => `${indent}${line}`);
    return `\n${indent};\n${lines.join('\n')}\n`;
}

// (minifier removed; keep build readable and smaller)

function buildConsoleVersion() {
    console.log('Building console version...');
    
    const schemaColumns = readModule('src/schema/columns.js');
    const themeTokens = readModule('src/theme/tokens.js');
    const themeEngine = readModule('src/theme/index.js');
    const modResolver = readModule('src/shared/modResolver.js');
    const urlLib = readModule('src/lib/url.js');
    const authLib = readModule('src/lib/auth.js');
    const buildUrlLib = readModule('src/lib/buildUrl.js');
    const profileLib = readModule('src/lib/profile.js');
    const extractor = readModule('src/extractors/linkedin.js');
    const core = readModule('src/core.js');
    const exportShared = readModule('src/export/shared.js');
    const exportHtmlSticky = readModule('src/export/htmlSticky.js'); // NEW
    const exportHtmlStyles = readModule('src/export/htmlStyles.js'); // NEW
    const exportCsv = readModule('src/export/csv.js');
    const exportHtml = readModule('src/export/html.js');
    const utils = readModule('src/utils.js');
    const uiStyles = readModule('src/ui/styles.js');
    const ui = readModule('src/ui.js');
    
    const consoleVersion = `/**
 * LinkedIn Profile Scraper - Console Version
 * 
 * USAGE:
 * 1. Navigate to LinkedIn and perform a people search
 * 2. Open browser console (F12 → Console)
 * 3. Paste this entire script
 * 4. Press Enter
 * 5. Enter number of profiles to scrape when prompted
 * 6. Wait for scraping to complete
 * 7. Click Export CSV or Export HTML buttons
 * 
 * REQUIREMENTS:
 * - Must be on linkedin.com/search/results/people page
 * - Must be logged in to LinkedIn
 * 
 * FEATURES:
 * - Scrapes profile data from LinkedIn search results
 * - Handles rate limiting automatically
 * - Exports to CSV or HTML format
 * - Shows real-time progress
 */

(function() {
    'use strict';
    
    // Check if already running
    if (window.__linkedInScraperRunning__) {
        alert('Scraper already running!');
        return;
    }
    window.__linkedInScraperRunning__ = true;
    
    // Verify we're on LinkedIn search
    if (!/\\/search\\/results\\/people/.test(location.pathname)) {
        alert('Please navigate to LinkedIn People search results first\\n\\nGo to: linkedin.com → Search for people → Then run this script');
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    // Schema definition${injectModule(schemaColumns)}

    // Theme tokens${injectModule(themeTokens)}

    // Theme engine${injectModule(themeEngine)}

    // URL helpers${injectModule(urlLib)}

    // Shared resolver${injectModule(modResolver)}

    // Auth${injectModule(authLib)}

    // Build URL${injectModule(buildUrlLib)}
    // Profile lib${injectModule(profileLib)}

    // LinkedIn extractors${injectModule(extractor)}

    // Core functionality${injectModule(core)}

    // Export shared${injectModule(exportShared)}
    // Export HTML Sticky${injectModule(exportHtmlSticky)}
    // Export HTML Styles${injectModule(exportHtmlStyles)}
    // Export CSV${injectModule(exportCsv)}
    // Export HTML${injectModule(exportHtml)}

    // Export utilities${injectModule(utils)}

    // UI base styles (token-agnostic)${injectModule(uiStyles)}

    // UI components${injectModule(ui)}

    // Initialize and run
    const targetCount = prompt('How many profiles to scrape? (Default: 300)', '300');
    if (!targetCount) {
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    const scraper = new LinkedInScraper(parseInt(targetCount) || 300);
    scraper.run().then(people => {
        console.log(\`✅ Scraping complete! Found \${people.length} unique profiles.\`);
        console.log('📊 Use the Export buttons in the UI to save your data.');
    }).catch(error => {
        console.error('❌ Scraper error:', error);
        alert('Scraper encountered an error. Check console for details.');
    }).finally(() => {
        window.__linkedInScraperRunning__ = false;
    });
    
})();`;
    
    writeFile('build/console.js', consoleVersion);
}

function buildTampermonkeyVersion() {
    console.log('Building Tampermonkey version...');
    
    // Read package.json to get version
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const version = pkg.version;
    
    const schemaColumns = readModule('src/schema/columns.js');
    const themeTokens = readModule('src/theme/tokens.js');
    const themeEngine = readModule('src/theme/index.js');
    const modResolver = readModule('src/shared/modResolver.js');
    const urlLib = readModule('src/lib/url.js');
    const authLib = readModule('src/lib/auth.js');
    const buildUrlLib = readModule('src/lib/buildUrl.js');
    const profileLib = readModule('src/lib/profile.js');
    const extractor = readModule('src/extractors/linkedin.js');
    const core = readModule('src/core.js');
    const exportShared = readModule('src/export/shared.js');
    const exportHtmlSticky = readModule('src/export/htmlSticky.js'); // NEW
    const exportHtmlStyles = readModule('src/export/htmlStyles.js'); // NEW
    const exportCsv = readModule('src/export/csv.js');
    const exportHtml = readModule('src/export/html.js');
    const utils = readModule('src/utils.js');
    const uiStyles = readModule('src/ui/styles.js');
    const ui = readModule('src/ui.js');
    
    const tampermonkeyScript = `// ==UserScript==
// @name         LinkedIn Profile Scraper
// @namespace    https://github.com/withLinda/LinkedIn-profile-scraper-lite
// @version      ${version}
// @description  Scrape LinkedIn profile data; modular exporters & buildUrl refactor
// @author       LinkedIn Scraper
// @match        https://*.linkedin.com/search/results/people*
// @match        https://*.linkedin.com/search/results/all*
// @match        https://*.linkedin.com/m/search/results/people*
// @match        https://*.linkedin.com/m/search/results/all*
// @match        https://linkedin.com/search/results/people*
// @match        https://linkedin.com/search/results/all*
// @match        https://linkedin.com/m/search/results/people*
// @match        https://linkedin.com/m/search/results/all*
// @run-at       document-idle
// @noframes
// @icon         https://www.linkedin.com/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/linkedin-scraper.user.js
// @updateURL    https://raw.githubusercontent.com/withLinda/LinkedIn-profile-scraper-lite/main/build/linkedin-scraper.user.js
// @homepage     https://github.com/withLinda/LinkedIn-profile-scraper-lite
// @supportURL   https://github.com/withLinda/LinkedIn-profile-scraper-lite/issues
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    const DBG = !!(typeof localStorage!=='undefined' && localStorage.getItem('li_scraper_debug'));
    
    // Schema definition${injectModule(schemaColumns)}

    // Theme tokens${injectModule(themeTokens)}

    // Theme engine${injectModule(themeEngine)}

    // URL helpers${injectModule(urlLib)}

    // Shared resolver${injectModule(modResolver)}

    // Auth${injectModule(authLib)}

    // Build URL${injectModule(buildUrlLib)}
    // Profile lib${injectModule(profileLib)}

    // LinkedIn extractors${injectModule(extractor)}

    // Core functionality${injectModule(core)}

    // Export shared${injectModule(exportShared)}
    // Export HTML Sticky${injectModule(exportHtmlSticky)}
    // Export HTML Styles${injectModule(exportHtmlStyles)}
    // Export CSV${injectModule(exportCsv)}
    // Export HTML${injectModule(exportHtml)}

    // Export utilities${injectModule(utils)}

    // UI base styles (token-agnostic)${injectModule(uiStyles)}

    // UI components${injectModule(ui)}

    // Register menu command
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('🔍 Start LinkedIn Scraper', startScraper);
    }
    
    // Add button to LinkedIn UI
    function addScraperButton() {
        if (DBG) console.log('🔍 LinkedIn Scraper: addScraperButton called');
        if (document.getElementById('linkedin-scraper-button')) {
            if (DBG) console.log('🔍 LinkedIn Scraper: Button already exists, skipping');
            return;
        }
        
        const buttonHost = document.body;
        if (!buttonHost) {
            if (DBG) console.warn('LinkedIn Scraper: unable to locate page body to attach button.');
            return;
        }
        if (DBG) console.log('🔍 LinkedIn Scraper: Creating button...');

        const button = document.createElement('button');
        button.id = 'linkedin-scraper-button';
        button.textContent = '🔍 Scrape Profiles';
        button.style.cssText = \`
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 9998;
            background: var(--ef-green, #8DA101);
            color: var(--ef-bg0, #FFFBEF);
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s;
        \`;

        button.onmouseover = () => {
            button.style.background = '#35A77C';
            button.style.transform = 'scale(1.05)';
        };

        button.onmouseout = () => {
            button.style.background = '#8DA101';
            button.style.transform = 'scale(1)';
        };
        
        button.onclick = startScraper;
        buttonHost.appendChild(button);
        if (DBG) console.log('🔍 LinkedIn Scraper: Button added successfully!');
    }
    
    function startScraper() {
        if (window.__linkedInScraperRunning__) {
            alert('Scraper is already running!');
            return;
        }
        
        if (!location.pathname.includes('/search/results/people')) {
            if (confirm('You need to be on a LinkedIn people search page.\\n\\nNavigate there now?')) {
                window.location.href = 'https://www.linkedin.com/search/results/people/';
            }
            return;
        }
        
        window.__linkedInScraperRunning__ = true;
        
        const targetCount = prompt('How many profiles would you like to scrape?\\n\\n(Enter a number, e.g., 300)', '300');
        
        if (!targetCount || isNaN(targetCount)) {
            window.__linkedInScraperRunning__ = false;
            return;
        }
        
        const scraper = new LinkedInScraper(parseInt(targetCount));
        
        scraper.run().then(people => {
            if (DBG) console.log(\`✅ Successfully scraped \${people.length} profiles!\`);
            
            // Show success notification
            const notification = document.createElement('div');
            notification.textContent = \`✅ Scraped \${people.length} profiles! Use Export buttons to save.\`;
            notification.style.cssText = \`
                position: fixed;
                top: 100px;
                right: 20px;
                background: #8DA101;
                color: #FFFBEF;
                padding: 15px 20px;
                border-radius: 8px;
                font-weight: 600;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            \`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
            
        }).catch(error => {
            console.error('❌ Scraper error:', error);
            alert('Scraper encountered an error: ' + error.message + '\\n\\nCheck browser console for details.');
        }).finally(() => {
            window.__linkedInScraperRunning__ = false;
        });
    }
    
    // ---------- Robust boot: people-only, SPA-aware, idempotent ----------
    if (DBG) console.log('🔍 LinkedIn Scraper: Script starting...');
    
    // 1) Keyframes with GM_addStyle guard and fallback
    (function addKeyframes(){
      const css='@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
      if (typeof GM_addStyle==='function') {
        GM_addStyle(css);
      }
      else {
        const s=document.createElement('style');
        s.textContent=css;
        (document.head||document.documentElement).appendChild(s);
      }
    })();

    const onPeoplePage = () => location.pathname.includes('/search/results/people');

    function ensureButtonVisibility(){
      if (DBG) console.log('🔍 LinkedIn Scraper: Checking button visibility...');
      if (DBG) console.log('🔍 LinkedIn Scraper: Current path:', location.pathname);
      if (DBG) console.log('🔍 LinkedIn Scraper: Is people page?', onPeoplePage());
      
      const btn = document.getElementById('linkedin-scraper-button');
      if (onPeoplePage()) {
        if (!btn) {
          if (DBG) console.log('🔍 LinkedIn Scraper: Adding button...');
          addScraperButton();
        } else {
          if (DBG) console.log('🔍 LinkedIn Scraper: Button already exists');
        }
      }
      else if (btn) {
        if (DBG) console.log('🔍 LinkedIn Scraper: Not on people page, removing button');
        btn.remove();
      }
    }

    // 2) Ready + safety retry
    if (document.readyState==='loading') {
      document.addEventListener('DOMContentLoaded', () => ensureButtonVisibility(), { once:true });
    } else {
      ensureButtonVisibility();
    }
    setTimeout(ensureButtonVisibility, 1000);

    // 3) SPA route changes via History API hooks
    (function hookHistory(){
      const _p=history.pushState, _r=history.replaceState;
      const fire=()=>window.dispatchEvent(new Event('locationchange'));
      history.pushState=function(...a){const o=_p.apply(this,a);fire();return o;};
      history.replaceState=function(...a){const o=_r.apply(this,a);fire();return o;};
      window.addEventListener('popstate', fire);
    })();
    window.addEventListener('locationchange', ensureButtonVisibility);

    // 4) DOM re-renders observer
    function startObserver(){
      const root = document.body || document.documentElement;
      if (!root) return;
      new MutationObserver(() => ensureButtonVisibility()).observe(root, { childList:true, subtree:true });
    }

    if (document.body) {
      startObserver();
    } else {
      new MutationObserver((_,obs)=>{
        if (document.body){
          startObserver();
          obs.disconnect();
        }
      }).observe(document.documentElement, { childList:true });
    }

    if (DBG) console.log('🔍 LinkedIn Scraper loaded! Click the "Scrape Profiles" button or use Tampermonkey menu.');

})();`;
    
    writeFile('build/linkedin-scraper.user.js', tampermonkeyScript);
    
    // Also copy to docs directory for GitHub Pages hosting
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'linkedin-scraper.user.js'), tampermonkeyScript, 'utf8');
    console.log('✅ Mirrored to: docs/linkedin-scraper.user.js');
}

function build() {
    console.log('🚀 Starting build process...\n');
    
    // Ensure build directory exists
    const buildDir = path.join(__dirname, '..', 'build');
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Build all versions
    buildConsoleVersion();
    buildTampermonkeyVersion();
    
    console.log('\n✅ Build complete! Files created:');
    console.log('   - build/console.js               : Copy & paste into browser console');
    console.log('   - build/linkedin-scraper.user.js : Install via Tampermonkey');
    console.log('   - docs/linkedin-scraper.user.js  : GitHub Pages mirror\n');
}

// Run build
build();

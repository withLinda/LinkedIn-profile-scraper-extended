const fs = require('fs');
const path = require('path');

function readFile(filePath) {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
}

function writeFile(filePath, content) {
    const fullPath = path.join(__dirname, '..', filePath);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
}

function minifyBasic(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}();,:])\s*/g, '$1')
        .trim();
}

function buildConsoleVersion() {
    console.log('Building console version...');
    
    const core = readFile('src/core.js');
    const ui = readFile('src/ui.js');
    const utils = readFile('src/utils.js');
    
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
    if (!window.location.href.includes('linkedin.com/search/results/people')) {
        alert('Please navigate to LinkedIn People search results first\\n\\nGo to: linkedin.com → Search for people → Then run this script');
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    // Core functionality
    ${core.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
    // UI components
    ${ui.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
    // Export utilities
    ${utils.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
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
    
    const core = readFile('src/core.js');
    const ui = readFile('src/ui.js');
    const utils = readFile('src/utils.js');
    
    const tampermonkeyScript = `// ==UserScript==
// @name         LinkedIn Profile Scraper
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Scrape LinkedIn profile data from search results
// @author       LinkedIn Scraper
// @match        https://www.linkedin.com/search/results/people/*
// @match        https://www.linkedin.com/search/results/all/*
// @icon         https://www.linkedin.com/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    
    // Core functionality
    ${core.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
    // UI components
    ${ui.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
    // Export utilities
    ${utils.replace(/\(function\(\) \{|\}\)\(\);?/g, '').trim()}
    
    // Register menu command
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('🔍 Start LinkedIn Scraper', startScraper);
    }
    
    // Add button to LinkedIn UI
    function addScraperButton() {
        if (document.getElementById('linkedin-scraper-button')) return;
        
        const searchBar = document.querySelector('.search-global-typeahead') || 
                         document.querySelector('.search-reusables__primary-filter');
        
        if (searchBar) {
            const button = document.createElement('button');
            button.id = 'linkedin-scraper-button';
            button.textContent = '🔍 Scrape Profiles';
            button.style.cssText = \`
                position: fixed;
                top: 70px;
                right: 20px;
                z-index: 9998;
                background: #0077b5;
                color: white;
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
                button.style.background = '#005885';
                button.style.transform = 'scale(1.05)';
            };
            
            button.onmouseout = () => {
                button.style.background = '#0077b5';
                button.style.transform = 'scale(1)';
            };
            
            button.onclick = startScraper;
            document.body.appendChild(button);
        }
    }
    
    function startScraper() {
        if (window.__linkedInScraperRunning__) {
            alert('Scraper is already running!');
            return;
        }
        
        if (!window.location.href.includes('linkedin.com/search/results/people')) {
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
            console.log(\`✅ Successfully scraped \${people.length} profiles!\`);
            
            // Show success notification
            const notification = document.createElement('div');
            notification.textContent = \`✅ Scraped \${people.length} profiles! Use Export buttons to save.\`;
            notification.style.cssText = \`
                position: fixed;
                top: 100px;
                right: 20px;
                background: #48bb78;
                color: white;
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
    
    // Add CSS animation
    GM_addStyle(\`
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    \`);
    
    // Initialize button when page loads
    window.addEventListener('load', () => {
        setTimeout(addScraperButton, 2000);
    });
    
    // Re-add button when navigating
    const observer = new MutationObserver(() => {
        if (window.location.href.includes('linkedin.com/search/results/people')) {
            addScraperButton();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🔍 LinkedIn Scraper loaded! Click the "Scrape Profiles" button or use Tampermonkey menu.');
    
})();`;
    
    writeFile('build/userscript.js', tampermonkeyScript);
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
    
    console.log('\n✅ Build complete! Files created in /build directory:');
    console.log('   - console.js    : Copy & paste into browser console');
    console.log('   - userscript.js : Install via Tampermonkey\n');
}

// Run build
build();
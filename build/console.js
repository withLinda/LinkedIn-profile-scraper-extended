/**
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
        alert('Please navigate to LinkedIn People search results first\n\nGo to: linkedin.com → Search for people → Then run this script');
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    // Core functionality
    'use strict';

    function getCsrfToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'JSESSIONID') {
                const cleanValue = value.replace(/"/g, '');
                return decodeURIComponent(cleanValue);
            }
        }
        return null;
    }

    function sanitizeProfileUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        
        if (!rawUrl.startsWith('https://www.linkedin.com/in/')) {
            return null;
        }
        
        const url = new URL(rawUrl);
        url.search = '';
        
        const pathMatch = url.pathname.match(/^\/in\/[^\/]+\/?$/);
        if (!pathMatch) return null;
        
        return url.href;
    }

    function parseFollowers(text) {
        if (!text || typeof text !== 'string') return null;
        
        const match = text.match(/(\d+(?:\.\d+)?)\s*([KMk]?)\s*followers?/i);
        if (!match) return null;
        
        let number = parseFloat(match[1]);
        const suffix = match[2].toUpperCase();
        
        if (suffix === 'K') {
            number = number * 1000;
        } else if (suffix === 'M') {
            number = number * 1000000;
        }
        
        return Math.round(number);
    }

    function parseSummary(summaryText) {
        if (!summaryText || typeof summaryText !== 'string') {
            return { current: [], past: [] };
        }
        
        const lines = summaryText.split('\n');
        const result = { current: [], past: [] };
        
        for (let line of lines) {
            if (line.startsWith('Current:')) {
                const companies = line.replace('Current:', '').trim();
                result.current = companies.split(',').map(c => c.trim()).filter(c => c);
            } else if (line.startsWith('Past:')) {
                const companies = line.replace('Past:', '').trim();
                result.past = companies.split(',').map(c => c.trim()).filter(c => c);
            }
        }
        
        return result;
    }

    function isNoiseEntry(name) {
        if (!name || typeof name !== 'string') return true;
        
        const noisePatterns = [
            /mutual connection/i,
            /LinkedIn Member/i,
            /View services/i,
            /Provides services/i,
            /^View\s/i,
            /^LinkedIn\s/i
        ];
        
        return noisePatterns.some(pattern => pattern.test(name));
    }

    function normalizePerson(rawData) {
        if (!rawData || typeof rawData !== 'object') return null;
        
        let name = rawData.title?.text || rawData.name || '';
        
        const followerMatch = name.match(/^(.*?)(?:\s*·\s*.*followers?)?$/);
        if (followerMatch) {
            name = followerMatch[1].trim();
        }
        
        if (isNoiseEntry(name)) return null;
        
        const profileUrl = sanitizeProfileUrl(
            rawData.navigationUrl || 
            rawData.profileUrl || 
            rawData.url
        );
        
        const headline = rawData.primarySubtitle?.text || 
                        rawData.headline || 
                        rawData.subtitle || 
                        '';
        
        const location = rawData.secondarySubtitle?.text || 
                        rawData.location || 
                        '';
        
        let followersText = '';
        if (rawData.insights && Array.isArray(rawData.insights)) {
            for (let insight of rawData.insights) {
                if (insight.text && insight.text.includes('follower')) {
                    followersText = insight.text;
                    break;
                }
            }
        }
        if (!followersText && rawData.title?.text) {
            followersText = rawData.title.text;
        }
        
        const followers = parseFollowers(followersText);
        
        const summaryText = rawData.summary?.text || rawData.summary || '';
        const summary = parseSummary(summaryText);
        
        if (!name && !headline) return null;
        
        return {
            name: name,
            profileUrl: profileUrl,
            headline: headline,
            location: location,
            followers: followers,
            summaryCurrent: summary.current,
            summaryPast: summary.past
        };
    }

    function extractPeopleFromResponse(jsonResponse) {
        const people = [];
        const seen = new Set();
        
        function traverse(obj) {
            if (!obj || typeof obj !== 'object') return;
            
            if (Array.isArray(obj)) {
                obj.forEach(item => traverse(item));
                return;
            }
            
            const hasPersonIndicators = 
                (obj.title && obj.title.text) ||
                (obj.primarySubtitle && obj.primarySubtitle.text) ||
                (obj.navigationUrl && obj.navigationUrl.includes('/in/')) ||
                (obj.entityUrn && obj.entityUrn.includes('member'));
            
            if (hasPersonIndicators) {
                const person = normalizePerson(obj);
                if (person) {
                    const key = person.profileUrl || `${person.name}:${person.headline}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        people.push(person);
                    }
                }
            }
            
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    traverse(obj[key]);
                }
            }
        }
        
        traverse(jsonResponse);
        return people;
    }

    class LinkedInScraper {
        constructor(targetCount = 300, keyword = null) {
            this.targetCount = targetCount;
            this.keyword = keyword || this.extractKeyword();
            this.people = [];
            this.seen = new Set();
            this.ui = null;
            this.retryCount = 0;
            this.maxRetries = 3;
        }
        
        extractKeyword() {
            const urlParams = new URLSearchParams(window.location.search);
            const keywords = urlParams.get('keywords');
            
            // Debug logging
            console.log('=== URL PARAMETERS ===');
            urlParams.forEach((value, key) => {
                console.log(`${key}: ${value}`);
            });
            console.log('====================');
            
            if (keywords) return keywords;
            
            const searchBox = document.querySelector('input[placeholder*="Search"]');
            if (searchBox && searchBox.value) return searchBox.value;
            
            return '';
        }
        
        buildUrl(start) {
            const urlParams = new URLSearchParams(window.location.search);
            
            console.log('=== Building LinkedIn API URL ===');
            console.log('Current URL:', window.location.href);
            
            // Parameters to EXCLUDE from queryParameters
            // These are either handled elsewhere or shouldn't be sent
            const excludeParams = [
                'keywords',     // Goes in query.keywords, not queryParameters
                'origin',       // Already set at top level
                'sid',          // Session tracking, not needed
                '_sid',         // Session tracking variant
                'trk',          // Tracking parameter
                '_trk',         // Tracking variant
                'lipi',         // LinkedIn internal tracking
                'lici'          // LinkedIn internal tracking
            ];
            
            // Build queryParameters list - start with empty, will add dynamically
            let queryParamsList = [];
            
            // Add parameters from URL, excluding the ones above
            urlParams.forEach((value, key) => {
                if (!excludeParams.includes(key) && value) {
                    let clean = value;
                    
                    // CORRECT CLEANING: Handle ["value"] format properly
                    if (clean.startsWith('[') && clean.endsWith(']')) {
                        // Remove outer brackets
                        clean = clean.slice(1, -1);
                    }
                    
                    // Remove quotes if present
                    if (clean.startsWith('"') && clean.endsWith('"')) {
                        clean = clean.slice(1, -1);
                    }
                    
                    // Remove any remaining quotes
                    clean = clean.replace(/"/g, '');
                    
                    queryParamsList.push('(key:' + key + ',value:List(' + clean + '))');
                    console.log('Added parameter:', key, '=', clean);
                }
            });
            
            // Always add resultType at the end
            queryParamsList.push('(key:resultType,value:List(PEOPLE))');
            
            // Join all parameters
            const queryParameters = 'List(' + queryParamsList.join(',') + ')';
            
            // Build the complete variables string
            const variables = 'variables=(start:' + start + 
                             ',origin:FACETED_SEARCH' +
                             ',query:(keywords:' + encodeURIComponent(this.keyword) + 
                             ',flagshipSearchIntent:SEARCH_SRP' +
                             ',queryParameters:' + queryParameters + 
                             ',includeFiltersInResponse:false))';
            
            // Use the CORRECT queryId (the original one)
            const queryId = 'queryId=voyagerSearchDashClusters.15c671c3162c043443995439a3d3b6dd';
            
            const finalUrl = 'https://www.linkedin.com/voyager/api/graphql?' + variables + '&' + queryId;
            
            console.log('Final URL:', finalUrl);
            console.log('=============================')
            
            return finalUrl;
        }
        
        async delay(min = 400, max = 1100) {
            const ms = Math.floor(Math.random() * (max - min + 1)) + min;
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        async fetchPage(start) {
            const url = this.buildUrl(start);
            const csrfToken = getCsrfToken();
            
            const headers = {
                'x-restli-protocol-version': '2.0.0',
                'Accept': 'application/json'
            };
            
            if (csrfToken) {
                headers['csrf-token'] = csrfToken;
            }
            
            try {
                console.log(`Fetching page starting at ${start}...`);
                console.log(`URL: ${url}`); // Add this for debugging
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: headers,
                    credentials: 'include'
                });
                
                if (response.status === 429) {
                    throw new Error('RATE_LIMIT');
                }
                
                if (!response.ok) {
                    console.error(`Fetch error: HTTP ${response.status}`);
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                const newPeople = extractPeopleFromResponse(data);
                
                let addedCount = 0;
                for (let person of newPeople) {
                    const key = person.profileUrl || `${person.name}:${person.headline}`;
                    if (!this.seen.has(key)) {
                        this.seen.add(key);
                        this.people.push(person);
                        if (this.ui) {
                            this.ui.addRow(person);
                        }
                        addedCount++;
                    }
                }
                
                console.log(`Found ${addedCount} new profiles (Total: ${this.people.length})`);
                return addedCount > 0;
                
            } catch (error) {
                if (error.message === 'RATE_LIMIT') {
                    throw error;
                }
                console.error('Fetch error:', error);
                throw error;
            }
        }
        
        async handleRateLimit() {
            this.retryCount++;
            if (this.retryCount > this.maxRetries) {
                throw new Error('Max retries exceeded for rate limiting');
            }
            
            if (this.ui) {
                this.ui.showError(`Rate limited. Waiting... (Retry ${this.retryCount}/${this.maxRetries})`);
            }
            
            await this.delay(1200, 1500);
        }
        
        async run() {
            if (typeof ScraperUI !== 'undefined') {
                this.ui = new ScraperUI();
                this.ui.init();
            }
            
            const csrfToken = getCsrfToken();
            if (!csrfToken && this.ui) {
                this.ui.showError('Warning: No CSRF token found. Continuing anyway...');
            }
            
            let start = 0;
            const step = 10;
            let consecutiveEmptyPages = 0;
            
            while (this.people.length < this.targetCount && consecutiveEmptyPages < 3) {
                if (this.ui) {
                    this.ui.updateProgress(this.people.length, this.targetCount);
                }
                
                try {
                    const hasResults = await this.fetchPage(start);
                    
                    if (!hasResults) {
                        consecutiveEmptyPages++;
                    } else {
                        consecutiveEmptyPages = 0;
                        this.retryCount = 0;
                    }
                    
                    start += step;
                    
                    if (this.people.length < this.targetCount) {
                        await this.delay();
                    }
                    
                } catch (error) {
                    if (error.message === 'RATE_LIMIT') {
                        await this.handleRateLimit();
                    } else {
                        console.error('Error during scraping:', error);
                        if (this.ui) {
                            this.ui.showError(`Error: ${error.message}`);
                        }
                        break;
                    }
                }
            }
            
            if (this.ui) {
                this.ui.updateProgress(this.people.length, this.people.length);
                this.ui.enableExport(this.people);
                
                if (this.people.length === 0) {
                    this.ui.showError('No results found. Try a different search.');
                } else {
                    console.log(`Scraping complete. Found ${this.people.length} unique profiles.`);
                }
            }
            
            return this.people;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getCsrfToken,
            sanitizeProfileUrl,
            parseFollowers,
            parseSummary,
            isNoiseEntry,
            normalizePerson,
            extractPeopleFromResponse,
            LinkedInScraper
        };
    } else {
        window.LinkedInScraper = LinkedInScraper;
        window.LinkedInScraperCore = {
            getCsrfToken,
            sanitizeProfileUrl,
            parseFollowers,
            parseSummary,
            isNoiseEntry,
            normalizePerson,
            extractPeopleFromResponse
        };
    }
    
    // UI components
    'use strict';

    class ScraperUI {
        constructor() {
            this.container = null;
            this.progressBar = null;
            this.progressText = null;
            this.resultsCounter = null;
            this.resultsTable = null;
            this.resultsBody = null;
            this.exportButtons = null;
            this.errorMessage = null;
            this.people = [];
        }
        
        init() {
            if (document.getElementById('linkedin-scraper-ui')) {
                this.destroy();
            }
            
            this.createStyles();
            this.createContainer();
            this.createHeader();
            this.createProgressSection();
            this.createResultsSection();
            this.createExportSection();
            this.attachEventListeners();
            
            document.body.appendChild(this.container);
        }
        
        createStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #linkedin-scraper-ui {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 500px;
                    max-height: 80vh;
                    background: rgba(26, 32, 44, 0.95);
                    border: 1px solid #4a5568;
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    z-index: 9999;
                    font-family: system-ui, -apple-system, sans-serif;
                    color: #e2e8f0;
                    display: flex;
                    flex-direction: column;
                }
                
                #linkedin-scraper-ui * {
                    box-sizing: border-box;
                }
                
                .scraper-header {
                    padding: 16px;
                    border-bottom: 1px solid #4a5568;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .scraper-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #63b3ed;
                }
                
                .scraper-close {
                    background: transparent;
                    border: none;
                    color: #a0aec0;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .scraper-close:hover {
                    color: #f56565;
                }
                
                .scraper-progress {
                    padding: 16px;
                    border-bottom: 1px solid #4a5568;
                }
                
                .progress-bar-container {
                    background: #2d3748;
                    border-radius: 4px;
                    height: 8px;
                    margin-bottom: 8px;
                    overflow: hidden;
                }
                
                .progress-bar {
                    background: #48bb78;
                    height: 100%;
                    width: 0%;
                    transition: width 0.3s ease;
                }
                
                .progress-text {
                    font-size: 14px;
                    color: #a0aec0;
                    text-align: center;
                }
                
                .results-counter {
                    padding: 8px 16px;
                    background: #2d3748;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .results-table-container {
                    max-height: 400px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .results-table {
                    width: 100%;
                    font-size: 13px;
                }
                
                .results-table th {
                    background: #2d3748;
                    padding: 8px;
                    text-align: left;
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }
                
                .results-table td {
                    padding: 8px;
                    border-bottom: 1px solid #2d3748;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .results-table tr:hover {
                    background: rgba(56, 178, 172, 0.1);
                }
                
                .export-section {
                    padding: 16px;
                    border-top: 1px solid #4a5568;
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }
                
                .export-button {
                    background: #3182ce;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .export-button:hover:not(:disabled) {
                    background: #2c5282;
                }
                
                .export-button:disabled {
                    background: #4a5568;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                
                .error-message {
                    position: absolute;
                    bottom: 70px;
                    left: 16px;
                    right: 16px;
                    background: #f56565;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 13px;
                    display: none;
                    animation: slideUp 0.3s ease;
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .results-table-container::-webkit-scrollbar {
                    width: 8px;
                }
                
                .results-table-container::-webkit-scrollbar-track {
                    background: #2d3748;
                }
                
                .results-table-container::-webkit-scrollbar-thumb {
                    background: #4a5568;
                    border-radius: 4px;
                }
                
                .results-table-container::-webkit-scrollbar-thumb:hover {
                    background: #718096;
                }
            `;
            document.head.appendChild(style);
        }
        
        createContainer() {
            this.container = document.createElement('div');
            this.container.id = 'linkedin-scraper-ui';
        }
        
        createHeader() {
            const header = document.createElement('div');
            header.className = 'scraper-header';
            
            const title = document.createElement('div');
            title.className = 'scraper-title';
            title.textContent = 'LinkedIn Scraper';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'scraper-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => this.destroy();
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            this.container.appendChild(header);
        }
        
        createProgressSection() {
            const progressSection = document.createElement('div');
            progressSection.className = 'scraper-progress';
            
            const barContainer = document.createElement('div');
            barContainer.className = 'progress-bar-container';
            
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'progress-bar';
            
            barContainer.appendChild(this.progressBar);
            
            this.progressText = document.createElement('div');
            this.progressText.className = 'progress-text';
            this.progressText.textContent = '0 of 0 profiles';
            
            progressSection.appendChild(barContainer);
            progressSection.appendChild(this.progressText);
            this.container.appendChild(progressSection);
        }
        
        createResultsSection() {
            this.resultsCounter = document.createElement('div');
            this.resultsCounter.className = 'results-counter';
            this.resultsCounter.textContent = 'Found: 0 unique profiles';
            this.container.appendChild(this.resultsCounter);
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'results-table-container';
            
            this.resultsTable = document.createElement('table');
            this.resultsTable.className = 'results-table';
            
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Name</th>
                    <th>Headline</th>
                    <th>Location</th>
                    <th>Followers</th>
                </tr>
            `;
            
            this.resultsBody = document.createElement('tbody');
            
            this.resultsTable.appendChild(thead);
            this.resultsTable.appendChild(this.resultsBody);
            tableContainer.appendChild(this.resultsTable);
            this.container.appendChild(tableContainer);
        }
        
        createExportSection() {
            const exportSection = document.createElement('div');
            exportSection.className = 'export-section';
            
            const csvButton = document.createElement('button');
            csvButton.className = 'export-button';
            csvButton.textContent = 'Export CSV';
            csvButton.disabled = true;
            csvButton.onclick = () => {
                if (typeof exportToCsv === 'function') {
                    exportToCsv(this.people);
                }
            };
            
            const htmlButton = document.createElement('button');
            htmlButton.className = 'export-button';
            htmlButton.textContent = 'Export HTML';
            htmlButton.disabled = true;
            htmlButton.onclick = () => {
                if (typeof exportToHtml === 'function') {
                    exportToHtml(this.people);
                }
            };
            
            exportSection.appendChild(csvButton);
            exportSection.appendChild(htmlButton);
            
            this.exportButtons = [csvButton, htmlButton];
            this.container.appendChild(exportSection);
            
            this.errorMessage = document.createElement('div');
            this.errorMessage.className = 'error-message';
            this.container.appendChild(this.errorMessage);
        }
        
        attachEventListeners() {
            this.container.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }
        
        updateProgress(current, total) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            this.progressBar.style.width = `${percentage}%`;
            this.progressText.textContent = `${current} of ${total} profiles`;
            this.resultsCounter.textContent = `Found: ${current} unique profiles`;
        }
        
        addRow(person) {
            this.people.push(person);
            
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('td');
            nameCell.textContent = person.name || '-';
            nameCell.title = person.name || '';
            
            const headlineCell = document.createElement('td');
            headlineCell.textContent = person.headline || '-';
            headlineCell.title = person.headline || '';
            
            const locationCell = document.createElement('td');
            locationCell.textContent = person.location || '-';
            locationCell.title = person.location || '';
            
            const followersCell = document.createElement('td');
            followersCell.textContent = person.followers ? 
                person.followers.toLocaleString() : '-';
            
            row.appendChild(nameCell);
            row.appendChild(headlineCell);
            row.appendChild(locationCell);
            row.appendChild(followersCell);
            
            this.resultsBody.appendChild(row);
            
            this.resultsCounter.textContent = `Found: ${this.people.length} unique profiles`;
        }
        
        showError(message) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
            
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 5000);
        }
        
        enableExport(people) {
            if (people) {
                this.people = people;
            }
            this.exportButtons.forEach(btn => {
                btn.disabled = false;
            });
        }
        
        destroy() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            
            const style = document.querySelector('style');
            if (style && style.textContent.includes('#linkedin-scraper-ui')) {
                style.parentNode.removeChild(style);
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScraperUI;
    } else {
        window.ScraperUI = ScraperUI;
    }
    
    // Export utilities
    'use strict';

    function escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        const str = String(value);
        
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }

    function exportToCsv(people) {
        if (!people || people.length === 0) {
            alert('No data to export');
            return;
        }
        
        const BOM = '\uFEFF';
        
        const headers = ['Name', 'Profile URL', 'Headline', 'Location', 'Current Companies', 'Past Companies', 'Followers'];
        
        const csvContent = BOM + headers.map(escapeCSV).join(',') + '\n' + 
            people.map(person => {
                return [
                    person.name || '',
                    person.profileUrl || '',
                    person.headline || '',
                    person.location || '',
                    (person.summaryCurrent || []).join('; '),
                    (person.summaryPast || []).join('; '),
                    person.followers || ''
                ].map(escapeCSV).join(',');
            }).join('\n');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `linkedin_profiles_${timestamp}.csv`;
        
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
    }

    function exportToHtml(people) {
        if (!people || people.length === 0) {
            alert('No data to export');
            return;
        }
        
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str || '';
            return div.innerHTML;
        };
        
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn Profiles Export</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f7fafc;
            padding: 20px;
            color: #2d3748;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        h1 {
            background: #0077b5;
            color: white;
            padding: 20px;
            font-size: 24px;
        }
        
        .meta {
            padding: 15px 20px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            color: #718096;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #edf2f7;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #4a5568;
            border-bottom: 2px solid #cbd5e0;
            position: sticky;
            top: 0;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        tr:hover {
            background: #f7fafc;
        }
        
        .profile-link {
            color: #0077b5;
            text-decoration: none;
            font-weight: 500;
        }
        
        .profile-link:hover {
            text-decoration: underline;
        }
        
        .followers {
            text-align: right;
            font-weight: 500;
            color: #2d3748;
        }
        
        .companies {
            font-size: 13px;
            color: #718096;
        }
        
        .no-data {
            color: #a0aec0;
            font-style: italic;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>LinkedIn Profiles Export</h1>
        <div class="meta">
            <strong>Export Date:</strong> ${new Date().toLocaleDateString()} | 
            <strong>Total Profiles:</strong> ${people.length}
        </div>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Headline</th>
                    <th>Location</th>
                    <th>Current Companies</th>
                    <th>Past Companies</th>
                    <th>Followers</th>
                </tr>
            </thead>
            <tbody>
                ${people.map(person => `
                <tr>
                    <td>
                        ${person.profileUrl ? 
                            `<a href="${escapeHtml(person.profileUrl)}" target="_blank" class="profile-link">${escapeHtml(person.name || 'Unknown')}</a>` :
                            escapeHtml(person.name || 'Unknown')
                        }
                    </td>
                    <td>${escapeHtml(person.headline) || '<span class="no-data">-</span>'}</td>
                    <td>${escapeHtml(person.location) || '<span class="no-data">-</span>'}</td>
                    <td class="companies">
                        ${person.summaryCurrent && person.summaryCurrent.length > 0 ?
                            escapeHtml(person.summaryCurrent.join(', ')) :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                    <td class="companies">
                        ${person.summaryPast && person.summaryPast.length > 0 ?
                            escapeHtml(person.summaryPast.join(', ')) :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                    <td class="followers">
                        ${person.followers ? 
                            person.followers.toLocaleString() :
                            '<span class="no-data">-</span>'
                        }
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `linkedin_profiles_${timestamp}.html`;
        
        downloadFile(htmlContent, filename, 'text/html;charset=utf-8');
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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            exportToCsv,
            exportToHtml,
            downloadFile
        };
    } else {
        window.exportToCsv = exportToCsv;
        window.exportToHtml = exportToHtml;
        window.downloadFile = downloadFile;
    }
    
    // Initialize and run
    const targetCount = prompt('How many profiles to scrape? (Default: 300)', '300');
    if (!targetCount) {
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    const scraper = new LinkedInScraper(parseInt(targetCount) || 300);
    scraper.run().then(people => {
        console.log(`✅ Scraping complete! Found ${people.length} unique profiles.`);
        console.log('📊 Use the Export buttons in the UI to save your data.');
    }).catch(error => {
        console.error('❌ Scraper error:', error);
        alert('Scraper encountered an error. Check console for details.');
    }).finally(() => {
        window.__linkedInScraperRunning__ = false;
    });
    
})();
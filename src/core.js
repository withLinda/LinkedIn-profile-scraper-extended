(function() {
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
            console.log('=============================';
            
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

})();
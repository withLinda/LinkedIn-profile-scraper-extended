(function() {
    'use strict';

    function getBuildUrlFn() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                const mod = require('./lib/buildUrl');
                if (mod && typeof mod.buildLinkedInSearchUrl === 'function') return mod.buildLinkedInSearchUrl;
            } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        const libBuildUrl = mods.libBuildUrl || {};
        return typeof libBuildUrl.buildLinkedInSearchUrl === 'function'
            ? libBuildUrl.buildLinkedInSearchUrl
            : function(){ return ''; };
    }

    const buildLinkedInSearchUrl = getBuildUrlFn();

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

    function getExtractPersonFn() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                const extractorModule = require('./extractors/linkedin');
                if (extractorModule && typeof extractorModule.extractPerson === 'function') {
                    return extractorModule.extractPerson;
                }
            } catch (error) {
                return null;
            }
        }

        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const modules = root.LinkedInScraperModules || {};
        const extractors = modules.extractors || {};
        const linkedin = extractors.linkedin || {};
        return typeof linkedin.extractPerson === 'function' ? linkedin.extractPerson : null;
    }

    function extractPeopleFromResponse(jsonResponse) {
        const extractPerson = getExtractPersonFn();
        if (typeof extractPerson !== 'function') return [];

        const people = [];
        const seen = new Set();

        if (jsonResponse && Array.isArray(jsonResponse.included)) {
            for (const record of jsonResponse.included) {
                const person = extractPerson(record);
                if (!person || !person.name || !person.profileUrl) continue;
                if (seen.has(person.profileUrl)) continue;
                seen.add(person.profileUrl);
                people.push(person);
            }
        }

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
            this.pageSize = 10; // keep in sync with GraphQL count
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
        
        async delay(min = 400, max = 1100) {
            const ms = Math.floor(Math.random() * (max - min + 1)) + min;
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        async fetchPage(start) {
            const url = buildLinkedInSearchUrl({
                keyword: this.keyword,
                start, count: this.pageSize
            });
            const csrfToken = getCsrfToken();
            
            const headers = {
                'x-restli-protocol-version': '2.0.0',
                'accept': 'application/vnd.linkedin.normalized+json+2.1'
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
                    const body = await response.text().catch(() => '');
                    console.error('[Voyager] HTTP', response.status, body.slice(0, 500));
                    throw new Error(`HTTP ${response.status}`);
                }

                const responseClone = response.clone();
                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    const body = await responseClone.text().catch(() => '');
                    console.error('[Voyager] Non-JSON body:', body.slice(0, 500));
                    throw e;
                }

                const rawIncluded = data?.included ?? data?.data?.included ?? [];
                const included = Array.isArray(rawIncluded) ? rawIncluded : [];

                const hasPromo = included.some(item => (
                    item && typeof item.$type === 'string' && item.$type.includes('PromoCard')
                ) || /monthly limit/i.test(item?.subtitle?.text || ''));

                const newPeople = extractPeopleFromResponse({ included });

                if (hasPromo && newPeople.length === 0 && this.ui) {
                    this.ui.showError('LinkedIn search limit reached or results truncated by promo.');
                }
                
                let addedCount = 0;
                for (let person of newPeople) {
                    const key = person.profileUrl;
                    if (!key || this.seen.has(key)) continue;
                    this.seen.add(key);
                    this.people.push(person);
                    if (this.ui) {
                        this.ui.addRow(person);
                    }
                    addedCount++;
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
            const step = this.pageSize;
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
            getExtractPersonFn,
            extractPeopleFromResponse,
            LinkedInScraper
        };
    } else {
        window.LinkedInScraper = LinkedInScraper;
        window.LinkedInScraperCore = {
            getCsrfToken,
            getExtractPersonFn,
            extractPeopleFromResponse
        };
    }

})();

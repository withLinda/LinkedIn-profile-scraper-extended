(function() {
    'use strict';

    // Return the entire buildUrl module instead of only one function
    function getBuildUrlModule() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                return require('./lib/buildUrl');
            } catch (e) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.libBuildUrl || {};
    }

    // Destructure helpers from lib/buildUrl with safe fallbacks
    const __buildUrl__ = getBuildUrlModule();
    const buildLinkedInSearchUrl = typeof __buildUrl__.buildLinkedInSearchUrl === 'function' ? __buildUrl__.buildLinkedInSearchUrl : function(){ return ''; };
    const extractKeywordFromPage = typeof __buildUrl__.extractKeywordFromPage === 'function' ? __buildUrl__.extractKeywordFromPage : function(){ return ''; };
    const fetchVoyagerJson = typeof __buildUrl__.fetchVoyagerJson === 'function' ? __buildUrl__.fetchVoyagerJson : null;

    // Resolve profile lib
    function getProfileModule(){
        if (typeof module!=='undefined' && module.exports) {
            try { return require('./lib/profile'); } catch(_) { /* ignore */ }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.profile || {};
    }
    const __profile__ = getProfileModule();

    // Use lib/auth.getCsrfToken() via shared modules; legacy cookie helper removed.

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
            this.keyword = (keyword != null) ? keyword : extractKeywordFromPage();
            this.people = [];
            this.seen = new Set();
            this.ui = null;
            this.retryCount = 0;
            this.maxRetries = 3;
            this.pageSize = 10; // keep in sync with GraphQL count
        }
        
        async delay(min = 400, max = 1100) {
            const ms = Math.floor(Math.random() * (max - min + 1)) + min;
            return new Promise(resolve => setTimeout(resolve, ms));
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
            
            const auth = (function(){
                if (typeof module!=='undefined' && module.exports) {
                    try { return require('./lib/auth'); } catch(_) {}
                }
                const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
                return (r.LinkedInScraperModules||{}).auth || {};
            })();
            const csrfToken = (auth && typeof auth.getCsrfToken==='function') ? auth.getCsrfToken() : null;
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
                    // NEW: delegate the network call to lib/buildUrl
                    if (typeof fetchVoyagerJson !== 'function') {
                        throw new Error('fetchVoyagerJson not available');
                    }
                    const { included } = await fetchVoyagerJson({
                        keyword: this.keyword,
                        start,
                        count: this.pageSize
                    });

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
                        // --- Enrich with profile (About/Experience/Education) when urnCode present
                        if (person.urnCode && __profile__ && typeof __profile__.fetchProfileJson==='function' && typeof __profile__.parseProfile==='function') {
                            let attempts = 0;
                            while (attempts < 2) {
                                try {
                                    const { included } = await __profile__.fetchProfileJson(person.urnCode, null);
                                    const parsed = __profile__.parseProfile(included || []);
                                    // About
                                    if (parsed.about) person.about = parsed.about;
                                    // Experience (flatten first 3)
                                    const exp = Array.isArray(parsed.experiences) ? parsed.experiences.slice(0,3) : [];
                                    for (let i=0; i<3; i++){
                                        const e = exp[i] || {};
                                        person[`exp${i+1}_company`] = e.companyName || '';
                                        person[`exp${i+1}_position`] = e.positionTitle || '';
                                        person[`exp${i+1}_duration`] = e.duration || '';
                                        person[`exp${i+1}_position_duration`] = e.positionDuration || '';
                                        person[`exp${i+1}_description`] = e.jobDescription || '';
                                    }
                                    // Education (flatten first 3)
                                    const edu = Array.isArray(parsed.education) ? parsed.education.slice(0,3) : [];
                                    for (let i=0; i<3; i++){
                                        const d = edu[i] || {};
                                        person[`edu${i+1}_institution`] = d.institutionName || '';
                                        person[`edu${i+1}_degree`] = d.degree || '';
                                        person[`edu${i+1}_grade`] = d.grade || '';
                                        person[`edu${i+1}_description`] = d.educationDescription || '';
                                    }
                                    break; // success
                                } catch (e) {
                                    if (e && e.message === 'RATE_LIMIT') {
                                        await this.handleRateLimit();
                                        attempts++;
                                        continue;
                                    }
                                    // Non-rate-limit errors: log and continue without enrichment
                                    console.warn('Profile enrichment failed:', e);
                                    break;
                                }
                            }
                        }
                        // Now add to model/UI
                        this.people.push(person);
                        if (this.ui) this.ui.addRow(person);
                        addedCount++;
                    }
                    const hasResults = addedCount > 0;
                    
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
            getExtractPersonFn,
            extractPeopleFromResponse,
            LinkedInScraper
        };
    } else {
        window.LinkedInScraper = LinkedInScraper;
        window.LinkedInScraperCore = {
            getExtractPersonFn,
            extractPeopleFromResponse
        };
    }

})();

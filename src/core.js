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

    function joinCompact(parts, separator) {
        const sep = separator || ' ';
        return parts
            .map(part => (typeof part === 'string' ? part.trim() : ''))
            .filter(Boolean)
            .join(sep);
    }

    // Extract memberIdentity slug from a LinkedIn profile URL, e.g.
    // "https://www.linkedin.com/in/anoop-reddy-/" -> "anoop-reddy-"
    function extractMemberIdentityFromProfileUrl(profileUrl) {
        if (!profileUrl || typeof profileUrl !== 'string') return null;
        try {
            const url = new URL(profileUrl, 'https://www.linkedin.com');
            const segments = url.pathname.split('/').filter(Boolean);
            if (!segments.length) return null;
            if (segments[0].toLowerCase() === 'in') {
                return segments[1] || null;
            }
            // Fallback: last non-empty segment
            return segments[segments.length - 1] || null;
        } catch (e) {
            return null;
        }
    }

    function formatSkills(skills) {
        if (!Array.isArray(skills) || skills.length === 0) return '';
        return skills.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean).join(', ');
    }

    function formatProgrammingLanguages(langs) {
        if (!Array.isArray(langs) || langs.length === 0) return '';
        const lines = langs.map(item => {
            const name = (item && typeof item.name === 'string') ? item.name.trim() : '';
            if (!name) return '';
            const proficiency = (item && typeof item.proficiency === 'string') ? item.proficiency.trim() : '';
            return proficiency ? name + ' (' + proficiency + ')' : name;
        }).filter(Boolean);
        return lines.join('\n');
    }

    function formatDetailList(entries, selectors) {
        if (!Array.isArray(entries) || entries.length === 0) return '';
        const [primary, secondary, tertiary, quaternary] = selectors;
        const lines = entries.map(item => {
            if (!item || typeof item !== 'object') return '';
            const parts = [];
            if (primary) parts.push(primary(item));
            if (secondary) parts.push(secondary(item));
            if (tertiary) parts.push(tertiary(item));
            if (quaternary) parts.push(quaternary(item));
            return joinCompact(parts, ' • ');
        }).filter(Boolean);
        return lines.join('\n');
    }

    function formatLicenses(licenses) {
        return formatDetailList(licenses, [
            item => item && typeof item.name === 'string' ? item.name : '',
            item => item && typeof item.issuer === 'string' ? item.issuer : '',
            item => item && typeof item.issuedOn === 'string' ? item.issuedOn : '',
            item => item && typeof item.note === 'string' ? item.note : ''
        ]);
    }

    function formatVolunteering(volunteering) {
        return formatDetailList(volunteering, [
            item => item && typeof item.role === 'string' ? item.role : '',
            item => item && typeof item.organization === 'string' ? item.organization : '',
            item => item && typeof item.duration === 'string' ? item.duration : '',
            item => item && typeof item.description === 'string' ? item.description : ''
        ]);
    }

    function formatOrganizations(organizations) {
        return formatDetailList(organizations, [
            item => item && typeof item.name === 'string' ? item.name : '',
            item => item && typeof item.roleOrDetail === 'string' ? item.roleOrDetail : '',
            item => item && typeof item.duration === 'string' ? item.duration : ''
        ]);
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
            this.companyWebsiteCache = new Map();
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

        async getCompanyWebsite(companyId, csrfToken) {
            if (!companyId || !__profile__ || typeof __profile__.fetchCompanyWebsite !== 'function') return null;

            const cache = this.companyWebsiteCache;
            if (cache && cache.has(companyId)) {
                return cache.get(companyId);
            }

            let attempts = 0;
            let website = null;

            while (attempts < 2) {
                try {
                    website = await __profile__.fetchCompanyWebsite(companyId, csrfToken);
                    break;
                } catch (e) {
                    if (e && e.message === 'RATE_LIMIT') {
                        await this.handleRateLimit();
                        attempts++;
                        continue;
                    }
                    console.warn('Company website enrichment failed:', e);
                    break;
                }
            }

            if (cache) {
                cache.set(companyId, website || null);
            }
            return website || null;
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
                                    const { included } = await __profile__.fetchProfileJson(person.urnCode, csrfToken);
                                    const parsed = __profile__.parseProfile(included || []);
                                    // About
                                    if (parsed.about) person.about = parsed.about;
                                    // Experience (flatten first 3)
                                    const exp = Array.isArray(parsed.experiences) ? parsed.experiences.slice(0,3) : [];
                                    const expWithWebsites = [];
                                    for (let i = 0; i < 3; i++) {
                                        const e = exp[i] || null;
                                        if (e && e.companyId) {
                                            const website = await this.getCompanyWebsite(e.companyId, csrfToken);
                                            if (website) {
                                                expWithWebsites[i] = Object.assign({}, e, { companyWebsite: website });
                                                continue;
                                            }
                                        }
                                        expWithWebsites[i] = e || {};
                                    }
                                    for (let i=0; i<3; i++){
                                        const e = expWithWebsites[i] || {};
                                        const website = e.companyWebsite || '';
                                        let companyDisplay = e.companyName || '';
                                        if (website) {
                                            companyDisplay = companyDisplay
                                                ? (companyDisplay + ' (' + website + ')')
                                                : website;
                                        } else if (!website && e.companyName && e.companyId) {
                                            companyDisplay = e.companyName + ' (' + e.companyId + ')';
                                        }
                                        person[`exp${i+1}_company`] = companyDisplay;
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
                                    person.skills = formatSkills(parsed.skills);
                                    person.languages = formatProgrammingLanguages(parsed.languages);
                                    person.licenses = formatLicenses(parsed.licenses);
                                    person.volunteering = formatVolunteering(parsed.volunteering);
                                    person.organizations = formatOrganizations(parsed.organizations);
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

                        // --- Enrich with contact info (email, websites, phones, etc.) using memberIdentity slug
                        if (person.profileUrl &&
                            __profile__ &&
                            typeof __profile__.fetchContactInfoJson === 'function' &&
                            typeof __profile__.parseContactInfo === 'function') {
                            const memberIdentity = extractMemberIdentityFromProfileUrl(person.profileUrl);
                            if (memberIdentity) {
                                let contactAttempts = 0;
                                while (contactAttempts < 2) {
                                    try {
                                        const { included: contactIncluded } =
                                            await __profile__.fetchContactInfoJson(memberIdentity, csrfToken);
                                        const contact =
                                            __profile__.parseContactInfo(contactIncluded || [], { memberIdentity });
                                        if (contact && contact.contactInfo) {
                                            person.contactInfo = contact.contactInfo;
                                        }
                                        break;
                                    } catch (e) {
                                        if (e && e.message === 'RATE_LIMIT') {
                                            await this.handleRateLimit();
                                            contactAttempts++;
                                            continue;
                                        }
                                        console.warn('Contact info enrichment failed:', e);
                                        break;
                                    }
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

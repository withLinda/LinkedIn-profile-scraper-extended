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
    if (!/\/search\/results\/people/.test(location.pathname)) {
        alert('Please navigate to LinkedIn People search results first\n\nGo to: linkedin.com → Search for people → Then run this script');
        window.__linkedInScraperRunning__ = false;
        return;
    }
    
    // Schema definition
    ;
    (function() {
        'use strict';
    
        const PERSON_COLUMNS = [
            { key: 'name', label: 'Name' },
            { key: 'profileUrl', label: 'Profile URL' },
            { key: 'headline', label: 'Headline' },
            { key: 'location', label: 'Location' },
            { key: 'current', label: 'Current' },
            { key: 'followers', label: 'Followers' },
            { key: 'urnCode', label: 'URN Code' }
        ];
    
        const linkedinSchemaModule = { PERSON_COLUMNS };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = linkedinSchemaModule;
        }
    
        const linkedinSchemaRoot = typeof globalThis !== 'undefined' ? globalThis : window;
        linkedinSchemaRoot.LinkedInScraperModules = linkedinSchemaRoot.LinkedInScraperModules || {};
        linkedinSchemaRoot.LinkedInScraperModules.schema = linkedinSchemaModule;
    })();


    // Theme tokens
    ;
    (function() {
        'use strict';
    
        // Default theme tokens (Everforest Light Hard, previously hardcoded)
        const DEFAULT_THEME = {
            '--ef-bg0': '#FFFBEF',
            '--ef-bg1': '#F8F5E4',
            '--ef-bg2': '#F2EFDF',
            '--ef-bg3': '#EDEADA',
            '--ef-bg4': '#E8E5D5',
            '--ef-visual': '#F0F2D4',
            '--ef-fg': '#5C6A72',
            '--ef-grey1': '#939F91',
            '--ef-blue': '#3A94C5',
            '--ef-aqua': '#35A77C',
            '--ef-green': '#8DA101',
            '--ef-red': '#F85552',
            '--ef-yellow': '#DFA000',
            '--ef-statusline3': '#E66868'
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


    // Theme engine
    ;
    (function() {
        'use strict';
    
        function getTokensModule() {
            if (typeof module !== 'undefined' && module.exports) {
                try {
                    return require('./tokens');
                } catch (e) { /* ignore */ }
            }
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.themeTokens || {};
        }
    
        const { DEFAULT_THEME = {} } = getTokensModule();
    
        function clone(obj) {
            return Object.assign({}, obj);
        }
    
        function mergeTokens(base, patch) {
            return Object.assign({}, base || {}, patch || {});
        }
    
        function getActiveTokens() {
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
            const override = (root.LinkedInScraperTheme && root.LinkedInScraperTheme.tokens) || null;
            return mergeTokens(DEFAULT_THEME, override);
        }
    
        // Build CSS variable declarations for a given scope.
        function getCssVariablesCss(scope, tokens) {
            const t = tokens || getActiveTokens();
            const body = Object.entries(t).map(([k, v]) => `${k}: ${v};`).join(' ');
            return `${scope}{ ${body} }`;
        }
    
        // Apply theme variables to the in-page UI container.
        function applyTheme(container) {
            const doc = (typeof document !== 'undefined') ? document : null;
            if (!doc) return;
            const scope = '#linkedin-scraper-ui';
            let styleEl = doc.getElementById('linkedin-scraper-theme');
            if (!styleEl) {
                styleEl = doc.createElement('style');
                styleEl.id = 'linkedin-scraper-theme';
                doc.head.appendChild(styleEl);
            }
            styleEl.textContent = getCssVariablesCss(scope, getActiveTokens());
        }
    
        // Replace current theme tokens at runtime.
        function setTheme(partialTokens) {
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
            root.LinkedInScraperTheme = root.LinkedInScraperTheme || {};
            root.LinkedInScraperTheme.tokens = mergeTokens(DEFAULT_THEME, partialTokens);
            applyTheme(null);
        }
    
        const themeModule = {
            getActiveTokens,
            getCssVariablesCss,
            applyTheme,
            setTheme,
            DEFAULT_THEME: clone(DEFAULT_THEME)
        };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = themeModule;
        }
    
        const root = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
        root.LinkedInScraperModules = root.LinkedInScraperModules || {};
        root.LinkedInScraperModules.theme = themeModule;
    })();


    // URL helpers
    ;
    (function() {
        'use strict';
    
        function sanitizeProfileUrl(rawNavUrl) {
            if (!rawNavUrl || typeof rawNavUrl !== 'string') return null;
    
            try {
                const url = new URL(rawNavUrl, 'https://www.linkedin.com');
                const segments = url.pathname.split('/').filter(Boolean);
                if (segments[0]?.toLowerCase() !== 'in') return null;
    
                const slug = segments[1];
                if (!slug) return null;
    
                const trimmedSlug = slug.trim();
                if (!trimmedSlug) return null;
    
                let decodedSlug = trimmedSlug;
                try {
                    decodedSlug = decodeURIComponent(trimmedSlug);
                } catch (error) {
                    // Ignore decode errors; use raw slug
                }
    
                const encodedSlug = encodeURIComponent(decodedSlug).replace(/%2F/gi, '/');
                return `https://www.linkedin.com/in/${encodedSlug}`;
            } catch (error) {
                return null;
            }
        }
    
        function extractMiniProfileUrn(rawNavUrl) {
            if (!rawNavUrl || typeof rawNavUrl !== 'string') return null;
    
            try {
                const url = new URL(rawNavUrl, 'https://www.linkedin.com');
                const params = new URLSearchParams(url.search);
                const encodedUrn = params.get('miniProfileUrn');
                if (!encodedUrn) return null;
    
                // keep only the ID after the last colon, e.g.
                // "urn:li:fs_miniProfile:ACoA..." -> "ACoA..."
                const decoded = decodeURIComponent(encodedUrn);
                const idOnly = decoded.split(':').pop();
                return idOnly || null;
            } catch (error) {
                return null;
            }
        }
    
        const linkedinUrlModule = {
            sanitizeProfileUrl,
            extractMiniProfileUrn
        };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = linkedinUrlModule;
        }
    
        const linkedinUrlRoot = typeof globalThis !== 'undefined' ? globalThis : window;
        linkedinUrlRoot.LinkedInScraperModules = linkedinUrlRoot.LinkedInScraperModules || {};
        linkedinUrlRoot.LinkedInScraperModules.url = linkedinUrlModule;
    })();


    // Build URL
    ;
    (function() {
        'use strict';
    
        function cleanValue(raw) {
            let clean = String(raw || '');
            if (clean.startsWith('[') && clean.endsWith(']')) clean = clean.slice(1, -1);
            if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
            clean = clean.replace(/"/g, '');
            return clean;
        }
    
        function buildLinkedInSearchUrl({ keyword = '', start = 0, count = 10 }) {
            const urlParams = new URLSearchParams(window.location.search);
            console.log('=== Building LinkedIn API URL ===');
            console.log('Current URL:', window.location.href);
    
            const excludeParams = [
                'keywords', 'origin', 'sid', '_sid', 'trk', '_trk', 'lipi', 'lici'
            ];
    
            const queryParamsList = [];
            urlParams.forEach((value, key) => {
                if (!excludeParams.includes(key) && value) {
                    const clean = cleanValue(value);
                    queryParamsList.push(`(key:${key},value:List(${clean}))`);
                    console.log('Added parameter:', key, '=', clean);
                }
            });
            queryParamsList.push('(key:resultType,value:List(PEOPLE))');
    
            const queryParameters = 'List(' + queryParamsList.join(',') + ')';
            const variables =
                'variables=(start:' + start +
                ',count:' + count +
                ',origin:FACETED_SEARCH' +
                ',query:(keywords:' + encodeURIComponent(keyword) +
                ',flagshipSearchIntent:SEARCH_SRP' +
                ',queryParameters:' + queryParameters +
                ',includeFiltersInResponse:false))';
    
            const queryId = 'queryId=voyagerSearchDashClusters.15c671c3162c043443995439a3d3b6dd';
            const finalUrl = 'https://www.linkedin.com/voyager/api/graphql?' + variables + '&' + queryId;
            console.log('Final URL:', finalUrl);
            console.log('=============================');
            return finalUrl;
        }
    
        // NEW: mirror of the old core.js extractKeyword()
        function extractKeywordFromPage() {
            const urlParams = new URLSearchParams(window.location.search);
            const keywords = urlParams.get('keywords');
            if (keywords) return keywords;
            const searchBox = document.querySelector('input[placeholder*="Search"]');
            return (searchBox && searchBox.value) ? searchBox.value : '';
        }
    
        // NEW: local copy of CSRF token getter so this file is self-contained for requests
        function getCsrfTokenForVoyager() {
            const cookies = (typeof document!=='undefined' ? document.cookie : '').split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'JSESSIONID') {
                    const cleanValue = String(value || '').replace(/\"/g, '');
                    try { return decodeURIComponent(cleanValue); } catch { return cleanValue; }
                }
            }
            return null;
        }
    
        // NEW: request builder (URL + headers) used by fetch
        function buildVoyagerRequest({ keyword = '', start = 0, count = 10 }) {
            const url = buildLinkedInSearchUrl({ keyword, start, count });
            const headers = {
                'x-restli-protocol-version': '2.0.0',
                'accept': 'application/vnd.linkedin.normalized+json+2.1'
            };
            const csrf = getCsrfTokenForVoyager();
            if (csrf) headers['csrf-token'] = csrf;
            return { url, headers };
        }
    
        // NEW: performs the network call and JSON parsing; returns { data, included }
        async function fetchVoyagerJson({ keyword = '', start = 0, count = 10 }) {
            const { url, headers } = buildVoyagerRequest({ keyword, start, count });
            const response = await fetch(url, {
                method: 'GET',
                headers,
                credentials: 'include'
            });
            if (response.status === 429) throw new Error('RATE_LIMIT');
            if (!response.ok) {
                // Keep response body trimming as in core.js for parity/debugability
                const body = await response.text().catch(() => '');
                console.error('[Voyager] HTTP', response.status, body.slice(0, 500));
                throw new Error(`HTTP ${response.status}`);
            }
            const clone = response.clone();
            let data;
            try {
                data = await response.json();
            } catch (e) {
                const body = await clone.text().catch(() => '');
                console.error('[Voyager] Non-JSON body:', body.slice(0, 500));
                throw e;
            }
            const rawIncluded = data?.included ?? data?.data?.included ?? [];
            const included = Array.isArray(rawIncluded) ? rawIncluded : [];
            return { data, included };
        }
    
        const mod = {
            buildLinkedInSearchUrl,
            extractKeywordFromPage,
            buildVoyagerRequest,
            fetchVoyagerJson
        };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = mod;
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        root.LinkedInScraperModules = root.LinkedInScraperModules || {};
        root.LinkedInScraperModules.libBuildUrl = mod;
    })();


    // LinkedIn extractors
    ;
    (function() {
        'use strict';
    
        function getModuleExports() {
            if (typeof module !== 'undefined' && module.exports) {
                return {
                    url: require('../lib/url')
                };
            }
    
            const linkedinExtractorRoot = typeof globalThis !== 'undefined' ? globalThis : window;
            const modules = linkedinExtractorRoot.LinkedInScraperModules || {};
            return {
                url: modules.url || {}
            };
        }
    
        const { url } = getModuleExports();
        const sanitizeProfileUrl = url.sanitizeProfileUrl || (() => null);
        const extractMiniProfileUrn = url.extractMiniProfileUrn || (() => null);
    
        function trimText(value) {
            if (typeof value !== 'string') return '';
            return value.trim();
        }
    
        function extractCurrent(summaryText) {
            const trimmed = trimText(summaryText);
            if (!trimmed) return null;
            const withoutPrefix = trimmed.replace(/^Current:\s*/i, '').trim();
            return withoutPrefix || null;
        }
    
        function extractPerson(record) {
            if (!record || typeof record !== 'object') return null;
    
            const name = trimText(record?.image?.accessibilityText);
            if (!name) return null;
    
            const rawNavUrl = record?.navigationContext?.url;
            const profileUrl = sanitizeProfileUrl(rawNavUrl);
            if (!profileUrl) return null;
    
            const headline = trimText(record?.primarySubtitle?.text) || null;
            const location = trimText(record?.secondarySubtitle?.text) || null;
            const current = extractCurrent(record?.summary?.text);
    
            const insight = trimText(record?.insightsResolutionResults?.[0]?.simpleInsight?.title?.text);
            // Only keep text when it actually looks like followers (e.g., "30K followers")
            const followers = /\bfollowers?\b/i.test(insight) ? insight : null;
            const urnCode = extractMiniProfileUrn(rawNavUrl) || null;
    
            return {
                name,
                profileUrl,
                headline,
                location,
                current,
                followers,
                urnCode
            };
        }
    
        const linkedinExtractorModule = { extractPerson };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = linkedinExtractorModule;
        }
    
        const linkedinExtractorRoot = typeof globalThis !== 'undefined' ? globalThis : window;
        linkedinExtractorRoot.LinkedInScraperModules = linkedinExtractorRoot.LinkedInScraperModules || {};
        linkedinExtractorRoot.LinkedInScraperModules.extractors = linkedinExtractorRoot.LinkedInScraperModules.extractors || {};
        linkedinExtractorRoot.LinkedInScraperModules.extractors.linkedin = linkedinExtractorModule;
    })();


    // Core functionality
    ;
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
                            this.people.push(person);
                            if (this.ui) {
                                this.ui.addRow(person);
                            }
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


    // Export shared
    ;
    (function(){
      'use strict';
    
      function getPersonColumns() {
        try {
          if (typeof module!=='undefined' && module.exports) {
            const schema = require('../schema/columns');
            if (schema && Array.isArray(schema.PERSON_COLUMNS)) return schema.PERSON_COLUMNS;
          }
        } catch(_) {}
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        const schema = mods.schema || {};
        return Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : [];
      }
    
      function getCsvValue(person, key) {
        if (!person) return '';
        if (key === 'followers') {
          const f = person.followers;
          if (typeof f === 'string') return f;
          if (typeof f === 'number' && Number.isFinite(f)) return String(f);
          return '';
        }
        const value = person[key];
        return value == null ? '' : String(value);
      }
    
      function getDisplayValue(person, key) {
        if (!person) return '';
        if (key === 'followers') {
          const f = person.followers;
          if (typeof f === 'string' && f.trim()) return f;
          if (typeof f === 'number' && Number.isFinite(f)) return f;
          return null;
        }
        const value = person[key];
        if (value == null) return null;
        const text = String(value).trim();
        return text ? text : null;
      }
    
      function escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
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
    
      const mod = {
        getPersonColumns, getCsvValue, getDisplayValue, escapeCSV, downloadFile
      };
    
      if (typeof module!=='undefined' && module.exports) {
        module.exports = mod;
      }
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportShared = mod;
    })();

    // Export CSV
    ;
    (function(){
      'use strict';
    
      function getShared() {
        if (typeof module!=='undefined' && module.exports) {
          try { return require('./shared'); } catch(_) { return {}; }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportShared || {};
      }
    
      const shared = getShared();
    
      function exportToCsv(people) {
        if (!people || people.length===0) {
          alert('No data to export');
          return;
        }
        const columns = shared.getPersonColumns();
        const BOM = '\uFEFF';
        const headerRow = columns.map(c => shared.escapeCSV(c.label)).join(',');
        const bodyRows = people.map(p => columns.map(c => shared.escapeCSV(shared.getCsvValue(p, c.key))).join(',')).join('\n');
        const csvContent = BOM + headerRow + '\n' + bodyRows;
        const timestamp = new Date().toISOString().split('T')[0];
        shared.downloadFile(csvContent, `linkedin_profiles_${timestamp}.csv`, 'text/csv;charset=utf-8');
      }
    
      const mod = { exportToCsv };
      if (typeof module!=='undefined' && module.exports) {
        module.exports = mod;
      }
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportCsv = mod;
      if (typeof window!=='undefined') window.exportToCsv = exportToCsv;
    })();

    // Export HTML
    ;
    (function(){
      'use strict';
    
      function getShared() {
        if (typeof module!=='undefined' && module.exports) {
          try { return require('./shared'); } catch(_) { return {}; }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.exportShared || {};
      }
      function getThemeModule() {
        if (typeof module!=='undefined' && module.exports) {
          try { return require('../theme'); } catch(_) {}
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.theme || {};
      }
      function getUiStylesModule() {
        if (typeof module!=='undefined' && module.exports) {
          try { return require('../ui/styles'); } catch(_) {}
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.uiStyles || {};
      }
    
      const shared = getShared();
    
      function exportToHtml(people) {
        if (!people || people.length===0) {
          alert('No data to export');
          return;
        }
        const columns = shared.getPersonColumns();
        const themeModule = getThemeModule();
        const uiStylesModule = getUiStylesModule();
        const cssVars = (themeModule && typeof themeModule.getCssVariablesCss === 'function')
          ? themeModule.getCssVariablesCss(':root', themeModule.getActiveTokens ? themeModule.getActiveTokens() : undefined)
          : '';
        const baseCss = (uiStylesModule && uiStylesModule.UI_BASE_CSS) ? uiStylesModule.UI_BASE_CSS : '';
        const scopedBaseCss = baseCss
            .replace(/#linkedin-scraper-ui\s*\{[\s\S]*?\}/g, '')
            .replace(/#linkedin-scraper-ui\s*\*\s*\{[\s\S]*?\}/g, '');
    
        const escapeHtml = (str) => {
          const div = document.createElement('div');
          div.textContent = str || '';
          return div.innerHTML;
        };
        const renderHtmlCell = (person, column) => {
          const value = shared.getDisplayValue(person, column.key);
          if (column.key === 'profileUrl') {
            if (!value) return '<span class="no-data">-</span>';
            const safeUrl = escapeHtml(String(value));
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="profile-link">${safeUrl}</a>`;
          }
          if (column.key === 'followers') {
            if (typeof value === 'string' && value.trim()) return escapeHtml(value);
            if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString();
            return '<span class="no-data">-</span>';
          }
          if (!value) return '<span class="no-data">-</span>';
          return escapeHtml(String(value));
        };
        const headerCells = columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
        const bodyRows = people.map(p => {
          const cells = columns.map(c => {
            const content = renderHtmlCell(p, c);
            const cellClass = c.key === 'followers' ? 'followers' : '';
            return cellClass ? `<td class="${cellClass}">${content}</td>` : `<td>${content}</td>`;
          }).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
    
        const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <title>LinkedIn Profiles Export</title>
      <style>
        ${cssVars}
        html{ color-scheme: light; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body{ background:var(--ef-bg0); padding:20px; color:var(--ef-fg); }
        .export-scope, .export-scope *{
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;
          color:var(--ef-fg);
          box-sizing:border-box;
        }
        .container{
          max-width:1400px; margin:0 auto; background:var(--ef-bg1);
          border:1px solid var(--ef-bg3); border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.4); overflow:hidden;
        }
        h1{ background:var(--ef-bg0); color:var(--ef-aqua); padding:20px; font-size:24px; }
        .meta{ padding:15px 20px; background:var(--ef-bg0); border-bottom:1px solid var(--ef-bg3); font-size:14px; color:var(--ef-grey1); }
        table{ width:100%; border-collapse:collapse; }
        ${scopedBaseCss}
        .followers{ text-align:right; font-weight:500; color:var(--ef-fg); white-space:nowrap; }
        .no-data{ color:var(--ef-grey1); font-style:italic; }
      </style>
    </head>
    <body>
      <div class="export-scope container">
        <h1>LinkedIn Profiles Export</h1>
        <div class="meta"><strong>Export Date:</strong> ${new Date().toLocaleDateString()} | <strong>Total Profiles:</strong> ${people.length}</div>
        <table class="results-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
      </div>
    </body>
    </html>`;
        const timestamp = new Date().toISOString().split('T')[0];
        shared.downloadFile(htmlContent, `linkedin_profiles_${timestamp}.html`, 'text/html;charset=utf-8');
      }
    
      const mod = { exportToHtml };
      if (typeof module!=='undefined' && module.exports) module.exports = mod;
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportHtml = mod;
      if (typeof window!=='undefined') window.exportToHtml = exportToHtml;
    })();


    // Export utilities
    ;
    /**
     * Utilities module re-exporting exporters and shared helpers
     */
    (function() {
        'use strict';
    
        function getThemeModule() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./theme'); } catch (e) { /* ignore */ }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const modules = root.LinkedInScraperModules || {};
            return modules.theme || {};
        }
    
        // Export helpers come from export/shared.js + export/{csv,html}.js
        function getExportShared() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/shared'); } catch (e) { /* ignore */ }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportShared || {};
        }
    
        function getPersonColumns() {
            try {
                if (typeof module !== 'undefined' && module.exports) {
                    const schema = require('./schema/columns');
                    if (schema && Array.isArray(schema.PERSON_COLUMNS)) return schema.PERSON_COLUMNS;
                }
            } catch (error) { /* ignore */ }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const modules = root.LinkedInScraperModules || {};
            const schema = modules.schema || {};
            return Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : [];
        }
    
        // Re-export shared helpers and exporters to keep back-compat
        const shared = getExportShared();
        const downloadFile = typeof shared.downloadFile === 'function' ? shared.downloadFile : function(){};
        function getExportCsv() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/csv'); } catch (e) { return {}; }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportCsv || {};
        }
        function getExportHtml() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/html'); } catch (e) { return {}; }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportHtml || {};
        }
    
        const utilsModule = {
            getPersonColumns,
            downloadFile,
            // Back-compat re-exports so UI keeps working
            exportToCsv: getExportCsv().exportToCsv || null,
            exportToHtml: getExportHtml().exportToHtml || null
        };
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = utilsModule;
        }
    
        const utilsRoot = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});
    
        utilsRoot.LinkedInScraperModules = utilsRoot.LinkedInScraperModules || {};
        utilsRoot.LinkedInScraperModules.utils = utilsModule;
    
        if (typeof window !== 'undefined') {
            const csv = getExportCsv().exportToCsv;
            const html = getExportHtml().exportToHtml;
            if (typeof csv === 'function') window.exportToCsv = csv;
            if (typeof html === 'function') window.exportToHtml = html;
            window.downloadFile = downloadFile;
        }
    
    })();


    // UI base styles (token-agnostic)
    ;
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
                background: rgba(255, 251, 239, 0.98);
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
                font-size: 18px;
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
                overflow-y: auto;
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
            .results-table tr:hover { background: rgba(58, 148, 197, 0.10); }
    
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
                color: #FFFBEF;
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
    
            .results-table-container::-webkit-scrollbar { width: 8px; }
            .results-table-container::-webkit-scrollbar-track { background: var(--ef-bg1); }
            .results-table-container::-webkit-scrollbar-thumb { background: var(--ef-bg3); border-radius: 4px; }
            .results-table-container::-webkit-scrollbar-thumb:hover { background: var(--ef-visual); }
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


    // UI components
    ;
    (function() {
        'use strict';
    
    
        function getUtilsModule() {
            if (typeof module !== 'undefined' && module.exports) {
                try {
                    return require('./utils');
                } catch (error) {
                    // Ignore resolve errors when running in Node
                    return {};
                }
            }
    
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
    
            const modules = root.LinkedInScraperModules || {};
            return modules.utils || {};
        }
    
        function getThemeModule() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./theme'); } catch (e) { /* ignore */ }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const modules = root.LinkedInScraperModules || {};
            return modules.theme || {};
        }
    
        function getUiStylesModule() {
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./ui/styles'); } catch (e) { /* ignore */ }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const modules = root.LinkedInScraperModules || {};
            return modules.uiStyles || {};
        }
    
        function getExportHandler(utilsModule, name) {
            if (utilsModule && typeof utilsModule[name] === 'function') {
                return utilsModule[name];
            }
    
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
    
            const fallback = root[name];
            return typeof fallback === 'function' ? fallback : null;
        }
    
        function resolvePersonColumns(utilsModule) {
            const root = typeof globalThis !== 'undefined'
                ? globalThis
                : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            const schema = mods.schema || {};
            const columns = Array.isArray(schema.PERSON_COLUMNS) ? schema.PERSON_COLUMNS : null;
            if (columns && columns.length) return columns;
            // Last-resort fallback to a minimal set if schema not present
            return [{ key:'name',label:'Name'},{ key:'profileUrl',label:'Profile URL'}];
        }
    
        const utilsModule = getUtilsModule();
        const themeModule = getThemeModule();
        const uiStylesModule = getUiStylesModule();
    
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
                this.columns = resolvePersonColumns(utilsModule);
            }
    
            resolveHandlers() {
                const utilsModule = getUtilsModule();
                return {
                    csv: getExportHandler(utilsModule, 'exportToCsv'),
                    html: getExportHandler(utilsModule, 'exportToHtml')
                };
            }
            
            init() {
                if (document.getElementById('linkedin-scraper-ui')) {
                    this.destroy();
                }
                // Inject base CSS (structure/layout), then apply theme tokens
                if (uiStylesModule && typeof uiStylesModule.injectUiBaseStyles === 'function') {
                    uiStylesModule.injectUiBaseStyles();
                }
                this.createContainer();
                this.createHeader();
                this.createProgressSection();
                this.createResultsSection();
                this.createExportSection();
                this.attachEventListeners();
                
                if (themeModule && typeof themeModule.applyTheme === 'function') {
                    themeModule.applyTheme(this.container);
                }
    
                document.body.appendChild(this.container);
            }
            
            // createStyles() removed; UI now uses ui/styles.js + theme for CSS
            
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
                const headerCells = this.columns.map(column => `<th>${column.label}</th>`).join('');
                thead.innerHTML = `<tr>${headerCells}</tr>`;
                
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
                csvButton.dataset.exportType = 'csv';
                csvButton.textContent = 'Export CSV';
                csvButton.disabled = true;
                csvButton.onclick = () => {
                    const { csv } = this.resolveHandlers();
                    if (csv) { csv(this.people); }
                    else { this.showError('Export to CSV is not available yet.'); }
                };
                
                const htmlButton = document.createElement('button');
                htmlButton.className = 'export-button';
                htmlButton.dataset.exportType = 'html';
                htmlButton.textContent = 'Export HTML';
                htmlButton.disabled = true;
                htmlButton.onclick = () => {
                    const { html } = this.resolveHandlers();
                    if (html) { html(this.people); }
                    else { this.showError('Export to HTML is not available yet.'); }
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
    
            setCellEmpty(cell) {
                cell.textContent = '-';
                cell.classList.add('empty');
            }
    
            createCellForColumn(column, person) {
                const cell = document.createElement('td');
                const value = person ? person[column.key] : null;
    
                if (column.key === 'profileUrl') {
                    if (value) {
                        const link = document.createElement('a');
                        link.href = value;
                        link.textContent = value;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.className = 'profile-link';
                        cell.appendChild(link);
                        cell.title = value;
                    } else {
                        this.setCellEmpty(cell);
                    }
                    return cell;
                }
    
                if (column.key === 'followers') {
                    if (typeof value === 'string' && value.trim()) {
                        cell.textContent = value;                // e.g., "30K followers"
                        cell.classList.add('followers');
                    } else if (typeof value === 'number' && Number.isFinite(value)) {
                        cell.textContent = value.toLocaleString();
                        cell.classList.add('numeric');
                    } else {
                        this.setCellEmpty(cell);
                    }
                    return cell;
                }
    
                if (value == null || String(value).trim() === '') {
                    this.setCellEmpty(cell);
                    return cell;
                }
    
                const textValue = String(value).trim();
                cell.textContent = textValue;
                cell.title = textValue;
                return cell;
            }
    
            addRow(person) {
                this.people.push(person);
    
                const row = document.createElement('tr');
                this.columns.forEach(column => {
                    const cell = this.createCellForColumn(column, person);
                    row.appendChild(cell);
                });
    
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
                if (people) this.people = people;
                const { csv, html } = this.resolveHandlers();
                this.exportButtons.forEach(btn => {
                    btn.disabled = btn.dataset.exportType === 'csv' ? !csv : !html;
                });
            }
            
            destroy() {
                if (this.container && this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
                // Keep shared base/theme styles in DOM; they are idempotent and used across sessions.
            }
        }
    
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = ScraperUI;
        } else {
            window.ScraperUI = ScraperUI;
        }
    
    })();


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
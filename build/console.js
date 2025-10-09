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
 * 7. Click Export CSV / Export HTML / Export JSON buttons
 * 
 * REQUIREMENTS:
 * - Must be on linkedin.com/search/results/people page
 * - Must be logged in to LinkedIn
 * 
 * FEATURES:
 * - Scrapes profile data from LinkedIn search results
 * - Handles rate limiting automatically
 * - Exports to CSV, HTML, or JSON format
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
            { key: 'urnCode', label: 'URN Code' },
            // ---- Profile enrichment (About)
            { key: 'about', label: 'About' },
            // ---- Experience (merged 1–3)
            { key: 'exp1', label: 'Experience 1' },
            { key: 'exp2', label: 'Experience 2' },
            { key: 'exp3', label: 'Experience 3' },
            // ---- Education (merged 1–3)
            { key: 'edu1', label: 'Education 1' },
            { key: 'edu2', label: 'Education 2' },
            { key: 'edu3', label: 'Education 3' },
            // ---- New fields
            { key: 'skills', label: 'Skills' },
            { key: 'programmingLanguages', label: 'Programming Languages' },
            { key: 'licenses', label: 'Licenses & Certs' },
            { key: 'volunteering', label: 'Volunteering' },
            { key: 'organizations', label: 'Organizations' }
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
            '--ef-statusline3': '#E66868',
            // Scrollbar + brand accents
            '--ef-orange': '#F57D26',
            '--ef-scrollbar-thumb': 'var(--ef-orange)',
            '--ef-scrollbar-track': 'var(--ef-bg1)',
            // UI surface with slight translucency; falls back to bg0 if missing
            '--ef-panel-bg': 'rgba(255, 251, 239, 0.98)',
            // === Font size tokens (NEW) ===
            // Exported HTML
            '--ef-font-export-h1': '24px',
            '--ef-font-export-th': '13px',
            // In-page UI
            '--ef-font-ui-title': '18px',
            '--ef-font-ui-th': '13px'
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
            // Expose tokens both on :root and on the UI container.
            // This ensures pseudo-elements like ::-webkit-scrollbar can resolve vars,
            // matching the exported HTML behavior.
            const scope = ':root, #linkedin-scraper-ui';
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


    // Shared resolver
    ;
    (function(){
      'use strict';
    
      function getRoot(){
        return (typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {}));
      }
    
      function getNamespace(root){
        root.LinkedInScraperModules = root.LinkedInScraperModules || {};
        return root.LinkedInScraperModules;
      }
    
      /**
       * resolve(requirePath, globalKey)
       * Attempts CommonJS require first (Node/build), then falls back to
       * LinkedInScraperModules[globalKey] in the browser.
       */
      function resolve(requirePath, globalKey){
        if (typeof module!=='undefined' && module.exports){
          try { return require(requirePath); } catch(_) {}
        }
        const root = getRoot();
        const ns = getNamespace(root);
        return ns[globalKey] || {};
      }
    
      const mod = { resolve, getRoot, getNamespace };
    
      if (typeof module!=='undefined' && module.exports) module.exports = mod;
      const root = getRoot();
      getNamespace(root).modResolver = mod;
    })();


    // Auth
    ;
    (function(){
      'use strict';
    
      function getCsrfToken(){
        const cookieStr = (typeof document!=='undefined' ? document.cookie : '') || '';
        const cookies = cookieStr.split(';');
        for (let cookie of cookies){
          const [name, value] = cookie.trim().split('=');
          if (name === 'JSESSIONID'){
            const clean = String(value||'').replace(/\"/g,'').replace(/"/g,'');
            try { return decodeURIComponent(clean); } catch { return clean; }
          }
        }
        return null;
      }
    
      const mod = { getCsrfToken };
      if (typeof module!=='undefined' && module.exports) module.exports = mod;
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.auth = mod;
    })();


    // Build URL
    ;
    (function() {
        'use strict';
    
        function getModResolver(){
            if (typeof module!=='undefined' && module.exports){
                try { return require('../shared/modResolver'); } catch(_) { /* ignore */ }
            }
            const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.modResolver || { resolve: function(){ return {}; } };
        }
    
        const modResolver = getModResolver();
    
        function getAuth(){
            const auth = modResolver.resolve('./auth','auth');
            return auth && typeof auth === 'object' ? auth : {};
        }
        function cleanValue(raw) {
            let clean = String(raw || '');
            if (clean.startsWith('[') && clean.endsWith(']')) clean = clean.slice(1, -1);
            if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
            clean = clean.replace(/"/g, '');
            return clean;
        }
    
        function isDebug(){
            try {
                const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
                const ls = root.localStorage;
                return !!(ls && ls.getItem && ls.getItem('li_scraper_debug'));
            } catch { return false; }
        }
    
        function buildLinkedInSearchUrl({ keyword = '', start = 0, count = 10 }) {
            const urlParams = new URLSearchParams(window.location.search);
            if (isDebug()){
                console.log('=== Building LinkedIn API URL ===');
                console.log('Current URL:', window.location.href);
            }
    
            const excludeParams = [
                'keywords', 'origin', 'sid', '_sid', 'trk', '_trk', 'lipi', 'lici'
            ];
    
            const queryParamsList = [];
            urlParams.forEach((value, key) => {
                if (!excludeParams.includes(key) && value) {
                    const clean = cleanValue(value);
                    queryParamsList.push(`(key:${key},value:List(${clean}))`);
                    if (isDebug()){
                        console.log('Added parameter:', key, '=', clean);
                    }
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
            if (isDebug()){
                console.log('Final URL:', finalUrl);
                console.log('=============================');
            }
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
    
        // NEW: request builder (URL + headers) used by fetch
        function buildVoyagerRequest({ keyword = '', start = 0, count = 10 }) {
            const url = buildLinkedInSearchUrl({ keyword, start, count });
            const headers = {
                'x-restli-protocol-version': '2.0.0',
                'accept': 'application/vnd.linkedin.normalized+json+2.1'
            };
            const csrf = getAuth().getCsrfToken ? getAuth().getCsrfToken() : null;
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

    // Profile lib
    ;
    (function(){
      'use strict';
    
      // NOTE: this patch adds promo/highlight filters to avoid false Education matches.
      function getModResolver(){
        if (typeof module!=='undefined' && module.exports){
          try { return require('../shared/modResolver'); } catch(_) { /* ignore */ }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.modResolver || { resolve: function(){ return {}; } };
      }
    
      const modResolver = getModResolver();
    
      function getAuth(){
        const auth = modResolver.resolve('./auth','auth');
        return auth && typeof auth === 'object' ? auth : {};
      }
    
      // -- URL builder for profile GraphQL
      function buildProfileUrl(urnId){
        // urnId like "ACoAABxSf60B8FuXw29q6dU2BWvmGAdGUie4MYI"
        const encodedUrn = encodeURIComponent(`urn:li:fsd_profile:${urnId}`).replace(/%3A/g, '%3A');
        const variables = `variables=(profileUrn:${encodedUrn})`;
        const queryId  = 'queryId=voyagerIdentityDashProfileCards.f0415f0ff9d9968bab1cd89c0352f7c8';
        return `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&${variables}&${queryId}`;
      }
    
      async function fetchProfileJson(urnId, csrfToken){
        const url = buildProfileUrl(urnId);
        const headers = {
          'x-restli-protocol-version': '2.0.0',
          'accept': 'application/vnd.linkedin.normalized+json+2.1'
        };
        const auth = getAuth();
        const token = csrfToken || (auth && typeof auth.getCsrfToken==='function' ? auth.getCsrfToken() : null);
        if (token) headers['csrf-token'] = token;
    
        const res = await fetch(url, { method:'GET', headers, credentials:'include' });
        if (res.status === 429) throw new Error('RATE_LIMIT');
        if (!res.ok) {
          const body = await res.text().catch(()=> '');
          console.error('[Profile] HTTP', res.status, body.slice(0,500));
          throw new Error(`HTTP ${res.status}`);
        }
        let data;
        try { data = await res.json(); }
        catch (e) {
          const clone = res.clone();
          const body = await clone.text().catch(()=> '');
          console.error('[Profile] Non-JSON body:', body.slice(0,500));
          throw e;
        }
        const rawIncluded = data?.included ?? data?.data?.included ?? [];
        const included = Array.isArray(rawIncluded) ? rawIncluded : [];
        return { data, included };
      }
    
      // -----------------------------
      // Helpers for robust extraction
      // -----------------------------
      function safeText(v){
        return (typeof v === 'string') ? v.trim() : '';
      }
      function t(node, path){
        const val = get(node, path);
        return safeText(val);
      }
      function isCard(node){
        const type = get(node, '$type') || '';
        return typeof type === 'string' && /\.tetris\.Card$/.test(type);
      }
      function cardSectionOf(node){
        const urn = t(node, 'entityUrn');
        // urn looks like: urn:li:fsd_profileCard:(<id>,SECTION,en_US)
        const m = /,([^,]+),en_US\)/.exec(urn);
        return m ? m[1] : null;
      }
      function isLogoOnlyEntity(node){
        // Ignore pure image/logo entries lacking textual signal
        const controlName = t(node, 'components.entityComponent.controlName');
        const title = t(node, 'components.entityComponent.titleV2.text.accessibilityText') ||
                      t(node, 'components.entityComponent.titleV2.text.text');
        const subtitle = t(node, 'components.entityComponent.subtitle.accessibilityText') ||
                         t(node, 'components.entityComponent.subtitle.text');
        const looksLikeLogo = /^entity_image_/.test(controlName) ||
          /logo/i.test(t(node, 'components.entityComponent.image.accessibilityText'));
        return looksLikeLogo && !safeText(title) && !safeText(subtitle);
      }
      function getSectionLists(included, section){
        const out = [];
        for (const item of included){
          if (!isCard(item)) continue;
          if (cardSectionOf(item) !== section) continue;
          walk(item, (n)=>{
            const list = get(n, 'fixedListComponent.components');
            if (Array.isArray(list) && list.length) out.push(list);
          });
        }
        return out;
      }
    
      // --- Generic deep walker utilities
      function walk(node, visitor){
        if (!node || typeof node !== 'object') return;
        visitor(node);
        for (const k in node){
          const v = node[k];
          if (!v) continue;
          if (Array.isArray(v)) { for (const item of v) walk(item, visitor); }
          else if (typeof v === 'object') walk(v, visitor);
        }
      }
      function get(obj, pathStr){
        if (!obj) return undefined;
        const parts = pathStr.split('.');
        let cur = obj;
        for (const p of parts){
          if (cur == null) return undefined;
          const idx = /^\d+$/.test(p) ? Number(p) : p;
          cur = cur[idx];
        }
        return cur;
      }
      function firstNonEmpty(...candidates){
        for (const c of candidates){
          if (typeof c === 'string' && c.trim()) return c.trim();
        }
        return null;
      }
    
      // --- NEW: filters to exclude Sales Navigator highlights / upsell / media cards ---
      const DISALLOWED_CONTROL_NAMES = new Set([
        'highlights_sn_recent_posts_on_linkedin',
        'sales_navigator_profile_highlights_upsell_click',
        'experience_company_logo',                      // not education
        'entity_image_licenses_and_certifications',     // not education
        'entity_image_volunteer_experiences',           // not education
        'experience_media',                             // not education
        'experience_media_roll_up'                      // not education
      ]);
    
      function hasDisallowedControl(node){
        const cn =
          get(node, 'components.entityComponent.controlName') ||
          get(node, 'controlName') || '';
        return typeof cn === 'string' && DISALLOWED_CONTROL_NAMES.has(cn);
      }
    
      // Typical promo strings we saw in highlight cards.
      const PROMO_RE = /(recently posted on linkedin|free insight from sales navigator|understand what topics .* posts)/i;
    
      function isPromoOrHighlight(node){
        if (hasDisallowedControl(node)) return true;
        const textBlob = [
          get(node, 'components.entityComponent.titleV2.text.accessibilityText'),
          get(node, 'components.entityComponent.subtitle.accessibilityText'),
          get(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText'),
          get(node, 'subtitle.accessibilityText'),
          get(node, 'titleV2.text.accessibilityText')
        ].filter(Boolean).join(' ');
        if (PROMO_RE.test(String(textBlob))) return true;
        const upsell = get(node, 'textActionTarget') || '';
        if (typeof upsell === 'string' && /sales_navigator_profile_highlights_upsell/i.test(upsell)) return true;
        // presence of premiumUpsellComponent in the subtree/siblings is also a strong signal
        if (get(node, 'components.premiumUpsellComponent')) return true;
        return false;
      }
    
      // ---- Heuristics for locating sections
      function pickAboutText(included){
        // Find any reasonably long textComponent within a "card"/"topComponents" subtree
        const texts = [];
        for (const item of included){
          if (!item || typeof item !== 'object') continue;
          const bucket = [];
          walk(item, (n)=>{
            const text = get(n, 'textComponent.text.accessibilityText') || get(n, 'text.text.accessibilityText');
            if (typeof text === 'string') {
              const t = text.trim();
              // Avoid Sales Navigator highlight/upsell copy
              if (t && t.length >= 40 && !PROMO_RE.test(t)) bucket.push(t);
            }
          });
          if (bucket.length) texts.push(bucket.sort((a,b)=>b.length-a.length)[0]);
        }
        if (!texts.length) return null;
        const about = texts.sort((a,b)=>b.length-a.length)[0];
        return about || null;
      }
    
      function collectFixedLists(included){
        // Return arrays of list nodes likely belonging to Experience or Education
        const lists = [];
        for (const item of included){
          walk(item, (n)=>{
            const list = get(n, 'fixedListComponent.components');
            if (Array.isArray(list) && list.length){
              lists.push(list);
            }
          });
        }
        return lists;
      }
    
      function looksLikeExperienceEntity(node){
        // entityComponent with nested subComponents containing another entityComponent (position)
        return !!get(node, 'components.entityComponent.subComponents.components.0.components.entityComponent.titleV2.text.accessibilityText');
      }
      function looksLikeEducationEntity(node){
        // Exclude Sales Navigator highlights / upsell and other non-education entities early
        if (isPromoOrHighlight(node)) return false;
        const hasDegreeOrSub = !!firstNonEmpty(
          get(node, 'components.entityComponent.subtitle.accessibilityText'),
          get(node, 'components.entityComponent.titleV2.text.accessibilityText')
        );
        const hasGradeOrDesc = !!firstNonEmpty(
          get(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText'),
          get(node, 'components.entityComponent.subComponents.components.1.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText')
        );
        return hasDegreeOrSub || hasGradeOrDesc;
      }
    
      function parseExperiencesFromList(list){
        const out = [];
        for (const node of list){
          const companyName = get(node, 'components.entityComponent.titleV2.text.accessibilityText') || null;
          const duration    = get(node, 'components.entityComponent.subtitle.accessibilityText') || null;
          const positionTitle = get(node, 'components.entityComponent.subComponents.components.0.components.entityComponent.titleV2.text.accessibilityText') || null;
          const positionDuration = get(node, 'components.entityComponent.subComponents.components.0.components.entityComponent.caption.accessibilityText') || null;
          const jobDescription = get(node, 'components.entityComponent.subComponents.components.0.components.entityComponent.subComponents.components.0.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') || null;
    
          if (!firstNonEmpty(companyName, positionTitle, duration, jobDescription)) continue;
          out.push({ companyName, duration, positionTitle, positionDuration, jobDescription });
          if (out.length >= 3) break; // only first 3
        }
        return out;
      }
    
      function parseEducationFromList(list){
        const out = [];
        for (const node of list){
          // Skip highlights/upsell/media cards outright
          if (isPromoOrHighlight(node)) continue;
          const institutionName = get(node, 'components.entityComponent.titleV2.text.accessibilityText') || null;
          const degree          = get(node, 'components.entityComponent.subtitle.accessibilityText') || null;
          const grade           = get(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText') || null;
          const educationDescription = get(node, 'components.entityComponent.subComponents.components.1.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') || null;
    
          // Guard against promo copy parsed as education fields
          const text = [institutionName, degree, grade, educationDescription].filter(Boolean).join(' ');
          if (PROMO_RE.test(text)) continue;
          if (!firstNonEmpty(institutionName, degree, grade, educationDescription)) continue;
          out.push({ institutionName, degree, grade, educationDescription });
          if (out.length >= 3) break; // only first 3
        }
        return out;
      }
    
      // -----------------------------
      // New section parsers
      // -----------------------------
      function parseVolunteeringFromList(list){
        const out = [];
        for (const node of list){
          if (isPromoOrHighlight(node) || isLogoOnlyEntity(node)) continue;
          const role = t(node, 'components.entityComponent.titleV2.text.accessibilityText');
          const organization = t(node, 'components.entityComponent.subtitle.accessibilityText');
          const duration = t(node, 'components.entityComponent.caption.accessibilityText');
          const description =
            t(node, 'components.entityComponent.subComponents.components.0.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') ||
            t(node, 'components.entityComponent.subComponents.components.0.components.textComponent.text.accessibilityText') || '';
          if (!firstNonEmpty(role, organization, duration, description)) continue;
          out.push({ role, organization, duration, description });
        }
        return out;
      }
    
      function parseLicensesFromList(list){
        const out = [];
        for (const node of list){
          if (isPromoOrHighlight(node) || isLogoOnlyEntity(node)) continue;
          const name = t(node, 'components.entityComponent.titleV2.text.accessibilityText');
          const issuer = t(node, 'components.entityComponent.subtitle.accessibilityText');
          const issuedOn = t(node, 'components.entityComponent.caption.accessibilityText');
          // Optional extra detail (rare):
          const note = t(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText') || '';
          if (!firstNonEmpty(name, issuer, issuedOn, note)) continue;
          out.push({ name, issuer, issuedOn, note });
        }
        return out;
      }
    
      const PROG_LANG_SET = (function(){
        const names = [
          'c','c++','c#','go','golang','rust','python','java','kotlin','swift','objective-c',
          'javascript','typeScript','php','ruby','perl','scala','haskell','elixir','erlang','julia',
          'matlab','r','dart','lua','solidity','shell','bash','powershell','fortran','cobol','sql','pl/sql',
          'groovy','vb','vb.net','visual basic'
        ];
        return new Set(names.map(s=>s.toLowerCase()));
      })();
      function normalizeLangName(s){
        return safeText(s).replace(/\s+/g,' ').trim();
      }
      function parseProgrammingLanguagesFromList(list){
        const out = [];
        for (const node of list){
          if (isPromoOrHighlight(node)) continue;
          const name = normalizeLangName(
            t(node, 'components.entityComponent.titleV2.text.accessibilityText') ||
            t(node, 'components.entityComponent.titleV2.text.text')
          );
          if (!name) continue;
          // Only keep entries that look like programming languages
          const key = name.toLowerCase();
          if (!PROG_LANG_SET.has(key)) continue;
          const proficiency = normalizeLangName(
            t(node, 'components.entityComponent.caption.accessibilityText') ||
            t(node, 'components.entityComponent.caption.text')
          );
          out.push({ name, proficiency });
        }
        return out;
      }
    
      function pickSkillsFromAbout(included){
        // About card contains "Top skills" entity with bullet-separated subtitle
        for (const item of included){
          if (!isCard(item) || cardSectionOf(item) !== 'ABOUT') continue;
          let subtitle = '';
          walk(item, (n)=>{
            const title = t(n, 'entityComponent.titleV2.text.accessibilityText') || t(n, 'entityComponent.titleV2.text.text');
            if (/^top skills$/i.test(title)){
              const sub = t(n, 'entityComponent.subtitleV2.text.accessibilityText') ||
                          t(n, 'entityComponent.subtitleV2.text.text') ||
                          t(n, 'entityComponent.subtitle.accessibilityText') ||
                          t(n, 'entityComponent.subtitle.text');
              if (sub) subtitle = sub;
            }
          });
          if (subtitle){
            const parts = subtitle.split(/[•·,]|\s{2,}/).map(s=>s.trim()).filter(Boolean);
            // de-dupe while preserving order
            const seen = new Set(); const skills = [];
            for (const p of parts){ const k=p.toLowerCase(); if (!seen.has(k)){ seen.add(k); skills.push(p); } }
            return skills;
          }
        }
        return [];
      }
    
      function parseOrganizationsFromLists(lists){
        const out = [];
        for (const list of lists){
          for (const node of list){
            if (isPromoOrHighlight(node) || isLogoOnlyEntity(node)) continue;
            const name = t(node, 'components.entityComponent.titleV2.text.accessibilityText') ||
                         t(node, 'components.entityComponent.titleV2.text.text');
            const roleOrDetail = t(node, 'components.entityComponent.subtitle.accessibilityText') ||
                                 t(node, 'components.entityComponent.subtitle.text');
            const duration = t(node, 'components.entityComponent.caption.accessibilityText') ||
                             t(node, 'components.entityComponent.caption.text');
            if (!firstNonEmpty(name, roleOrDetail, duration)) continue;
            out.push({ name, roleOrDetail, duration });
          }
        }
        return out;
      }
    
      function parseProfile(included){
        const about = pickAboutText(included);
    
        // Experience by card section
        let experiences = [];
        for (const list of getSectionLists(included, 'EXPERIENCE')) {
          const items = parseExperiencesFromList(list);
          if (items && items.length) experiences = experiences.concat(items);
        }
        experiences = experiences.slice(0, 3);
    
        // Education by card section
        let education = [];
        for (const list of getSectionLists(included, 'EDUCATION')) {
          const items = parseEducationFromList(list);
          if (items && items.length) education = education.concat(items);
        }
        education = education.slice(0, 3);
    
        // Volunteering by card section
        let volunteering = [];
        for (const list of getSectionLists(included, 'VOLUNTEERING_EXPERIENCE')) {
          const items = parseVolunteeringFromList(list);
          if (items && items.length) volunteering = volunteering.concat(items);
        }
    
        // Licenses & Certifications by card section
        let licenses = [];
        for (const list of getSectionLists(included, 'LICENSES_AND_CERTIFICATIONS')) {
          const items = parseLicensesFromList(list);
          if (items && items.length) licenses = licenses.concat(items);
        }
    
        // Programming languages from LANGUAGES card
        let programmingLanguages = [];
        for (const list of getSectionLists(included, 'LANGUAGES')) {
          const items = parseProgrammingLanguagesFromList(list);
          if (items && items.length) programmingLanguages = programmingLanguages.concat(items);
        }
    
        // Organizations by card section
        const orgLists = getSectionLists(included, 'ORGANIZATIONS');
        const organizations = orgLists.length ? parseOrganizationsFromLists(orgLists) : [];
    
        const skills = pickSkillsFromAbout(included);
    
        return { about, experiences, education, volunteering, licenses, skills, programmingLanguages, organizations };
      }
    
      const mod = {
        buildProfileUrl,
        fetchProfileJson,
        parseProfile
      };
    
      if (typeof module!=='undefined' && module.exports) module.exports = mod;
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.profile = mod;
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
                                        person.skills = formatSkills(parsed.skills);
                                        person.programmingLanguages = formatProgrammingLanguages(parsed.programmingLanguages);
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


    // Export shared
    ;
    (function(){
      'use strict';
    
      // --- Columns --------------------------------------------------------------
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
    
      // --- Value accessors ------------------------------------------------------
      function joinNonEmptyLines(parts) {
        return parts
          .map(function (part) {
            var text = part == null ? '' : String(part).trim();
            return text ? text : null;
          })
          .filter(Boolean)
          .join('\n');
      }
    
      function makeExperienceString(person, idx) {
        var prefix = 'exp' + idx + '_';
        return joinNonEmptyLines([
          person[prefix + 'company'],
          person[prefix + 'duration'],
          person[prefix + 'position'],
          person[prefix + 'position_duration'],
          person[prefix + 'description']
        ]);
      }
    
      function makeEducationString(person, idx) {
        var prefix = 'edu' + idx + '_';
        return joinNonEmptyLines([
          person[prefix + 'institution'],
          person[prefix + 'degree'],
          person[prefix + 'grade'],
          person[prefix + 'description']
        ]);
      }
    
      function getCsvValue(person, key) {
        if (!person) return '';
        if (/^exp[1-3]$/.test(key)) {
          var expIndex = Number(key.replace('exp', ''));
          return makeExperienceString(person, expIndex);
        }
        if (/^edu[1-3]$/.test(key)) {
          var eduIndex = Number(key.replace('edu', ''));
          return makeEducationString(person, eduIndex);
        }
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
        if (/^exp[1-3]$/.test(key)) {
          var expIndex = Number(key.replace('exp', ''));
          var expValue = makeExperienceString(person, expIndex);
          return expValue ? expValue : null;
        }
        if (/^edu[1-3]$/.test(key)) {
          var eduIndex = Number(key.replace('edu', ''));
          var eduValue = makeEducationString(person, eduIndex);
          return eduValue ? eduValue : null;
        }
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
    
      // Make HTML-escape available to all exporters/UIs
      function escapeHTML(value){
        if (value === null || value === undefined) return '';
        // If no DOM (Node), fallback to naive escape
        if (typeof document === 'undefined') {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }
        const div = document.createElement('div'); div.textContent = String(value);
        return div.innerHTML;
      }
      // Back-compat alias: older bundles call `escapeHtml` (lowercase "H").
      function escapeHtml(value){
        return escapeHTML(value);
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
        getPersonColumns, getCsvValue, getDisplayValue, escapeCSV, escapeHTML, escapeHtml, downloadFile
      };
    
      if (typeof module!=='undefined' && module.exports) {
        module.exports = mod;
      }
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportShared = mod;
      // Expose a global alias for legacy callers that reference escapeHtml()
      const g = (typeof globalThis!=='undefined') ? globalThis : (typeof window!=='undefined' ? window : {});
      if (g && typeof g.escapeHtml !== 'function' && typeof mod.escapeHTML === 'function') {
        g.escapeHtml = mod.escapeHTML;
      }
    })();

    // Export HTML Sticky
    ;
    (function () {
      'use strict';
    
      // Lightweight resolver (pattern shared across modules)
      function getModResolver() {
        if (typeof module !== 'undefined' && module.exports) {
          try { return require('../shared/modResolver'); } catch (_) {}
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.modResolver || { resolve: function () { return {}; } };
      }
    
      const modResolver = getModResolver();
    
      // Per-column width map (moved from html.js)
      // Keep these widths identical to the original exporter.  :contentReference[oaicite:11]{index=11}
      const COL_WIDTHS = {
        // Core
        name: '180px',
        profileUrl: '260px',
        headline: '220px',
        location: '150px',
        current: '220px',
        followers: '120px',
        urnCode: '160px',
        about: '520px',
        // Experience (1–3)
        exp1: '520px',
        exp2: '520px',
        exp3: '520px',
        exp1_company: '220px',
        exp1_position: '220px',
        exp1_duration: '180px',
        exp1_position_duration: '180px',
        exp1_description: '360px',
        exp2_company: '220px',
        exp2_position: '220px',
        exp2_duration: '180px',
        exp2_position_duration: '180px',
        exp2_description: '360px',
        exp3_company: '220px',
        exp3_position: '220px',
        exp3_duration: '180px',
        exp3_position_duration: '180px',
        exp3_description: '360px',
        // Education (1–3)
        edu1: '420px',
        edu2: '420px',
        edu3: '420px',
        edu1_institution: '220px',
        edu1_degree: '180px',
        edu1_grade: '140px',
        edu1_description: '280px',
        edu2_institution: '220px',
        edu2_degree: '180px',
        edu2_grade: '140px',
        edu2_description: '280px',
        edu3_institution: '220px',
        edu3_degree: '180px',
        edu3_grade: '140px',
        edu3_description: '280px',
        // Additional sections
        skills: '260px',
        programmingLanguages: '260px',
        licenses: '420px',
        volunteering: '420px',
        organizations: '360px'
      };
    
      function renderColGroup(columns, widths) {
        const W = widths || COL_WIDTHS;
        return '<colgroup>' + columns.map(function (c) {
          var w = W[c.key];
          return w ? '<col style="width:' + w + ';" />' : '<col />';
        }).join('') + '</colgroup>';
      }
    
      // Defaults: freeze Name and Profile URL (same behavior as before).  :contentReference[oaicite:12]{index=12}
      const DEFAULT_STICKY_KEYS = ['name', 'profileUrl'];
    
      function parsePx(v) {
        const n = parseInt(String(v || '').replace('px', ''), 10);
        return Number.isFinite(n) ? n : 0;
      }
    
      // Compute left offsets from ordered columns + width map, limited to sticky keys.
      function computeStickyOffsets(columns, widths, stickyKeys) {
        const W = widths || COL_WIDTHS;
        const keys = stickyKeys || DEFAULT_STICKY_KEYS;
        const map = {};
        let left = 0;
        for (const col of columns) {
          const k = col && col.key;
          if (k && keys.indexOf(k) !== -1) {
            map[k] = { left: left + 'px' };
            left += parsePx(W[k]);
          }
        }
        return map;
      }
    
      // Sticky CSS (moved out of BASE_STYLES in html.js).  :contentReference[oaicite:13]{index=13}
      const STICKY_CSS = [
        '.sticky-col { position: sticky; z-index: 1; background: inherit; box-shadow: 1px 0 0 rgba(15, 23, 42, 0.06) inset; }',
        'thead th.sticky-col { z-index: 5; background: var(--ef-bg2, #f2efdf); }'
      ].join('\n');
    
      // Factory returning everything html.js needs in one go.
      function createSticky(columns, opts) {
        const widths = (opts && opts.widths) || COL_WIDTHS;
        const stickyKeys = (opts && opts.stickyKeys) || DEFAULT_STICKY_KEYS;
        const offsets = computeStickyOffsets(columns, widths, stickyKeys);
        const orderedSticky = stickyKeys.filter(k => k in offsets);
    
        function stickyAttrsFor(column) {
          const key = column && column.key;
          if (!key || !(key in offsets)) return { cls: '', style: '' };
          const idx = orderedSticky.indexOf(key) + 1; // 1-based like before
          return { cls: ' sticky-col sticky-col-' + idx, style: 'left:' + offsets[key].left + ';' };
        }
    
        return {
          colgroup: renderColGroup(columns, widths),
          stickyAttrsFor,
          css: STICKY_CSS,
          widths,
          stickyKeys
        };
      }
    
      const mod = {
        COL_WIDTHS,
        DEFAULT_STICKY_KEYS,
        renderColGroup,
        createSticky
      };
    
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
      }
      const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportHtmlSticky = mod;
    })();

    // Export HTML Styles
    ;
    (function () {
      'use strict';
    
      // Base CSS used by the HTML exporter (moved from src/export/html.js)
      const HTML_BASE_CSS = [
        '*, *::before, *::after { box-sizing: border-box; }',
        'body { margin: 0; background: var(--ef-bg0, #ffffff); color: var(--ef-fg, #1f2933); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; }',
        'a { color: var(--ef-blue, #3A94C5); text-decoration: none; }',
        'a:hover { color: var(--ef-aqua, #35A77C); text-decoration: underline; }',
        '.page { padding: 32px clamp(16px, 5vw, 64px) 56px; background: var(--ef-bg0, #ffffff); min-height: 100vh; display: flex; flex-direction: column; gap: 24px; }',
        '.header { display: flex; flex-direction: column; gap: 4px; }',
        '.header h1 { margin: 0; font-size: var(--ef-font-export-h1, 24px); font-weight: 600; color: var(--ef-blue, #3A94C5); }',
        '.header .meta { margin: 0; color: var(--ef-grey1, #939F91); font-size: 13px; }',
        '.table-shell { border: 1px solid var(--ef-bg3, #d7d3c5); border-radius: 12px; background: var(--ef-bg0, #ffffff); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); overflow: hidden; }',
        // Enable both axes scrolling and set Firefox scrollbar colors
        '.table-scroll { max-height: 70vh; overflow: auto; background: inherit; position: relative; scrollbar-color: var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26)) var(--ef-scrollbar-track, var(--ef-bg1, #f8f5e4)); }',
        // WebKit/Chromium scrollbars (both vertical & horizontal)
        '.table-scroll::-webkit-scrollbar { width: 10px; height: 10px; }',
        '.table-scroll::-webkit-scrollbar-track { background: var(--ef-scrollbar-track, var(--ef-bg1, #f8f5e4)); }',
        '.table-scroll::-webkit-scrollbar-thumb { background: var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26)); border-radius: 6px; }',
        '.table-scroll::-webkit-scrollbar-thumb:hover { background: var(--ef-scrollbar-thumb, var(--ef-orange, #F57D26)); }',
        'table { width: 100%; border-collapse: collapse; min-width: 1280px; table-layout: fixed; }',
        'thead th { position: sticky; top: 0; z-index: 3; background: var(--ef-bg2, #f2efdf); color: var(--ef-statusline3, #E66868); padding: 12px 16px; text-align: left; font-weight: 600; font-size: var(--ef-font-export-th, 13px); letter-spacing: 0.01em; border-bottom: 1px solid var(--ef-bg4, #e8e5d5); box-shadow: 0 1px 0 rgba(15, 23, 42, 0.05); }',
        '/* Make both zebra stripes explicit so <td> can inherit a real color */',
        'tbody tr:nth-child(odd) { background: var(--ef-bg0, #ffffff); }',
        'tbody tr:nth-child(even) { background: var(--ef-bg1, #f8f5e4); }',
        'tbody tr:hover { background: var(--ef-visual, #f0f2d4); }',
        'td { padding: 12px 16px; border-bottom: 1px solid var(--ef-bg3, #d7d3c5); white-space: pre-wrap; overflow-wrap: anywhere; color: inherit; vertical-align: top; }',
        'tbody tr:last-child td { border-bottom: none; }',
        'td.numeric { text-align: right; font-variant-numeric: tabular-nums; }',
        'td.empty { color: var(--ef-grey1, #939F91); font-style: italic; text-align: center; }',
        'a.profile-link { word-break: break-word; }',
        '.export-meta { font-size: 12px; color: var(--ef-grey1, #939F91); }',
        '@media (max-width: 768px) { .page { padding: 24px 16px 48px; } thead th, td { padding: 10px 12px; } }',
        '@media print { .page { padding: 24px; box-shadow: none; } .table-shell { box-shadow: none; } .table-scroll { max-height: none; overflow: visible; } thead th { position: static; box-shadow: none; } }'
      ].join('\n');
    
      // Compose the final <style> payload exactly as the exporter expects.
      function composeExportStyles(themeCss, stickyCss) {
        const parts = [];
        if (themeCss) parts.push(themeCss);
        parts.push(HTML_BASE_CSS);
        if (stickyCss) parts.push(stickyCss);
        return parts.join('\n');
      }
    
      const mod = { HTML_BASE_CSS, composeExportStyles };
    
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
      }
    
      const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportHtmlStyles = mod;
    })();

    // Export CSV
    ;
    (function(){
      'use strict';
    
      function getModResolver(){
        if (typeof module!=='undefined' && module.exports){
          try { return require('../shared/modResolver'); } catch(_) { /* ignore */ }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.modResolver || { resolve: function(){ return {}; } };
      }
    
      const modResolver = getModResolver();
      const shared = modResolver.resolve('../export/shared','exportShared') || {};
    
      const getColumns = typeof shared.getPersonColumns === 'function'
        ? shared.getPersonColumns.bind(shared)
        : function(){ return []; };
    
      const escapeCSV = typeof shared.escapeCSV === 'function'
        ? shared.escapeCSV
        : function(value){
            if (value === null || value === undefined) return '';
            const str = String(value);
            return (/,|"|\n|\r/.test(str)) ? '"' + str.replace(/"/g,'""') + '"' : str;
          };
    
      const getCsvValue = typeof shared.getCsvValue === 'function'
        ? shared.getCsvValue
        : function(person, key){
            if (!person) return '';
            const value = person[key];
            return value == null ? '' : String(value);
          };
    
      const downloadFile = typeof shared.downloadFile === 'function'
        ? shared.downloadFile
        : function(content, filename, mimeType){
            if (typeof document === 'undefined') return;
            const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(function(){
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 100);
          };
    
      function exportToCsv(people) {
        if (!Array.isArray(people) || people.length===0) {
          if (typeof alert === 'function') alert('No data to export');
          return;
        }
        const columns = getColumns();
        if (!Array.isArray(columns) || columns.length === 0) {
          if (typeof alert === 'function') alert('No columns available for export');
          return;
        }
        const BOM = '\uFEFF';
        const headerRow = columns.map(function(c){ return escapeCSV(c.label); }).join(',');
        const bodyRows = people.map(function(p){
          return columns.map(function(c){ return escapeCSV(getCsvValue(p, c.key)); }).join(',');
        }).join('\n');
        const csvContent = BOM + headerRow + '\n' + bodyRows;
        const timestamp = new Date().toISOString().split('T')[0];
        downloadFile(csvContent, 'linkedin_profiles_' + timestamp + '.csv', 'text/csv;charset=utf-8');
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
    (function () {
      'use strict';
    
      function getModResolver() {
        if (typeof module !== 'undefined' && module.exports) {
          try { return require('../shared/modResolver'); } catch (_) { /* ignore */ }
        }
        const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.modResolver || { resolve: function () { return {}; } };
      }
    
      const modResolver = getModResolver();
      const shared = modResolver.resolve('../export/shared', 'exportShared') || {};
      const theme = modResolver.resolve('../theme/index', 'theme') || {};
      // NEW: sticky helpers module (optional at runtime)
      const stickyMod = modResolver.resolve('../export/htmlSticky', 'exportHtmlSticky') || {};
      const stylesMod = modResolver.resolve('../export/htmlStyles', 'exportHtmlStyles') || {};
    
      const getColumns = typeof shared.getPersonColumns === 'function'
        ? shared.getPersonColumns.bind(shared)
        : function () { return []; };
    
      const getDisplayValue = typeof shared.getDisplayValue === 'function'
        ? shared.getDisplayValue.bind(shared)
        : function (person, key) {
            if (!person) return null;
            const value = person[key];
            if (value == null) return null;
            const text = String(value).trim();
            return text ? text : null;
          };
    
      const escapeHTML = typeof shared.escapeHTML === 'function'
        ? function (value) { return shared.escapeHTML(value); }
        : function (value) {
            if (value === null || value === undefined) return '';
            return String(value)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };
    
      // ---------------------------------------------------------------------------
      // THEME CSS (unchanged)
      const downloadFile = typeof shared.downloadFile === 'function'
        ? shared.downloadFile
        : function (content, filename, mimeType) {
            if (typeof document === 'undefined') return;
            const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(function () {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 100);
          };
    
      const fallbackTokens = (theme && theme.DEFAULT_THEME) ? theme.DEFAULT_THEME : {};
      function getThemeTokens() {
        if (theme && typeof theme.getActiveTokens === 'function') {
          try {
            const tokens = theme.getActiveTokens();
            if (tokens && typeof tokens === 'object') return tokens;
          } catch (_) { /* ignore */ }
        }
        return fallbackTokens;
      }
    
      function buildThemeCss() {
        const tokens = getThemeTokens();
        const entries = Object.entries(tokens || {});
        if (!entries.length) return '';
        const lines = entries.map(function ([key, value]) { return '  ' + key + ': ' + value + ';'; });
        return ':root {\n' + lines.join('\n') + '\n}';
      }
    
      // sticky attrs function is provided by sticky module (set at export time).
      // default no-op so existing code can call it safely.
      var stickyAttrsFor = function () { return { cls: '', style: '' }; };
    
      // Base CSS now lives in src/export/htmlStyles.js
      const HTML_BASE_CSS = typeof stylesMod.HTML_BASE_CSS === 'string' ? stylesMod.HTML_BASE_CSS : '';
      const composeExportStyles = (typeof stylesMod.composeExportStyles === 'function')
        ? stylesMod.composeExportStyles
        : function (themeCss, stickyCss) {
            const parts = [];
            if (themeCss) parts.push(themeCss);
            if (HTML_BASE_CSS) parts.push(HTML_BASE_CSS);
            if (stickyCss) parts.push(stickyCss);
            return parts.join('\n');
          };
    
      const EN_DASH = '\u2013';
    
      function formatFollowers(value) {
        if (value == null) return null;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed ? trimmed : null;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
          try { return value.toLocaleString(); } catch (_) { return String(value); }
        }
        return null;
      }
    
      function buildCell(content, classes, sticky) {
        const baseClasses = Array.isArray(classes) ? classes.slice() : [];
        if (sticky && sticky.cls) {
          const stickyClasses = sticky.cls.trim().split(/\s+/);
          Array.prototype.push.apply(baseClasses, stickyClasses.filter(Boolean));
        }
        const classAttr = baseClasses.length ? ' class="' + baseClasses.join(' ') + '"' : '';
        const styleAttr = sticky && sticky.style ? ' style="' + sticky.style + '"' : '';
        return '<td' + classAttr + styleAttr + '>' + content + '</td>';
      }
    
      function renderCell(person, column) {
        const key = column.key;
        const stickyAttrs = stickyAttrsFor(column);
        const displayValue = getDisplayValue(person, key);
    
        if (key === 'profileUrl') {
          if (!displayValue) {
            return buildCell(EN_DASH, ['empty'], stickyAttrs);
          }
          const safe = escapeHTML(displayValue);
          const link = '<a class="profile-link" href="' + safe + '" target="_blank" rel="noopener noreferrer">' + safe + '</a>';
          return buildCell(link, [], stickyAttrs);
        }
    
        if (key === 'followers') {
          const formatted = formatFollowers(displayValue);
          if (!formatted) {
            return buildCell(EN_DASH, ['empty'], stickyAttrs);
          }
          const safeText = escapeHTML(formatted);
          const classes = typeof displayValue === 'number' ? ['numeric'] : [];
          return buildCell(safeText, classes, stickyAttrs);
        }
    
        if (displayValue == null) {
          return buildCell(EN_DASH, ['empty'], stickyAttrs);
        }
    
        const safeValue = escapeHTML(displayValue);
        return buildCell(safeValue, [], stickyAttrs);
      }
    
      function renderRows(people, columns) {
        return people.map(function (person) {
          const cells = columns.map(function (column) { return renderCell(person, column); });
          return '<tr>' + cells.join('') + '</tr>';
        }).join('\n');
      }
    
      function renderHeaders(columns) {
        return columns.map(function (column) {
          const sticky = stickyAttrsFor(column);
          const classes = sticky && sticky.cls ? sticky.cls.trim() : '';
          const classAttr = classes ? ' class="' + classes + '"' : '';
          const styleAttr = sticky && sticky.style ? ' style="' + sticky.style + '"' : '';
          const label = column && column.label ? column.label : column.key;
          return '<th' + classAttr + styleAttr + '>' + escapeHTML(label) + '</th>';
        }).join('');
      }
    
      function exportToHtml(people) {
        if (!Array.isArray(people) || people.length === 0) {
          if (typeof alert === 'function') alert('No data to export');
          return;
        }
    
        const columns = getColumns();
        if (!Array.isArray(columns) || columns.length === 0) {
          if (typeof alert === 'function') alert('No columns available for export');
          return;
        }
    
        // Prepare sticky helpers for this set of columns
        var stickyHelpers = (stickyMod && typeof stickyMod.createSticky === 'function')
          ? stickyMod.createSticky(columns)
          : { colgroup: '', stickyAttrsFor: function(){ return { cls:'', style:'' }; }, css: '' };
        stickyAttrsFor = stickyHelpers.stickyAttrsFor;
    
        const headers = renderHeaders(columns);
        const colgroup = stickyHelpers.colgroup;
        const rows = renderRows(people, columns);
        const themeCss = buildThemeCss();
        const styles = composeExportStyles(themeCss, stickyHelpers.css);
        const now = new Date();
        const metaText = people.length + ' profile' + (people.length === 1 ? '' : 's') + ' • exported ' + now.toLocaleString();
    
        const htmlContent = '<!doctype html>\n'
          + '<html lang="en">\n'
          + '<head>\n'
          + '  <meta charset="utf-8" />\n'
          + '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
          + '  <title>LinkedIn Profiles</title>\n'
          + '  <style>\n' + styles + '\n  </style>\n'
          + '</head>\n'
          + '<body>\n'
          + '  <div class="page">\n'
          + '    <header class="header">\n'
          + '      <h1>LinkedIn Profiles</h1>\n'
          + '      <p class="meta">' + escapeHTML(metaText) + '</p>\n'
          + '    </header>\n'
          + '    <div class="table-shell">\n'
          + '      <div class="table-scroll">\n'
          + '        <table>\n'
          + colgroup + '\n'
          + '          <thead>\n'
          + '            <tr>' + headers + '</tr>\n'
          + '          </thead>\n'
          + '          <tbody>\n'
          + rows + '\n'
          + '          </tbody>\n'
          + '        </table>\n'
          + '      </div>\n'
          + '    </div>\n'
          + '    <div class="export-meta">Generated on ' + escapeHTML(now.toDateString()) + '</div>\n'
          + '  </div>\n'
          + '</body>\n'
          + '</html>';
    
        const timestamp = now.toISOString().split('T')[0];
        downloadFile(htmlContent, 'linkedin_profiles_' + timestamp + '.html', 'text/html;charset=utf-8');
      }
    
      const mod = { exportToHtml };
    
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
      }
    
      const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportHtml = mod;
      if (typeof window !== 'undefined') window.exportToHtml = exportToHtml;
    })();

    // Export JSON
    ;
    (function(){
      'use strict';
    
      function getModResolver(){
        if (typeof module!=='undefined' && module.exports){
          try { return require('../shared/modResolver'); } catch(_) { /* ignore */ }
        }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        const mods = root.LinkedInScraperModules || {};
        return mods.modResolver || { resolve: function(){ return {}; } };
      }
    
      const modResolver = getModResolver();
      const shared = modResolver.resolve('../export/shared', 'exportShared') || {};
    
      const getColumns = typeof shared.getPersonColumns === 'function'
        ? shared.getPersonColumns.bind(shared)
        : function(){ return []; };
    
      const getDisplayValue = typeof shared.getDisplayValue === 'function'
        ? shared.getDisplayValue.bind(shared)
        : function(person, key){
            if (!person) return null;
            const value = person[key];
            if (value == null) return null;
            const text = String(value).trim();
            return text ? text : null;
          };
    
      const downloadFile = typeof shared.downloadFile === 'function'
        ? shared.downloadFile
        : function(content, filename, mimeType){
            if (typeof document === 'undefined') return;
            const blob = new Blob([content], { type: mimeType || 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            setTimeout(function(){
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 100);
          };
    
      function exportToJson(people){
        if (!Array.isArray(people) || people.length === 0) {
          if (typeof alert === 'function') alert('No data to export');
          return;
        }
    
        const columns = getColumns();
        if (!Array.isArray(columns) || columns.length === 0) {
          if (typeof alert === 'function') alert('No columns available for export');
          return;
        }
    
        const rows = people.map(function(person){
          const row = {};
          columns.forEach(function(column){
            row[column.key] = getDisplayValue(person, column.key);
          });
          return row;
        });
    
        const payload = {
          columns: columns.map(function(column){
            return {
              key: column.key,
              label: column.label != null ? column.label : column.key
            };
          }),
          count: rows.length,
          generatedAt: new Date().toISOString(),
          rows: rows
        };
    
        const jsonContent = JSON.stringify(payload, null, 2);
        const timestamp = new Date().toISOString().split('T')[0];
        downloadFile(jsonContent, 'linkedin_profiles_' + timestamp + '.json', 'application/json;charset=utf-8');
      }
    
      const mod = { exportToJson };
    
      if (typeof module!=='undefined' && module.exports) {
        module.exports = mod;
      }
    
      const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
      root.LinkedInScraperModules = root.LinkedInScraperModules || {};
      root.LinkedInScraperModules.exportJson = mod;
    
      if (typeof window!=='undefined') window.exportToJson = exportToJson;
    })();


    // Export utilities
    ;
    /**
     * Utilities module re-exporting exporters and shared helpers
     */
    (function() {
        'use strict';
    
        function getResolver(){
            if (typeof module!=='undefined' && module.exports) {
                try { return require('./shared/modResolver'); } catch(_) { return null; }
            }
            const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
            return (r.LinkedInScraperModules||{}).modResolver || null;
        }
        // Export helpers come from export/shared.js + export/{csv,html}.js
        function getExportShared() {
            const res = getResolver();
            if (res && res.resolve) return res.resolve('./export/shared','exportShared');
            try { if (typeof module !== 'undefined' && module.exports) return require('./export/shared'); } catch (e) { /* ignore */ }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportShared || {};
        }
    
        // Re-export shared helpers and exporters to keep back-compat
        const shared = getExportShared();
        const downloadFile = typeof shared.downloadFile === 'function' ? shared.downloadFile : function(){};
        function getExportCsv() {
            const res = getResolver();
            if (res && res.resolve) return res.resolve('./export/csv','exportCsv');
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/csv'); } catch (e) { return {}; }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportCsv || {};
        }
        function getExportHtml() {
            const res = getResolver();
            if (res && res.resolve) return res.resolve('./export/html','exportHtml');
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/html'); } catch (e) { return {}; }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportHtml || {};
        }
        function getExportJson() {
            const res = getResolver();
            if (res && res.resolve) return res.resolve('./export/json','exportJson');
            if (typeof module !== 'undefined' && module.exports) {
                try { return require('./export/json'); } catch (e) { return {}; }
            }
            const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
            const mods = root.LinkedInScraperModules || {};
            return mods.exportJson || {};
        }
    
        const utilsModule = {
            getPersonColumns: shared.getPersonColumns,
            // Expose exporter display helper so UI can reuse merged column formatting.
            getDisplayValue: shared.getDisplayValue,
            downloadFile,
            // Surface escapers for callers that used to import from utils
            escapeHTML: shared.escapeHTML,
            // Back-compat alias (older code used utils.escapeHtml)
            escapeHtml: shared.escapeHTML,
            // Back-compat re-exports so UI keeps working
            exportToCsv: getExportCsv().exportToCsv || null,
            exportToHtml: getExportHtml().exportToHtml || null,
            exportToJson: getExportJson().exportToJson || null
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
            const json = getExportJson().exportToJson;
            if (typeof csv === 'function') window.exportToCsv = csv;
            if (typeof html === 'function') window.exportToHtml = html;
            if (typeof json === 'function') window.exportToJson = json;
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
            if (utilsModule && typeof utilsModule.getPersonColumns==='function') {
                const cols = utilsModule.getPersonColumns();
                if (Array.isArray(cols) && cols.length) return cols;
            }
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
                    html: getExportHandler(utilsModule, 'exportToHtml'),
                    json: getExportHandler(utilsModule, 'exportToJson')
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
    
                const jsonButton = document.createElement('button');
                jsonButton.className = 'export-button';
                jsonButton.dataset.exportType = 'json';
                jsonButton.textContent = 'Export JSON';
                jsonButton.disabled = true;
                jsonButton.onclick = () => {
                    const { json } = this.resolveHandlers();
                    if (json) { json(this.people); }
                    else { this.showError('Export to JSON is not available yet.'); }
                };
    
                exportSection.appendChild(csvButton);
                exportSection.appendChild(htmlButton);
                exportSection.appendChild(jsonButton);
    
                this.exportButtons = [csvButton, htmlButton, jsonButton];
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
                // Use exporter display rules so merged experience/education columns render.
                const value = person
                    ? (typeof utilsModule.getDisplayValue === 'function'
                        ? utilsModule.getDisplayValue(person, column.key)
                        : person[column.key])
                    : null;
    
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
                const { csv, html, json } = this.resolveHandlers();
                this.exportButtons.forEach(btn => {
                    const type = btn.dataset.exportType;
                    const available =
                        type === 'csv' ? !!csv :
                        type === 'html' ? !!html : !!json;
                    btn.disabled = !available;
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
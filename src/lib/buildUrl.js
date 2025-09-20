(function() {
    'use strict';

    function getResolver(){
        if (typeof module!=='undefined' && module.exports) {
            try { return require('../shared/modResolver'); } catch(_) { return null; }
        }
        const r = (typeof globalThis!=='undefined'?globalThis:(typeof window!=='undefined'?window:{}));
        return (r.LinkedInScraperModules||{}).modResolver || null;
    }
    function getAuth(){
        const res = getResolver();
        if (res && res.resolve) return res.resolve('./auth','auth');
        try { if (typeof module!=='undefined' && module.exports) return require('./auth'); } catch(_) { return {}; }
        const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
        return (root.LinkedInScraperModules||{}).auth || {};
    }
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

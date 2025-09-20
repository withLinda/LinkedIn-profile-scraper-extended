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

    const mod = { buildLinkedInSearchUrl };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
    }
    const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
    root.LinkedInScraperModules = root.LinkedInScraperModules || {};
    root.LinkedInScraperModules.libBuildUrl = mod;
})();


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

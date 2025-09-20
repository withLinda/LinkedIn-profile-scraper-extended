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

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
        { key: 'languages', label: 'Languages' },
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

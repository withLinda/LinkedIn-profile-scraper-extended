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

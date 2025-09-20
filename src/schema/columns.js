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
        // ---- Experience (first 3)
        { key: 'exp1_company', label: 'Experience 1 - Company' },
        { key: 'exp1_position', label: 'Experience 1 - Position' },
        { key: 'exp1_duration', label: 'Experience 1 - Company Duration' },
        { key: 'exp1_position_duration', label: 'Experience 1 - Position Duration' },
        { key: 'exp1_description', label: 'Experience 1 - Description' },
        { key: 'exp2_company', label: 'Experience 2 - Company' },
        { key: 'exp2_position', label: 'Experience 2 - Position' },
        { key: 'exp2_duration', label: 'Experience 2 - Company Duration' },
        { key: 'exp2_position_duration', label: 'Experience 2 - Position Duration' },
        { key: 'exp2_description', label: 'Experience 2 - Description' },
        { key: 'exp3_company', label: 'Experience 3 - Company' },
        { key: 'exp3_position', label: 'Experience 3 - Position' },
        { key: 'exp3_duration', label: 'Experience 3 - Company Duration' },
        { key: 'exp3_position_duration', label: 'Experience 3 - Position Duration' },
        { key: 'exp3_description', label: 'Experience 3 - Description' },
        // ---- Education (first 3)
        { key: 'edu1_institution', label: 'Education 1 - Institution' },
        { key: 'edu1_degree', label: 'Education 1 - Degree' },
        { key: 'edu1_grade', label: 'Education 1 - Grade' },
        { key: 'edu1_description', label: 'Education 1 - Description' },
        { key: 'edu2_institution', label: 'Education 2 - Institution' },
        { key: 'edu2_degree', label: 'Education 2 - Degree' },
        { key: 'edu2_grade', label: 'Education 2 - Grade' },
        { key: 'edu2_description', label: 'Education 2 - Description' },
        { key: 'edu3_institution', label: 'Education 3 - Institution' },
        { key: 'edu3_degree', label: 'Education 3 - Degree' },
        { key: 'edu3_grade', label: 'Education 3 - Grade' },
        { key: 'edu3_description', label: 'Education 3 - Description' }
    ];

    const linkedinSchemaModule = { PERSON_COLUMNS };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = linkedinSchemaModule;
    }

    const linkedinSchemaRoot = typeof globalThis !== 'undefined' ? globalThis : window;
    linkedinSchemaRoot.LinkedInScraperModules = linkedinSchemaRoot.LinkedInScraperModules || {};
    linkedinSchemaRoot.LinkedInScraperModules.schema = linkedinSchemaModule;
})();

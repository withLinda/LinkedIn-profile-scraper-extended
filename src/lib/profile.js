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
    const lists = collectFixedLists(included);

    let experiences = [];
    let education = [];
    let volunteering = [];
    let licenses = [];
    let programmingLanguages = [];
    let organizations = [];

    for (const list of lists){
      if (!Array.isArray(list) || !list.length) continue;
      const first = list[0];
      if (looksLikeExperienceEntity(first)){
        if (!experiences.length) experiences = parseExperiencesFromList(list);
      } else if (looksLikeEducationEntity(first)){
        if (!education.length) education = parseEducationFromList(list);
      }
      // Do not break early; other sections may be in later lists/cards
    }

    // Volunteering (by card section)
    for (const vList of getSectionLists(included, 'VOLUNTEERING_EXPERIENCE')){
      volunteering.push(...parseVolunteeringFromList(vList));
    }
    // Licenses & Certifications (by card section)
    for (const lList of getSectionLists(included, 'LICENSES_AND_CERTIFICATIONS')){
      licenses.push(...parseLicensesFromList(lList));
    }
    // Programming languages (subset of LANGUAGES card)
    for (const langList of getSectionLists(included, 'LANGUAGES')){
      programmingLanguages.push(...parseProgrammingLanguagesFromList(langList));
    }
    // Organizations (if such a card exists)
    const orgLists = getSectionLists(included, 'ORGANIZATIONS');
    if (orgLists.length) organizations = parseOrganizationsFromLists(orgLists);

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

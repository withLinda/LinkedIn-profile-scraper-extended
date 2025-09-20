(function(){
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
          if (t && t.length >= 40) bucket.push(t);
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
      const institutionName = get(node, 'components.entityComponent.titleV2.text.accessibilityText') || null;
      const degree          = get(node, 'components.entityComponent.subtitle.accessibilityText') || null;
      const grade           = get(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText') || null;
      const educationDescription = get(node, 'components.entityComponent.subComponents.components.1.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') || null;

      if (!firstNonEmpty(institutionName, degree, grade, educationDescription)) continue;
      out.push({ institutionName, degree, grade, educationDescription });
      if (out.length >= 3) break; // only first 3
    }
    return out;
  }

  function parseProfile(included){
    const about = pickAboutText(included);
    const lists = collectFixedLists(included);

    let experiences = [];
    let education = [];

    for (const list of lists){
      if (!Array.isArray(list) || !list.length) continue;
      const first = list[0];
      if (looksLikeExperienceEntity(first)){
        if (!experiences.length) experiences = parseExperiencesFromList(list);
      } else if (looksLikeEducationEntity(first)){
        if (!education.length) education = parseEducationFromList(list);
      }
      if (experiences.length && education.length) break;
    }

    return { about, experiences, education };
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


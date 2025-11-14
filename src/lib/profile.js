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

  // -- URL builder and fetcher for "contact info" profile GraphQL
  function buildContactInfoUrl(memberIdentity){
    if (!memberIdentity) return null;
    const slug = String(memberIdentity || '').trim();
    if (!slug) return null;
    const encodedSlug = encodeURIComponent(slug);
    const variables = `variables=(memberIdentity:${encodedSlug})`;
    const queryId  = 'queryId=voyagerIdentityDashProfiles.c7452e58fa37646d09dae4920fc5b4b9';
    return `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&${variables}&${queryId}`;
  }

  async function fetchContactInfoJson(memberIdentity, csrfToken){
    const url = buildContactInfoUrl(memberIdentity);
    if (!url) throw new Error('CONTACT_URL');
    const headers = {
      'x-restli-protocol-version': '2.0.0',
      'accept': 'application/vnd.linkedin.normalized+json+2.1'
    };
    const auth = getAuth();
    const token = csrfToken || (auth && typeof auth.getCsrfToken === 'function' ? auth.getCsrfToken() : null);
    if (token) headers['csrf-token'] = token;

    const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[ContactInfo] HTTP', res.status, body.slice(0, 500));
      throw new Error(`HTTP ${res.status}`);
    }
    let data;
    try { data = await res.json(); }
    catch (e) {
      const clone = res.clone();
      const body = await clone.text().catch(() => '');
      console.error('[ContactInfo] Non-JSON body:', body.slice(0, 500));
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
    // urn: urn:li:fsd_profileCard:(<id>,SECTION,<locale>) — accept any locale
    if (!urn) return null;
    const m = /^urn:li:fsd_profileCard:\([^,]+,([^,]+),[^)]+\)$/.exec(urn);
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
    'experience_company_logo',
    'entity_image_volunteer_experiences',
    'experience_media',
    'experience_media_roll_up'
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
    // Helper: collect candidate text strings from a node into the given bucket
    function collectTextFromNode(node, bucket, minLen){
      const min = typeof minLen === 'number' ? minLen : 40;
      const text =
        get(node, 'textComponent.text.accessibilityText') ||
        get(node, 'text.text.accessibilityText') ||
        get(node, 'textComponent.text.text') ||
        get(node, 'text.text');
      if (typeof text !== 'string') return;
      const t = text.trim();
      // Avoid Sales Navigator highlight/upsell copy
      if (t && t.length >= min && !PROMO_RE.test(t)) {
        bucket.push(t);
      }
    }

    // First try: only look inside ABOUT cards
    const aboutCandidates = [];
    for (const item of included){
      if (!item || typeof item !== 'object') continue;
      if (cardSectionOf(item) !== 'ABOUT') continue;

      const bucket = [];
      walk(item, (n)=>{
        // Skip obvious promo/highlight content
        if (isPromoOrHighlight(n)) return;
        // Allow short ABOUT texts; pick longest later
        collectTextFromNode(n, bucket, 1);
      });

      if (bucket.length){
        // Keep the longest text from this ABOUT card
        bucket.sort((a, b) => b.length - a.length);
        aboutCandidates.push(bucket[0]);
      }
    }

    // If we found any text inside ABOUT cards, use the longest one.
    if (aboutCandidates.length){
      aboutCandidates.sort((a, b) => b.length - a.length);
      return aboutCandidates[0] || null;
    }

    // Fallback: preserve the old heuristic across all included items
    const fallbackTexts = [];
    for (const item of included){
      if (!item || typeof item !== 'object') continue;
      const bucket = [];
      walk(item, (n)=>{
        if (isPromoOrHighlight(n)) return;
        collectTextFromNode(n, bucket, 40);
      });
      if (bucket.length){
        bucket.sort((a, b) => b.length - a.length);
        fallbackTexts.push(bucket[0]);
      }
    }

    if (!fallbackTexts.length) return null;
    fallbackTexts.sort((a, b) => b.length - a.length);
    return fallbackTexts[0] || null;
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

  // Extract skills from insight texts (drop trailing "+N skills", split on bullets/commas/"and")
  function extractSkillsFromInsightText(s){
    let txt = safeText(s);
    txt = txt.replace(/\band\s+\+\d+\s+skills\b/i, '');
    const parts = txt
      .split(/\s*[•·,]\s*|\s+and\s+/i)
      .map(function(p){ return p.trim(); })
      .filter(Boolean);
    return parts;
  }

  function parseExperiencesFromList(list){
    const out = [];
    for (const node of list){
      const base = get(node, 'components.entityComponent') || {};
      const subtitle = t(node, 'components.entityComponent.subtitle.accessibilityText') ||
                       t(node, 'components.entityComponent.subtitle.text') || null;
      // Company is usually in subtitle like "Hebe Beauty Indonesia · Full-time"
      const companyName = subtitle ? subtitle.split('·')[0].trim() : null;
      const duration = t(node, 'components.entityComponent.caption.accessibilityText') || null;
      const location = t(node, 'components.entityComponent.metadata.text') ||
                       t(node, 'components.entityComponent.caption.text') || null;

      const roles = get(node, 'components.entityComponent.subComponents.components') || [];
      let pushed = false;

      // Parse nested roles when present (multi-role company entry)
      for (const r of roles){
        const positionTitle = t(r, 'components.entityComponent.titleV2.text.accessibilityText') ||
                              t(r, 'components.entityComponent.titleV2.text.text') || null;
        const positionDuration = t(r, 'components.entityComponent.caption.accessibilityText') || null;
        const jobDescription =
          t(r, 'components.entityComponent.subComponents.components.0.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') ||
          t(r, 'components.entityComponent.subComponents.components.0.components.textComponent.text.accessibilityText') || null;

        const roleSkills = [];
        walk(r, function(n){
          const s = get(n, 'insightComponent.text.text.accessibilityText');
          if (s) roleSkills.push.apply(roleSkills, extractSkillsFromInsightText(s));
        });

        if (firstNonEmpty(companyName, positionTitle, duration, positionDuration, location, jobDescription)){
          out.push({ companyName, duration, location, positionTitle, positionDuration, jobDescription, roleSkills });
          pushed = true;
        }
      }

      // Fallback: single-role entry (no nested roles)
      if (!roles.length || !pushed){
        const positionTitle = t(node, 'components.entityComponent.titleV2.text.accessibilityText') ||
                              t(node, 'components.entityComponent.titleV2.text.text') || null;
        const jobDescription =
          t(node, 'components.entityComponent.subComponents.components.0.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') ||
          null;
        const roleSkills = [];
        walk(node, function(n){
          const s = get(n, 'insightComponent.text.text.accessibilityText');
          if (s) roleSkills.push.apply(roleSkills, extractSkillsFromInsightText(s));
        });
        if (firstNonEmpty(companyName, positionTitle, duration, location, jobDescription)){
          out.push({ companyName, duration, location, positionTitle, positionDuration: null, jobDescription, roleSkills });
        }
      }
    }
    return out;
  }

  function parseEducationFromList(list){
    const out = [];
    for (const node of list){
      if (isPromoOrHighlight(node)) continue;
      const institutionName = get(node, 'components.entityComponent.titleV2.text.accessibilityText') || null;
      const degree          = get(node, 'components.entityComponent.subtitle.accessibilityText') || null;
      const dates           = get(node, 'components.entityComponent.caption.accessibilityText') || null;
      const grade           = get(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText') || null;
      const educationDescription = get(node, 'components.entityComponent.subComponents.components.1.components.fixedListComponent.components.0.components.textComponent.text.accessibilityText') || null;
      const text = [institutionName, degree, grade, educationDescription].filter(Boolean).join(' ');
      if (PROMO_RE.test(text)) continue;
      if (!firstNonEmpty(institutionName, degree, dates, grade, educationDescription)) continue;
      out.push({ institutionName, degree, dates, grade, educationDescription });
      if (out.length >= 3) break;
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
      // keep promo filter, but do not block legitimate license rows
      if (isPromoOrHighlight(node)) continue;
      const name = t(node, 'components.entityComponent.titleV2.text.accessibilityText');
      const issuer = t(node, 'components.entityComponent.subtitle.accessibilityText');
      const issuedOn = t(node, 'components.entityComponent.caption.accessibilityText');
      const note = t(node, 'components.entityComponent.subComponents.components.0.components.insightComponent.text.text.accessibilityText') || '';
      if (!firstNonEmpty(name, issuer, issuedOn, note)) continue;
      out.push({ name, issuer, issuedOn, note });
    }
    return out;
  }

  function normalizeLangName(s){
    return safeText(s).replace(/\s+/g,' ').trim();
  }
  // Parse human languages from LANGUAGES card
  function parseLanguagesFromList(list){
    const out = [];
    for (const node of list){
      if (isPromoOrHighlight(node)) continue;
      const name = normalizeLangName(
        t(node, 'components.entityComponent.titleV2.text.accessibilityText') ||
        t(node, 'components.entityComponent.titleV2.text.text')
      );
      if (!name) continue;
      const proficiency = normalizeLangName(
        t(node, 'components.entityComponent.caption.accessibilityText') ||
        t(node, 'components.entityComponent.caption.text')
      );
      out.push({ name, proficiency });
    }
    return out;
  }

  function pickSkillsFromCards(included){
    // Gather skills shown in ABOUT card (Top skills + any contextual insights there)
    let aboutSkills = [];
    for (const item of included){
      if (!isCard(item) || cardSectionOf(item) !== 'ABOUT') continue;
      let subtitle = '';
      walk(item, function(n){
        const title = t(n, 'entityComponent.titleV2.text.accessibilityText') || t(n, 'entityComponent.titleV2.text.text');
        if (/^top skills$/i.test(title)){
          const sub = t(n, 'entityComponent.subtitleV2.text.accessibilityText') ||
                      t(n, 'entityComponent.subtitleV2.text.text') ||
                      t(n, 'entityComponent.subtitle.accessibilityText') ||
                      t(n, 'entityComponent.subtitle.text');
          if (sub) subtitle = sub;
        }
      });
      const found = [];
      if (subtitle) found.push.apply(found, subtitle.split(/[•·,]|\s{2,}/).map(function(s){ return s.trim(); }).filter(Boolean));
      walk(item, function(n){
        const insight = t(n, 'insightComponent.text.text.accessibilityText');
        if (insight) found.push.apply(found, extractSkillsFromInsightText(insight));
      });
      if (found.length){
        const seen = new Set(); const skills = [];
        for (const p of found){ const k=p.toLowerCase(); if (!seen.has(k)){ seen.add(k); skills.push(p); } }
        aboutSkills = skills;
        break; // processed ABOUT
      }
    }
    // If not on ABOUT, gather contextual skills from EXPERIENCE (walk ALL roles)
    const agg = [];
    const expLists = getSectionLists(included, 'EXPERIENCE');
    for (const card of expLists){
      for (const node of card){
        walk(node, function(n){
          const s = get(n, 'insightComponent.text.text.accessibilityText');
          if (s) agg.push.apply(agg, extractSkillsFromInsightText(s));
        });
      }
    }
    // Also include EDUCATION contextual skills as before
    const eduLists = getSectionLists(included, 'EDUCATION');
    for (const card of eduLists){
      for (const node of card){
        const insight = get(node, 'components.insightComponent.text.text.accessibilityText') ||
                        get(node, 'components.entityComponent.subComponents.components.0.components.fixedListComponent.components.0.components.insightComponent.text.text.accessibilityText');
        if (insight) agg.push.apply(agg, extractSkillsFromInsightText(insight));
      }
    }
    const seen = new Set(); const skills = [];
    for (const p of aboutSkills.concat(agg)){ const k=p.toLowerCase(); if (!seen.has(k)){ seen.add(k); skills.push(p); } }
    return skills;
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

    // Human languages from LANGUAGES card
    let languages = [];
    for (const list of getSectionLists(included, 'LANGUAGES')) {
      const items = parseLanguagesFromList(list);
      if (items && items.length) languages = languages.concat(items);
    }

    // Organizations by card section
    const orgLists = getSectionLists(included, 'ORGANIZATIONS');
    const organizations = orgLists.length ? parseOrganizationsFromLists(orgLists) : [];

    const skills = pickSkillsFromCards(included);

    return { about, experiences, education, volunteering, licenses, skills, languages, organizations };
  }

  // Parse contact info (email, phones, websites, social, etc.) into a flat string
  function parseContactInfo(included, options){
    const list = Array.isArray(included) ? included : [];
    if (!list.length) return { contactInfo: '', profile: null };

    const targetSlug = (options && typeof options.memberIdentity === 'string')
      ? options.memberIdentity.trim().toLowerCase()
      : null;

    let profileNode = null;
    for (const item of list){
      if (!item || typeof item !== 'object') continue;
      const type = get(item, '$type') || item.$type || '';
      if (type !== 'com.linkedin.voyager.dash.identity.profile.Profile') continue;
      if (targetSlug){
        const id = safeText(item.publicIdentifier).toLowerCase();
        if (id && id === targetSlug) { profileNode = item; break; }
      } else if (!profileNode) {
        profileNode = item;
      }
    }

    if (!profileNode) return { contactInfo: '', profile: null };

    const lines = [];

    // Email
    const emailObj = profileNode.emailAddress || null;
    const email = emailObj && safeText(emailObj.emailAddress);
    if (email) lines.push('Email: ' + email);

    // Phones
    const phones = Array.isArray(profileNode.phoneNumbers) ? profileNode.phoneNumbers : [];
    phones.forEach(function(p){
      if (!p || typeof p !== 'object') return;
      const number = safeText(p.number || p.phoneNumber);
      if (!number) return;
      const label = safeText(p.type || p.category);
      lines.push(label ? ('Phone (' + label + '): ' + number) : ('Phone: ' + number));
    });

    // Websites
    const websites = Array.isArray(profileNode.websites) ? profileNode.websites : [];
    websites.forEach(function(w){
      if (!w || typeof w !== 'object') return;
      const url = safeText(w.url);
      if (!url) return;
      const category = safeText(w.category);
      lines.push(category ? ('Website (' + category + '): ' + url) : ('Website: ' + url));
    });

    // Twitter handles
    const twitterHandles = Array.isArray(profileNode.twitterHandles) ? profileNode.twitterHandles : [];
    twitterHandles.forEach(function(tw){
      if (!tw || typeof tw !== 'object') return;
      const handle = safeText(tw.name || tw.handle);
      if (!handle) return;
      lines.push('Twitter: ' + handle);
    });

    // WeChat
    const wechat = profileNode.weChatContactInfo || profileNode.wechatContactInfo || null;
    if (wechat && typeof wechat === 'object') {
      const wechatId = safeText(wechat.weChatId || wechat.wechatId || wechat.handle || wechat.id);
      if (wechatId) lines.push('WeChat: ' + wechatId);
    }

    // Address
    const address = safeText(profileNode.address);
    if (address) lines.push('Address: ' + address);

    // Exclude birth date and technical identifiers from Contact Info

    return {
      contactInfo: lines.join('\n'),
      profile: profileNode
    };
  }

  const mod = {
    buildProfileUrl,
    fetchProfileJson,
    parseProfile,
    buildContactInfoUrl,
    fetchContactInfoJson,
    parseContactInfo
  };

  if (typeof module!=='undefined' && module.exports) module.exports = mod;
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.profile = mod;
})();

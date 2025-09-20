(function(){
  'use strict';

  function getCsrfToken(){
    const cookieStr = (typeof document!=='undefined' ? document.cookie : '') || '';
    const cookies = cookieStr.split(';');
    for (let cookie of cookies){
      const [name, value] = cookie.trim().split('=');
      if (name === 'JSESSIONID'){
        const clean = String(value||'').replace(/\"/g,'').replace(/"/g,'');
        try { return decodeURIComponent(clean); } catch { return clean; }
      }
    }
    return null;
  }

  const mod = { getCsrfToken };
  if (typeof module!=='undefined' && module.exports) module.exports = mod;
  const root = typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {});
  root.LinkedInScraperModules = root.LinkedInScraperModules || {};
  root.LinkedInScraperModules.auth = mod;
})();


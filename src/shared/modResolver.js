(function(){
  'use strict';

  function getRoot(){
    return (typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : {}));
  }

  function getNamespace(root){
    root.LinkedInScraperModules = root.LinkedInScraperModules || {};
    return root.LinkedInScraperModules;
  }

  /**
   * resolve(requirePath, globalKey)
   * Attempts CommonJS require first (Node/build), then falls back to
   * LinkedInScraperModules[globalKey] in the browser.
   */
  function resolve(requirePath, globalKey){
    if (typeof module!=='undefined' && module.exports){
      try { return require(requirePath); } catch(_) {}
    }
    const root = getRoot();
    const ns = getNamespace(root);
    return ns[globalKey] || {};
  }

  const mod = { resolve, getRoot, getNamespace };

  if (typeof module!=='undefined' && module.exports) module.exports = mod;
  const root = getRoot();
  getNamespace(root).modResolver = mod;
})();


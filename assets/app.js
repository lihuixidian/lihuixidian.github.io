/* =========================================================================
 * lihui.db — app.js
 * Vanilla JS, no dependencies. Handles:
 *   1. Receiving iframe height messages (postMessage) from each tab iframe
 *   2. Setting `lastbuild` to the current year
 *   3. Smooth scroll with sticky-bar offset
 *   4. Active section highlight in top nav
 *
 * Note: tab content is loaded via <iframe data-tab-src>, NOT fetch().
 * iframes work under both file:// and https://; fetch() is blocked on file://.
 * ========================================================================= */

(function () {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* -------- 0. set last-build year -------------------------------------- */
  const lastBuild = $('#lastbuild');
  if (lastBuild) lastBuild.textContent = String(new Date().getFullYear());

  /* -------- 1. iframe height sync ------------------------------------- *
   * Tab iframes report their height by directly mutating the parent DOM
   * (parent.document.getElementById(id).querySelector('iframe').style.height).
   * This works under both file:// and http:// because property writes (and
   * direct DOM access from same-tab iframes) are allowed even when
   * function calls across realms are isolated in some Chrome file://
   * builds. The postMessage listener below is the no-op fallback path.
   * ---------------------------------------------------------------------- */
  function findIframeById(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  function applyHeight(id, rawH) {
    const sec = findIframeById(id);
    if (!sec) return;
    const f = sec.querySelector('iframe[src]');
    if (!f) return;
    const h = Math.max(80, Math.min(rawH, 60000));
    f.style.height = h + 'px';
  }

  // Function-call entry point (used by iframes on http:// where direct
  // parent.document access is restricted, and where postMessage is reliable).
  window.__lihuiSetIframeHeight = applyHeight;

  // postMessage fallback (also works on http://).
  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || data.kind !== 'lihui-tab-h' || typeof data.h !== 'number') return;
    if (!data.id) return;
    applyHeight(data.id, data.h);
  });

  /* -------- 2. smooth scroll with sticky-bar offset -------------------- */
  function bindSmoothScroll() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const tgt = document.getElementById(id.slice(1));
      if (!tgt) return;
      e.preventDefault();
      const y = tgt.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  }

  /* -------- 3. active section highlight -------------------------------- */
  function bindActiveSection() {
    const links = $$('.topbar-nav a[href^="#"]');
    if (!links.length) return;
    const linkById = links; // keep for symmetry

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.pageYOffset + 120;
        let current = null;
        for (const a of linkById) {
          const id = a.getAttribute('href').slice(1);
          const sec = document.getElementById(id);
          if (!sec) continue;
          if (sec.offsetTop <= y) current = a;
        }
        for (const a of linkById) a.classList.remove('active');
        if (current) current.classList.add('active');
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------- 4. global init --------------------------------------------- */
  function init() {
    bindSmoothScroll();
    bindActiveSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

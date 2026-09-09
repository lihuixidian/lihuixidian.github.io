/* =========================================================================
 * iframe-resize.js
 * Loaded inside every tabs/*.html iframe. Notifies the parent whenever the
 * document height changes, so the parent can resize the iframe to match
 * its content.
 *
 * We use THREE redundant paths, because the situation between file:// and
 * http:// is asymmetric:
 *   1) Direct DOM mutation: parent.document...style.height = h
 *      (works on file:// AND same-origin http://)
 *   2) Function call: parent.__lihuiSetIframeHeight(id, h)
 *      (works on same-origin http://; isolated to the iframe's realm under
 *       some Chrome file:// builds)
 *   3) postMessage: parent.postMessage({kind, h, id}, '*')
 *      (works on http://; dropped silently under some Chrome file:// builds)
 * ========================================================================= */

(function () {
  'use strict';

  // Derive a stable id from the URL: tabs/about.html -> "about"
  function iframeId() {
    var p = (location.pathname || '').split('/');
    var last = p[p.length - 1] || '';
    return last.replace(/\.html?$/i, '');
  }

  function reportHeight() {
    // Measure ONLY the body's content height. documentElement.scrollHeight
    // is `max(body.scrollHeight, html.clientHeight)`, so when the iframe is
    // sized larger than the content, documentElement.scrollHeight grows with
    // the iframe and a positive feedback loop inflates the height every
    // cycle. body.scrollHeight reflects the content alone and is stable.
    var h = 0;
    try { h = document.body ? (document.body.scrollHeight || 0) : 0; } catch (_) {}
    var id = iframeId();

    // 1) Direct DOM update on the parent.
    try {
      var p = window.parent;
      if (p && p.document) {
        var sec = p.document.getElementById(id);
        if (sec) {
          var frm = sec.querySelector('iframe[src]');
          if (frm) frm.style.height = h + 'px';
        }
      }
    } catch (_) {}

    // 2) Function call (same-origin http://).
    try {
      if (window.parent && typeof window.parent.__lihuiSetIframeHeight === 'function') {
        window.parent.__lihuiSetIframeHeight(id, h);
      }
    } catch (_) {}

    // 3) postMessage.
    try { parent.postMessage({ kind: 'lihui-tab-h', h: h, id: id }, '*'); } catch (_) {}
  }

  function init() {
    reportHeight();
    window.addEventListener('load', reportHeight);
    window.addEventListener('resize', reportHeight);
    if (typeof MutationObserver !== 'undefined') {
      try {
        new MutationObserver(reportHeight).observe(document.body, {
          childList: true, subtree: true, attributes: true
        });
      } catch (_) { /* body not ready */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* =========================================================================
 * LocalBib.js (Style C edition)
 * Renders a .bib file as a list of grouped publication entries.
 *
 * Pipeline:
 *   fetch(lihui.bib)
 *     -> bibtexParse.toJSON(text)
 *       -> render: group by year | type, output <details class="bib-group">...
 *
 * Exposed as window.LocalBib (no module loader; loaded by app.js on demand).
 * ========================================================================= */

(function (root) {
  'use strict';

  const TYPE_LABELS = {
    article:       'Journal Articles',
    inproceedings: 'Conference Papers',
    proceedings:   'Conference Papers',
    book:          'Books',
    phdthesis:     'Theses',
    mastersthesis: 'Theses',
    techreport:    'Technical Reports',
    misc:          'Preprints & Others'
  };

  /* Names that should be highlighted in the author list. */
  const SELF_NAMES = ['Hui Li', 'Li, Hui', 'H. {Li}', '李辉'];

  class LocalBib {

    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error('LocalBib: container #' + containerId + ' not found');
      }
      this.rawEntries      = [];
      this.filteredEntries = [];
      this.currentMode     = 'year';
      this._boundClicks    = false;
    }

    /* ---------- loading ---------- */
    async load(bibUrl) {
      try {
        this.container.innerHTML = '<div class="empty">loading <code>' +
          escapeHtml(bibUrl) + '</code> ...</div>';
        const res = await fetch(bibUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        const txt = await res.text();
        this._ingest(txt);
      } catch (err) {
        this.container.innerHTML =
          '<div class="empty">error: ' + escapeHtml(String(err.message || err)) +
          '<br><span class="text-mute" style="font-size:11px">tip: when opened via file://, run <code>bin/sync-bib.ps1</code> to inline the bib</span></div>';
        console.error('[LocalBib] load failed:', err);
        throw err;  // let caller fall back
      }
    }

    /**
     * Load from a pre-fetched text string. Used as a fallback when fetch()
     * is blocked (e.g. file:// protocol).
     */
    loadText(text) {
      this.container.innerHTML = '<div class="empty">loading (inline snapshot) ...</div>';
      this._ingest(text);
    }

    _ingest(text) {
      this.rawEntries      = bibtexParse.toJSON(text);
      this.filteredEntries = this.rawEntries.slice();
      this.render();
      this._bindContainerEvents();
    }

    /* ---------- search ---------- */
    handleSearch(query) {
      const q = (query || '').toLowerCase().trim();
      this.filteredEntries = !q
        ? this.rawEntries.slice()
        : this.rawEntries.filter(entry => {
            const tags = entry.entryTags || {};
            return [tags.title, tags.author, tags.bibbase_note, tags.booktitle, tags.journal]
              .join(' ')
              .toLowerCase()
              .includes(q);
          });
      this.render();
    }

    /* ---------- group mode ---------- */
    setGroupMode(mode) {
      if (mode !== 'year' && mode !== 'type') return;
      this.currentMode = mode;
      this.render();
    }

    /* ---------- render ---------- */
    render() {
      if (!this.filteredEntries.length) {
        this.container.innerHTML = '<div class="empty">no matching entries.</div>';
        return;
      }

      // Group
      const grouped = new Map();
      for (const entry of this.filteredEntries) {
        const name = (this.currentMode === 'year')
          ? (entry.entryTags && entry.entryTags.year) || 'Unknown'
          : TYPE_LABELS[(entry.entryType || '').toLowerCase()] || 'Others';
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name).push(entry);
      }

      // Sort group keys: years desc, others asc
      const keys = Array.from(grouped.keys());
      keys.sort((a, b) =>
        this.currentMode === 'year' ? b.localeCompare(a) : a.localeCompare(b)
      );

      // Build HTML
      const parts = [];
      keys.forEach(group => {
        const entries = grouped.get(group);
        const tag = this.currentMode === 'year' ? '##' : '##';
        const countText = entries.length + (entries.length === 1 ? ' paper' : ' papers');
        parts.push(
          '<details class="bib-group" open>' +
            '<summary>' +
              '<span class="group-name"><span class="tag">' + tag + '</span>' +
                escapeHtml(group) + '</span>' +
              '<span class="group-count">' + countText + '</span>' +
            '</summary>' +
            '<div class="bib-entries">' +
              entries.map(e => this._entryHtml(e)).join('') +
            '</div>' +
          '</details>'
        );
      });

      this.container.innerHTML = parts.join('');
    }

    /* ---------- per-entry HTML ---------- */
    _entryHtml(item) {
      const tags = item.entryTags || {};
      const title    = tags.title || 'Untitled';
      const authors  = tags.author || '';
      const venue    = tags.journal || tags.booktitle || 'Preprint';
      const year     = tags.year || '';
      const note     = tags.bibbase_note || '';
      const url      = tags.url || '';

      const titleHtml =
        '<div class="bib-entry-title">' + escapeHtml(title) + '</div>';
      const authorsHtml =
        '<div class="bib-entry-authors">' + this._formatAuthors(authors) + '</div>';
      const venueHtml =
        '<div class="bib-entry-venue">' +
          '<em>' + escapeHtml(venue) + '</em>, ' + escapeHtml(year) + '.' +
          (note ? '<span class="bib-entry-note">' + note + '</span>' : '') +
        '</div>';
      const actions =
        '<div class="bib-entry-actions">' +
          (url ? '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener">PDF</a>' : '') +
          '<a href="javascript:void(0)" data-bibtex-toggle>BibTeX</a>' +
        '</div>';
      const raw =
        '<pre class="bib-entry-raw">' + escapeHtml(this._generateRaw(item)) + '</pre>';

      return '<div class="bib-entry">' + titleHtml + authorsHtml + venueHtml + actions + raw + '</div>';
    }

    _formatAuthors(authorStr) {
      if (!authorStr) return '<span class="text-mute">Unknown Authors</span>';
      const cleaned = authorStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
      const names = cleaned.split(/\s+\b(?:and|AND|And)\b\s+|;\s*|,\s*/);
      return names
        .map(n => n.trim())
        .filter(Boolean)
        .map(name => {
          const isSelf = SELF_NAMES.some(s => name.indexOf(s) !== -1);
          const cls    = isSelf ? ' class="self"' : '';
          const safe   = escapeAttr(name);
          // Click an author to filter the list by that name.
          return '<a href="javascript:void(0)" data-author-filter="' + safe + '">' +
                   (isSelf ? '<span' + cls + '>' + escapeHtml(name) + '</span>' : escapeHtml(name)) +
                 '</a>';
        })
        .join(', ');
    }

    _generateRaw(item) {
      try {
        let raw = '@' + item.entryType + '{' + item.citationKey + ',\n';
        for (const tag in item.entryTags) {
          if (!Object.prototype.hasOwnProperty.call(item.entryTags, tag)) continue;
          raw += '  ' + tag.padEnd(12) + ' = {' + item.entryTags[tag] + '},\n';
        }
        return raw + '}';
      } catch (_) {
        return '@error{}';
      }
    }

    /* ---------- event delegation on the container ---------- */
    _bindContainerEvents() {
      if (this._boundClicks) return;
      this._boundClicks = true;
      const self = this;
      this.container.addEventListener('click', (e) => {
        const t = e.target.closest('[data-bibtex-toggle],[data-author-filter]');
        if (!t) return;
        e.preventDefault();
        if (t.hasAttribute('data-bibtex-toggle')) {
          const entry = t.closest('.bib-entry');
          if (!entry) return;
          const pre = entry.querySelector('.bib-entry-raw');
          if (pre) pre.classList.toggle('open');
        } else if (t.hasAttribute('data-author-filter')) {
          const name = t.getAttribute('data-author-filter');
          const search = document.getElementById('bib-search');
          if (search) {
            search.value = name;
            self.handleSearch(name);
          }
        }
      });
    }
  }

  /* ---------- helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  /* expose */
  root.LocalBib = LocalBib;
})(window);

/**
 * LocalBib.js - Enhanced Version
 * Supports: Grouping by Year/Type, Semantic UI, bibbase_note HTML, All-English.
 */
class LocalBib {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.rawEntries = [];
        this.currentMode = 'year'; // Default grouping mode
        this.options = { ...options };
        
        // Define mapping for BibTeX types to English Categories
        this.typeMap = {
            'article': 'Journal Articles',
            'inproceedings': 'Conference Papers',
            'proceedings': 'Conference Papers',
            'book': 'Books',
            'phdthesis': 'Theses',
            'mastersthesis': 'Theses',
            'techreport': 'Technical Reports',
            'misc': 'Preprints & Others'
        };
    }

    async load(bibUrl) {
        try {
            this.container.innerHTML = '<div class="ui active centered inline loader"></div><p style="text-align:center">Loading bibliography...</p>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            
            if (typeof bibtexParse === 'undefined') {
                throw new Error("bibtexParse.js not found. Please check your script tags.");
            }

            this.rawEntries = bibtexParse.toJSON(bibText);
            this.render(); // Initial render
        } catch (error) {
            this.container.innerHTML = `<div class="ui negative message"><div class="header">Loading Error</div><p>${error.message}</p></div>`;
        }
    }

    // Switch between 'year' and 'type'
    setGroupMode(mode) {
        this.currentMode = mode;
        this.render();
    }

    render() {
        if (!this.rawEntries.length) return;

        let groupedData = {};
        
        // 1. Grouping Logic
        if (this.currentMode === 'year') {
            // Sort by year descending
            this.rawEntries.sort((a, b) => (parseInt(b.entryTags.year) || 0) - (parseInt(a.entryTags.year) || 0));
            this.rawEntries.forEach(entry => {
                const year = entry.entryTags.year || 'Other';
                if (!groupedData[year]) groupedData[year] = [];
                groupedData[year].push(entry);
            });
        } else {
            // Group by Type
            this.rawEntries.forEach(entry => {
                const type = this.typeMap[entry.entryType.toLowerCase()] || 'Other';
                if (!groupedData[type]) groupedData[type] = [];
                groupedData[type].push(entry);
            });
        }

        // 2. Build HTML Structure
        let html = '<div class="ui styled fluid accordion bib-accordion">';
        
        Object.keys(groupedData).forEach((groupName, index) => {
            const isActive = index === 0 ? 'active' : ''; // Open the first group by default
            
            html += `
                <div class="title ${isActive}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                    <i class="dropdown icon"></i>
                    ${groupName} (${groupedData[groupName].length})
                </div>
                <div class="content ${isActive}">
                    <div class="ui list">
                        ${groupedData[groupName].map(item => this.createItemHtml(item)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.container.innerHTML = html;
    }

    createItemHtml(item) {
        const tags = item.entryTags;
        const authors = tags.author ? tags.author.replace(/ and /g, ', ') : 'Unknown';
        const note = tags.bibbase_note ? `<div class="bib-note">${tags.bibbase_note}</div>` : '';
        
        return `
            <div class="item bib-entry-item" style="padding: 1em 0; border-bottom: 1px solid #eee;">
                <div class="content">
                    <div class="header" style="font-size: 1.1em; color: #1a73e8; display:inline;">${tags.title || 'Untitled'}</div>
                    ${note}
                    <div class="description" style="margin-top: 5px; color: #555;">
                        <strong>${authors}</strong>. 
                        <i>${tags.journal || tags.booktitle || 'Preprint'}</i>, ${tags.year || ''}.
                    </div>
                    <div class="extra" style="margin-top: 8px;">
                        ${tags.url ? `<a class="ui mini basic blue button" href="${tags.url}" target="_blank">PDF</a>` : ''}
                        <button class="ui mini basic gray button" onclick="this.nextElementSibling.classList.toggle('show')">BibTeX</button>
                        <pre class="bib-raw-code" style="display:none; background:#f9f9f9; padding:10px; margin-top:10px; font-size:11px; border-left: 3px solid #ccc;">${this.generateRaw(item)}</pre>
                    </div>
                </div>
            </div>
        `;
    }

    generateRaw(item) {
        let raw = `@${item.entryType}{${item.citationKey},\n`;
        for (let tag in item.entryTags) {
            raw += `  ${tag.padEnd(12)} = {${item.entryTags[tag]}},\n`;
        }
        return raw + "}";
    }
}

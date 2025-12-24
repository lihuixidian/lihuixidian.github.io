class LocalBib {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.rawEntries = [];
        this.currentMode = 'year';
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
            this.container.innerHTML = '<div class="ui active centered inline loader"></div>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            
            if (typeof bibtexParse === 'undefined') {
                throw new Error("bibtexParse library not loaded. Check CDN link.");
            }

            this.rawEntries = bibtexParse.toJSON(bibText);
            console.log("Loaded entries:", this.rawEntries.length); // 调试用
            this.render();
        } catch (error) {
            console.error(error);
            this.container.innerHTML = `<div class="ui negative message">Error: ${error.message}</div>`;
        }
    }

    setGroupMode(mode) {
        this.currentMode = mode;
        this.render();
    }

    render() {
        if (!this.rawEntries || this.rawEntries.length === 0) {
            this.container.innerHTML = "No entries found.";
            return;
        }

        let groupedData = {};

        // 1. 分组逻辑
        if (this.currentMode === 'year') {
            this.rawEntries.forEach(entry => {
                const year = (entry.entryTags && entry.entryTags.year) ? entry.entryTags.year : 'Others';
                if (!groupedData[year]) groupedData[year] = [];
                groupedData[year].push(entry);
            });
        } else {
            this.rawEntries.forEach(entry => {
                const typeKey = entry.entryType ? entry.entryType.toLowerCase() : 'misc';
                const typeName = this.typeMap[typeKey] || 'Others';
                if (!groupedData[typeName]) groupedData[typeName] = [];
                groupedData[typeName].push(entry);
            });
        }

        // 2. 排序组标题 (Year 降序, Type 升序)
        const sortedGroups = Object.keys(groupedData).sort((a, b) => {
            if (this.currentMode === 'year') return b.localeCompare(a); // 年份降序
            return a.localeCompare(b); // 类型升序
        });

        // 3. 构建 HTML
        let html = '<div class="ui styled fluid accordion">';
        
        sortedGroups.forEach((groupName, index) => {
            const isActive = index === 0 ? 'active' : '';
            const items = groupedData[groupName];

            html += `
                <div class="title ${isActive}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                    <i class="dropdown icon"></i>
                    ${groupName} (${items.length} ${items.length > 1 ? 'entries' : 'entry'})
                </div>
                <div class="content ${isActive}">
                    <div class="ui divided list">
                        ${items.map(item => this.createItemHtml(item)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.container.innerHTML = html;
    }

    createItemHtml(item) {
        const tags = item.entryTags || {};
        const authors = tags.author ? tags.author.replace(/ and /g, ', ') : 'Unknown Authors';
        const note = tags.bibbase_note ? `<span class="bib-note-container">${tags.bibbase_note}</span>` : '';
        const title = tags.title || 'Untitled';
        const venue = tags.journal || tags.booktitle || 'Preprint';
        const year = tags.year || '';

        return `
            <div class="item" style="padding: 1.2em 0 !important;">
                <div class="content">
                    <div class="header" style="color: #1a73e8; font-size: 1.1em; line-height: 1.4;">
                        ${title} ${note}
                    </div>
                    <div class="description" style="margin-top: 5px; color: #444;">
                        <strong>${authors}</strong>. 
                        <span style="color: #666;"><em>${venue}</em>, ${year}</span>
                    </div>
                    <div class="extra" style="margin-top: 10px;">
                        ${tags.url ? `<a href="${tags.url}" target="_blank" class="ui mini basic blue button">PDF</a>` : ''}
                        <button class="ui mini basic gray button" onclick="const p = this.nextElementSibling; p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none'">BibTeX</button>
                        <pre style="display:none; background:#f4f4f4; padding:10px; margin-top:10px; font-size:11px; overflow-x:auto; border-left: 3px solid #ccc;">${this.generateRaw(item)}</pre>
                    </div>
                </div>
            </div>
        `;
    }

    generateRaw(item) {
        try {
            let raw = `@${item.entryType}{${item.citationKey},\n`;
            for (let tag in item.entryTags) {
                raw += `  ${tag.padEnd(12)} = {${item.entryTags[tag]}},\n`;
            }
            return raw + "}";
        } catch (e) { return "Error generating BibTeX"; }
    }
}

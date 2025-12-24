class LocalBib {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.rawEntries = [];
        this.filteredEntries = [];
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

    formatAuthors(authorStr) {
        if (!authorStr) return 'Unknown Authors';
        try {
            // 1. 处理换行和多余空格
            let cleanAuthorStr = authorStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
            // 2. 拆分作者
            let authorList = cleanAuthorStr.split(/\s+\b(?:and|AND|And)\b\s+|;\s*|,\s*/);

            return authorList.map(name => {
                let cleanName = name.trim();
                if (!cleanName) return '';

                let displayName = cleanName;
                let targetName = "Hui Li"; // <--- 改成你的名字
                let targetName1 = "Li, Hui";
                let targetName2 = "H. {Li}";
                if (cleanName.includes(targetName)||cleanName.includes(targetName1)||cleanName.includes(targetName2)) { 
                    displayName = `<strong>${cleanName}</strong>`;
                }

                let escapedName = cleanName.replace(/'/g, "\\'");
                return `<a href="javascript:void(0)" 
                           onclick="if(window.myBib) { myBib.handleSearch('${escapedName}'); document.getElementById('bib-search').value='${escapedName}'; }" 
                           style="color: inherit; text-decoration: none; border-bottom: 1px dashed #ccc;">${displayName}</a>`;
            }).filter(n => n !== '').join(', ');
        } catch (e) {
            return authorStr;
        }
    }

    async load(bibUrl) {
        try {
            this.container.innerHTML = '<div class="ui active centered inline loader"></div>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            this.rawEntries = bibtexParse.toJSON(bibText);
            this.filteredEntries = [...this.rawEntries];
            this.render();
        } catch (error) {
            this.container.innerHTML = `<div class="ui negative message">Error: ${error.message}</div>`;
        }
    }

    handleSearch(query) {
        const q = query.toLowerCase().trim();
        this.filteredEntries = !q ? [...this.rawEntries] : this.rawEntries.filter(entry => {
            const tags = entry.entryTags || {};
            return [tags.title, tags.author, tags.bibbase_note].join(' ').toLowerCase().includes(q);
        });
        this.render();
    }

    setGroupMode(mode) {
        this.currentMode = mode;
        this.render();
    }

    render() {
        if (!this.filteredEntries.length) {
            this.container.innerHTML = '<div class="ui segment center aligned">No matching entries found.</div>';
            return;
        }

        let groupedData = {};
        this.filteredEntries.forEach(entry => {
            let groupName = (this.currentMode === 'year') ? 
                (entry.entryTags.year || 'Others') : 
                (this.typeMap[entry.entryType.toLowerCase()] || 'Others');
            if (!groupedData[groupName]) groupedData[groupName] = [];
            groupedData[groupName].push(entry);
        });

        const sortedGroups = Object.keys(groupedData).sort((a, b) => 
            (this.currentMode === 'year') ? b.localeCompare(a) : a.localeCompare(b)
        );

        let html = '<div class="ui styled fluid accordion">';
        sortedGroups.forEach((group, idx) => {
            const isActive = idx === 0 ? 'active' : '';
            html += `
                <div class="title ${isActive}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                    <i class="dropdown icon"></i> ${group} (${groupedData[group].length})
                </div>
                <div class="content ${isActive}">
                    <div class="ui divided list">
                        ${groupedData[group].map(item => this.createItemHtml(item)).join('')}
                    </div>
                </div>`;
        });
        this.container.innerHTML = html + '</div>';
    }

    createItemHtml(item) {
        const tags = item.entryTags || {};
        const authorsHtml = this.formatAuthors(tags.author);
        const note = tags.bibbase_note ? 
            `<div style="flex-shrink: 0; margin-left: 20px; text-align: right; white-space: nowrap;">${tags.bibbase_note}</div>` : '';
        
        return `
            <div class="item" style="padding: 0.6em 0 !important;">
                <div class="content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                        <div style="color: #1a73e8; font-size: 1.05em; line-height: 1.2; flex-grow: 1; font-weight: bold;">
                            ${tags.title || 'Untitled'}
                        </div>
                        ${note}
                    </div>
                    <div style="margin-top: 2px; color: #444; font-size: 0.95em;">
                        ${authorsHtml}. 
                        <span style="color: #666;"><em>${tags.journal || tags.booktitle || 'Preprint'}</em>, ${tags.year || ''}</span>
                    </div>
                    <div style="margin-top: 6px;">
                        ${tags.url ? `<a href="${tags.url}" target="_blank" class="ui mini basic blue button" style="padding: 0.4em 0.8em !important; font-size:0.75rem !important;">PDF</a>` : ''}
                        <button class="ui mini basic gray button" style="padding: 0.4em 0.8em !important; font-size:0.75rem !important;" onclick="const p = this.parentElement.nextElementSibling; p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none'">BibTeX</button>
                    </div>
                    <pre style="display:none; background:#f4f4f4; padding:8px; margin-top:8px; font-size:11px; overflow-x:auto; border-left: 3px solid #ccc;">${this.generateRaw(item)}</pre>
                </div>
            </div>`;
    }

    generateRaw(item) {
        try {
            let raw = `@${item.entryType}{${item.citationKey},\n`;
            for (let tag in item.entryTags) { raw += `  ${tag.padEnd(12)} = {${item.entryTags[tag]}},\n`; }
            return raw + "}";
        } catch(e) { return "@error{}"; }
    }
}

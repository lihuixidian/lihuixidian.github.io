class LocalBib {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.rawEntries = [];
        this.filteredEntries = []; // 新增：用于存储过滤后的数据
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

    // 格式化作者的方法：你可以在这里加粗自己的名字
    formatAuthors(authorStr) {
        if (!authorStr) return 'Unknown Authors';
        let authors = authorStr.replace(/ and /g, ', ');
        // 示例：加粗你自己
        authors = authors.replace('Hui Li', '<strong>Hui Li</strong>');
        return authors;
    }

    async load(bibUrl) {
        try {
            this.container.innerHTML = '<div class="ui active centered inline loader"></div>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            this.rawEntries = bibtexParse.toJSON(bibText);
            this.filteredEntries = [...this.rawEntries]; // 初始状态显示全部
            this.render();
        } catch (error) {
            this.container.innerHTML = `<div class="ui negative message">Error: ${error.message}</div>`;
        }
    }

    // 搜索过滤函数
    handleSearch(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.filteredEntries = [...this.rawEntries];
        } else {
            this.filteredEntries = this.rawEntries.filter(entry => {
                const tags = entry.entryTags || {};
                const textToSearch = [
                    tags.title || '',
                    tags.author || '',
                    tags.bibbase_note || '',
                    tags.journal || tags.booktitle || '',
                    tags.keywords || '' // 如果你的bib里有keywords字段也会被搜索
                ].join(' ').toLowerCase();
                return textToSearch.includes(q);
            });
        }
        this.render();
    }

    setGroupMode(mode) {
        this.currentMode = mode;
        this.render();
    }

    render() {
        if (!this.filteredEntries.length) {
            this.container.innerHTML = '<div class="ui placeholder segment"><div class="ui icon header"><i class="search icon"></i>No matching publications found.</div></div>';
            return;
        }

        let groupedData = {};

        // 分组逻辑
        if (this.currentMode === 'year') {
            this.filteredEntries.forEach(entry => {
                const year = (entry.entryTags && entry.entryTags.year) ? entry.entryTags.year : 'Others';
                if (!groupedData[year]) groupedData[year] = [];
                groupedData[year].push(entry);
            });
        } else {
            this.filteredEntries.forEach(entry => {
                const typeKey = entry.entryType ? entry.entryType.toLowerCase() : 'misc';
                const typeName = this.typeMap[typeKey] || 'Others';
                if (!groupedData[typeName]) groupedData[typeName] = [];
                groupedData[typeName].push(entry);
            });
        }

        const sortedGroups = Object.keys(groupedData).sort((a, b) => {
            if (this.currentMode === 'year') return b.localeCompare(a);
            return a.localeCompare(b);
        });

        let html = '<div class="ui styled fluid accordion">';
        sortedGroups.forEach((groupName, index) => {
            const isActive = index === 0 ? 'active' : '';
            const items = groupedData[groupName];
            html += `
                <div class="title ${isActive}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                    <i class="dropdown icon"></i> ${groupName} (${items.length})
                </div>
                <div class="content ${isActive}">
                    <div class="ui divided list">
                        ${items.map(item => this.createItemHtml(item)).join('')}
                    </div>
                </div>`;
        });
        html += '</div>';
        this.container.innerHTML = html;
    }

    createItemHtml(item) {
        const tags = item.entryTags || {};
        const authors = this.formatAuthors(tags.author);
        const note = tags.bibbase_note ? `<span class="bib-note-container">${tags.bibbase_note}</span>` : '';
        
        return `
            <div class="item" style="padding: 0.6em 0 !important;">
                <div class="content">
                    <div class="header" style="color: #1a73e8; font-size: 1.05em; line-height: 1.2;">
                        ${tags.title || 'Untitled'} ${note}
                    </div>
                    <div class="description" style="margin-top: 2px; color: #444; font-size: 0.95em;">
                        <strong>${authors}</strong>. 
                        <span style="color: #666;"><em>${tags.journal || tags.booktitle || 'Preprint'}</em>, ${tags.year || ''}</span>
                    </div>
                    <div class="extra" style="margin-top: 6px;">
                        ${tags.url ? `<a href="${tags.url}" target="_blank" class="ui mini basic blue button" style="padding: 0.4em 0.8em !important;">PDF</a>` : ''}
                        <button class="ui mini basic gray button" style="padding: 0.4em 0.8em !important;" onclick="const p = this.nextElementSibling; p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none'">BibTeX</button>
                        <pre style="display:none; background:#f4f4f4; padding:8px; margin-top:8px; font-size:11px; overflow-x:auto; border-left: 3px solid #ccc;">${this.generateRaw(item)}</pre>
                    </div>
                </div>
            </div>`;
    }

    generateRaw(item) {
        let raw = `@${item.entryType}{${item.citationKey},\n`;
        for (let tag in item.entryTags) {
            raw += `  ${tag.padEnd(12)} = {${item.entryTags[tag]}},\n`;
        }
        return raw + "}";
    }
}

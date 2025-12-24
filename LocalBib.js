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

    // 格式化作者：增加了转义处理，防止单引号导致崩溃
    formatAuthors(authorStr) {
        if (!authorStr) return 'Unknown Authors';
        try {
            // 兼容多种分隔符
            let authorList = authorStr.split(/ and |; |,/);
            return authorList.map(name => {
                let cleanName = name.trim();
                if (!cleanName) return '';

                // 处理名字中的单引号，防止 onclick 语法错误
                let escapedName = cleanName.replace(/'/g, "\\'");

                // 检查是否需要加粗自己 (请在此处修改你的名字)
                let displayName = cleanName;
                if (cleanName.includes("Hui Li")||cleanName.includes("Li, Hui")) { 
                    displayName = `<strong>${cleanName}</strong>`;
                }

                // 返回可点击的链接，注意 myBib 必须与 index.html 中的变量名一致
                return `<a href="javascript:void(0)" 
                           onclick="if(window.myBib) { myBib.handleSearch('${escapedName}'); document.getElementById('bib-search').value='${escapedName}'; }" 
                           style="color: inherit; text-decoration: none; border-bottom: 1px dashed #ccc;">${displayName}</a>`;
            }).filter(n => n !== '').join(', ');
        } catch (e) {
            return authorStr; // 如果解析失败，返回原始字符串
        }
    }

    async load(bibUrl) {
        try {
            this.container.innerHTML = '<div class="ui active centered inline loader"></div>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            
            if (typeof bibtexParse === 'undefined') {
                throw new Error("bibtexParse library not found.");
            }

            this.rawEntries = bibtexParse.toJSON(bibText);
            this.filteredEntries = [...this.rawEntries];
            this.render();
        } catch (error) {
            console.error("Load Error:", error);
            this.container.innerHTML = `<div class="ui negative message">Error loading .bib file: ${error.message}</div>`;
        }
    }

    handleSearch(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            this.filteredEntries = [...this.rawEntries];
        } else {
            this.filteredEntries = this.rawEntries.filter(entry => {
                const tags = entry.entryTags || {};
                const text = [tags.title, tags.author, tags.bibbase_note, tags.journal, tags.booktitle].join(' ').toLowerCase();
                return text.includes(q);
            });
        }
        this.render();
    }

    setGroupMode(mode) {
        this.currentMode = mode;
        this.render();
    }

    render() {
        if (!this.filteredEntries || this.filteredEntries.length === 0) {
            this.container.innerHTML = '<div class="ui segment center aligned">No entries found.</div>';
            return;
        }

        let groupedData = {};
        this.filteredEntries.forEach(entry => {
            let groupName = 'Others';
            if (this.currentMode === 'year') {
                groupName = (entry.entryTags && entry.entryTags.year) ? entry.entryTags.year : 'Others';
            } else {
                const typeKey = entry.entryType ? entry.entryType.toLowerCase() : 'misc';
                groupName = this.typeMap[typeKey] || 'Others';
            }
            if (!groupedData[groupName]) groupedData[groupName] = [];
            groupedData[groupName].push(entry);
        });

        const sortedGroups = Object.keys(groupedData).sort((a, b) => {
            if (this.currentMode === 'year') return b.localeCompare(a);
            return a.localeCompare(b);
        });

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
        html += '</div>';
        this.container.innerHTML = html;
    }

    createItemHtml(item) {
        const tags = item.entryTags || {};
        const authorsHtml = this.formatAuthors(tags.author);
        const note = tags.bibbase_note ? `<span class="bib-note-container">${tags.bibbase_note}</span>` : '';
        
        return `
            <div class="item" style="padding: 0.6em 0 !important;">
                <div class="content">
                    <div class="header" style="color: #1a73e8; font-size: 1.05em; line-height: 1.2;">
                        ${tags.title || 'Untitled'} ${note}
                    </div>
                    <div class="description" style="margin-top: 2px; color: #444; font-size: 0.95em;">
                        ${authorsHtml}. 
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
        try {
            let raw = `@${item.entryType}{${item.citationKey},\n`;
            for (let tag in item.entryTags) {
                raw += `  ${tag.padEnd(12)} = {${item.entryTags[tag]}},\n`;
            }
            return raw + "}";
        } catch(e) { return "@error{}"; }
    }
}

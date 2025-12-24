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
        // 1. 先把所有换行符、回车符替换为空格，并将多个空格合并为一个
        let cleanAuthorStr = authorStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

        // 2. 使用更严谨的正则拆分：匹配 " and " (忽略大小写) 或分号或逗号
        // \b 表示单词边界，确保不会误切 "Anderson" 这样的名字
        let authorList = cleanAuthorStr.split(/\s+\b(?:and|AND|And)\b\s+|;\s*|,\s*/);

        return authorList.map(name => {
            let cleanName = name.trim();
            if (!cleanName) return '';

            // 检查是否需要加粗自己 (请确保这里的字符串匹配你的名字)
            let displayName = cleanName;
            let targetName = "Hui Li"; // <--- 在这里修改你的名字
            let targetName1 = "H. {Li}";
            let targetName2 = "Li, Hui";
            
            // 使用精确匹配或包含匹配
            if (cleanName.includes(targetName)||cleanName.includes(targetName1)||cleanName.includes(targetName2)) { 
                displayName = `<strong>${cleanName}</strong>`;
            }

            // 处理单引号防止 onclick 报错
            let escapedName = cleanName.replace(/'/g, "\\'");

            // 返回点击筛选的 HTML
            return `<a href="javascript:void(0)" 
                       onclick="if(window.myBib) { myBib.handleSearch('${escapedName}'); document.getElementById('bib-search').value='${escapedName}'; }" 
                       style="color: inherit; text-decoration: none; border-bottom: 1px dashed #ccc;">${displayName}</a>`;
        }).filter(n => n !== '').join(', ');
    } catch (e) {
        console.error("Author formatting error:", e);
        return authorStr;
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
    // 处理 bibbase_note，确保它是一个块状容器，并设置不压缩
    const note = tags.bibbase_note ? 
        `<div class="bib-note-container" style="flex-shrink: 0; margin-left: 20px; text-align: right;">${tags.bibbase_note}</div>` : '';
       // 在 note 的 style 中加入 white-space: nowrap
    const note = tags.bibbase_note ? 
    `<div class="bib-note-container" style="flex-shrink: 0; margin-left: 20px; text-align: right; white-space: nowrap;">${tags.bibbase_note}</div>` : '';
    
    return `
        <div class="item" style="padding: 0.6em 0 !important;">
            <div class="content">
                <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div class="bib-title" style="color: #1a73e8; font-size: 1.05em; line-height: 1.2; flex-grow: 1;">
                        ${tags.title || 'Untitled'}
                    </div>
                    ${note}
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

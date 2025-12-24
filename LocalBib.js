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
                let targetName3 = "李辉";
                if (cleanName.includes(targetName)||cleanName.includes(targetName1)||cleanName.includes(targetName2)||cleanName.includes(targetName3)) { 
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

    // 渲染手风琴
    let html = '<div class="ui styled fluid accordion">';
    sortedGroups.forEach((group) => {
        // 核心修改：移除 index 判断，直接为所有板块添加 'active' 类名
        html += `
            <div class="title active" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                <i class="dropdown icon"></i> ${group} (${groupedData[group].length})
            </div>
            <div class="content active">
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
        `<div style="flex-shrink: 0; margin-left: 15px; text-align: right; white-space: nowrap; line-height: 1;">${tags.bibbase_note}</div>` : '';
    
    return `
        <div class="item" style="padding: 2px 0 !important; margin: 0 !important;"> <div class="content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div style="color: #1a73e8; font-size: 0.98em; line-height: 1.2; flex-grow: 1; font-weight: 700;">
                        ${tags.title || 'Untitled'}
                    </div>
                    ${note}
                </div>
                
                <div style="margin-top: 0px; color: #444; font-size: 0.88em; line-height: 1.3;">
                    ${authorsHtml}. 
                    <span style="color: #777;"><em>${tags.journal || tags.booktitle || 'Preprint'}</em>, ${tags.year || ''}.</span>
                    
                    <span style="margin-left: 10px; white-space: nowrap;">
                        ${tags.url ? `<a href="${tags.url}" target="_blank" style="color: #2185d0; text-decoration: underline; font-size: 0.85em; margin-right: 8px;">[PDF]</a>` : ''}
                        <a href="javascript:void(0)" style="color: #767676; text-decoration: underline; font-size: 0.85em;" 
                           onclick="const p = this.parentElement.parentElement.nextElementSibling; p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none'">[BibTeX]</a>
                    </span>
                </div>
                
                <pre style="display:none; background:#f9f9f9; padding:6px; margin: 5px 0; font-size:10px; overflow-x:auto; border-left: 2px solid #ddd; line-height: 1.1;">${this.generateRaw(item)}</pre>
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

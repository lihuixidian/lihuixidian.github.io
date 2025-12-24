/**
 * LocalBib.js - Semantic UI 增强版
 */
class LocalBib {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            sortBy: 'year',
            order: 'desc',
            ...options
        };
    }

    async load(bibUrl) {
        try {
            this.container.innerHTML = '<div class="ui active centered inline loader"></div>';
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            
            if (typeof bibtexParse === 'undefined') {
                throw new Error("请先引入 bibtexParse.js");
            }

            const parsedData = bibtexParse.toJSON(bibText);
            this.render(parsedData);
        } catch (error) {
            this.container.innerHTML = `<div class="ui negative message"><div class="header">加载失败</div><p>${error.message}</p></div>`;
        }
    }

    // 处理作者格式
    formatAuthors(authorStr) {
        if (!authorStr) return 'Unknown Author';
        return authorStr.replace(/ and /g, ', ');
    }

    // 核心渲染逻辑
    render(data) {
        // 1. 排序
        data.sort((a, b) => {
            const valA = parseInt(a.entryTags[this.options.sortBy]) || 0;
            const valB = parseInt(b.entryTags[this.options.sortBy]) || 0;
            return this.options.order === 'desc' ? valB - valA : valA - valB;
        });

        // 2. 分组构建 HTML
        let html = '<div class="ui styled fluid accordion bib-accordion">';
        let currentYear = '';

        data.forEach((item, index) => {
            const tags = item.entryTags;
            const year = tags.year || 'Other';

            // 当年份变换时，开启新的手风琴面板
            if (year !== currentYear) {
                if (currentYear !== '') html += '</div></div>'; // 关闭上一个面板内容
                currentYear = year;
                
                // 默认展开第一个年份 (active 状态)
                const isActive = index === 0 ? 'active' : '';
                html += `
                    <div class="title ${isActive} bib-year-title" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active')">
                        <i class="dropdown icon"></i>
                        ${currentYear} 年论文
                    </div>
                    <div class="content ${isActive} bib-year-content">
                `;
            }

            // 处理 bibbase_note 逻辑：直接输出 HTML
            const noteHtml = tags.bibbase_note ? `<div class="bib-note">${tags.bibbase_note}</div>` : '';

            html += `
                <div class="ui vertical segment bib-item">
                    <div class="bib-main-info">
                        <span class="ui header small bib-title" style="margin-right:10px">${tags.title || 'Untitled'}</span>
                        ${noteHtml} 
                    </div>
                    <div class="bib-meta" style="color: rgba(0,0,0,.6); font-size: 0.95em; margin-top:5px;">
                        <span class="ui author"><strong>${this.formatAuthors(tags.author)}</strong></span>. 
                        <span class="ui venue"><em>${tags.journal || tags.booktitle || 'Preprint'}</em>, ${year}.</span>
                    </div>
                    <div class="bib-actions" style="margin-top:8px;">
                        ${tags.url ? `<a class="ui mini basic button" href="${tags.url}" target="_blank">PDF</a>` : ''}
                        <button class="ui mini basic button" onclick="this.nextElementSibling.classList.toggle('show')">BibTeX</button>
                        <pre class="bib-raw-code" style="display:none; background:#f3f4f5; padding:10px; margin-top:10px; font-size:11px;">${this.generateRaw(item)}</pre>
                    </div>
                </div>
            `;
        });

        html += '</div></div>'; // 关闭最后的容器
        this.container.innerHTML = html;
    }

    generateRaw(item) {
        let raw = `@${item.entryType}{${item.citationKey},\n`;
        for (let tag in item.entryTags) {
            raw += `  ${tag} = {${item.entryTags[tag]}},\n`;
        }
        return raw + "}";
    }
}

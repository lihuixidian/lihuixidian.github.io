/**
 * LocalBib.js - 模仿 BibBase 的本地文献渲染库
 */
class LocalBib {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            sortBy: 'year',
            order: 'desc', // 默认降序
            ...options
        };
    }

    // 主加载函数
    async load(bibUrl) {
        try {
            this.container.innerHTML = "正在加载文献...";
            const response = await fetch(bibUrl);
            const bibText = await response.text();
            
            // 确保解析库已加载
            if (typeof bibtexParse === 'undefined') {
                throw new Error("请先引入 bibtexParse.js 库");
            }

            const parsedData = bibtexParse.toJSON(bibText);
            this.render(parsedData);
        } catch (error) {
            this.container.innerHTML = `<div style="color:red">加载失败: ${error.message}</div>`;
        }
    }

    // 格式化作者 (将 "and" 替换为逗号)
    formatAuthors(authorStr) {
        if (!authorStr) return 'Unknown Author';
        return authorStr.replace(/ and /g, ', ');
    }

    // 渲染函数
    render(data) {
        // 1. 排序逻辑
        data.sort((a, b) => {
            const valA = parseInt(a.entryTags[this.options.sortBy]) || 0;
            const valB = parseInt(b.entryTags[this.options.sortBy]) || 0;
            return this.options.order === 'desc' ? valB - valA : valA - valB;
        });

        // 2. 生成 HTML
        let html = '';
        let currentYear = '';

        data.forEach(item => {
            const tags = item.entryTags;
            const year = tags.year || 'Other';

            // 按年份分组显示标题
            if (year !== currentYear) {
                currentYear = year;
                html += `<h2 class="bib-year-header">${currentYear}</h2>`;
            }

            html += `
                <div class="bib-item">
                    <div class="bib-title">${tags.title || 'Untitled'}</div>
                    <div class="bib-author">${this.formatAuthors(tags.author)}</div>
                    <div class="bib-venue">
                        <em>${tags.journal || tags.booktitle || 'Preprint'}</em>, ${year}
                    </div>
                    <div class="bib-links">
                        ${tags.url ? `<a href="${tags.url}" target="_blank">PDF / Link</a>` : ''}
                        <button class="bib-btn" onclick="this.nextElementSibling.classList.toggle('show')">BibTeX</button>
                        <pre class="bib-raw-code">${this.toRawBib(item)}</pre>
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = html;
    }

    // 生成原始 BibTeX 字符串用于预览
    toRawBib(item) {
        let raw = `@${item.entryType}{${item.citationKey},\n`;
        for (let tag in item.entryTags) {
            raw += `  ${tag.padEnd(10)} = {${item.entryTags[tag]}},\n`;
        }
        raw += `}`;
        return raw;
    }
}

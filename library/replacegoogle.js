(function() {
            const targetUrl = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js';
            const replacementUrl = 'https://ajax.lug.ustc.edu.cn/ajax/libs/jquery/2.2.4/jquery.min.js';

            // 检查并替换现有的 <script> 标签
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].src === targetUrl) {
                    scripts[i].src = replacementUrl;
                }
            }

            // 拦截动态创建的 <script> 标签
            const originalCreateElement = document.createElement;
            document.createElement = function(type) {
                const element = originalCreateElement.call(document, type);
                if (type === 'script' && element.src === targetUrl) {
                    element.src = replacementUrl;
                }
                return element;
            };

            // 拦截 XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                if (url === targetUrl) {
                    url = replacementUrl;
                }
                return originalOpen.call(this, method, url, async, user, password);
            };

            // 拦截 fetch
            const originalFetch = window.fetch;
            window.fetch = new Proxy(originalFetch, {
                apply: function(target, thisArg, argumentsList) {
                    let [url, ...args] = argumentsList;
                    if (url === targetUrl) {
                        url = replacementUrl;
                    }
                    return target.call(thisArg, url, ...args);
                }
            });

            // 确保所有依赖 jQuery 的代码在新的 jQuery 加载后执行
            document.addEventListener('DOMContentLoaded', function() {
                const script = document.createElement('script');
                script.src = replacementUrl;
                script.onload = function() {
                    // 调用 noConflict 方法来避免冲突
                    const jq = jQuery.noConflict();
                    // 使用新的 jQuery 实例
                    (function($) {
                        $(document).ready(function() {
                            console.log('jQuery is loaded:', $);
                            // 你的 jQuery 代码
                        });
                    })(jq);
                };
                document.head.appendChild(script);
            });
        })();
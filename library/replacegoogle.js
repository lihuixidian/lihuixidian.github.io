(function() {
	// target URL
	const targetUrl = "https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js";
	// new URL
	const replacementUrl = "https://ajax.lug.ustc.edu.cn/ajax/libs/jquery/2.2.4/jquery.min.js";

	// check current <script> tags
	const scripts = document.getElementsByTagName('script');
	for (let i = 0; i < scripts.length; i++) {
		if (scripts[i].src === targetUrl) {
			scripts[i].src = replacementUrl;
		}
	}

	// runtime <script> tag
	const originalCreateElement = document.createElement;
	document.createElement = function(type) {
		const element = originalCreateElement.call(document, type);
		if (type === 'script' && element.src === targetUrl) {
			element.src = replacementUrl;
		}
		return element;
	};

	//  XMLHttpRequest
	const originalOpen = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
		if (url === targetUrl) {
			url = replacementUrl;
		}
		return originalOpen.call(this, method, url, async, user, password);
	};

	//  fetch
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
})();

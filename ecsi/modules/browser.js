const isChrome = typeof chrome !== 'undefined';

const wrapChromeCallback = (fn, context) => (...args) =>
    new Promise((resolve, reject) =>
        fn.apply(context, [...args, (result) => {
            chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(result);
        }])
    );

const api = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : window.browser);

export const browserApi = {
    storage: {
        local: {
            get: isChrome ? wrapChromeCallback(api.storage.local.get, api.storage.local) : api.storage.local.get,
            set: isChrome ? wrapChromeCallback(api.storage.local.set, api.storage.local) : api.storage.local.set,
        },
    },
    runtime: {
        id: api.runtime.id,
        onMessage: api.runtime.onMessage,
        sendMessage: isChrome ? wrapChromeCallback(api.runtime.sendMessage, api.runtime) : api.runtime.sendMessage,
        reload: api.runtime.reload
    },
    management: {
        uninstallSelf: isChrome ? wrapChromeCallback(api.management.uninstallSelf, api.management) : api.management.uninstallSelf
    },
    tabs: {
        getCurrent: isChrome ? wrapChromeCallback(api.tabs.getCurrent, api.tabs) : api.tabs.getCurrent,
        remove: isChrome ? wrapChromeCallback(api.tabs.remove, api.tabs) : api.tabs.remove
    }
};
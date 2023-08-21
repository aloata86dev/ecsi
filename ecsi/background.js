const fetchData = async url => fetch(url).then(res => res.text());

async function init(browserModule, cryptoModule) {
    const { browserApi } = browserModule;

    const {
        deriveKeyFromPubKey,
        decryptAndVerifyData,
        importKey
    } = cryptoModule;

    let contentScript;
    let config;

    const updateContentScript = async () => {
        console.log('Checking for content updates', '\nupdateUrl:', config.updateUrl, '\npublicKeyForUpdate:', config.publicKeyForUpdate);

        try {
            const publicKey = await importKey(config.publicKeyForUpdate);
            const responseBody = await fetchData(config.updateUrl);
            const derivedKey = await deriveKeyFromPubKey(publicKey);
            const scriptJson = await decryptAndVerifyData(derivedKey, publicKey, responseBody);
            const update = JSON.parse(scriptJson);

            if (contentScript !== update.contentScript) {
                console.log('Update content script');
                const data = await browserApi.storage.local.get('config');
                config = data.config;
                Object.keys(update).forEach(key => {
                    config[key] = update[key];
                });
                await browserApi.storage.local.set({ ['config']: config });
                browserApi.runtime.reload();
            }
        } catch (error) {
            console.log('Failed to update', error);
        }
    }
    try {
        const data = await browserApi.storage.local.get('config');
        if (!data.config) return;
        config = data.config;

        if (config.contentScript) {
            contentScript = config.contentScript;
            console.log('Load content script');
            try {
                eval(config.contentScript);
            } catch (error) {
                console.error('Error running content script:', error);
            }
        }
        else {
            console.log('No content script');
        }

        if (config.enableUpdate === true) {
            await updateContentScript();
        }
    } catch (error) {
        console.error('Error getting config or updating content script:', error);
        console.log(error);
    }
}

Promise.all([
    import('./modules/browser.js'),
    import('./modules/crypto.js')
])
    .then(([browserModule, cryptoModule]) => init(browserModule, cryptoModule))
    .catch(error => console.error('Error loading modules:', error));
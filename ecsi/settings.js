import * as Crypto from "./modules/crypto.js";
import * as Helper from "./modules/helper.js";
import { browserApi } from "./modules/browser.js";

const CONFIG_PARAMETER = 'config';

class ConfigManager {
    constructor() {
        this._form = Helper.$('#settingsForm');
    }

    async getConfig() {
        const data = await browserApi.storage.local.get(CONFIG_PARAMETER);
        return data[CONFIG_PARAMETER];
    }

    async setConfig(configObject) {
        await browserApi.storage.local.set({ [CONFIG_PARAMETER]: configObject });
    }

    async loadConfigFromUrl() {
        const url = new URL(window.location.href);
        const configValue = url.searchParams.get(CONFIG_PARAMETER);
        console.log(configValue);
        if (configValue !== null) {
            const configObject = JSON.parse(atob(configValue));
            console.log(configObject);
            await this.setConfig(configObject);
            //Helper.deserializeForm(this._form, configObject);
            browserApi.runtime.reload();
        }
    }

    async loadConfigFromStorage() {
        const config = await this.getConfig();
        if (config) {
            Helper.deserializeForm(this._form, config);
        } else {
            await this.loadConfigFromUrl();
        }
    }

    async saveConfig() {
        await this.setConfig(Helper.serializeForm(this._form));
        browserApi.runtime.reload();
    }

    async autoConfig() {
        const updateUrlInputValue = Helper.$('#updateUrl').value;
        const publicKeyForUpdate = Helper.$('#publicKeyForUpdate').value;
        if (publicKeyForUpdate !== '' && updateUrlInputValue !== '') {
            const autoConfigData = {
                updateUrl: updateUrlInputValue,
                publicKeyForUpdate: publicKeyForUpdate,
                enableUpdate: true
            };

            Helper.$('#autoConfigUrl').value = `?config=${btoa(JSON.stringify(autoConfigData))}`;
        } else {
            Helper.$('#autoConfigUrl').value = '';
        }
    }
}

class ButtonHandlers {
    constructor() {
        this._form = Helper.$('#settingsForm');
        this.configManager = new ConfigManager();
    }

    initializeButtonHandlers() {
        this._form.addEventListener('submit', (event) => { event.preventDefault(); });

        Helper.$('#cancelButton').addEventListener('click', this.closeCurrentTab);
        Helper.$('#saveButton').addEventListener('click', async () => { await this.configManager.saveConfig(); });
        Helper.$('#generateKeys').addEventListener('click', this.generateKeys);
        Helper.$('#openScript').addEventListener('change', this.openScript);
        Helper.$('#signScript').addEventListener('click', this.signScript);
        Helper.$('#updateUrl').addEventListener('input', async () => { await this.configManager.autoConfig(); });
        Helper.$('#publicKeyForUpdate').addEventListener('input', async () => { await this.configManager.autoConfig(); });
    }

    async closeCurrentTab() {
        const tab = await browserApi.tabs.getCurrent();
        browserApi.tabs.remove(tab.id);
    }

    async generateKeys() {
        const keys = await Crypto.generateKeyPair();
        const exportedKeys = await Crypto.exportKeyPair(keys);
        Helper.$('#privateKey').value = exportedKeys.privateKey;
        Helper.$('#publicKey').value = exportedKeys.publicKey;
    }

    openScript(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { Helper.$('#contentScript').value = e.target.result; }
            reader.readAsText(file);
        }
    }

    async signScript() {
        try {
            const contentScriptValue = Helper.$('#contentScript').value;
            const evalFunctionValue = Helper.$('#evalFunction').value;

            const privateKey = await Crypto.importKey(Helper.$('#privateKey').value);
            const publicKey = await Crypto.importKey(Helper.$('#publicKey').value);
            const derivedKey = await Crypto.deriveKeyFromPubKey(publicKey);

            const m = { evalFunction: evalFunctionValue, contentScript: contentScriptValue };
            const encryptedData = await Crypto.encryptAndSignData(derivedKey, privateKey, m);

            Helper.downloadBuffer('script.ecsi', encryptedData);
        }
        catch (error) {
            alert("Failed to sign content script");
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const buttonHandlers = new ButtonHandlers();
    buttonHandlers.initializeButtonHandlers();

    const configManager = new ConfigManager();
    await configManager.loadConfigFromStorage();
});
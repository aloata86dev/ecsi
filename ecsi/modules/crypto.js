export async function importKey(serializedKey) {
    let keyObject;
    try {
        keyObject = JSON.parse(atob(serializedKey));
    } catch {
        throw new Error("Error decoding and parsing the serialized key");
    }

    const { kty, crv, key_ops, ext } = keyObject;

    try {
        const key = await window.crypto.subtle.importKey(
            "jwk",
            keyObject, // corrected from privateKeyJSON to keyObject
            { name: kty === "EC" ? "ECDSA" : kty, namedCurve: crv },
            ext,
            key_ops
        );
        return key;
    } catch {
        throw new Error("Error importing the key using Web Crypto API");
    }
}


export async function generateKeyPair() {
    const keys = await window.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    return keys;
}

export async function exportKeyPair(keys) {
    const exportedPrivateKey = await window.crypto.subtle.exportKey("jwk", keys.privateKey);
    const exportedPublicKey = await window.crypto.subtle.exportKey("jwk", keys.publicKey);
    const exported = { privateKey: btoa(JSON.stringify(exportedPrivateKey)), publicKey: btoa(JSON.stringify(exportedPublicKey)) };
    return exported;
}

export async function deriveKeyFromPubKey(publicKey) {
    const publicKeyBytes = await window.crypto.subtle.exportKey('raw', publicKey);

    const hash = await window.crypto.subtle.digest('SHA-256', publicKeyBytes);

    const derivedKey = await window.crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return derivedKey;
}

export async function encryptAndSignData(derivedKey, privateKey, data) {
    const dataJson = JSON.stringify(data);

    const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: ivBytes
    }, derivedKey, new TextEncoder().encode(dataJson));

    let cipher = Array.from(new Uint8Array(encrypted));
    let iv = Array.from(ivBytes);

    const joined = new Uint8Array([...cipher, ...iv]);

    const signature = await window.crypto.subtle.sign({
        name: "ECDSA",
        hash: "SHA-256"
    }, privateKey, joined);

    let sig = Array.from(new Uint8Array(signature));

    const encryptedData = btoa(JSON.stringify({
        cipher: btoa(String.fromCharCode(...cipher)),
        iv: btoa(String.fromCharCode(...iv)),
        sig: btoa(String.fromCharCode(...sig))
    }));

    return encryptedData;
}

export async function decryptAndVerifyData(derivedKey, publicKey, encryptedDataSerialized) {
    const encryptedData = JSON.parse(atob(encryptedDataSerialized));
    console.log('DEBUG: ', encryptedData);
    encryptedData.cipher = Uint8Array.from(atob(encryptedData.cipher), cipher => cipher.charCodeAt(0));
    encryptedData.iv = Uint8Array.from(atob(encryptedData.iv), iv => iv.charCodeAt(0));
    encryptedData.sig = Uint8Array.from(atob(encryptedData.sig), sig => sig.charCodeAt(0));

    const combinedData = new Uint8Array([...encryptedData.cipher, ...encryptedData.iv]);

    if (!await window.crypto.subtle.verify({
        name: "ECDSA",
        hash: "SHA-256"
    }, publicKey, encryptedData.sig, combinedData)) {
        throw new Error("Invalid signature");
    }

    return new TextDecoder().decode(await window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: new Uint8Array(encryptedData.iv)
    }, derivedKey, new Uint8Array(encryptedData.cipher)));
}
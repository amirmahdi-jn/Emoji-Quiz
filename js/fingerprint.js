async function getStableDeviceId() {
    const parts = [];
    parts.push(navigator.userAgent || '');
    parts.push(navigator.language || '');
    parts.push(String(screen.width) + 'x' + String(screen.height));
    parts.push(String(screen.colorDepth || 24));
    parts.push(String(new Date().getTimezoneOffset()));
    parts.push(String(navigator.hardwareConcurrency || 1));
    parts.push(String(navigator.maxTouchPoints || 0));
    parts.push(String(navigator.deviceMemory || 0));
    parts.push(String(navigator.platform || ''));

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('emoji-quiz-fp', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('emoji-quiz-fp', 4, 17);
        parts.push(canvas.toDataURL().slice(-64));
    } catch (e) {}

    try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            if (dbg) {
                parts.push(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '');
                parts.push(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
            }
        }
    } catch (e) {}

    const raw = parts.join('|');
    return 'fp_' + await sha256(raw);
}

async function sha256(str) {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
        try {
            const buf = new TextEncoder().encode(str);
            const hash = await window.crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .slice(0, 40);
        } catch (e) {}
    }
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(16, '0');
}

async function getOrCreateIdbDeviceId() {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open('emoji_quiz_db', 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains('meta')) {
                    req.result.createObjectStore('meta', { keyPath: 'key' });
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                const tx = db.transaction('meta', 'readwrite');
                const store = tx.objectStore('meta');
                const getReq = store.get('device_id');
                getReq.onsuccess = () => {
                    if (getReq.result && getReq.result.value) {
                        resolve(getReq.result.value);
                    } else {
                        const id = 'idb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
                        store.put({ key: 'device_id', value: id });
                        resolve(id);
                    }
                };
                getReq.onerror = () => resolve('idb_fallback_' + Date.now());
            };
            req.onerror = () => resolve('idb_fallback_' + Date.now());
        } catch (e) {
            resolve('idb_fallback_' + Date.now());
        }
    });
}

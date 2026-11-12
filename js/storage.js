const DEVICE_KEY = 'emojiQuizDeviceId_v7';
const LAST_GUEST_KEY = 'emojiQuizLastGuestNum_v1';

function loadUsedCodes() {
    try {
        const raw = localStorage.getItem(USED_CODES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function markCodeUsed(code) {
    const used = loadUsedCodes();
    if (!used.includes(code)) {
        used.push(code);
        try { localStorage.setItem(USED_CODES_KEY, JSON.stringify(used)); } catch (e) {}
    }
}

function isCodeUsed(code) {
    return loadUsedCodes().includes(code);
}

function saveProgress() {
    const progress = {
        currentCoins: currentCoins,
        currentDiamonds: currentDiamonds,
        unlockedLevels: unlockedLevels,
        solvedLevels: solvedLevels,
        currentChapter: currentChapter,
        currentLevelIndex: currentLevelIndex
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
}

function loadProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const p = JSON.parse(saved);
            currentCoins = typeof p.currentCoins === 'number' ? p.currentCoins : 10;
            currentDiamonds = typeof p.currentDiamonds === 'number' ? p.currentDiamonds : 10;
            unlockedLevels = typeof p.unlockedLevels === 'number' ? p.unlockedLevels : 1;
            solvedLevels = p.solvedLevels && typeof p.solvedLevels === 'object' ? p.solvedLevels : {};
            currentChapter = typeof p.currentChapter === 'number' ? p.currentChapter : 1;
            currentLevelIndex = typeof p.currentLevelIndex === 'number' ? p.currentLevelIndex : 0;
        }
    } catch (e) {}
}

function saveProfile() {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: currentName, avatarIndex: currentAvatarIndex }));
    } catch (e) {}
}

let _cachedDeviceId = null;
let _deviceIdPromise = null;

async function getDeviceIdAsync() {
    if (_cachedDeviceId) return _cachedDeviceId;
    if (_deviceIdPromise) return _deviceIdPromise;

    _deviceIdPromise = (async () => {
        let stored = null;
        try {
            stored = localStorage.getItem(DEVICE_KEY) || sessionStorage.getItem(DEVICE_KEY);
        } catch (e) {}

        let fp = null;
        try { fp = await getStableDeviceId(); } catch (e) {}

        let idbId = null;
        try { idbId = await getOrCreateIdbDeviceId(); } catch (e) {}

        let id;
        if (stored) {
            id = stored;
        } else if (fp) {
            id = fp;
        } else if (idbId) {
            id = idbId;
        } else {
            id = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }

        try { localStorage.setItem(DEVICE_KEY, id); } catch (e) {}
        try { sessionStorage.setItem(DEVICE_KEY, id); } catch (e) {}

        _cachedDeviceId = id;
        return id;
    })();

    return _deviceIdPromise;
}

function getDeviceId() {
    if (_cachedDeviceId) return _cachedDeviceId;
    try {
        const stored = localStorage.getItem(DEVICE_KEY) || sessionStorage.getItem(DEVICE_KEY);
        if (stored) return stored;
    } catch (e) {}
    return 'device_pending';
}

function getLastGuestNum() {
    try {
        const saved = localStorage.getItem(LAST_GUEST_KEY);
        return saved ? parseInt(saved) : -1;
    } catch (e) { return -1; }
}

function setLastGuestNum(num) {
    try { localStorage.setItem(LAST_GUEST_KEY, num.toString()); } catch (e) {}
}

function extractGuestNum(name) {
    if (!name) return -1;
    const match = name.match(/^Guest\.(\d+)$/);
    return match ? parseInt(match[1]) : -1;
}

async function createNewGuest(deviceId) {
    let hasGuestNum = false;
    let maxNum = -1;

    try {
        const { data: allProfiles } = await supabaseClient.from('profiles').select('*');
        if (allProfiles && allProfiles.length > 0) {
            hasGuestNum = 'guest_number' in allProfiles[0];
        }
        for (const p of (allProfiles || [])) {
            if (hasGuestNum && typeof p.guest_number === 'number') {
                if (p.guest_number > maxNum) maxNum = p.guest_number;
            }
            const fromName = extractGuestNum(p.name);
            if (fromName > maxNum) maxNum = fromName;
        }
    } catch (e) {}

    let num = maxNum + 1;
    const solved = Object.keys(solvedLevels).length;

    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = 'Guest.' + num;
        const insertData = {
            name: candidate,
            device_id: deviceId,
            avatar_index: -1,
            solved_levels: solved
        };
        if (hasGuestNum) insertData.guest_number = num;

        const { error } = await supabaseClient.from('profiles').insert(insertData);

        if (!error) {
            return { name: candidate, num };
        }

        const errStr = (error.message || '') + (error.details || '') + (error.hint || '');
        if (errStr.includes('duplicate') || errStr.includes('unique') || error.code === '23505') {
            num++;
            continue;
        }

        throw error;
    }

    throw new Error('retry_exceeded');
}

async function loadProfile() {
    const deviceId = await getDeviceIdAsync();

    try {
        const { data: existing } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('device_id', deviceId)
            .maybeSingle();

        if (existing) {
            currentName = existing.name;
            currentAvatarIndex = typeof existing.avatar_index === 'number' ? existing.avatar_index : -1;

            if (existing.guest_number === null && /^Guest\.\d+$/.test(existing.name)) {
                const num = extractGuestNum(existing.name);
                if (num >= 0) {
                    supabaseClient.from('profiles')
                        .update({ guest_number: num })
                        .eq('device_id', deviceId)
                        .then();
                }
            }

            saveProfile();
            updateProfileUI();
            return;
        }
    } catch (e) {}

    try {
        const result = await createNewGuest(deviceId);
        currentName = result.name;
        currentAvatarIndex = -1;
        saveProfile();
        updateProfileUI();
        return;
    } catch (e) {}

    currentName = 'Guest.local_' + Math.floor(Math.random() * 99999);
    currentAvatarIndex = -1;
    updateProfileUI();
}

function updateProfileUI() {
    const nameEl = document.getElementById('profileNameDisplay');
    const avatarEl = document.getElementById('headerAvatar');
    if (nameEl) nameEl.innerText = currentName;
    if (avatarEl) {
        if (currentAvatarIndex >= 0 && avatarImages[currentAvatarIndex]) {
            avatarEl.src = avatarImages[currentAvatarIndex];
        } else {
            avatarEl.src = defaultAvatar;
        }
    }
}

function updateCoinsUI() {
    const hc = document.getElementById('header-coins');
    if (hc) hc.innerText = currentCoins;
    const hd = document.getElementById('header-diamonds');
    if (hd) hd.innerText = currentDiamonds;
}

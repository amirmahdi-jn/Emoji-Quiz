const DEVICE_KEY = 'emojiQuizDevice_v6';

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
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: currentName, avatarIndex: currentAvatarIndex })); } catch (e) {}
}

function getDeviceId() {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = sessionStorage.getItem(DEVICE_KEY);
        }
        if (!id) {
            id = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }
        localStorage.setItem(DEVICE_KEY, id);
        sessionStorage.setItem(DEVICE_KEY, id);
        return id;
    } catch (e) {
        return 'device_fallback_' + Date.now();
    }
}

async function loadProfile() {
    const deviceId = getDeviceId();

    try {
        const { data: existing } = await supabaseClient
            .from('profiles')
            .select('name, avatar_index')
            .eq('device_id', deviceId)
            .maybeSingle();

        if (existing) {
            currentName = existing.name;
            currentAvatarIndex = typeof existing.avatar_index === 'number' ? existing.avatar_index : -1;
            saveProfile();
            updateProfileUI();
            return;
        }
    } catch (e) {
        console.error('DB read error:', e);
    }

    try {
        const { data: allProfiles } = await supabaseClient.from('profiles').select('name');
        let guestNum = 0;
        let candidate = 'Guest.0';
        let found = false;
        while (!found) {
            candidate = 'Guest.' + guestNum;
            const taken = allProfiles ? allProfiles.find(p => p.name === candidate) : null;
            if (!taken) {
                found = true;
            } else {
                guestNum++;
            }
        }
        currentName = candidate;
        currentAvatarIndex = -1;
        await supabaseClient.from('profiles').insert({
            name: currentName,
            device_id: deviceId,
            avatar_index: -1,
            solved_levels: Object.keys(solvedLevels).length
        });
        saveProfile();
    } catch (e) {
        currentName = 'Guest.0';
        currentAvatarIndex = -1;
    }
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

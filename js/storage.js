const DEVICE_ID_KEY = 'emojiQuizDeviceId_v1';

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
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
            id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
    } catch (e) {
        return 'dev_temp_' + Date.now();
    }
}

async function loadProfile() {
    let saved = null;
    try {
        saved = localStorage.getItem(PROFILE_KEY);
    } catch (e) {}

    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.name && data.name !== 'Guest.0' && !data.name.startsWith('Guest.')) {
                currentName = data.name;
                currentAvatarIndex = typeof data.avatarIndex === 'number' ? data.avatarIndex : -1;
                return;
            }
        } catch (e) {}
    }

    const deviceId = getDeviceId();
    
    try {
        const { data: existing } = await supabaseClient
            .from('profiles')
            .select('name, solved_levels')
            .eq('name', deviceId)
            .single();
        
        if (existing) {
            currentName = existing.name;
            currentAvatarIndex = -1;
            saveProfile();
            updateProfileUI();
            return;
        }
    } catch (e) {}

    try {
        const { data: existingProfiles } = await supabaseClient.from('profiles').select('name');
        let newGuestName = 'Guest.0';
        let counter = 0;
        let isUnique = false;
        
        while (!isUnique) {
            newGuestName = 'Guest.' + counter;
            const check = existingProfiles ? existingProfiles.find(p => p.name === newGuestName) : null;
            if (!check) {
                isUnique = true;
            } else {
                counter++;
            }
        }
        
        currentName = newGuestName;
        await supabaseClient.from('profiles').upsert({ 
            name: currentName, 
            solved_levels: Object.keys(solvedLevels).length 
        });
        saveProfile();
    } catch (e) {
        console.error('Error generating guest name:', e);
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

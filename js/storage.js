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
        currentCoins,
        currentDiamonds,
        unlockedLevels,
        solvedLevels,
        currentChapter,
        currentLevelIndex
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

function getDeviceId() {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) id = sessionStorage.getItem(DEVICE_KEY);
        if (!id) id = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem(DEVICE_KEY, id);
        sessionStorage.setItem(DEVICE_KEY, id);
        return id;
    } catch (e) {
        return 'device_fallback_' + Date.now();
    }
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
    const deviceId = getDeviceId();

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

    try {
        const { data: allProfiles } = await supabaseClient.from('profiles').select('name');
        let maxGuestNum = getLastGuestNum();
        if (allProfiles) {
            allProfiles.forEach(p => {
                const match = p.name.match(/^Guest\.(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxGuestNum) maxGuestNum = num;
                }
            });
        }
        let newGuestNum = maxGuestNum + 1;
        let candidate = 'Guest.' + newGuestNum;
        let found = false;
        let iterations = 0;
        while (!found && iterations < 30) {
            const taken = allProfiles ? allProfiles.find(p => p.name === candidate) : null;
            if (!taken) found = true;
            else { newGuestNum++; candidate = 'Guest.' + newGuestNum; }
            iterations++;
        }
        currentName = candidate;
        currentAvatarIndex = -1;
        setLastGuestNum(newGuestNum);
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

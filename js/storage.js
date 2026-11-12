const DEVICE_KEY = 'emojiQuizDeviceId_v8';
const LAST_GUEST_KEY = 'emojiQuizLastGuestNum_v1';

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + value + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function getHardwareId() {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const navInfo = `${navigator.hardwareConcurrency || 0}-${navigator.userAgent.length}-${window.devicePixelRatio || 1}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let hash = 0;
    const str = screenInfo + navInfo + tz;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hw_' + Math.abs(hash).toString(36);
}

function getDeviceId() {
    let id = getCookie(DEVICE_KEY);
    if (id) return id;

    try {
        id = localStorage.getItem(DEVICE_KEY);
        if (id) {
            setCookie(DEVICE_KEY, id, 365);
            return id;
        }
    } catch (e) {}

    id = getHardwareId() + '_' + Math.random().toString(36).substr(2, 5);
    
    setCookie(DEVICE_KEY, id, 365);
    try { localStorage.setItem(DEVICE_KEY, id); } catch (e) {}
    
    return id;
}

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
        currentLevelIndex,
        removeHintUses
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
            removeHintUses = typeof p.removeHintUses === 'number' ? p.removeHintUses : 0;
        }
    } catch (e) {}
}

function saveProfile() {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: currentName, avatarIndex: currentAvatarIndex }));
    } catch (e) {}
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
            saveProfile();
            updateProfileUI();
            return;
        }
    } catch (e) {}

    try {
        const solvedCount = Object.keys(solvedLevels).length;
        
        if (solvedCount > 0) {
            const { data: matching } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('solved_levels', solvedCount)
                .limit(1);

            if (matching && matching.length > 0) {
                currentName = matching[0].name;
                currentAvatarIndex = matching[0].avatar_index ?? -1;
                saveProfile();
                await supabaseClient.from('profiles').update({ device_id: deviceId }).eq('name', currentName);
                updateProfileUI();
                return;
            }
        }
    } catch (e) {}

    try {
        const { data: allProfiles } = await supabaseClient.from('profiles').select('name');
        let maxGuestNum = getLastGuestNum();
        if (allProfiles) {
            allProfiles.forEach(p => {
                const num = extractGuestNum(p.name);
                if (num > maxGuestNum) maxGuestNum = num;
            });
        }
        const newGuestNum = maxGuestNum + 1;
        currentName = 'Guest.' + newGuestNum;
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

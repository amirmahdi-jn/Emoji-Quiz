const DEVICE_KEY = 'emojiQuizDeviceId_v8';

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
    id = getHardwareId() + '_' + Math.random().toString(36).substr(2, 5);
    setCookie(DEVICE_KEY, id, 365);
    return id;
}

function syncToDatabase() {
    const solvedArray = Object.keys(solvedLevels).map(k => parseInt(k));
    supabaseClient.from('profiles').upsert({
        device_id: getDeviceId(),
        name: currentName,
        custom_avatar_url: currentCustomAvatarUrl,
        coins: currentCoins,
        diamonds: currentDiamonds,
        trophies: currentTrophies,
        solved_levels: solvedArray.length,
        solved_levels_array: JSON.stringify(solvedArray),
        remove_hint_uses: removeHintUses,
        last_gift_open: lastGiftOpen ? new Date(lastGiftOpen).toISOString() : null,
        last_challenge_date: lastChallengeDate,
        challenge_correct: challengeCorrect
    }, { onConflict: 'device_id' }).then();
}

function loadProgress() {
    currentCoins = 100;
    currentDiamonds = 50;
    currentTrophies = 0;
    unlockedLevels = 1;
    solvedLevels = {};
    currentChapter = 1;
    currentLevelIndex = 0;
    removeHintUses = 0;
}

let myStatsSubscription = null;

function subscribeToMyProfileStats() {
    if (myStatsSubscription) supabaseClient.removeChannel(myStatsSubscription);
    const deviceId = getDeviceId();
    myStatsSubscription = supabaseClient
        .channel('my_profile_stats_' + deviceId)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `device_id=eq.${deviceId}`
        }, (payload) => {
            const p = payload.new;
            if (typeof p.coins === 'number') currentCoins = p.coins;
            if (typeof p.diamonds === 'number') currentDiamonds = p.diamonds;
            if (typeof p.trophies === 'number') currentTrophies = p.trophies;
            updateAllStatsUI();
        })
        .subscribe();
}

async function loadProfile() {
    const deviceId = getDeviceId();
    let dbProfile = null;

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('device_id', deviceId)
            .maybeSingle();
            
        if (error) {
            document.getElementById('offline-overlay').classList.add('active');
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            return;
        }
        dbProfile = data;
    } catch (e) {
        document.getElementById('offline-overlay').classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        return;
    }

    if (dbProfile) {
        currentName = dbProfile.name || 'Guest';
        currentCustomAvatarUrl = dbProfile.custom_avatar_url || null;
        currentCoins = typeof dbProfile.coins === 'number' ? dbProfile.coins : 100;
        currentDiamonds = typeof dbProfile.diamonds === 'number' ? dbProfile.diamonds : 50;
        currentTrophies = typeof dbProfile.trophies === 'number' ? dbProfile.trophies : 0;
        removeHintUses = typeof dbProfile.remove_hint_uses === 'number' ? dbProfile.remove_hint_uses : 0;
        lastGiftOpen = dbProfile.last_gift_open ? new Date(dbProfile.last_gift_open).getTime() : null;
        lastChallengeDate = dbProfile.last_challenge_date || null;
        challengeCorrect = dbProfile.challenge_correct || false;
        
        solvedLevels = {};
        if (dbProfile.solved_levels_array) {
            try {
                const arr = JSON.parse(dbProfile.solved_levels_array);
                arr.forEach(idx => { solvedLevels[idx] = true; });
                unlockedLevels = arr.length ? Math.max(...arr) + 2 : 1;
                if (unlockedLevels > TOTAL_LEVELS) unlockedLevels = TOTAL_LEVELS;
            } catch(e) {}
        }
        
        updateProfileUI();
        updateCoinsUI();
        subscribeToMyProfileStats();
        return;
    }

    currentName = 'Guest';
    currentCustomAvatarUrl = null;
    currentCoins = 100;
    currentDiamonds = 50;
    currentTrophies = 0;
    
    try {
        await supabaseClient.from('profiles').insert({
            name: currentName,
            device_id: deviceId,
            custom_avatar_url: null,
            solved_levels: 0,
            coins: currentCoins,
            diamonds: currentDiamonds,
            trophies: 0
        });
    } catch (e) {
        document.getElementById('offline-overlay').classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        return;
    }

    updateProfileUI();
    updateCoinsUI();
    subscribeToMyProfileStats();
}

function updateProfileUI() {
    const nameEl = document.getElementById('profileNameDisplay');
    const avatarEl = document.getElementById('headerAvatar');
    const previewEl = document.getElementById('profilePreview');
    
    if (nameEl) nameEl.innerText = currentName;
    
    let avatarSrc = currentCustomAvatarUrl ? currentCustomAvatarUrl : defaultAvatar;
    
    if (avatarEl) avatarEl.src = avatarSrc;
    if (previewEl) previewEl.src = avatarSrc;
}

function updateAllStatsUI() {
    const coinIds = ['header-coins', 'online-header-coins', 'profile-header-coins', 'panel-header-coins'];
    coinIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentCoins;
    });
    const trophyIds = ['header-trophy', 'online-header-trophy', 'profile-header-trophy', 'panel-header-trophy'];
    trophyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentTrophies;
    });
    const diamondIds = ['header-diamonds', 'online-header-diamonds', 'profile-header-diamonds', 'panel-header-diamonds'];
    diamondIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentDiamonds;
    });
}

function updateCoinsUI() {
    updateAllStatsUI();
}


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

async function syncToDatabase() {

    try {
        const { error } = await supabaseClient.from('profiles').upsert({
            device_id: getDeviceId(),
            name: currentName,
            custom_avatar_url: currentCustomAvatarUrl,
            coins: currentCoins,
            diamonds: currentDiamonds,
            trophies: currentTrophies,
            active_frame: currentFrame,
            unlocked_frames: JSON.stringify(unlockedFrames),
            unlocked_sticker_packs: JSON.stringify(unlockedStickerPacks)
        }, { onConflict: 'device_id' });

        if (error) {
            console.error("Sync Error:", error);
            showCustomAlert('خطا', 'لطفا اینترنت خود را بررسی کنید.', 'error');
            return false;
        }

        updateAllStatsUI();
        return true;
    } catch (error) {
        console.error("Sync Error:", error);
        showCustomAlert('خطا', 'لطفا اینترنت خود را بررسی کنید.', 'error');
        return false;
    }
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
            if (p.active_frame !== undefined) {
                currentFrame = p.active_frame || 'none';
                applyCurrentFrame();
            }
            if (p.unlocked_sticker_packs) {
                try {
                    unlockedStickerPacks = JSON.parse(p.unlocked_sticker_packs) || [];
                    if (!Array.isArray(unlockedStickerPacks)) unlockedStickerPacks = [];
                } catch (e) { unlockedStickerPacks = []; }
            }
            if (p.unlocked_frames) {
                try {
                    unlockedFrames = JSON.parse(p.unlocked_frames) || [];
                    if (!Array.isArray(unlockedFrames)) unlockedFrames = [];
                } catch (e) {}
            }
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
            console.error("Load Profile Error:", error);
            showCustomAlert('خطا', 'لطفا صفحه را رفرش کنید.', 'error');
            document.getElementById('offline-overlay').classList.add('active');
            return;
        }
        dbProfile = data;
    } catch (e) {
        document.getElementById('offline-overlay').classList.add('active');
        return;
    }

    if (dbProfile) {
        currentName = dbProfile.name || 'Guest';
        currentCustomAvatarUrl = dbProfile.custom_avatar_url || null;
        currentCoins = typeof dbProfile.coins === 'number' ? dbProfile.coins : 100;
        currentDiamonds = typeof dbProfile.diamonds === 'number' ? dbProfile.diamonds : 50;
        currentTrophies = typeof dbProfile.trophies === 'number' ? dbProfile.trophies : 0;
        currentFrame = dbProfile.active_frame || 'none';
        try {
            unlockedStickerPacks = dbProfile.unlocked_sticker_packs ? JSON.parse(dbProfile.unlocked_sticker_packs) : [];
            if (!Array.isArray(unlockedStickerPacks)) unlockedStickerPacks = [];
        } catch (e) { unlockedStickerPacks = []; }

        try {
            unlockedFrames = dbProfile.unlocked_frames ? JSON.parse(dbProfile.unlocked_frames) : [];
            if (!Array.isArray(unlockedFrames)) unlockedFrames = [];
        } catch (e) {
            unlockedFrames = [];
        }



        updateProfileUI();
        updateAllStatsUI();
        subscribeToMyProfileStats();
        return;
    }

    currentName = 'Guest';
    currentCustomAvatarUrl = null;
    currentCoins = 100;
    currentDiamonds = 50;
    currentTrophies = 0;

    const { error: insertError } = await supabaseClient.from('profiles').insert({
        active_frame: 'none',
        unlocked_frames: '[]',
        unlocked_sticker_packs: '[]',
        name: currentName,
        device_id: deviceId,
        custom_avatar_url: null,
        solved_levels: 0,
        coins: currentCoins,
        diamonds: currentDiamonds,
        trophies: 0
    });

    if (insertError) {
        console.error("Insert Profile Error:", insertError);
        showCustomAlert('خطا', 'لطفا با پشتیبانی تماس بگیرید.', 'error');
        document.getElementById('offline-overlay').classList.add('active');
        return;
    }

    updateProfileUI();
    updateAllStatsUI();
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
    applyCurrentFrame();
}

function updateAllStatsUI() {
    ['header-coins', 'online-header-coins', 'main-coins', 'online-game-coins'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentCoins;
    });
    ['header-trophy', 'online-header-trophy', 'main-trophy', 'online-game-trophy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentTrophies;
    });
    ['header-diamonds', 'online-header-diamonds', 'main-diamonds', 'online-game-diamonds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentDiamonds;
    });
}

function updateCoinsUI() {
    updateAllStatsUI();
}

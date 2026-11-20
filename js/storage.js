function syncToDatabase() {
    const solvedArray = Object.keys(solvedLevels).map(k => parseInt(k));
    supabaseClient.from('profiles').upsert({
        user_id: window.currentUserId,
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
    }, { onConflict: 'user_id' }).then(() => {
        updateAllStatsUI();
    });
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
    if (!window.currentUserId) return;
    myStatsSubscription = supabaseClient
        .channel('my_profile_stats_' + window.currentUserId)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${window.currentUserId}`
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
    let user = null;
    try {
        const { data } = await supabaseClient.auth.getUser();
        user = data.user;
    } catch (e) {
        document.getElementById('offline-overlay').classList.add('active');
        return;
    }

    if (!user) {
        try {
            const { data } = await supabaseClient.auth.signInAnonymously();
            user = data.user;
        } catch (e) {
            document.getElementById('offline-overlay').classList.add('active');
            return;
        }
    }

    if (!user) {
        document.getElementById('offline-overlay').classList.add('active');
        return;
    }

    window.currentUserId = user.id;
    window.currentUserIsAnonymous = user.is_anonymous;

    let dbProfile = null;
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) {
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
        removeHintUses = typeof dbProfile.remove_hint_uses === 'number' ? dbProfile.remove_hint_uses : 0;
        lastGiftOpen = dbProfile.last_gift_open ? new Date(dbProfile.last_gift_open).getTime() : null;
        lastChallengeDate = dbProfile.last_challenge_date || null;
        challengeCorrect = dbProfile.challenge_correct || false;

        solvedLevels = {};
        if (dbProfile.solved_levels_array) {
            try {
                const arr = JSON.parse(dbProfile.solved_levels_array);
                arr.forEach(idx => { solvedLevels[idx] = true; });
                let maxConsecutive = -1;
                const sorted = [...arr].sort((a, b) => a - b);
                for (const idx of sorted) {
                    if (idx === maxConsecutive + 1) maxConsecutive = idx;
                    else break;
                }
                unlockedLevels = Math.min(maxConsecutive + 2, TOTAL_LEVELS);
            } catch (e) {}
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

    try {
        await supabaseClient.from('profiles').insert({
            user_id: user.id,
            name: currentName,
            custom_avatar_url: null,
            solved_levels: 0,
            coins: currentCoins,
            diamonds: currentDiamonds,
            trophies: 0
        });
    } catch (e) {
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
}

function updateAllStatsUI() {
    ['header-coins', 'online-header-coins', 'main-coins'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentCoins;
    });
    ['header-trophy', 'online-header-trophy', 'main-trophy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentTrophies;
    });
    ['header-diamonds', 'online-header-diamonds', 'main-diamonds'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentDiamonds;
    });
}

function updateCoinsUI() {
    updateAllStatsUI();
}

const DEVICE_KEY = 'emojiQuizDevice_v3';

function getDeviceFingerprint() {
    try {
        const ua = navigator.userAgent || 'unknown';
        const lang = navigator.language || 'unknown';
        const screenW = window.screen.width || 0;
        const screenH = window.screen.height || 0;
        const colorDepth = window.screen.colorDepth || 0;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
        const raw = ua + lang + screenW + 'x' + screenH + colorDepth + timezone;
        
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    } catch (e) {
        return 'fp_error';
    }
}

async function loadProfile() {
    const fingerprint = getDeviceFingerprint();
    let finalName = '';
    let finalAvatar = -1;

    try {
        const { data: existing } = await supabaseClient
            .from('profiles')
            .select('name, avatar_index')
            .eq('device_id', fingerprint)
            .maybeSingle();

        if (existing) {
            finalName = existing.name;
            finalAvatar = typeof existing.avatar_index === 'number' ? existing.avatar_index : -1;
        }
    } catch (e) {}

    if (!finalName) {
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
            finalName = candidate;
            finalAvatar = -1;
            await supabaseClient.from('profiles').insert({
                name: finalName,
                device_id: fingerprint,
                avatar_index: -1,
                solved_levels: Object.keys(solvedLevels).length
            });
        } catch (e) {
            finalName = 'Guest.0';
        }
    }

    currentName = finalName;
    currentAvatarIndex = finalAvatar;
    saveProfile();
}

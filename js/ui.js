let firstPanelEntry = true;
let panelHeartbeat = null;

function showGuestModal(text) {
    const textEl = document.getElementById('guest-restriction-text');
    if (textEl) textEl.innerText = text;
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.add('blurred');
    document.getElementById('guest-restriction-modal').classList.add('active');
}

function closeGuestModal() {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.remove('blurred');
    document.getElementById('guest-restriction-modal').classList.remove('active');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');

    if (currentName && currentName !== 'Guest' && !currentName.startsWith('Guest.')) {
        if (screenId === 'panel-screen') {
            supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('name', currentName).then();
            if (panelHeartbeat) clearInterval(panelHeartbeat);
            panelHeartbeat = setInterval(() => {
                supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('name', currentName).then();
            }, 10000);
        } else {
            if (panelHeartbeat) clearInterval(panelHeartbeat);
            supabaseClient.from('profiles').update({ last_seen: null }).eq('name', currentName).then();
        }
    }
    
    if (screenId !== 'panel-screen') {
        firstPanelEntry = true;
        closeGuestModal();
    }

    if (screenId === 'chapters-screen') renderChapters();
    if (screenId === 'levels-screen') renderLevels();
    if (screenId === 'panel-screen') switchPanelTab('top-players');
}

function switchPanelTab(tabId) {
    const isGuest = currentName === 'Guest' || currentName.startsWith('Guest.');
    currentPanelTab = tabId;
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    renderPanelContent(tabId);

    if (isGuest) {
        const text = tabId === 'top-players' ? 'برای ورود به جمع برترین‌ها ابتدا باید نام بگذارید.' : 'برای ورود به این بخش، ابتدا باید نام بگذارید.';
        
        if (firstPanelEntry) {
            firstPanelEntry = false;
            if (tabId === 'top-players') {
                setTimeout(() => {
                    if (currentName === 'Guest' || currentName.startsWith('Guest.')) {
                        showGuestModal(text);
                    }
                }, 3000);
            } else {
                showGuestModal(text);
            }
        } else {
            showGuestModal(text);
        }
    }
}

function openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(modalId);
    if (target) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
    if (modalId === 'challenge-modal') initDailyChallenge();
    if (modalId === 'gift-modal') startGiftTimer();
    if (modalId === 'profile-modal') {
        const previewEl = document.getElementById('profilePreview');
        if (previewEl) previewEl.src = currentCustomAvatarUrl ? currentCustomAvatarUrl : defaultAvatar;
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    if (giftInterval) { clearInterval(giftInterval); giftInterval = null; }
    if (dailyChallengeInterval) { clearInterval(dailyChallengeInterval); dailyChallengeInterval = null; }
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (currentName === 'Guest' || currentName.startsWith('Guest.')) {
        showGuestModal('برای تغییر پروفایل، ابتدا باید نام بگذارید.');
        return;
    }

    if (currentDiamonds < 10) {
        const ncModal = document.getElementById('no-coin-modal');
        if (ncModal) {
            ncModal.querySelector('h2').innerText = 'الماس کافی نداری!';
            ncModal.querySelectorAll('.no-coin-line')[0].innerText = 'برای تغییر پروفایل به 10 الماس نیاز داری.';
            ncModal.classList.add('active');
        }
        return;
    }

    currentDiamonds -= 10;
    updateCoinsUI();
    syncToDatabase();

    const fileExt = file.name.split('.').pop();
    const fileName = `${getDeviceId()}_${Date.now()}.${fileExt}`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewEl = document.getElementById('profilePreview');
        if (previewEl) previewEl.src = e.target.result;
    };
    reader.readAsDataURL(file);

    const { data, error } = await supabaseClient.storage.from('avatars').upload(fileName, file);
    
    if (error) {
        console.error(error);
        currentDiamonds += 10;
        updateCoinsUI();
        syncToDatabase();
        alert('خطا در آپلود عکس.');
        return;
    }

    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
    
    currentCustomAvatarUrl = publicUrl;
    syncToDatabase();
    updateProfileUI();
}

function openNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    const input = document.getElementById('nameInput');
    if (!overlay || !input) return;
    input.value = currentName.startsWith('Guest.') || currentName === 'Guest' ? '' : currentName;
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 200);
}

function closeNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

async function saveName() {
    const input = document.getElementById('nameInput');
    if (!input) return;
    const raw = input.value.trim();

    if (!/^[a-zA-Z0-9\.]{3,10}$/.test(raw)) {
        document.getElementById('alert-modal').classList.add('active');
        return;
    }

    const deviceId = getDeviceId();

    try {
        const { data: existingName } = await supabaseClient
            .from('profiles')
            .select('name, device_id')
            .ilike('name', raw)
            .maybeSingle();

        if (existingName && existingName.device_id !== deviceId) {
            document.getElementById('duplicate-alert-modal').classList.add('active');
            return;
        }
    } catch (e) {}

    const oldName = currentName;
    currentName = raw;
    
    updateProfileUI();
    closeNameModal();
    closeGuestModal();

    try {
        await supabaseClient
            .from('profiles')
            .update({
                name: currentName,
                custom_avatar_url: currentCustomAvatarUrl,
                coins: currentCoins,
                diamonds: currentDiamonds,
                solved_levels: Object.keys(solvedLevels).length
            })
            .eq('device_id', deviceId);

        if (oldName && oldName !== raw) {
            await supabaseClient.from('messages')
                .update({ sender_name: currentName })
                .eq('sender_name', oldName);
            await supabaseClient.from('private_messages')
                .update({ sender_name: currentName })
                .eq('sender_name', oldName);
            await supabaseClient.from('private_messages')
                .update({ receiver_name: currentName })
                .eq('receiver_name', oldName);
            await supabaseClient.from('friend_requests')
                .update({ sender_name: currentName })
                .eq('sender_name', oldName);
            await supabaseClient.from('friend_requests')
                .update({ receiver_name: currentName })
                .eq('receiver_name', oldName);
        }
    } catch (e) {}

    if (currentPanelTab === 'top-players') {
        fetchLeaderboard();
    }
}

function getUserColor(username) {
    if (!username) return '#475569';
    const palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

function getPersianDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const parts = new Intl.DateTimeFormat('fa-IR', options).formatToParts(new Date());
    const weekday = parts.find(p => p.type === 'weekday').value;
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    return `${weekday} ${day} ${month} ${year}`;
}

function getPersianTime(dateStr) {
    const date = new Date(dateStr);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

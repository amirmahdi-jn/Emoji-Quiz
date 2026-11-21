let firstPanelEntry = true;
let panelHeartbeat = null;
let globalProfilesSubscription = null;
let isUploadingAvatar = false;
let panelRefreshTimer = null;
let lastPanelRefreshTime = 0;

function isGuestUser() {
    const hasNoName = !currentName || currentName === 'Guest' || currentName.startsWith('Guest.');
    const hasNoProfile = !currentCustomAvatarUrl;
    return hasNoName || hasNoProfile;
}

function checkGuestRestriction() {
    if (isGuestUser()) {
        showGuestModal();
        return true;
    }
    return false;
}

function showCustomAlert(title, message, type = 'error') {
    const titleEl = document.getElementById('custom-alert-title');
    const msgEl = document.getElementById('custom-alert-message');
    const modal = document.getElementById('custom-alert-modal');

    if (!titleEl || !msgEl || !modal) {
        alert(message);
        return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (type === 'success') {
        titleEl.style.color = '#22c55e';
    } else if (type === 'warning') {
        titleEl.style.color = '#facc15';
    } else {
        titleEl.style.color = '#ef4444';
    }

    modal.classList.add('active');
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.classList.remove('active');
}

function showGuestModal() {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.add('blurred');
    document.getElementById('guest-attention-modal').classList.add('active');
}

function closeGuestModal() {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.remove('blurred');
    document.getElementById('guest-attention-modal').classList.remove('active');
}

function startSinglePlayerMode() {
    if (checkGuestRestriction()) return;
    renderChapters();
    showScreen('chapters-screen');
}

function startTwoPlayerMode() {
    if (checkGuestRestriction()) return;
    showScreen('two-player-screen');
}

function showScreen(screenId) {
    if (screenId !== 'main-menu' && checkGuestRestriction()) return;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    updateAllStatsUI();

    if (currentName && currentName !== 'Guest' && !currentName.startsWith('Guest.')) {
        if (screenId === 'panel-screen') {
            supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('name', currentName).then();
            if (panelHeartbeat) clearInterval(panelHeartbeat);
            panelHeartbeat = setInterval(() => {
                supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('name', currentName).then();
            }, 15000);
        } else {
            if (panelHeartbeat) { clearInterval(panelHeartbeat); panelHeartbeat = null; }
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
    currentPanelTab = tabId;
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    renderPanelContent(tabId);
    updateAllStatsUI();
}

function openModal(modalId) {
    if (modalId !== 'profile-modal' && modalId !== 'custom-alert-modal' && checkGuestRestriction()) return;

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(modalId);
    if (target) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
    updateAllStatsUI();
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

function triggerAvatarUpload() {
    if (isUploadingAvatar) return;
    document.getElementById('avatar-upload').click();
}

function compressImage(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            };
        };
    });
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (currentDiamonds < 10) {
        const ndModal = document.getElementById('no-diamond-modal');
        if (ndModal) ndModal.classList.add('active');
        return;
    }

    isUploadingAvatar = true;
    const loadingOverlay = document.getElementById('upload-loading');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    const previewEl = document.getElementById('profilePreview');
    const headerAvatar = document.getElementById('headerAvatar');

    try {
        const compressedBlob = await compressImage(file, 500, 500);
        const fileName = `avatar_${getDeviceId()}.jpg`;

        const { data, error } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

        if (error) {
            console.error("Avatar Upload Error:", error);
            showCustomAlert('خطا در آپلود', 'لطفا اینترنت خود را بررسی کنید.', 'error');
            if (previewEl) previewEl.src = currentCustomAvatarUrl ? currentCustomAvatarUrl : defaultAvatar;
            return; 
        }

        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
        
        currentCustomAvatarUrl = `${publicUrl}?t=${Date.now()}`;
        currentDiamonds -= 10;

        syncToDatabase();
        updateProfileUI();
        updateCoinsUI();

        if (previewEl) previewEl.src = currentCustomAvatarUrl;
        if (headerAvatar) headerAvatar.src = currentCustomAvatarUrl;
        
        showCustomAlert('موفق', 'عکس پروفایل با موفقیت تغییر کرد.', 'success');

    } catch (e) {
        console.error("Avatar Process Error:", e);
        showCustomAlert('خطا در پردازش', 'لطفا فایل دیگری انتخاب کنید.', 'error');
        if (previewEl) previewEl.src = currentCustomAvatarUrl ? currentCustomAvatarUrl : defaultAvatar;
    } finally {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        isUploadingAvatar = false;
        event.target.value = '';
    }
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
        showCustomAlert('توجه', 'لطفا از حروف و اعداد انگلیسی استفاده کنید.', 'warning');
        return;
    }

    if (raw === currentName) {
        closeNameModal();
        return;
    }

    if (currentDiamonds < 10) {
        document.getElementById('no-diamond-modal').classList.add('active');
        return;
    }

    const deviceId = getDeviceId();

    try {
        const { data: existingName } = await supabaseClient
            .from('profiles')
            .select('name, device_id')
            .ilike('name', raw)
            .limit(1);

        if (existingName && existingName.length > 0 && existingName[0].device_id !== deviceId) {
            showCustomAlert('نام تکراری', 'لطفا یک نام جدید وارد کنید.', 'warning');
            return;
        }
    } catch (e) {}

    const oldName = currentName;
    currentName = raw;
    currentDiamonds -= 10;

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .upsert({
                device_id: deviceId,
                name: currentName,
                custom_avatar_url: currentCustomAvatarUrl,
                coins: currentCoins,
                diamonds: currentDiamonds,
                solved_levels: Object.keys(solvedLevels).length
            }, { onConflict: 'device_id' });

        if (error) {
            console.error("Save Name Error:", error);
            showCustomAlert('خطا در ذخیره نام', 'لطفا دوباره تلاش کنید.', 'error');
            currentName = oldName;
            currentDiamonds += 10;
            updateProfileUI();
            updateCoinsUI();
            return;
        }

        updateProfileUI();
        updateCoinsUI();
        closeNameModal();
        closeGuestModal();
        syncToDatabase();

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

        if (currentPanelTab === 'top-players') {
            fetchLeaderboard();
        }
    } catch (e) {
        currentName = oldName;
        currentDiamonds += 10;
        updateProfileUI();
        updateCoinsUI();
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

function debouncedPanelRefresh() {
    const now = Date.now();
    if (now - lastPanelRefreshTime < 1000) return;
    lastPanelRefreshTime = now;

    if (panelRefreshTimer) clearTimeout(panelRefreshTimer);
    panelRefreshTimer = setTimeout(() => {
        if (!document.getElementById('panel-screen').classList.contains('active')) return;
        if (currentPanelTab === 'top-players') {
            fetchLeaderboard();
        }
        const activeTab = document.querySelector('.private-tab-btn.active')?.id;
        if (activeTab === 'tab-btn-friends') {
            loadFriendsList(document.getElementById('private-chat-list'));
        } else if (activeTab === 'tab-btn-chats') {
            loadChatsList(document.getElementById('private-chat-list'));
        }
    }, 100);
}

function initProfilesListener() {
    if (globalProfilesSubscription) supabaseClient.removeChannel(globalProfilesSubscription);
    globalProfilesSubscription = supabaseClient
        .channel('public:global_profiles')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
            debouncedPanelRefresh();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
            const updatedUser = payload.new;
            const oldUser = payload.old || {};

            if (updatedUser.name === currentName && oldUser.custom_avatar_url !== updatedUser.custom_avatar_url) {
                currentCustomAvatarUrl = updatedUser.custom_avatar_url;
                updateProfileUI();
            }

            const meaningfulChange =
                oldUser.trophies !== updatedUser.trophies ||
                oldUser.solved_levels !== updatedUser.solved_levels ||
                oldUser.custom_avatar_url !== updatedUser.custom_avatar_url ||
                oldUser.name !== updatedUser.name;

            if (meaningfulChange) {
                debouncedPanelRefresh();
            }
        })
        .subscribe();
}

let currentOnlineGame = null;
let onlineSearchInterval = null;

const ONLINE_GAME_NAMES = {
    tictactoe: 'دوز'
};

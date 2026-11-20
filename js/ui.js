let firstPanelEntry = true;
let panelHeartbeat = null;
let globalProfilesSubscription = null;
let isUploadingAvatar = false;
let panelRefreshTimer = null;
let lastPanelRefreshTime = 0;

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

function startSinglePlayerMode() {
    renderChapters();
    showScreen('chapters-screen');
}

function startTwoPlayerMode() {
    showScreen('two-player-screen');
}

function showScreen(screenId) {
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
    const isGuest = currentName === 'Guest' || currentName.startsWith('Guest.');
    currentPanelTab = tabId;
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    renderPanelContent(tabId);
    updateAllStatsUI();

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
    updateAllStatsUI();
    if (modalId === 'challenge-modal') initDailyChallenge();
    if (modalId === 'gift-modal') startGiftTimer();
    if (modalId === 'profile-modal') {
        const previewEl = document.getElementById('profilePreview');
        if (previewEl) previewEl.src = currentCustomAvatarUrl ? currentCustomAvatarUrl : defaultAvatar;
        const badge = document.getElementById('profileAccountBadge');
        if (badge) {
            if (window.currentUserIsAnonymous !== false) {
                badge.innerHTML = `<span style="color:#fb923c;">● حساب مهمان</span> <span style="color:var(--text-muted);font-size:0.72rem;">(برای ذخیره دائمی وارد بخش حساب شوید)</span>`;
            } else {
                badge.innerHTML = `<span style="color:#22c55e;">● حساب ثبت‌شده</span>`;
            }
        }
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
    if (window.currentUserIsAnonymous !== false) {
        showAuthMessage('info', 'توجه', 'لطفا ابتدا از بخش تنظیمات ثبت نام کنید.');
        return;
    }
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

    if (window.currentUserIsAnonymous !== false) {
        event.target.value = '';
        showAuthMessage('info', 'توجه', 'لطفا ابتدا از بخش تنظیمات ثبت نام کنید.');
        return;
    }

    if (currentDiamonds < 10) {
        event.target.value = '';
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
        const fileName = `avatar_${window.currentUserId}.jpg`;

        const localUrl = URL.createObjectURL(compressedBlob);
        if (previewEl) previewEl.src = localUrl;

        const { error } = await supabaseClient.storage.from('avatars').upload(fileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

        if (error) {
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
    } catch (e) {
    } finally {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        isUploadingAvatar = false;
        event.target.value = '';
    }
}

function openNameModal() {
    if (window.currentUserIsAnonymous !== false) {
        showAuthMessage('info', 'توجه', 'لطفا ابتدا از بخش تنظیمات ثبت نام کنید.');
        return;
    }
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

    if (raw === currentName) {
        closeNameModal();
        return;
    }

    if (currentDiamonds < 10) {
        document.getElementById('no-diamond-modal').classList.add('active');
        return;
    }

    try {
        const { data: existingName } = await supabaseClient
            .from('profiles')
            .select('name, user_id')
            .ilike('name', raw)
            .limit(1);

        if (existingName && existingName.length > 0 && existingName[0].user_id !== window.currentUserId) {
            document.getElementById('duplicate-alert-modal').classList.add('active');
            return;
        }
    } catch (e) {}

    const oldName = currentName;
    currentName = raw;
    currentDiamonds -= 10;

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                name: currentName,
                custom_avatar_url: currentCustomAvatarUrl,
                coins: currentCoins,
                diamonds: currentDiamonds,
                solved_levels: Object.keys(solvedLevels).length
            })
            .eq('user_id', window.currentUserId);

        if (error) {
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

        if (oldName && oldName !== raw && oldName !== 'Guest') {
            await supabaseClient.from('messages').update({ sender_name: currentName }).eq('sender_name', oldName);
            await supabaseClient.from('private_messages').update({ sender_name: currentName }).eq('sender_name', oldName);
            await supabaseClient.from('private_messages').update({ receiver_name: currentName }).eq('receiver_name', oldName);
            await supabaseClient.from('friend_requests').update({ sender_name: currentName }).eq('sender_name', oldName);
            await supabaseClient.from('friend_requests').update({ receiver_name: currentName }).eq('receiver_name', oldName);
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

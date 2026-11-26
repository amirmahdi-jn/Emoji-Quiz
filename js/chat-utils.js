let activePrivateChat = null;
let privateChatSubscription = null;
let privateTabSubscription = null;
let cachedAvatarMap = {};
let currentChatContext = 'public';
let friendToDelete = null;

const singleTickSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M20 6 9 17l-5-5"/></svg>`;
const doubleTickSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;
const trophyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const goldMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#fef08a" stroke="#facc15" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#ca8a04" text-anchor="middle">I</text></svg>`;
const silverMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#64748b" text-anchor="middle">II</text></svg>`;
const bronzeMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#fed7aa" stroke="#fdba74" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#9a3412" text-anchor="middle">III</text></svg>`;

function getStatusHTML(name, lastSeen) {
    if (!lastSeen) return `<div class="status-text offline"><span class="status-dot status-offline"></span>آفلاین</div>`;
    const diff = Date.now() - new Date(lastSeen).getTime();
    if (diff < 25000) {
        return `<div class="status-text online"><span class="status-dot status-online"></span>آنلاین</div>`;
    }
    return `<div class="status-text offline"><span class="status-dot status-offline"></span>آفلاین</div>`;
}

function getVerifiedIcon(name) {
    if (name !== 'AmirMahdi') return '';
    return `<svg class="verified-badge sky" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill-opacity: 0.2;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12" stroke="#ffffff" stroke-width="2.5" fill="none"/></svg>`;
}

function getPersianDateString(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const parts = new Intl.DateTimeFormat('fa-IR', options).formatToParts(date);
    const weekday = parts.find(p => p.type === 'weekday').value;
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    return `${weekday} ${day} ${month} ${year}`;
}

function renderPanelContent(tabId) {
    const container = document.getElementById('panel-content');
    if (!container) return;

    if (tabId === 'top-players') {
        container.innerHTML = `
            <p class="panel-hint" id="leaderboard-loading">در حال دریافت...</p>
            <div id="top-three-container" style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; border-bottom: 2px solid var(--border-color); margin-bottom: 12px; display: none;"></div>
            <div id="rest-leaderboard" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; display: none; padding-bottom: 20px;"></div>
        `;
        fetchLeaderboard();
    } else if (tabId === 'public-chat') {
        container.innerHTML = `
            <div class="chat-container" style="display: flex; flex-direction: column; height: 100%;">
                <div id="panel-chat-messages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px;"></div>
                <div class="chat-input-row">
                    <button class="send-msg-btn" onclick="sendPanelChatMessage()" aria-label="ارسال پیام">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
                    </button>
                    <textarea id="panel-chat-input" placeholder="پیام خود را بنویسید..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
                    <button class="sticker-open-btn" onclick="openStickerPicker()" aria-label="استیکر">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sticker preview-icon"><path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/></svg>
                    </button>
                </div>
            </div>
        `;
        initPanelChat();
        currentChatContext = 'public';
    } else if (tabId === 'private-chat') {
        container.innerHTML = `
            <div class="private-search-bar">
                <input type="text" id="searchUserInput" placeholder="لطفا آیدی کاربر را دقیق وارد کنید...">
                <button onclick="searchUserForChat()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
            </div>
            <div class="private-tabs">
                <button class="private-tab-btn" id="tab-btn-chats" onclick="switchPrivateTab('chats')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    پیام‌ها
                    <span id="msg-badge" class="badge" style="display:none;">0</span>
                </button>
                <button class="private-tab-btn active" id="tab-btn-friends" onclick="switchPrivateTab('friends')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    دوستان
                </button>
                <button class="private-tab-btn" id="tab-btn-requests" onclick="switchPrivateTab('requests')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                    درخواست‌ها
                    <span id="req-badge" class="badge" style="display:none;">0</span>
                </button>
            </div>
            <div id="private-chat-list" style="flex:1; overflow-y:auto;"></div>
        `;
        switchPrivateTab('friends');
        updatePrivateBadges();
        listenForPrivateEvents();
    }

    const titleEl = document.getElementById('panel-title');
    if (titleEl) {
        if (tabId === 'top-players') titleEl.innerText = 'برترین‌ها';
        else if (tabId === 'public-chat') titleEl.innerText = 'گپ عمومی';
        else if (tabId === 'private-chat') titleEl.innerText = 'چت خصوصی';
    }
}

async function fetchLeaderboard() {
    const topThreeContainer = document.getElementById('top-three-container');
    const restLeaderboard = document.getElementById('rest-leaderboard');
    const loading = document.getElementById('leaderboard-loading');
    if (!topThreeContainer || !restLeaderboard) return;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('name, custom_avatar_url, created_at, trophies, active_frame')
        .neq('name', 'Guest')
        .order('trophies', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(50);

    if (loading) loading.style.display = 'none';

    if (error) {
        topThreeContainer.innerHTML = '<p style="text-align:center; color:#f87171; font-size:0.8rem;">خطا در دریافت</p>';
        topThreeContainer.style.display = 'flex';
        return;
    }

    if (!data || data.length === 0) {
        topThreeContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">هنوز رکوردی ثبت نشده است.</p>';
        topThreeContainer.style.display = 'flex';
        return;
    }

    topThreeContainer.style.display = 'flex';
    restLeaderboard.style.display = 'flex';
    topThreeContainer.innerHTML = '';
    restLeaderboard.innerHTML = '';

    data.forEach((profile, index) => {
        const isMe = profile.name === currentName;
        const borderStyle = isMe ? 'border: 2px solid var(--primary-color);' : 'border: 1px solid transparent;';

        let nameColor = '#ffffff';
        if (index < 3) nameColor = '#c084fc';

        let avatarSrc = profile.custom_avatar_url || defaultAvatar;

        let rankHTML = '';
        if (index === 0) rankHTML = goldMedalSvg;
        else if (index === 1) rankHTML = silverMedalSvg;
        else if (index === 2) rankHTML = bronzeMedalSvg;
        else rankHTML = `<div style="font-weight: bold; font-size: 1.1rem; width: 28px; text-align: center; color: #ef4444;">${index + 1}</div>`;

        const row = document.createElement('div');
        row.style.cssText = `background: rgba(255, 255, 255, 0.05); padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; ${borderStyle}`;

        row.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center;">${rankHTML}</div>
           <div class="lb-avatar ${profile.active_frame && profile.active_frame !== 'none' ? 'frame-' + profile.active_frame : ''}" style="width: 38px; height: 38px; border-radius: 50%; overflow: visible; flex-shrink: 0;">
    <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">
</div>
            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${nameColor}; font-weight: bold;"></span>
                <span style="font-size: 0.8rem; color: #ffffff; display: flex; align-items: center; gap: 4px;">${trophyIconSvg} ${profile.trophies || 0}</span>
            </div>
        `;
        row.querySelector('span[style*="font-weight: bold"]').innerHTML = profile.name + getVerifiedIcon(profile.name);

        if (index < 3) {
            topThreeContainer.appendChild(row);
        } else {
            restLeaderboard.appendChild(row);
        }
    });
}

window.openReplyModal = function(id, sender, text) {
    document.getElementById('reply-modal').classList.add('active');
    document.getElementById('reply-modal-text').innerText = `${sender}: ${text}`;
    document.getElementById('reply-input-text').value = '';
    setTimeout(() => document.getElementById('reply-input-text').focus(), 100);
    window.currentReplyData = { id, sender, text };
};

window.closeReplyModal = function() {
    document.getElementById('reply-modal').classList.remove('active');
};

window.submitReply = async function() {
    const input = document.getElementById('reply-input-text');
    const text = input.value.trim();
    if (!text || !window.currentReplyData) return;

    const msgData = {
        text: text,
        sender_name: currentName,
        reply_to_id: window.currentReplyData.id,
        reply_to_text: window.currentReplyData.text,
        reply_to_name: window.currentReplyData.sender
    };

    closeReplyModal();

    if (currentChatContext === 'private' && activePrivateChat) {
        msgData.receiver_name = activePrivateChat;
        const { data } = await supabaseClient.from('private_messages').insert([msgData]).select();
        if (data && data.length > 0) {
            const msg = data[0];
            const container = document.getElementById('private-messages-container');
            if (container && !document.querySelector(`[data-private-msg-id="${msg.id}"]`)) {
                const msgDate = new Date(msg.created_at).toDateString();
                let lastDate = null;
                const wrappers = container.querySelectorAll('.chat-msg-wrapper');
                if (wrappers.length > 0) lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
                if (lastDate !== msgDate) {
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'chat-header-date';
                    dateDiv.innerText = getPersianDateString(msg.created_at);
                    container.appendChild(dateDiv);
                }
                appendPrivateMessageUI(msg);
                container.scrollTop = container.scrollHeight;
            }
        }
    } else {
        const { data } = await supabaseClient.from('messages').insert([msgData]).select();
        if (data && data.length > 0) {
            const msg = data[0];
            const chatMessages = document.getElementById('panel-chat-messages');
            if (chatMessages && !document.querySelector(`[data-msg-id="${msg.id}"]`)) {
                if (chatMessages.innerHTML.includes('هنوز پیامی ارسال نشده است.')) chatMessages.innerHTML = '';
                const msgDate = new Date(msg.created_at).toDateString();
                let lastDate = null;
                const wrappers = chatMessages.querySelectorAll('.chat-msg-wrapper');
                if (wrappers.length > 0) lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
                if (lastDate !== msgDate) {
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'chat-header-date';
                    dateDiv.innerText = getPersianDateString(msg.created_at);
                    chatMessages.appendChild(dateDiv);
                }
                appendPanelChatMessage(msg, currentCustomAvatarUrl || defaultAvatar);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }
};

window.openEditModal = function(id, text) {
    document.getElementById('edit-modal').classList.add('active');
    const input = document.getElementById('edit-input-text');
    input.value = text;
    setTimeout(() => input.focus(), 100);
    window.currentEditId = id;
};

window.closeEditModal = function() {
    document.getElementById('edit-modal').classList.remove('active');
};

window.submitEdit = async function() {
    const input = document.getElementById('edit-input-text');
    const text = input.value.trim();
    if (!text || !window.currentEditId) return;

    closeEditModal();

    if (currentChatContext === 'private' && activePrivateChat) {
        await supabaseClient.from('private_messages').update({ text: text, is_edited: true }).eq('id', window.currentEditId);
    } else {
        await supabaseClient.from('messages').update({ text: text, is_edited: true }).eq('id', window.currentEditId);
    }
};

window.addEventListener('beforeunload', () => {
    if (currentName && currentName !== 'Guest' && !currentName.startsWith('Guest.')) {
        supabaseClient.from('profiles').update({ last_seen: null }).eq('name', currentName).then();
    }
});

window.addEventListener('load', async () => {
    await loadProfile();
    updateProfileUI();
    await recoverAbandonedTTTSearch();
    await recoverActiveTTTGame();
    if (!tttGame) await recoverRecentTTTOutcome();
    updateCoinsUI();
    checkOnlineStatus();
    initProfilesListener();

    if (currentName && currentName !== 'Guest') {
        supabaseClient.from('profiles').update({ last_seen: null }).eq('name', currentName).then();
    }

    const offlineBtn = document.getElementById('offline-close-btn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            if (navigator.onLine) checkOnlineStatus();
            else { checkOnlineStatus(); setTimeout(checkOnlineStatus, 100); }
        });
    }
});
window.addEventListener('offline', checkOnlineStatus);
window.addEventListener('online', checkOnlineStatus);

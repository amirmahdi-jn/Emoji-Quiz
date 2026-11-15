function renderPanelContent(tabId) {
    const container = document.getElementById('panel-content');
    if (!container) return;

    if (tabId === 'top-players') {
        container.innerHTML = `
            <p class="panel-hint" id="leaderboard-loading">در حال دریافت...</p>
            <div id="global-leaderboard" style="display: flex; flex-direction: column; gap: 8px;"></div>
        `;
        fetchLeaderboard();
    } else if (tabId === 'public-chat') {
        container.innerHTML = `
            <div class="chat-container" style="display: flex; flex-direction: column; height: 100%;">
                <div id="panel-chat-messages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px;"></div>
                <div class="chat-input-row">
                    <textarea id="panel-chat-input" placeholder="پیام خود را بنویسید..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
                    <button class="send-msg-btn" onclick="sendPanelChatMessage()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>
        `;
        initPanelChat();
    } else if (tabId === 'private-chat') {
        container.innerHTML = `
            <div class="panel-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                </svg>
                <p>چت خصوصی به‌زودی فعال می‌شود.</p>
            </div>
        `;
    }

    const titleEl = document.getElementById('panel-title');
    if (titleEl) {
        if (tabId === 'top-players') titleEl.innerText = 'برترین‌ها';
        else if (tabId === 'public-chat') titleEl.innerText = 'گپ عمومی';
        else if (tabId === 'private-chat') titleEl.innerText = 'چت خصوصی';
    }
}

const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#2ecc71" stroke-width="2" fill="rgba(46, 204, 113, 0.15)"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/></svg>`;

async function fetchLeaderboard() {
    const list = document.getElementById('global-leaderboard');
    const loading = document.getElementById('leaderboard-loading');
    if (!list) return;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('name, solved_levels, avatar_index, created_at')
        .neq('name', 'Guest')
        .order('solved_levels', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50);

    if (loading) loading.style.display = 'none';

    if (error) {
        list.innerHTML = '<p style="text-align:center; color:#f87171; font-size:0.8rem;">خطا در دریافت</p>';
        return;
    }
    
    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">هنوز رکوردی ثبت نشده است.</p>';
        return;
    }

    list.innerHTML = '';
    data.forEach((profile, index) => {
        let rowColor = '#ffffff';
        if (index === 0) rowColor = '#ffd700';
        else if (index === 1) rowColor = '#c0c0c0';
        else if (index === 2) rowColor = '#cd7f32';

        const isMe = profile.name === currentName;
        const borderStyle = isMe ? 'border: 2px solid var(--primary-color);' : 'border: 1px solid transparent;';

        let avatarSrc = defaultAvatar;
        if (profile.avatar_index >= 0 && avatarImages[profile.avatar_index]) {
            avatarSrc = avatarImages[profile.avatar_index];
        }

        const row = document.createElement('div');
        row.style.cssText = `background: rgba(255, 255, 255, 0.05); padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; ${borderStyle}`;

        row.innerHTML = `
            <div style="font-weight: bold; font-size: 1.1rem; width: 25px; color: ${rowColor};">${index + 1}</div>
            <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
                <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${rowColor}; font-weight: bold;"></span>
                <span style="font-size: 0.8rem; color: #ffffff; display: flex; align-items: center; gap: 4px;">${checkIconSvg} ${profile.solved_levels} مرحله حل شده</span>
            </div>
        `;
        row.querySelector('span[style*="font-weight: bold"]').textContent = profile.name;
        list.appendChild(row);
    });
}

async function initPanelChat() {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">در حال اتصال...</div>';

    const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) { 
        chatMessages.innerHTML = '<div style="text-align: center; color: #f87171; font-size: 0.8rem; margin-top: 20px;">خطا در اتصال</div>'; 
        return; 
    }

    const { data: profilesData } = await supabaseClient.from('profiles').select('name, avatar_index');
    const avatarMap = {};
    if (profilesData) {
        profilesData.forEach(p => { avatarMap[p.name] = p.avatar_index; });
    }

    chatMessages.innerHTML = `<div class="chat-header-date" style="margin-bottom: 15px;">${getPersianDate()}</div>`;
    
    if (!data || data.length === 0) {
        chatMessages.innerHTML += '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">هنوز پیامی ارسال نشده است.</div>';
    } else {
        data.forEach(msg => {
            const avatarIdx = avatarMap[msg.sender_name] !== undefined ? avatarMap[msg.sender_name] : -1;
            appendPanelChatMessage(msg, avatarIdx);
        });
    }

    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatSubscription = supabaseClient
        .channel('public:messages')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                const { data: profileData } = await supabaseClient
                    .from('profiles')
                    .select('avatar_index')
                    .eq('name', payload.new.sender_name)
                    .maybeSingle();
                const avatarIdx = profileData && typeof profileData.avatar_index === 'number' ? profileData.avatar_index : -1;
                appendPanelChatMessage(payload.new, avatarIdx);
            })
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages' },
            (payload) => {
                const msg = payload.new;
                const wrapper = document.querySelector(`[data-msg-id="${msg.id}"]`);
                if (wrapper) {
                    const textEl = wrapper.querySelector('.chat-msg-text');
                    if (textEl) {
                        textEl.textContent = msg.text;
                        if (msg.is_edited) {
                            let timeEl = wrapper.querySelector('.chat-msg-time');
                            if (!timeEl.innerHTML.includes('(ویرایش شده)')) {
                                timeEl.innerHTML += ' <span style="color:var(--text-muted);">(ویرایش شده)</span>';
                            }
                        }
                    }
                }
            })
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'messages' },
            (payload) => {
                const el = document.querySelector(`[data-msg-id="${payload.old.id}"]`);
                if (el) el.remove();
            })
        .subscribe();
}

function appendPanelChatMessage(msg, avatarIndex) {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    if (chatMessages.innerHTML.includes('هنوز پیامی ارسال نشده است.')) {
        chatMessages.innerHTML = `<div class="chat-header-date" style="margin-bottom: 15px;">${getPersianDate()}</div>`;
    }

    const color = getUserColor(msg.sender_name);
    const time = getPersianTime(msg.created_at);
    const isMe = msg.sender_name === currentName;

    let avatarSrc = defaultAvatar;
    if (avatarIndex >= 0 && avatarImages[avatarIndex]) {
        avatarSrc = avatarImages[avatarIndex];
    }

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : 'other-message'}`;
    wrapper.setAttribute('data-msg-id', msg.id);

    let replyHTML = '';
    if (msg.reply_to_text) {
        replyHTML = `<div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px; margin-bottom: 5px; border-right: 2px solid var(--primary-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><b>${msg.reply_to_name || 'کاربر'}:</b> ${msg.reply_to_text}</div>`;
    }

    let editHTML = msg.is_edited ? ' <span style="color:var(--text-muted); font-size:0.55rem;">(ویرایش شده)</span>' : '';

    let menuBtnHTML = isMe ? `<button class="msg-menu-btn" onclick="openEditModal('${msg.id}', '${msg.text.replace(/'/g, "\\'")}')">&#8942;</button>` : '';
    
    let replyBtnHTML = !isMe ? `<button class="msg-reply-btn" onclick="openReplyModal('${msg.id}', '${msg.sender_name}', '${msg.text.replace(/'/g, "\\'")}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 18v-2a4 4 0 0 0-4-4H4"/><path d="m9 17-5-5 5-5"/></svg>
    </button>` : '';

    wrapper.innerHTML = `
        <div class="chat-msg-avatar">
            <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        </div>
        <div class="chat-msg-content" style="background: ${isMe ? 'rgba(199, 36, 255, 0.2)' : 'rgba(255,255,255,0.1)'}; padding: 8px 12px; border-radius: 12px; position: relative;">
            ${menuBtnHTML}
            <div class="chat-msg-header" style="margin-bottom: 4px; padding-left: 15px;">
                <span class="chat-msg-name" style="color: ${color}; font-size: 0.75rem; font-weight: bold;"></span>
            </div>
            ${replyHTML}
            <div class="chat-msg-text" style="font-size: 0.85rem; color: #fff; white-space: pre-wrap;">${msg.text}</div>
            <div class="chat-msg-time" style="font-size: 0.6rem; color: var(--text-muted); direction: ltr; margin-top: 5px; text-align: left;">${time}${editHTML}</div>
            ${replyBtnHTML}
        </div>
    `;

    wrapper.querySelector('.chat-msg-name').textContent = msg.sender_name || 'Guest';

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendPanelChatMessage() {
    if (currentName === 'Guest' || currentName.startsWith('Guest.')) {
        document.getElementById('register-alert-modal').classList.add('active');
        return;
    }

    const input = document.getElementById('panel-chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim().slice(0, 500);
    input.value = '';
    input.style.height = 'auto';

    const msgData = { text: text, sender_name: currentName };
    if (window.currentReply) {
        msgData.reply_to_id = window.currentReply.id;
        msgData.reply_to_text = window.currentReply.text;
        msgData.reply_to_name = window.currentReply.sender;
        window.currentReply = null;
    }

    await supabaseClient.from('messages').insert([msgData]);
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
    await supabaseClient.from('messages').insert([msgData]);
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
    await supabaseClient.from('messages').update({ text: text, is_edited: true }).eq('id', window.currentEditId);
};

window.addEventListener('load', async () => {
    await loadProgress();
    await loadProfile();
    updateProfileUI();
    updateCoinsUI();
    renderChapters();
    checkOnlineStatus();
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            renderChapters();
            showScreen('chapters-screen');
        });
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

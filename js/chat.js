function renderPanelContent(tabId) {
    const container = document.getElementById('panel-content');
    if (!container) return;

    if (tabId === 'top-players') {
        container.innerHTML = `
            <p class="panel-hint" id="leaderboard-loading">در حال دریافت برترین‌ها از سرور...</p>
            <div id="global-leaderboard" style="display: flex; flex-direction: column; gap: 8px;"></div>
        `;
        fetchLeaderboard();
    } else if (tabId === 'public-chat') {
        container.innerHTML = `
            <div class="chat-container" style="display: flex; flex-direction: column; height: 100%;">
                <div id="panel-chat-messages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px;"></div>
                <div class="chat-input-row" style="display: flex; gap: 8px; margin-top: 10px;">
                    <input type="text" id="panel-chat-input" placeholder="پیام خود را بنویسید..." style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px; color: white; outline: none; font-family: 'Vazirmatn';">
                    <button onclick="sendPanelChatMessage()" style="background: var(--primary-color); color: white; border: none; border-radius: 12px; padding: 0 15px; cursor: pointer;">ارسال</button>
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
        .select('name, solved_levels, avatar_index')
        .order('solved_levels', { ascending: false })
        .limit(10);

    if (loading) loading.style.display = 'none';

    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">هنوز رکوردی ثبت نشده است.</p>';
        return;
    }

    list.innerHTML = '';
    data.forEach((profile, index) => {
        let numberColor = '#ffffff';
        let nameColor = '#ffffff';

        if (index === 0) { numberColor = '#ffd700'; nameColor = '#ef4444'; }
        else if (index === 1) { numberColor = '#c0c0c0'; nameColor = '#ef4444'; }
        else if (index === 2) { numberColor = '#cd7f32'; nameColor = '#ef4444'; }

        const isMe = profile.name === currentName;
        const borderStyle = isMe ? 'border: 2px solid var(--primary-color);' : 'border: 1px solid transparent;';

        let avatarSrc = defaultAvatar;
        if (profile.avatar_index >= 0 && avatarImages[profile.avatar_index]) {
            avatarSrc = avatarImages[profile.avatar_index];
        }

        const row = document.createElement('div');
        row.style.cssText = `background: rgba(255, 255, 255, 0.05); padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; ${borderStyle}`;

        row.innerHTML = `
            <div style="font-weight: bold; font-size: 1.1rem; width: 25px; color: ${numberColor};">${index + 1}</div>
            <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
                <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${nameColor}; font-weight: bold;"></span>
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
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) { chatMessages.innerHTML = 'خطا در اتصال.'; return; }

    const { data: profilesData } = await supabaseClient.from('profiles').select('name, avatar_index');
    const avatarMap = {};
    if (profilesData) {
        profilesData.forEach(p => { avatarMap[p.name] = p.avatar_index; });
    }

    const messages = (data || []).slice().reverse();

    chatMessages.innerHTML = `<div class="chat-header-date" style="margin-bottom: 15px;">${getPersianDate()}</div>`;
    if (messages.length === 0) {
        chatMessages.innerHTML += '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">هنوز پیامی نیست.</div>';
    } else {
        messages.forEach(msg => {
            const avatarIdx = avatarMap[msg.sender_name] !== undefined ? avatarMap[msg.sender_name] : -1;
            appendPanelChatMessage(msg.id, msg.sender_name, msg.text, msg.created_at, avatarIdx);
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
                appendPanelChatMessage(payload.new.id, payload.new.sender_name, payload.new.text, payload.new.created_at, avatarIdx);
            })
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages' },
            (payload) => {
                const id = payload.new.id;
                const newName = payload.new.sender_name;
                const el = document.querySelector(`[data-msg-id="${id}"]`);
                if (el) {
                    const nameEl = el.querySelector('.chat-msg-name');
                    if (nameEl) nameEl.textContent = newName;
                }
            })
        .subscribe();
}

function appendPanelChatMessage(id, sender, text, timeStr, avatarIndex) {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    if (chatMessages.innerHTML.includes('هنوز پیامی')) {
        chatMessages.innerHTML = `<div class="chat-header-date" style="margin-bottom: 15px;">${getPersianDate()}</div>`;
    }

    const color = getUserColor(sender);
    const time = getPersianTime(timeStr);
    const isMe = sender === currentName;

    let avatarSrc = defaultAvatar;
    if (avatarIndex >= 0 && avatarImages[avatarIndex]) {
        avatarSrc = avatarImages[avatarIndex];
    }

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : 'other-message'}`;
    if (id) wrapper.setAttribute('data-msg-id', id);

    wrapper.innerHTML = `
        <div class="chat-msg-avatar">
            <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        </div>
        <div class="chat-msg-content" style="background: ${isMe ? 'rgba(199, 36, 255, 0.2)' : 'rgba(255,255,255,0.1)'}; padding: 8px 12px; border-radius: 12px;">
            <div class="chat-msg-header" style="margin-bottom: 4px;">
                <span class="chat-msg-name" style="color: ${color}; font-size: 0.75rem; font-weight: bold;"></span>
            </div>
            <div class="chat-msg-text" style="font-size: 0.85rem; color: #fff;"></div>
            <div class="chat-msg-time" style="font-size: 0.6rem; color: var(--text-muted); direction: ltr; margin-top: 5px; text-align: left;">${time}</div>
        </div>
    `;

    wrapper.querySelector('.chat-msg-name').textContent = sender || 'Guest';
    wrapper.querySelector('.chat-msg-text').textContent = text;

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendPanelChatMessage() {
    const input = document.getElementById('panel-chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    await supabaseClient.from('messages').insert([{ text: text, sender_name: currentName }]);
}

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
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmPaymentToken();
        });
    }
});
window.addEventListener('offline', checkOnlineStatus);
window.addEventListener('online', checkOnlineStatus);

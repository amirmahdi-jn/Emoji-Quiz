function renderPanelContent(tabId) {
    const container = document.getElementById('panel-content');
    if (!container) return;
    
    if (tabId === 'top-players') {
        container.innerHTML = `
            <div class="top-player-card">
                <div class="top-player-avatar">
                    <img src="${currentAvatarIndex >= 0 && avatarImages[currentAvatarIndex] ? avatarImages[currentAvatarIndex] : defaultAvatar}" alt="Avatar">
                </div>
                <div class="top-player-info">
                    <div class="top-player-name">${currentName}</div>
                    <div class="top-player-stats">
                        <span>🏆 ${Object.keys(solvedLevels).length} مرحله حل‌شده</span>
                    </div>
                </div>
            </div>
            <p class="panel-hint" id="leaderboard-loading">در حال دریافت برترین‌ها از سرور...</p>
            <div id="global-leaderboard" style="display: flex; flex-direction: column; gap: 10px;"></div>
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

async function fetchLeaderboard() {
    const list = document.getElementById('global-leaderboard');
    const loading = document.getElementById('leaderboard-loading');
    if (!list) return;
    const { data, error } = await supabaseClient.from('profiles').select('name, solved_levels').order('solved_levels', { ascending: false }).limit(10);
    if (loading) loading.style.display = 'none';
    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">هنوز رکوردی ثبت نشده است.</p>';
        return;
    }
    list.innerHTML = '';
    data.forEach((profile, index) => {
        const row = document.createElement('div');
        row.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 10px 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);';
        row.innerHTML = `<span style="color: #f1c40f; font-weight: bold;">${index + 1}. ${profile.name}</span><span style="color: #fff; font-size: 0.85rem;">${profile.solved_levels} مرحله</span>`;
        list.appendChild(row);
    });
}

async function initPanelChat() {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">در حال اتصال...</div>';
    
    const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: true }).limit(50);
    if (error) { chatMessages.innerHTML = 'خطا در اتصال.'; return; }
    
    chatMessages.innerHTML = `<div class="chat-header-date">${getPersianDate()}</div>`;
    if (data.length === 0) {
        chatMessages.innerHTML += '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">هنوز پیامی نیست.</div>';
    } else {
        data.forEach(msg => appendPanelChatMessage(msg.sender_name, msg.text, msg.created_at));
    }
    
    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatSubscription = supabaseClient.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => appendPanelChatMessage(payload.new.sender_name, payload.new.text, payload.new.created_at)).subscribe();
}

function appendPanelChatMessage(sender, text, timeStr) {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    if (chatMessages.innerHTML.includes('هنوز پیامی')) chatMessages.innerHTML = `<div class="chat-header-date">${getPersianDate()}</div>`;
    
    const color = getUserColor(sender);
    const time = getPersianTime(timeStr);
    const avatarSrc = defaultAvatar;
    const isMe = sender === currentName;
    
    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : ''}`;
    
    wrapper.innerHTML = `
        <div class="chat-msg-avatar">
            <img src="${avatarSrc}" alt="Avatar">
        </div>
        <div class="chat-msg-content">
            <div class="chat-msg-header">
                <span class="chat-msg-name" style="color: ${color};">${sender || 'Guest'}</span>
                <span class="chat-msg-time">${time}</span>
            </div>
            <div class="chat-msg-text">${text}</div>
        </div>
    `;
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

window.addEventListener('load', () => {
    loadProgress();
    loadProfile();
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

let activePrivateChat = null;
let privateChatSubscription = null;
let privateTabSubscription = null;
let cachedAvatarMap = {};
let currentChatContext = 'public';
let friendToDelete = null;

const singleTickSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M20 6 9 17l-5-5"/></svg>`;
const doubleTickSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;

function getStatusHTML(name, lastSeen) {
    if (!lastSeen) return `<div class="status-text offline"><span class="status-dot status-offline"></span>آفلاین</div>`;
    const diff = Date.now() - new Date(lastSeen).getTime();
    if (diff < 25000) {
        return `<div class="status-text online"><span class="status-dot status-online"></span>آنلاین</div>`;
    }
    return `<div class="status-text offline"><span class="status-dot status-offline"></span>آفلاین</div>`;
}

function getVerifiedIcon(name) {
    let colorClass = '';
    if (name === 'AmirMahdi') colorClass = 'sky';
    else if (name === 'Amir') colorClass = 'purple';
    else if (name === 'Mahdi') colorClass = 'yellow';
    else return '';

    return `<svg class="verified-badge ${colorClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill-opacity: 0.2;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12" stroke="#ffffff" stroke-width="2.5" fill="none"/></svg>`;
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
                    <textarea id="panel-chat-input" placeholder="پیام خود را بنویسید..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
                    <button class="send-msg-btn" onclick="sendPanelChatMessage()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
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

async function updatePrivateBadges() {
    const { count: msgCount } = await supabaseClient
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_name', currentName)
        .eq('is_read', false);
    
    const msgBadge = document.getElementById('msg-badge');
    if (msgBadge) {
        if (msgCount > 0) {
            msgBadge.innerText = msgCount;
            msgBadge.style.display = 'flex';
        } else {
            msgBadge.style.display = 'none';
        }
    }

    const { count: reqCount } = await supabaseClient
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_name', currentName)
        .eq('status', 'pending');
    
    const reqBadge = document.getElementById('req-badge');
    if (reqBadge) {
        if (reqCount > 0) {
            reqBadge.innerText = reqCount;
            reqBadge.style.display = 'flex';
        } else {
            reqBadge.style.display = 'none';
        }
    }
}

function switchPrivateTab(tab) {
    document.getElementById('tab-btn-friends').classList.toggle('active', tab === 'friends');
    document.getElementById('tab-btn-chats').classList.toggle('active', tab === 'chats');
    document.getElementById('tab-btn-requests').classList.toggle('active', tab === 'requests');
    
    const listContainer = document.getElementById('private-chat-list');
    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">در حال دریافت...</p>';
    
    if (tab === 'chats') {
        loadChatsList(listContainer);
    }

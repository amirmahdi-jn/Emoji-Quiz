let activePrivateChat = null;
let privateChatSubscription = null;
let friendRequestsSubscription = null;

function getVerifiedIcon(name) {
    let colorClass = '';
    if (name === 'AmirMahdi') colorClass = 'sky';
    else if (name === 'Amir') colorClass = 'red';
    else if (name === 'Mahdi') colorClass = 'green';
    else return '';

    return `<svg class="verified-badge ${colorClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill-opacity: 0.2;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12" stroke="#ffffff" stroke-width="2.5" fill="none"/></svg>`;
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
    } else if (tabId === 'private-chat') {
        container.innerHTML = `
            <div class="private-search-bar">
                <input type="text" id="searchUserInput" placeholder="آیدی دقیق را وارد کنید...">
                <button onclick="searchUserForChat()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
            </div>
            <div class="private-tabs">
                <button class="private-tab-btn active" id="tab-btn-chats" onclick="switchPrivateTab('chats')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    چت‌ها
                </button>
                <button class="private-tab-btn" id="tab-btn-requests" onclick="switchPrivateTab('requests')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                    درخواست‌ها
                    <span id="req-badge" class="badge" style="display:none;">0</span>
                </button>
            </div>
            <div id="private-chat-list" style="flex:1; overflow-y:auto;"></div>
        `;
        switchPrivateTab('chats');
        listenForFriendRequests();
    }

    const titleEl = document.getElementById('panel-title');
    if (titleEl) {
        if (tabId === 'top-players') titleEl.innerText = 'برترین‌ها';
        else if (tabId === 'public-chat') titleEl.innerText = 'گپ عمومی';
        else if (tabId === 'private-chat') titleEl.innerText = 'چت خصوصی';
    }
}

function switchPrivateTab(tab) {
    document.getElementById('tab-btn-chats').classList.toggle('active', tab === 'chats');
    document.getElementById('tab-btn-requests').classList.toggle('active', tab === 'requests');
    const listContainer = document.getElementById('private-chat-list');
    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">در حال دریافت...</p>';
    
    if (tab === 'chats') {
        loadChatsList(listContainer);
    } else {
        loadRequestsList(listContainer);
    }
}

async function searchUserForChat() {
    const input = document.getElementById('searchUserInput');
    const term = input.value.trim();
    const listContainer = document.getElementById('private-chat-list');
    
    if (!term) return;
    if (term === currentName) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">شما نمی‌توانید به خودتان درخواست دهید!</p>';
        return;
    }

    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">در حال جستجو...</p>';

    const { data: user } = await supabaseClient.from('profiles').select('name, avatar_index').eq('name', term).maybeSingle();

    if (!user) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">کاربری با این آیدی یافت نشد.</p>';
        return;
    }

    const { data: existingFriend } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'accepted').maybeSingle();

    const { data: existingPending } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'pending').maybeSingle();

    let avatarSrc = user.avatar_index >= 0 ? avatarImages[user.avatar_index] : defaultAvatar;
    
    let actionBtn = '';
    if (existingFriend) {
        actionBtn = `<button class="user-card-action" onclick="openPrivateChat('${user.name}', '${avatarSrc}')">ورود به چت</button>`;
    } else if (existingPending) {
        actionBtn = `<button class="user-card-action" style="background:#eab308;" disabled>در انتظار تایید</button>`;
    } else {
        actionBtn = `<button class="user-card-action" onclick="sendFriendRequest('${user.name}')">درخواست دوستی</button>`;
    }

    listContainer.innerHTML = `
        <div class="user-card">
            <div class="user-card-info">
                <img src="${avatarSrc}">
                <span>${user.name}</span>
            </div>
            ${actionBtn}
        </div>
    `;
}

async function sendFriendRequest(receiver) {
    await supabaseClient.from('friend_requests').insert([{
        sender_name: currentName,
        receiver_name: receiver,
        status: 'pending'
    }]);
    alert('درخواست شما ارسال شد.');
    searchUserForChat();
}

async function loadChatsList(container) {
    const { data: friends } = await supabaseClient.from('friend_requests')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.neq.${currentName}),and(receiver_name.eq.${currentName},sender_name.neq.${currentName})`)
        .eq('status', 'accepted');

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هنوز چتی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, avatar_index');
    const avatarMap = {};
    if (profiles) profiles.forEach(p => avatarMap[p.name] = p.avatar_index);

    container.innerHTML = '';
    friends.forEach(f => {
        const otherUser = f.sender_name === currentName ? f.receiver_name : f.sender_name;
        const avIdx = avatarMap[otherUser] !== undefined ? avatarMap[otherUser] : -1;
        const avSrc = avIdx >= 0 ? avatarImages[avIdx] : defaultAvatar;

        container.innerHTML += `
            <div class="user-card" onclick="openPrivateChat('${otherUser}', '${avSrc}')" style="cursor:pointer;">
                <div class="user-card-info">
                    <img src="${avSrc}">
                    <span>${otherUser}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </div>
        `;
    });
}

async function loadRequestsList(container) {
    const { data: requests } = await supabaseClient.from('friend_requests')
        .select('*')
        .eq('receiver_name', currentName)
        .eq('status', 'pending');

    if (!requests || requests.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">درخواستی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, avatar_index');
    const avatarMap = {};
    if (profiles) profiles.forEach(p => avatarMap[p.name] = p.avatar_index);

    container.innerHTML = '';
    requests.forEach(r => {
        const avIdx = avatarMap[r.sender_name] !== undefined ? avatarMap[r.sender_name] : -1;
        const avSrc = avIdx >= 0 ? avatarImages[avIdx] : defaultAvatar;

        let timeStr = new Date(r.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

        container.innerHTML += `
            <div class="user-card" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div class="user-card-info">
                        <img src="${avSrc}">
                        <span>${r.sender_name}</span>
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${timeStr}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="user-card-action accept" style="flex:1;" onclick="acceptRequest('${r.id}')">تایید</button>
                    <button class="user-card-action reject" style="flex:1;" onclick="rejectRequest('${r.id}')">رد</button>
                </div>
            </div>
        `;
    });
}

async function acceptRequest(reqId) {
    await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    switchPrivateTab('requests');
}

async function rejectRequest(reqId) {
    await supabaseClient.from('friend_requests').update({ status: 'rejected' }).eq('id', reqId);
    switchPrivateTab('requests');
}

function listenForFriendRequests() {
    if (friendRequestsSubscription) supabaseClient.removeChannel(friendRequestsSubscription);
    friendRequestsSubscription = supabaseClient
        .channel('public:friend_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, async () => {
            const { data: reqs } = await supabaseClient.from('friend_requests').select('id').eq('receiver_name', currentName).eq('status', 'pending');
            const badge = document.getElementById('req-badge');
            if (badge) {
                if (reqs && reqs.length > 0) {
                    badge.innerText = reqs.length;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
            if (document.getElementById('tab-btn-requests')?.classList.contains('active')) {
                loadRequestsList(document.getElementById('private-chat-list'));
            }
        })
        .subscribe();
}

function openPrivateChat(user, avatarSrc) {
    activePrivateChat = user;
    const chatWindow = document.createElement('div');
    chatWindow.className = 'private-chat-window';
    chatWindow.id = 'private-chat-window';
    chatWindow.innerHTML = `
        <div class="private-chat-header">
            <button class="back-btn" onclick="closePrivateChat()">⬅</button>
            <img src="${avatarSrc}">
            <span>${user}</span>
        </div>
        <div class="private-chat-messages" id="private-messages-container"></div>
        <div class="chat-input-row" style="padding: 15px; background: var(--panel-bg); margin:0;">
            <textarea id="private-chat-input" placeholder="پیام..." rows="1" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 15px; color: white; resize: none; font-family: 'Vazirmatn';"></textarea>
            <button class="send-msg-btn" onclick="sendPrivateMessage()" style="height:44px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
        </div>
    `;
    document.body.appendChild(chatWindow);
    loadPrivateMessages();
}

function closePrivateChat() {
    if (privateChatSubscription) supabaseClient.removeChannel(privateChatSubscription);
    const w = document.getElementById('private-chat-window');
    if (w) w.remove();
    activePrivateChat = null;
}

async function loadPrivateMessages() {
    const container = document.getElementById('private-messages-container');
    if (!container) return;
    
    const { data } = await supabaseClient.from('private_messages')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${activePrivateChat}),and(sender_name.eq.${activePrivateChat},receiver_name.eq.${currentName})`)
        .order('created_at', { ascending: true });

    container.innerHTML = '';
    if (data) {
        data.forEach(msg => {
            const isMe = msg.sender_name === currentName;
            let timeStr = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            container.innerHTML += `
                <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'}; padding: 8px 12px; border-radius: 12px; max-width: 80%; color: #fff; position:relative;">
                    <div style="font-size:0.85rem;">${msg.text}</div>
                    <div style="font-size:0.55rem; color:rgba(255,255,255,0.6); text-align:left; margin-top:4px;">${timeStr}</div>
                </div>
            `;
        });
    }
    container.scrollTop = container.scrollHeight;

    if (privateChatSubscription) supabaseClient.removeChannel(privateChatSubscription);
    privateChatSubscription = supabaseClient
        .channel('public:private_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
            const msg = payload.new;
            if ((msg.sender_name === currentName && msg.receiver_name === activePrivateChat) || 
                (msg.sender_name === activePrivateChat && msg.receiver_name === currentName)) {
                loadPrivateMessages();
            }
        }).subscribe();
}

async function sendPrivateMessage() {
    const input = document.getElementById('private-chat-input');
    const text = input.value.trim();
    if (!text || !activePrivateChat) return;
    
    input.value = '';
    await supabaseClient.from('private_messages').insert([{
        sender_name: currentName,
        receiver_name: activePrivateChat,
        text: text
    }]);
}

const flameIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/></svg>`;
const goldMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#fef08a" stroke="#facc15" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#ca8a04" text-anchor="middle">I</text></svg>`;
const silverMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#64748b" text-anchor="middle">II</text></svg>`;
const bronzeMedalSvg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 L10 9 L14 9 L18 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><path d="M18 2 L14 9 L10 9 L6 2 Z" fill="#fca5a5" stroke="#f87171" stroke-width="1"/><circle cx="12" cy="16" r="6" fill="#fed7aa" stroke="#fdba74" stroke-width="1.5"/><text x="12" y="19.5" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#9a3412" text-anchor="middle">III</text></svg>`;

async function fetchLeaderboard() {
    const topThreeContainer = document.getElementById('top-three-container');
    const restLeaderboard = document.getElementById('rest-leaderboard');
    const loading = document.getElementById('leaderboard-loading');
    if (!topThreeContainer || !restLeaderboard) return;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('name, solved_levels, avatar_index, created_at')
        .neq('name', 'Guest')
        .order('solved_levels', { ascending: false })
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

        let avatarSrc = defaultAvatar;
        if (profile.avatar_index >= 0 && avatarImages[profile.avatar_index]) {
            avatarSrc = avatarImages[profile.avatar_index];
        }

        let rankHTML = '';
        if (index === 0) rankHTML = goldMedalSvg;
        else if (index === 1) rankHTML = silverMedalSvg;
        else if (index === 2) rankHTML = bronzeMedalSvg;
        else rankHTML = `<div style="font-weight: bold; font-size: 1.1rem; width: 28px; text-align: center; color: #ef4444;">${index + 1}</div>`;

        const row = document.createElement('div');
        row.style.cssText = `background: rgba(255, 255, 255, 0.05); padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; ${borderStyle}`;

        row.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center;">${rankHTML}</div>
            <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
                <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${nameColor}; font-weight: bold;"></span>
                <span style="font-size: 0.8rem; color: #0d9488; display: flex; align-items: center; gap: 4px;">${flameIconSvg} ${profile.solved_levels} مرحله حل شده</span>
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

    let menuBtnHTML = isMe ? `<button class="msg-menu-btn" onclick="openEditModal('${msg.id}', this.getAttribute('data-text'))" data-text="${msg.text.replace(/"/g, '&quot;')}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>` : '';
    
    let replyBtnHTML = !isMe ? `<button class="msg-reply-btn" onclick="openReplyModal('${msg.id}', '${msg.sender_name}', this.getAttribute('data-text'))" data-text="${msg.text.replace(/"/g, '&quot;')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
    </button>` : '';

    wrapper.innerHTML = `
        <div class="chat-msg-avatar">
            <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        </div>
        <div class="chat-msg-content" style="background: ${isMe ? 'rgba(199, 36, 255, 0.2)' : 'rgba(255,255,255,0.1)'}; padding: 8px 12px; border-radius: 12px; position: relative;">
            <div class="chat-msg-header" style="margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span class="chat-msg-name" style="color: ${color}; font-size: 0.75rem; font-weight: bold;"></span>
                ${menuBtnHTML}
            </div>
            ${replyHTML}
            <div class="chat-msg-text" style="font-size: 0.85rem; color: #fff; white-space: pre-wrap;">${msg.text}</div>
            <div class="chat-msg-time" style="font-size: 0.6rem; color: var(--text-muted); direction: ltr; margin-top: 5px; text-align: left;">${time}${editHTML}</div>
            ${replyBtnHTML}
        </div>
    `;

    wrapper.querySelector('.chat-msg-name').innerHTML = (msg.sender_name || 'Guest') + getVerifiedIcon(msg.sender_name);

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
        msgData.reply_to_name = window.currentReply

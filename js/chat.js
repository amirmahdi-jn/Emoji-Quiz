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
    } else if (tab === 'friends') {
        loadFriendsList(listContainer);
    } else {
        loadRequestsList(listContainer);
    }
}

function listenForPrivateEvents() {
    if (privateTabSubscription) supabaseClient.removeChannel(privateTabSubscription);
    privateTabSubscription = supabaseClient
        .channel('public:private_events')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
            updatePrivateBadges();
            const activeTab = document.querySelector('.private-tab-btn.active')?.id;
            if (activeTab === 'tab-btn-requests') {
                loadRequestsList(document.getElementById('private-chat-list'));
            } else if (activeTab === 'tab-btn-friends') {
                loadFriendsList(document.getElementById('private-chat-list'));
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
            if (payload.new.receiver_name === currentName) {
                updatePrivateBadges();
                const activeTab = document.querySelector('.private-tab-btn.active')?.id;
                if (activeTab === 'tab-btn-chats') {
                    loadChatsList(document.getElementById('private-chat-list'));
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
            const updatedUser = payload.new;
            if (!cachedAvatarMap[updatedUser.name]) {
                cachedAvatarMap[updatedUser.name] = { custom_avatar_url: updatedUser.custom_avatar_url, last_seen: updatedUser.last_seen };
            } else {
                cachedAvatarMap[updatedUser.name].last_seen = updatedUser.last_seen;
                cachedAvatarMap[updatedUser.name].custom_avatar_url = updatedUser.custom_avatar_url;
            }

            if (activePrivateChat === updatedUser.name) {
                const statusContainer = document.querySelector('.private-chat-header .name-status');
                if (statusContainer) {
                    const oldStatus = statusContainer.querySelector('.status-text');
                    if (oldStatus) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = getStatusHTML(updatedUser.name, updatedUser.last_seen);
                        statusContainer.replaceChild(tempDiv.firstElementChild, oldStatus);
                    }
                }
            }

            const activeTab = document.querySelector('.private-tab-btn.active')?.id;
            if (activeTab === 'tab-btn-friends') {
                loadFriendsList(document.getElementById('private-chat-list'));
            } else if (activeTab === 'tab-btn-chats') {
                loadChatsList(document.getElementById('private-chat-list'));
            }
        })
        .subscribe();
}

async function searchUserForChat() {
    const isGuest = currentName === 'Guest' || currentName.startsWith('Guest.');
    if (isGuest) {
        showGuestModal('برای ورود به این بخش، ابتدا باید نام بگذارید.');
        return;
    }

    const input = document.getElementById('searchUserInput');
    const term = input.value.trim();
    const listContainer = document.getElementById('private-chat-list');
    
    if (!term) return;
    if (term === currentName) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">شما نمی‌توانید به خودتان درخواست دهید!</p>';
        return;
    }

    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">در حال جستجو...</p>';

    const { data: user } = await supabaseClient.from('profiles').select('name, custom_avatar_url, last_seen').eq('name', term).maybeSingle();

    if (!user) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">کاربری با این آیدی یافت نشد.</p>';
        return;
    }

    const { data: existingFriend } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'accepted').maybeSingle();
    const { data: existingPending } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'pending').maybeSingle();

    let avatarSrc = user.custom_avatar_url || defaultAvatar;
    let actionBtn = '';

    if (existingFriend) {
        actionBtn = `<button class="user-card-action" onclick="openPrivateChat('${user.name}', '${avatarSrc}')">ورود به چت</button>`;
    } else if (existingPending) {
        actionBtn = `<button class="user-card-action" style="background:#eab308;" disabled>در انتظار تایید</button>`;
    } else {
        actionBtn = `<button class="user-card-action" id="btn-send-req-${user.name}" onclick="sendFriendRequest('${user.name}')">درخواست دوستی</button>`;
    }

    listContainer.innerHTML = `
        <div class="user-card">
            <div class="user-card-info">
                <img src="${avatarSrc}">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span>${user.name} ${getVerifiedIcon(user.name)}</span>
                    ${getStatusHTML(user.name, user.last_seen)}
                </div>
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

    const btn = document.getElementById(`btn-send-req-${receiver}`);
    if (btn) {
        btn.innerHTML = '<span style="color: #22c55e; font-weight: bold;">درخواست ارسال شد</span>';
        btn.disabled = true;
        btn.style.background = 'transparent';
        
        setTimeout(() => {
            btn.innerHTML = 'در انتظار تایید';
            btn.style.background = '#eab308';
            btn.style.color = '#fff';
        }, 2000);
    }
}

async function loadChatsList(container) {
    const { data: friends } = await supabaseClient.from('friend_requests')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.neq.${currentName}),and(receiver_name.eq.${currentName},sender_name.neq.${currentName})`)
        .eq('status', 'accepted');

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هنوز پیامی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url, last_seen');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url, last_seen: p.last_seen });

    const { data: unreadMsgs } = await supabaseClient.from('private_messages')
        .select('sender_name')
        .eq('receiver_name', currentName)
        .eq('is_read', false);

    const unreadCounts = {};
    if (unreadMsgs) {
        unreadMsgs.forEach(m => {
            unreadCounts[m.sender_name] = (unreadCounts[m.sender_name] || 0) + 1;
        });
    }

    container.innerHTML = '';
    friends.forEach(f => {
        const otherUser = f.sender_name === currentName ? f.receiver_name : f.sender_name;
        const uData = cachedAvatarMap[otherUser] || { custom_avatar_url: null, last_seen: null };
        const avSrc = uData.custom_avatar_url || defaultAvatar;
        const count = unreadCounts[otherUser] || 0;
        let badgeHTML = count > 0 ? `<span class="unread-badge">${count}</span>` : '';

        container.innerHTML += `
            <div class="user-card" onclick="openPrivateChat('${otherUser}', '${avSrc}')" style="cursor:pointer;">
                <div class="user-card-info">
                    <img src="${avSrc}">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span>${otherUser} ${getVerifiedIcon(otherUser)}</span>
                        ${getStatusHTML(otherUser, uData.last_seen)}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    ${badgeHTML}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </div>
        `;
    });
}

async function loadFriendsList(container) {
    const { data: friends } = await supabaseClient.from('friend_requests')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.neq.${currentName}),and(receiver_name.eq.${currentName},sender_name.neq.${currentName})`)
        .eq('status', 'accepted');

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هنوز دوستی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url, last_seen');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url, last_seen: p.last_seen });

    container.innerHTML = '';
    friends.forEach(f => {
        const otherUser = f.sender_name === currentName ? f.receiver_name : f.sender_name;
        const uData = cachedAvatarMap[otherUser] || { custom_avatar_url: null, last_seen: null };
        const avSrc = uData.custom_avatar_url || defaultAvatar;

        container.innerHTML += `
            <div class="user-card">
                <div class="user-card-info">
                    <img src="${avSrc}">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span>${otherUser} ${getVerifiedIcon(otherUser)}</span>
                        ${getStatusHTML(otherUser, uData.last_seen)}
                    </div>
                </div>
                <button class="trash-btn" onclick="openDeleteFriendModal('${otherUser}')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        `;
    });
}

function openDeleteFriendModal(user) {
    friendToDelete = user;
    document.getElementById('delete-friend-modal').classList.add('active');
}

function closeDeleteFriendModal() {
    friendToDelete = null;
    document.getElementById('delete-friend-modal').classList.remove('active');
}

async function confirmDeleteFriend() {
    if (!friendToDelete) return;

    await supabaseClient.from('friend_requests')
        .delete()
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${friendToDelete}),and(sender_name.eq.${friendToDelete},receiver_name.eq.${currentName})`)
        .eq('status', 'accepted');

    await supabaseClient.from('private_messages')
        .delete()
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${friendToDelete}),and(sender_name.eq.${friendToDelete},receiver_name.eq.${currentName})`);

    if (activePrivateChat === friendToDelete) {
        closePrivateChat();
    }

    closeDeleteFriendModal();
    switchPrivateTab('friends');
    updatePrivateBadges();
}

async function loadRequestsList(container) {
    const { data: requests } = await supabaseClient.from('friend_requests')
        .select('*')
        .eq('receiver_name', currentName)
        .eq('status', 'pending');

    if (!requests || requests.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هنوز درخواستی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url });

    container.innerHTML = '';
    requests.forEach(r => {
        const uData = cachedAvatarMap[r.sender_name] || { custom_avatar_url: null };
        const avSrc = uData.custom_avatar_url || defaultAvatar;

        const date = new Date(r.created_at);
        const pDate = date.toLocaleDateString('fa-IR');
        const pTime = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        container.innerHTML += `
            <div class="user-card" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div class="user-card-info">
                        <img src="${avSrc}">
                        <span>${r.sender_name} ${getVerifiedIcon(r.sender_name)}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span style="font-size:0.75rem; color:#fff;">${pDate}</span>
                        <span style="font-size:0.7rem; color:var(--text-muted);">${pTime}</span>
                    </div>
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
    updatePrivateBadges();
}

async function rejectRequest(reqId) {
    await supabaseClient.from('friend_requests').update({ status: 'rejected' }).eq('id', reqId);
    switchPrivateTab('requests');
    updatePrivateBadges();
}

async function openPrivateChat(user, avatarSrc) {
    activePrivateChat = user;
    currentChatContext = 'private';
    
    if (!cachedAvatarMap[user]) {
        const { data } = await supabaseClient.from('profiles').select('custom_avatar_url, last_seen').eq('name', user).maybeSingle();
        if (data) cachedAvatarMap[user] = data;
    }
    
    const { data: pData } = await supabaseClient.from('profiles').select('last_seen').eq('name', user).maybeSingle();
    const statusHTML = getStatusHTML(user, pData ? pData.last_seen : null);

    const chatWindow = document.createElement('div');
    chatWindow.className = 'private-chat-window';
    chatWindow.id = 'private-chat-window';
    chatWindow.innerHTML = `
        <div class="private-chat-header">
            <div class="header-right">
                <img src="${avatarSrc}">
                <div class="name-status">
                    <span class="name">${user} ${getVerifiedIcon(user)}</span>
                    ${statusHTML}
                </div>
            </div>
            <button class="back-btn" onclick="closePrivateChat()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
            </button>
        </div>
        <div class="private-chat-messages" id="private-messages-container"></div>
        <div class="private-input-row">
            <textarea id="private-chat-input" placeholder="پیام..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
            <button class="send-msg-btn" onclick="sendPrivateMessage()">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
        </div>
    `;
    document.body.appendChild(chatWindow);
    
    supabaseClient.from('private_messages')
        .update({ is_read: true })
        .eq('receiver_name', currentName)
        .eq('sender_name', user)
        .then(() => {
            updatePrivateBadges();
            if (document.getElementById('tab-btn-chats')?.classList.contains('active')) {
                loadChatsList(document.getElementById('private-chat-list'));
            }
        });

    loadPrivateMessages();
}

function closePrivateChat() {
    if (privateChatSubscription) supabaseClient.removeChannel(privateChatSubscription);
    const w = document.getElementById('private-chat-window');
    if (w) w.remove();
    activePrivateChat = null;
    currentChatContext = 'public';
    updatePrivateBadges();
}

async function loadPrivateMessages() {
    const container = document.getElementById('private-messages-container');
    if (!container) return;
    
    const { data } = await supabaseClient.from('private_messages')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${activePrivateChat}),and(sender_name.eq.${activePrivateChat},receiver_name.eq.${currentName})`)
        .order('created_at', { ascending: true });

    container.innerHTML = '';
    let lastDate = null;
    if (data) {
        data.forEach(msg => {
            const msgDate = new Date(msg.created_at).toDateString();
            if (lastDate !== msgDate) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'chat-header-date';
                dateDiv.innerText = getPersianDateString(msg.created_at);
                container.appendChild(dateDiv);
                lastDate = msgDate;
            }
            appendPrivateMessageUI(msg);
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
                
                if (!document.querySelector(`[data-private-msg-id="${msg.id}"]`)) {
                    const msgDate = new Date(msg.created_at).toDateString();
                    let lastDate = null;
                    const wrappers = container.querySelectorAll('.chat-msg-wrapper');
                    if (wrappers.length > 0) {
                        lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
                    }
                    
                    if (lastDate !== msgDate) {
                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'chat-header-date';
                        dateDiv.innerText = getPersianDateString(msg.created_at);
                        container.appendChild(dateDiv);
                    }
                    
                    appendPrivateMessageUI(msg);
                    container.scrollTop = container.scrollHeight;
                    
                    if (msg.receiver_name === currentName) {
                        supabaseClient.from('private_messages').update({ is_read: true }).eq('id', msg.id).then();
                    }
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
            const msg = payload.new;
            const wrapper = document.querySelector(`[data-private-msg-id="${msg.id}"]`);
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
                
                const tickEl = wrapper.querySelector('.msg-tick');
                if (tickEl && msg.sender_name === currentName) {
                    tickEl.innerHTML = msg.is_read ? doubleTickSvg : singleTickSvg;
                }
            }
        })
        .subscribe();
}

function appendPrivateMessageUI(msg) {
    const container = document.getElementById('private-messages-container');
    if (!container) return;

    const isMe = msg.sender_name === currentName;
    
    let avatarSrc = defaultAvatar;
    if (isMe) {
        if (currentCustomAvatarUrl) {
            avatarSrc = currentCustomAvatarUrl;
        }
    } else {
        const uData = cachedAvatarMap[msg.sender_name];
        if (uData && uData.custom_avatar_url) {
            avatarSrc = uData.custom_avatar_url;
        }
    }
    
    const time = getPersianTime(msg.created_at);
    const color = getUserColor(msg.sender_name);

    let replyHTML = '';
    if (msg.reply_to_text) {
        replyHTML = `<div style="font-size: 0.7rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px; margin-bottom: 5px; border-right: 2px solid var(--primary-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><b>${msg.reply_to_name || 'کاربر'}:</b> ${msg.reply_to_text}</div>`;
    }

    let editHTML = msg.is_edited ? ' <span style="color:var(--text-muted); font-size:0.55rem;">(ویرایش شده)</span>' : '';
    let tickHTML = '';
    if (isMe) {
        tickHTML = `<span class="msg-tick" style="margin-left: 4px;">${msg.is_read ? doubleTickSvg : singleTickSvg}</span>`;
    }

    let menuBtnHTML = isMe ? `<button class="msg-menu-btn" onclick="openEditModal('${msg.id}', this.getAttribute('data-text'))" data-text="${msg.text.replace(/"/g, '&quot;')}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>` : '';
    
    let replyBtnHTML = !isMe ? `<button class="msg-reply-btn" onclick="openReplyModal('${msg.id}', '${msg.sender_name}', this.getAttribute('data-text'))" data-text="${msg.text.replace(/"/g, '&quot;')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
    </button>` : '';

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : 'other-message'}`;
    wrapper.setAttribute('data-private-msg-id', msg.id);
    wrapper.setAttribute('data-date', new Date(msg.created_at).toDateString());
    
    wrapper.innerHTML = `
        <div class="chat-msg-avatar">
            <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        </div>
        <div class="chat-msg-content" style="background: ${isMe ? 'rgba(199, 36, 255, 0.2)' : 'rgba(255,255,255,0.1)'}; padding: 8px 12px; border-radius: 12px; position: relative;">
            <div class="chat-msg-header" style="margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span class="chat-msg-name" style="color: ${color}; font-size: 0.75rem; font-weight: bold;">${msg.sender_name} ${getVerifiedIcon(msg.sender_name)}</span>
                ${menuBtnHTML}
            </div>
            ${replyHTML}
            <div class="chat-msg-text" style="font-size: 0.85rem; color: #fff; white-space: pre-wrap;">${msg.text}</div>
            <div class="chat-msg-time" style="font-size: 0.6rem; color: var(--text-muted); direction: ltr; margin-top: 5px; text-align: left; display: flex; align-items: center; justify-content: flex-end;">
                ${tickHTML} <span dir="rtl" style="margin-left: 6px;">${time}${editHTML}</span>
            </div>
            ${replyBtnHTML}
        </div>
    `;

    container.appendChild(wrapper);
}

async function sendPrivateMessage() {
    const input = document.getElementById('private-chat-input');
    const text = input.value.trim();
    if (!text || !activePrivateChat) return;
    
    input.value = '';
    input.style.height = 'auto';

    const msgData = {
        sender_name: currentName,
        receiver_name: activePrivateChat,
        text: text
    };

    if (window.currentReply) {
        msgData.reply_to_id = window.currentReply.id;
        msgData.reply_to_text = window.currentReply.text;
        msgData.reply_to_name = window.currentReply.sender;
        window.currentReply = null;
    }
    
    const { data, error } = await supabaseClient.from('private_messages').insert([msgData]).select();
    if (data && data.length > 0) {
        const msg = data[0];
        const container = document.getElementById('private-messages-container');
        if (container && !document.querySelector(`[data-private-msg-id="${msg.id}"]`)) {
            const msgDate = new Date(msg.created_at).toDateString();
            let lastDate = null;
            const wrappers = container.querySelectorAll('.chat-msg-wrapper');
            if (wrappers.length > 0) {
                lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
            }
            
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
}

const trophyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
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
        .select('name, solved_levels, custom_avatar_url, created_at')
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
            <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
                <img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${nameColor}; font-weight: bold;"></span>
                <span style="font-size: 0.8rem; color: #ffffff; display: flex; align-items: center; gap: 4px;">${trophyIconSvg} 0</span>
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

    const { data: profilesData } = await supabaseClient.from('profiles').select('name, custom_avatar_url');
    const avatarMap = {};
    if (profilesData) {
        profilesData.forEach(p => { avatarMap[p.name] = p.custom_avatar_url; });
    }

    chatMessages.innerHTML = '';
    if (!data || data.length === 0) {
        chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">هنوز پیامی ارسال نشده است.</div>';
    } else {
        let lastDate = null;
        data.forEach(msg => {
            const msgDate = new Date(msg.created_at).toDateString();
            if (lastDate !== msgDate) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'chat-header-date';
                dateDiv.innerText = getPersianDateString(msg.created_at);
                chatMessages.appendChild(dateDiv);
                lastDate = msgDate;
            }
            const avatarUrl = avatarMap[msg.sender_name] || defaultAvatar;
            appendPanelChatMessage(msg, avatarUrl);
        });
    }

    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatSubscription = supabaseClient
        .channel('public:messages')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                if (document.querySelector(`[data-msg-id="${payload.new.id}"]`)) return;
                
                const { data: profileData } = await supabaseClient
                    .from('profiles')
                    .select('custom_avatar_url')
                    .eq('name', payload.new.sender_name)
                    .maybeSingle();
                const avatarUrl = profileData && profileData.custom_avatar_url ? profileData.custom_avatar_url : defaultAvatar;
                
                const msgDate = new Date(payload.new.created_at).toDateString();
                let lastDate = null;
                const wrappers = chatMessages.querySelectorAll('.chat-msg-wrapper');
                if (wrappers.length > 0) {
                    lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
                }
                
                if (lastDate !== msgDate) {
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'chat-header-date';
                    dateDiv.innerText = getPersianDateString(payload.new.created_at);
                    chatMessages.appendChild(dateDiv);
                }
                
                appendPanelChatMessage(payload.new, avatarUrl);
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

function appendPanelChatMessage(msg, avatarUrl) {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    if (chatMessages.innerHTML.includes('هنوز پیامی ارسال نشده است.')) {
        chatMessages.innerHTML = '';
    }

    const color = getUserColor(msg.sender_name);
    const time = getPersianTime(msg.created_at);
    const isMe = msg.sender_name === currentName;

    const avatarSrc = avatarUrl || defaultAvatar;

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : 'other-message'}`;
    wrapper.setAttribute('data-msg-id', msg.id);
    wrapper.setAttribute('data-date', new Date(msg.created_at).toDateString());

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
    const isGuest = currentName === 'Guest' || currentName.startsWith('Guest.');
    if (isGuest) {
        showGuestModal('برای ورود به این بخش، ابتدا باید نام بگذارید.');
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

    const { data } = await supabaseClient.from('messages').insert([msgData]).select();
    if (data && data.length > 0) {
        const msg = data[0];
        const chatMessages = document.getElementById('panel-chat-messages');
        if (chatMessages && !document.querySelector(`[data-msg-id="${msg.id}"]`)) {
            if (chatMessages.innerHTML.includes('هنوز پیامی ارسال نشده است.')) {
                chatMessages.innerHTML = '';
            }
            const msgDate = new Date(msg.created_at).toDateString();
            let lastDate = null;
            const wrappers = chatMessages.querySelectorAll('.chat-msg-wrapper');
            if (wrappers.length > 0) {
                lastDate = wrappers[wrappers.length - 1].getAttribute('data-date');
            }
            
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
    await loadProgress();
    await loadProfile();
    updateProfileUI();
    updateCoinsUI();
    renderChapters();
    checkOnlineStatus();
    initProfilesListener();
    
    if (currentName && currentName !== 'Guest') {
        supabaseClient.from('profiles').update({ last_seen: null }).eq('name', currentName).then();
    }

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

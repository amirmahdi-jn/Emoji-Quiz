let privateSearchResultActive = false;
let privateSearchTerm = '';

document.addEventListener('input', (event) => {
    if (event.target.id !== 'searchUserInput') return;
    if (!privateSearchResultActive || event.target.value.trim() === privateSearchTerm) return;
    privateSearchResultActive = false;
    privateSearchTerm = '';
    const listContainer = document.getElementById('private-chat-list');
    if (listContainer && document.getElementById('tab-btn-friends')?.classList.contains('active')) {
        loadFriendsList(listContainer);
    }
});

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
    privateSearchResultActive = false;
    privateSearchTerm = '';
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
            } else if (activeTab === 'tab-btn-friends' && !privateSearchResultActive) {
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
                cachedAvatarMap[updatedUser.name] = { custom_avatar_url: updatedUser.custom_avatar_url, active_frame: updatedUser.active_frame, last_seen: updatedUser.last_seen };
            } else {
                cachedAvatarMap[updatedUser.name].last_seen = updatedUser.last_seen;
                cachedAvatarMap[updatedUser.name].custom_avatar_url = updatedUser.custom_avatar_url;
                cachedAvatarMap[updatedUser.name].active_frame = updatedUser.active_frame;
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
            if (activeTab === 'tab-btn-friends' && !privateSearchResultActive) {
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
        showGuestModal();
        return;
    }

    const input = document.getElementById('searchUserInput');
    const term = input.value.trim();
    const listContainer = document.getElementById('private-chat-list');

    if (!term) return;
    privateSearchResultActive = true;
    privateSearchTerm = term;
    if (term === currentName) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">شما نمی‌توانید به خودتان درخواست دهید!</p>';
        return;
    }

    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">در حال جستجو...</p>';

    const { data: user } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame, last_seen').eq('name', term).maybeSingle();

    if (!privateSearchResultActive || input.value.trim() !== term) return;

    if (!user) {
        listContainer.innerHTML = '<p style="text-align:center; color:#f87171;">کاربری با این آیدی یافت نشد.</p>';
        return;
    }

    const { data: existingFriend } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'accepted').maybeSingle();
    const { data: existingPending } = await supabaseClient.from('friend_requests').select('status').or(`and(sender_name.eq.${currentName},receiver_name.eq.${term}),and(sender_name.eq.${term},receiver_name.eq.${currentName})`).eq('status', 'pending').maybeSingle();

    if (!privateSearchResultActive || input.value.trim() !== term) return;

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
                <div class="user-avatar-frame ${getFrameClass(user.active_frame)}"><img src="${avatarSrc}"></div>
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
    const { data: sent } = await supabaseClient
        .from('private_messages')
        .select('receiver_name, created_at, text, is_read')
        .eq('sender_name', currentName)
        .order('created_at', { ascending: false });

    const { data: received } = await supabaseClient
        .from('private_messages')
        .select('sender_name, created_at, text, is_read')
        .eq('receiver_name', currentName)
        .order('created_at', { ascending: false });

    const chatMap = new Map();

    if (sent) {
        sent.forEach(m => {
            if (!chatMap.has(m.receiver_name)) {
                chatMap.set(m.receiver_name, {
                    name: m.receiver_name,
                    lastMessage: m.text,
                    date: m.created_at,
                    unread: 0
                });
            }
        });
    }

    if (received) {
        received.forEach(m => {
            if (!chatMap.has(m.sender_name)) {
                chatMap.set(m.sender_name, {
                    name: m.sender_name,
                    lastMessage: m.text,
                    date: m.created_at,
                    unread: 0
                });
            }

            if (!m.is_read) {
                chatMap.get(m.sender_name).unread++;
            }
        });
    }

    const chats = Array.from(chatMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (chats.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">هنوز گفتگویی ندارید.</p>';
        return;
    }

    const names = chats.map(c => c.name);
    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('name, custom_avatar_url, active_frame, last_seen')
        .in('name', names);

    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.name] = p);

    container.innerHTML = '';

    chats.forEach(chat => {
        const profile = profileMap[chat.name] || {};
        const avatar = profile.custom_avatar_url || defaultAvatar;

        const row = document.createElement('div');
        row.className = 'friend-list-item';
        row.innerHTML = `
            <div class="user-card-info">
                <div class="user-avatar-frame ${getFrameClass(profile.active_frame)}"><img src="${avatar}"></div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span>${chat.name} ${getVerifiedIcon(chat.name)}</span>
                    ${getStatusHTML(chat.name, profile.last_seen)}
                    <small style="color:var(--text-muted);">${chat.lastMessage || ''}</small>
                </div>
            </div>
            ${chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''}
            <button class="user-card-action" onclick="openPrivateChat('${chat.name}', '${avatar}')">ورود به چت</button>
        `;
        container.appendChild(row);
    });
}

async function loadFriendsList(container) {
    const { data: friends } = await supabaseClient
        .from('friend_requests')
        .select('*')
        .or(`sender_name.eq.${currentName},receiver_name.eq.${currentName}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">هنوز دوستی ندارید.</p>';
        return;
    }

    const friendNames = friends.map(f => f.sender_name === currentName ? f.receiver_name : f.sender_name);

    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('name, custom_avatar_url, active_frame, last_seen')
        .in('name', friendNames);

    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.name] = p);

    container.innerHTML = '';

    friends.forEach(f => {
        const otherUser = f.sender_name === currentName ? f.receiver_name : f.sender_name;
        const profile = profileMap[otherUser] || {};
        const avatar = profile.custom_avatar_url || defaultAvatar;

        const row = document.createElement('div');
        row.className = 'friend-list-item';
        row.innerHTML = `
            <div class="user-card-info">
                <div class="user-avatar-frame ${getFrameClass(profile.active_frame)}"><img src="${avatar}"></div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span>${otherUser} ${getVerifiedIcon(otherUser)}</span>
                    ${getStatusHTML(otherUser, profile.last_seen)}
                </div>
            </div>
            <button class="user-card-action" onclick="openPrivateChat('${otherUser}', '${avatar}')">ورود به چت</button>
            <button class="trash-btn" onclick="openDeleteFriendModal('${otherUser}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
        `;
        container.appendChild(row);
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
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${friendToDelete}),and(sender_name.eq.${friendToDelete},receiver_name.eq.${currentName})`);

    if (activePrivateChat === friendToDelete) {
        activePrivateChat = null;
    }

    closeDeleteFriendModal();
    switchPrivateTab('friends');
}

async function loadRequestsList(container) {
    const { data: requests } = await supabaseClient
        .from('friend_requests')
        .select('*')
        .eq('receiver_name', currentName)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (!requests || requests.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">هنوز درخواستی ندارید.</p>';
        return;
    }

    const senderNames = requests.map(r => r.sender_name);

    const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('name, custom_avatar_url, active_frame, last_seen')
        .in('name', senderNames);

    const profileMap = {};
    if (profiles) profiles.forEach(p => profileMap[p.name] = p);

    container.innerHTML = '';

    requests.forEach(req => {
        const profile = profileMap[req.sender_name] || {};
        const avatar = profile.custom_avatar_url || defaultAvatar;

        const row = document.createElement('div');
        row.className = 'friend-list-item';
        row.innerHTML = `
            <div class="user-card-info">
                <div class="user-avatar-frame ${getFrameClass(profile.active_frame)}"><img src="${avatar}"></div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span>${req.sender_name} ${getVerifiedIcon(req.sender_name)}</span>
                    ${getStatusHTML(req.sender_name, profile.last_seen)}
                </div>
            </div>
            <button class="user-card-action" style="background:#22c55e;" onclick="acceptFriendRequest(${req.id})">تایید</button>
            <button class="user-card-action" style="background:#ef4444;" onclick="rejectFriendRequest(${req.id})">رد</button>
        `;
        container.appendChild(row);
    });
}

async function acceptFriendRequest(reqId) {
    await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', reqId);
    updatePrivateBadges();
    switchPrivateTab('friends');
}

async function rejectFriendRequest(reqId) {
    await supabaseClient.from('friend_requests').delete().eq('id', reqId);
    updatePrivateBadges();
    switchPrivateTab('requests');
}

function openPrivateChat(name, avatar) {
    activePrivateChat = name;
    currentChatContext = 'private';

    const panelContent = document.getElementById('panel-content');
    panelContent.innerHTML = `
        <div class="private-chat-header">
            <button class="back-btn" onclick="renderPanelContent('private-chat')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>
            </button>
            <div class="user-avatar-frame">
                <img src="${avatar}">
            </div>
            <div class="name-status">
                <span>${name}</span>
                ${getStatusHTML(name, cachedAvatarMap[name]?.last_seen)}
            </div>
        </div>
        <div id="private-messages-container" class="private-messages-container"></div>
        <div class="chat-input-row">
            <button class="send-msg-btn" onclick="sendPrivateMessage()" aria-label="ارسال پیام">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
            <textarea id="private-chat-input" placeholder="پیام خود را بنویسید..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
            <button class="sticker-open-btn" onclick="openStickerPicker()" aria-label="استیکر">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sticker preview-icon"><path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/></svg>
            </button>
        </div>
    `;

    loadPrivateMessages(name);
}

async function loadPrivateMessages(name) {
    const container = document.getElementById('private-messages-container');
    if (!container) return;

    const { data: messages } = await supabaseClient
        .from('private_messages')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${name}),and(sender_name.eq.${name},receiver_name.eq.${currentName})`)
        .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">هنوز پیامی ارسال نشده است.</p>';
    } else {
        container.innerHTML = '';
        let lastDate = null;

        messages.forEach(msg => {
            const msgDate = new Date(msg.created_at).toDateString();

            if (msgDate !== lastDate) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'chat-header-date';
                dateDiv.innerText = getPersianDateString(msg.created_at);
                container.appendChild(dateDiv);
                lastDate = msgDate;
            }

            appendPrivateMessageUI(msg);
        });
    }

    await supabaseClient
        .from('private_messages')
        .update({ is_read: true })
        .eq('sender_name', name)
        .eq('receiver_name', currentName)
        .eq('is_read', false);

    container.scrollTop = container.scrollHeight;
    updatePrivateBadges();

    if (privateChatSubscription) supabaseClient.removeChannel(privateChatSubscription);
    privateChatSubscription = supabaseClient
        .channel(`private-chat-${currentName}-${name}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
            const msg = payload.new;
            if (
                (msg.sender_name === name && msg.receiver_name === currentName) ||
                (msg.sender_name === currentName && msg.receiver_name === name)
            ) {
                const existing = document.querySelector(`[data-private-msg-id="${msg.id}"]`);
                if (!existing) {
                    if (container.innerHTML.includes('هنوز پیامی ارسال نشده است.')) container.innerHTML = '';
                    appendPrivateMessageUI(msg);
                    container.scrollTop = container.scrollHeight;
                }
            }
        })
        .subscribe();
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

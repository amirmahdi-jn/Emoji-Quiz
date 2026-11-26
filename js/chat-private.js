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
        showGuestModal();
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

    const { data: user } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame, last_seen').eq('name', term).maybeSingle();

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
    const { data: friends } = await supabaseClient.from('friend_requests')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.neq.${currentName}),and(receiver_name.eq.${currentName},sender_name.neq.${currentName})`)
        .eq('status', 'accepted');

    if (!friends || friends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هنوز پیامی ندارید.</p>';
        return;
    }

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame, last_seen');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url, active_frame: p.active_frame, last_seen: p.last_seen });

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
        const uData = cachedAvatarMap[otherUser] || { custom_avatar_url: null, active_frame: 'none', last_seen: null };
        const avSrc = uData.custom_avatar_url || defaultAvatar;
        const count = unreadCounts[otherUser] || 0;
        let badgeHTML = count > 0 ? `<span class="unread-badge">${count}</span>` : '';

        container.innerHTML += `
            <div class="user-card" onclick="openPrivateChat('${otherUser}', '${avSrc}')" style="cursor:pointer;">
                <div class="user-card-info">
                    <div class="user-avatar-frame ${getFrameClass(uData.active_frame)}"><img src="${avSrc}"></div>
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

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame, last_seen');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url, active_frame: p.active_frame, last_seen: p.last_seen });

    container.innerHTML = '';
    friends.forEach(f => {
        const otherUser = f.sender_name === currentName ? f.receiver_name : f.sender_name;
        const uData = cachedAvatarMap[otherUser] || { custom_avatar_url: null, active_frame: 'none', last_seen: null };
        const avSrc = uData.custom_avatar_url || defaultAvatar;

        container.innerHTML += `
            <div class="user-card">
                <div class="user-card-info">
                    <div class="user-avatar-frame ${getFrameClass(uData.active_frame)}"><img src="${avSrc}"></div>
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

    const { data: profiles } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame');
    if (profiles) profiles.forEach(p => cachedAvatarMap[p.name] = { custom_avatar_url: p.custom_avatar_url, active_frame: p.active_frame });

    container.innerHTML = '';
    requests.forEach(r => {
        const uData = cachedAvatarMap[r.sender_name] || { custom_avatar_url: null, active_frame: 'none' };
        const avSrc = uData.custom_avatar_url || defaultAvatar;

        const date = new Date(r.created_at);
        const pDate = date.toLocaleDateString('fa-IR');
        const pTime = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        container.innerHTML += `
            <div class="user-card" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div class="user-card-info">
                        <div class="user-avatar-frame ${getFrameClass(uData.active_frame)}"><img src="${avSrc}"></div>
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
        const { data } = await supabaseClient.from('profiles').select('custom_avatar_url, active_frame, last_seen').eq('name', user).maybeSingle();
        if (data) cachedAvatarMap[user] = data;
    }

    const { data: pData } = await supabaseClient.from('profiles').select('last_seen, active_frame, custom_avatar_url').eq('name', user).maybeSingle();
    const statusHTML = getStatusHTML(user, pData ? pData.last_seen : null);

    const chatWindow = document.createElement('div');
    chatWindow.className = 'private-chat-window';
    chatWindow.id = 'private-chat-window';
    chatWindow.innerHTML = `
        <div class="private-chat-header">
            <div class="header-right">
                <div class="user-avatar-frame ${getFrameClass((cachedAvatarMap[user] || {}).active_frame)}"><img src="${avatarSrc}"></div>
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
            <button class="send-msg-btn" onclick="sendPrivateMessage()" aria-label="ارسال پیام">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
            <textarea id="private-chat-input" placeholder="پیام..." rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px';"></textarea>
            <button class="sticker-open-btn" onclick="openStickerPicker()" aria-label="استیکر">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sticker preview-icon"><path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/></svg>
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
                        if (timeEl && !timeEl.textContent.includes('(ویرایش شده)')) {
                            const editedSpan = document.createElement('span');
                            editedSpan.style.color = 'var(--text-muted)';
                            editedSpan.textContent = ' (ویرایش شده)';
                            timeEl.appendChild(editedSpan);
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
        if (currentCustomAvatarUrl) avatarSrc = currentCustomAvatarUrl;
    } else {
        const uData = cachedAvatarMap[msg.sender_name];
        if (uData && uData.custom_avatar_url) avatarSrc = uData.custom_avatar_url;
    }

    const time = getPersianTime(msg.created_at);
    const color = getUserColor(msg.sender_name);

    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg-wrapper ${isMe ? 'my-message' : 'other-message'}`;
    wrapper.setAttribute('data-private-msg-id', msg.id);
    wrapper.setAttribute('data-date', new Date(msg.created_at).toDateString());

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'chat-msg-avatar ' + getFrameClass(isMe ? currentFrame : ((cachedAvatarMap[msg.sender_name] || {}).active_frame));
    const avatarImg = document.createElement('img');
    avatarImg.src = avatarSrc;
    avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    avatarDiv.appendChild(avatarImg);
    wrapper.appendChild(avatarDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-msg-content';
    contentDiv.style.cssText = `background:${isMe ? 'rgba(199,36,255,0.2)' : 'rgba(255,255,255,0.1)'}; padding:8px 12px; border-radius:12px; position:relative;`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'chat-msg-header';
    headerDiv.style.cssText = 'margin-bottom:4px; display:flex; justify-content:space-between; align-items:center; gap:10px;';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-msg-name';
    nameSpan.style.cssText = `color:${color}; font-size:0.75rem; font-weight:bold;`;
    nameSpan.textContent = msg.sender_name;
    nameSpan.insertAdjacentHTML('beforeend', getVerifiedIcon(msg.sender_name));
    headerDiv.appendChild(nameSpan);

    if (isMe && msg.message_type !== 'sticker') {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'msg-menu-btn';
        menuBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
        menuBtn.addEventListener('click', () => window.openEditModal(msg.id, msg.text));
        headerDiv.appendChild(menuBtn);
    }
    contentDiv.appendChild(headerDiv);

    if (msg.reply_to_text) {
        const replyDiv = document.createElement('div');
        replyDiv.style.cssText = 'font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:4px; border-radius:4px; margin-bottom:5px; border-right:2px solid var(--primary-color); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        const replyName = document.createElement('b');
        replyName.textContent = (msg.reply_to_name || 'کاربر') + ':';
        replyDiv.appendChild(replyName);
        replyDiv.appendChild(document.createTextNode(' ' + msg.reply_to_text));
        contentDiv.appendChild(replyDiv);
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-msg-text';
    textDiv.style.cssText = 'font-size:0.85rem; color:#fff; white-space:pre-wrap;';
    if (msg.message_type === 'sticker' && msg.sticker_id) {
        textDiv.appendChild(createStickerMessageElement(msg.sticker_id));
    } else {
        textDiv.textContent = msg.text;
    }
    contentDiv.appendChild(textDiv);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-msg-time';
    timeDiv.style.cssText = 'font-size:0.6rem; color:var(--text-muted); direction:ltr; margin-top:5px; text-align:left; display:flex; align-items:center; justify-content:flex-end;';
    if (isMe) {
        const tickSpan = document.createElement('span');
        tickSpan.className = 'msg-tick';
        tickSpan.style.cssText = 'margin-left:4px;';
        tickSpan.innerHTML = msg.is_read ? doubleTickSvg : singleTickSvg;
        timeDiv.appendChild(tickSpan);
    }
    const timeInner = document.createElement('span');
    timeInner.setAttribute('dir', 'rtl');
    timeInner.style.cssText = 'margin-left:6px;';
    timeInner.textContent = time + (msg.is_edited ? ' (ویرایش شده)' : '');
    timeDiv.appendChild(timeInner);
    contentDiv.appendChild(timeDiv);

    if (!isMe && msg.message_type !== 'sticker') {
        const replyBtn = document.createElement('button');
        replyBtn.className = 'msg-reply-btn';
        replyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>';
        replyBtn.addEventListener('click', () => window.openReplyModal(msg.id, msg.sender_name, msg.text));
        contentDiv.appendChild(replyBtn);
    }

    wrapper.appendChild(contentDiv);
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

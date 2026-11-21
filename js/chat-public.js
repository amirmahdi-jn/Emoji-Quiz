async function initPanelChat() {
    const chatMessages = document.getElementById('panel-chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">در حال اتصال...</div>';

    const { data: rawData, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    const data = rawData ? rawData.reverse() : null;

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
                            if (timeEl && !timeEl.textContent.includes('(ویرایش شده)')) {
                                const editedSpan = document.createElement('span');
                                editedSpan.style.color = 'var(--text-muted)';
                                editedSpan.textContent = ' (ویرایش شده)';
                                timeEl.appendChild(editedSpan);
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

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'chat-msg-avatar';
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
    nameSpan.textContent = msg.sender_name || 'Guest';
    nameSpan.insertAdjacentHTML('beforeend', getVerifiedIcon(msg.sender_name));
    headerDiv.appendChild(nameSpan);

    if (isMe) {
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
    textDiv.textContent = msg.text;
    contentDiv.appendChild(textDiv);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-msg-time';
    timeDiv.style.cssText = 'font-size:0.6rem; color:var(--text-muted); direction:ltr; margin-top:5px; text-align:left;';
    timeDiv.textContent = time + (msg.is_edited ? ' (ویرایش شده)' : '');
    contentDiv.appendChild(timeDiv);

    if (!isMe) {
        const replyBtn = document.createElement('button');
        replyBtn.className = 'msg-reply-btn';
        replyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>';
        replyBtn.addEventListener('click', () => window.openReplyModal(msg.id, msg.sender_name, msg.text));
        contentDiv.appendChild(replyBtn);
    }

    wrapper.appendChild(contentDiv);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendPanelChatMessage() {
    const isGuest = currentName === 'Guest' || currentName.startsWith('Guest.');
    if (isGuest) {
        showGuestModal();
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

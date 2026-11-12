function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (screenId === 'chapters-screen') renderChapters();
    if (screenId === 'levels-screen') renderLevels();
    if (screenId === 'panel-screen') switchPanelTab('top-players');
}

function switchPanelTab(tabId) {
    currentPanelTab = tabId;
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    renderPanelContent(tabId);
}

function openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(modalId);
    if (target) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
    if (modalId === 'challenge-modal') initDailyChallenge();
    if (modalId === 'gift-modal') startGiftTimer();
    if (modalId === 'profile-modal') renderAvatars();
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    if (giftInterval) { clearInterval(giftInterval); giftInterval = null; }
    if (dailyChallengeInterval) { clearInterval(dailyChallengeInterval); dailyChallengeInterval = null; }
}

function openNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    const input = document.getElementById('nameInput');
    if (!overlay || !input) return;
    input.value = currentName.startsWith('Guest.') ? '' : currentName;
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 200);
}

function closeNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

async function saveName() {
    const input = document.getElementById('nameInput');
    if (!input) return;
    let raw = input.value.trim();
    
    if (!/^[a-zA-Z0-9\.]{3,10}$/.test(raw)) {
        document.getElementById('alert-modal').classList.add('active');
        return;
    }
    
    const { data: existing } = await supabaseClient.from('profiles').select('name').ilike('name', raw).single();
    if (existing) {
        document.getElementById('duplicate-alert-modal').classList.add('active');
        return;
    }
    
    const deviceId = getDeviceId();
    if (!currentName.startsWith('Guest.') && currentName !== raw) {
        await supabaseClient.from('profiles').delete().eq('name', currentName);
    }
    
    currentName = raw;
    await supabaseClient.from('profiles').upsert({ 
        name: currentName, 
        device_id: deviceId,
        avatar_index: currentAvatarIndex,
        solved_levels: Object.keys(solvedLevels).length 
    }, { onConflict: 'device_id' });
    
    saveProfile();
    updateProfileUI();
    closeNameModal();
    
    if (currentPanelTab === 'top-players') {
        setTimeout(() => fetchLeaderboard(), 100);
    }
}

function renderAvatars() {
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');
    const preview = document.getElementById('modalPreview');
    if (!row1 || !row2) return;
    row1.innerHTML = '';
    row2.innerHTML = '';
    avatarImages.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'avatar-item';
        const img = document.createElement('img');
        img.src = src;
        item.appendChild(img);
        item.onclick = () => {
            currentAvatarIndex = idx;
            if (preview) preview.src = src;
            saveProfile();
            updateProfileUI();
            supabaseClient.from('profiles')
                .update({ avatar_index: idx })
                .eq('device_id', getDeviceId())
                .then();
        };
        if (idx < 3) row1.appendChild(item);
        else row2.appendChild(item);
    });
    if (preview) preview.src = (currentAvatarIndex >= 0) ? avatarImages[currentAvatarIndex] : defaultAvatar;
}

function getUserColor(username) {
    if (!username) return '#475569';
    const palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

function getUserInitial(username) {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
}

function getAvatarForUser(username) {
    if (username === currentName && currentAvatarIndex >= 0) {
        return avatarImages[currentAvatarIndex];
    }
    return defaultAvatar;
}

function getPersianDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const parts = new Intl.DateTimeFormat('fa-IR', options).formatToParts(new Date());
    const weekday = parts.find(p => p.type === 'weekday').value;
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    return `${weekday} ${day} ${month} ${year}`;
}

function getPersianTime(dateStr) {
    const date = new Date(dateStr);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

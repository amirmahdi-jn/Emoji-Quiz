async function fetchLeaderboard() {
    const list = document.getElementById('global-leaderboard');
    const loading = document.getElementById('leaderboard-loading');
    if (!list) return;

    const { data, error } = await supabaseClient
        .from('leaderboard_view')
        .select('name, solved_levels, avatar_index')
        .order('solved_levels', { ascending: false })
        .limit(10);

    if (loading) loading.style.display = 'none';

    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem;">هنوز رکوردی از کاربران ثبت‌نام‌شده وجود ندارد.</p>';
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

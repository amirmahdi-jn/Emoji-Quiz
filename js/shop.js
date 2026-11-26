function openPayment(key, amount, type) {
    currentPaymentKey = key;
    currentPaymentAmount = amount;
    currentPaymentType = type;
    document.querySelectorAll('.modal-box').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    if (target && overlay) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
}

const FRAME_DEFS = [
    { id: 'none', name: 'بدون قالب', price: 0, desc: 'بدون افکت' },
    { id: 'fire', name: 'هاله آتشین', price: 30, desc: 'شعله‌های سوزان' },
    { id: 'aurora', name: 'پرده اورورا', price: 50, desc: 'رنگ‌های درخشان' },
    { id: 'glitch', name: 'روح گلیچ', price: 80, desc: 'موج‌های دیجیتال' }
];

function renderFrameShop() {
    const allowedFrames = ['fire', 'aurora', 'glitch'];
    const previousFrame = currentFrame;
    const previousUnlockedFrames = JSON.stringify(unlockedFrames);
    if (!allowedFrames.includes(currentFrame)) currentFrame = 'none';
    unlockedFrames = Array.isArray(unlockedFrames) ? unlockedFrames.filter(frame => allowedFrames.includes(frame)) : [];
    if (currentFrame !== previousFrame || JSON.stringify(unlockedFrames) !== previousUnlockedFrames) {
        applyCurrentFrame();
        syncToDatabase();
    }
    const container = document.getElementById('frame-list');
    if (!container) return;
    const diamondIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="frame-coin-icon"><path d="M10.5 3 8 9l4 13 4-13-2.5-6"/><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/><path d="M2 9h20"/></svg>';
    let html = '';
    FRAME_DEFS.forEach(frame => {
        const isOwned = frame.id === 'none' || unlockedFrames.includes(frame.id);
        const isActive = currentFrame === frame.id;
        let btnHTML = '';
        if (isActive) {
            btnHTML = '<button class="frame-btn frame-btn-active" disabled>فعال</button>';
        } else if (isOwned) {
            btnHTML = '<button class="frame-btn frame-btn-equip" onclick="equipFrame(\'' + frame.id + '\')">انتخاب</button>';
        } else {
            btnHTML = '<button class="frame-btn frame-btn-buy" onclick="buyFrame(\'' + frame.id + '\', ' + frame.price + ')">' + frame.price + ' ' + diamondIcon + '</button>';
        }
        const previewClass = frame.id === 'none' ? '' : 'frame-' + frame.id;
        const previewSrc = currentCustomAvatarUrl || defaultAvatar;
        html += '<div class="frame-row ' + (isActive ? 'frame-row-active' : '') + '">' +
            '<div class="frame-preview"><div class="frame-avatar ' + previewClass + '"><img src="' + previewSrc + '" alt=""></div></div>' +
            '<div class="frame-info"><div class="frame-name">' + frame.name + '</div><div class="frame-desc">' + frame.desc + '</div></div>' +
            btnHTML +
            '</div>';
    });
    container.innerHTML = html;
}

function buyFrame(id, price) {
    if (unlockedFrames.includes(id)) return;
    if (currentDiamonds < price) {
        document.getElementById('no-diamond-modal').classList.add('active');
        return;
    }
    currentDiamonds -= price;
    unlockedFrames.push(id);
    updateCoinsUI();
    syncToDatabase();
    renderFrameShop();
}

function equipFrame(id) {
    if (id !== 'none' && !unlockedFrames.includes(id)) return;
    currentFrame = id;
    syncToDatabase();
    applyCurrentFrame();
    renderFrameShop();
}

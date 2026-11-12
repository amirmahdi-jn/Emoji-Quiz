function startGiftTimer() {
    const giftTimerEl = document.getElementById('giftTimer');
    if (!giftTimerEl) return;
    if (giftInterval) clearInterval(giftInterval);
    updateGiftTimer();
    giftInterval = setInterval(updateGiftTimer, 1000);
}

function updateGiftTimer() {
    const giftTimerEl = document.getElementById('giftTimer');
    if (!giftTimerEl) return;
    const lastOpen = localStorage.getItem(GIFT_KEY);
    if (!lastOpen) { giftTimerEl.textContent = '--:--:--'; return; }
    const elapsed = Date.now() - parseInt(lastOpen);
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) {
        giftTimerEl.textContent = '۰:۰۰:۰۰';
        if (giftInterval) { clearInterval(giftInterval); giftInterval = null; }
        return;
    }
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((remaining % (60 * 1000)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    giftTimerEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
}

function openGift(boxNumber) {
    const lastOpen = localStorage.getItem(GIFT_KEY);
    if (lastOpen) {
        const elapsed = Date.now() - parseInt(lastOpen);
        if (elapsed < 24 * 60 * 60 * 1000) { openModal('attention-modal'); return; }
    }
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
    const prizes = [
        { type: 'coin', amount: 10, msg: 'تبریک! ۱۰ سکه برنده شدید.' },
        { type: 'empty', amount: 0, msg: 'متاسفانه هیچ جایزه‌ای برنده نشدید.' },
        { type: 'diamond', amount: 10, msg: 'تبریک! ۱۰ الماس برنده شدید.' }
    ];
    const shuffled = [0, 1, 2];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (seed + i * 7) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const prize = prizes[shuffled[boxNumber - 1]] || prizes[0];
    if (prize.type === 'coin') {
        currentCoins += prize.amount;
        updateCoinsUI();
    } else if (prize.type === 'diamond') {
        currentDiamonds += prize.amount;
        updateCoinsUI();
    }
    const msgEl = document.getElementById('giftResultMsg');
    if (msgEl) {
        msgEl.textContent = prize.msg;
        msgEl.style.color = prize.type === 'empty' ? '#f87171' : '#4ade80';
    }
    localStorage.setItem(GIFT_KEY, Date.now().toString());
    saveProgress();
    openModal('gift-result-modal');
}

function initDailyChallenge() {
    const container = document.getElementById('challengeContent');
    if (!container) return;
    const dayOfMonth = new Date().getDate();
    const questionIndex = (dayOfMonth - 1) % dailyQuestions.length;
    const todayQuestion = dailyQuestions[questionIndex];
    container.innerHTML =
        '<div class="challenge-emoji-row"><span>' + todayQuestion.emoji1 + '</span><span>' + todayQuestion.emoji2 + '</span><span>' + todayQuestion.emoji3 + '</span></div>' +
        '<div class="challenge-timer" id="dailyTimer">--:--:--</div>' +
        '<div class="challenge-input-row">' +
        '<input type="text" id="dailyInput" placeholder="پاسخ..." autocomplete="off">' +
        '<button class="challenge-btn" id="dailySubmitBtn">ثبت</button>' +
        '</div>' +
        '<div class="challenge-result" id="dailyResult"></div>';
    const dailyInput = document.getElementById('dailyInput');
    const dailySubmit = document.getElementById('dailySubmitBtn');
    const dailyResult = document.getElementById('dailyResult');
    const timerEl = document.getElementById('dailyTimer');
    function getDailyState() {
        const saved = localStorage.getItem(DAILY_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const today = new Date().toDateString();
                if (data.date === today) return data;
            } catch (e) {}
        }
        return null;
    }
    function setDailyState(answered, correct) {
        const today = new Date().toDateString();
        localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, answered: answered, correct: correct }));
    }
    const state = getDailyState();
    if (state && state.answered) {
        dailyInput.disabled = true;
        dailySubmit.disabled = true;
        if (state.correct) {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (درست)';
            dailyResult.className = 'challenge-result success';
        } else {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (نادرست)';
            dailyResult.className = 'challenge-result fail';
        }
    }
    function updateDailyTimer() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const diff = midnight - now;
        if (diff <= 0) { timerEl.textContent = '۰:۰۰:۰۰'; return; }
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        const pad = (n) => String(n).padStart(2, '0');
        timerEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
    }
    updateDailyTimer();
    if (dailyChallengeInterval) clearInterval(dailyChallengeInterval);
    dailyChallengeInterval = setInterval(updateDailyTimer, 1000);
    dailySubmit.addEventListener('click', () => {
        if (dailyInput.disabled) return;
        const answer = dailyInput.value.trim();
        if (!answer) { dailyResult.textContent = 'لطفاً پاسخ را وارد کنید.'; dailyResult.className = 'challenge-result'; return; }
        const isCorrect = (answer === todayQuestion.answer);
        setDailyState(true, isCorrect);
        dailyInput.disabled = true;
        dailySubmit.disabled = true;
        if (isCorrect) {
            currentDiamonds += 5;
            updateCoinsUI();
            dailyResult.textContent = 'درست! ۵ الماس دریافت کردید.';
            dailyResult.className = 'challenge-result success';
        } else {
            dailyResult.textContent = 'نادرست. پاسخ صحیح : «' + todayQuestion.answer + '»';
            dailyResult.className = 'challenge-result fail';
        }
        saveProgress();
    });
    dailyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') dailySubmit.click(); });
}

function checkOnlineStatus() {
    const overlay = document.getElementById('offline-overlay');
    if (!overlay) return;
    if (!navigator.onLine) overlay.classList.add('active');
    else overlay.classList.remove('active');
}

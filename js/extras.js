function getIranMidnight() {
    const now = new Date();
    const iranOffset = 3.5 * 60 * 60 * 1000;
    const iranNow = new Date(now.getTime() + iranOffset);
    iranNow.setUTCHours(24, 0, 0, 0);
    return iranNow.getTime() - iranOffset;
}

function formatTimeRemaining(ms) {
    if (ms <= 0) return '۰:۰۰:۰۰';
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((ms % (60 * 1000)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return pad(hours) + ':' + pad(mins) + ':' + pad(secs);
}

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
    if (!lastGiftOpen) { giftTimerEl.textContent = '--:--:--'; return; }
    
    const elapsed = Date.now() - lastGiftOpen;
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    
    giftTimerEl.textContent = formatTimeRemaining(remaining);
    if (remaining <= 0 && giftInterval) { 
        clearInterval(giftInterval); 
        giftInterval = null; 
    }
}

function openGift(boxNumber) {
    if (lastGiftOpen) {
        const elapsed = Date.now() - lastGiftOpen;
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
    
    lastGiftOpen = Date.now();
    syncToDatabase();
    
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
    
    const today = new Date().toDateString();
    
    if (lastChallengeDate === today) {
        dailyInput.disabled = true;
        dailySubmit.disabled = true;
        if (challengeCorrect) {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (درست)';
            dailyResult.className = 'challenge-result success';
        } else {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (نادرست)';
            dailyResult.className = 'challenge-result fail';
        }
    }
    
    function updateDailyTimer() {
        const now = Date.now();
        const midnight = getIranMidnight();
        const diff = midnight - now;
        timerEl.textContent = formatTimeRemaining(diff);
    }
    
    updateDailyTimer();
    if (dailyChallengeInterval) clearInterval(dailyChallengeInterval);
    dailyChallengeInterval = setInterval(updateDailyTimer, 1000);
    
    dailySubmit.addEventListener('click', () => {
        if (dailyInput.disabled) return;
        const answer = dailyInput.value.trim();
        if (!answer) { dailyResult.textContent = 'لطفاً پاسخ را وارد کنید.'; dailyResult.className = 'challenge-result'; return; }
        const isCorrect = (answer === todayQuestion.answer);
        
        lastChallengeDate = today;
        challengeCorrect = isCorrect;
        syncToDatabase();

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
    });
    dailyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') dailySubmit.click(); });
}

function checkOnlineStatus() {
    const overlay = document.getElementById('offline-overlay');
    if (!overlay) return;
    
    if (!navigator.onLine) {
        overlay.classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    } else {
        overlay.classList.remove('active');
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu && !document.querySelector('.screen.active')) {
            mainMenu.classList.add('active');
        }
    }
}

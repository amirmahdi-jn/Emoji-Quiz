let rpsGame = null;
let rpsSubscription = null;
let rpsTimerInterval = null;
let rpsEnteringGame = false;
let rpsLocalRoundStart = 0;
let rpsTimeoutFired = false;
let rpsRewarded = false;
let rpsShowingReveal = false;

const RPS_CHOICES = ['rock', 'paper', 'scissors'];
const RPS_EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
const RPS_LABEL = { rock: 'سنگ', paper: 'کاغذ', scissors: 'قیچی' };
const RPS_ROUND_SECONDS = 15;
const RPS_REVEAL_MS = 2000;

async function startRpsMatchmaking() {
    rpsEnteringGame = false;

    const { data: waitingGames } = await supabaseClient
        .from('rps_games')
        .select('*')
        .eq('status', 'waiting')
        .neq('player1_name', currentName)
        .order('created_at', { ascending: true })
        .limit(1);

    if (waitingGames && waitingGames.length > 0) {
        const game = waitingGames[0];
        const { data: joined } = await supabaseClient
            .from('rps_games')
            .update({
                player2_name: currentName,
                status: 'playing',
                round_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', game.id)
            .eq('status', 'waiting')
            .select()
            .maybeSingle();

        if (joined) {
            rpsGame = joined;
            subscribeToRpsGame(joined.id);
            updateSearchText('حریف پیدا شد. در حال ورود...');
            setTimeout(() => {
                if (!rpsEnteringGame) {
                    rpsEnteringGame = true;
                    enterRpsGame();
                }
            }, 150);
            return;
        }
    }

    const { data: created } = await supabaseClient
        .from('rps_games')
        .insert({
            player1_name: currentName,
            status: 'waiting'
        })
        .select()
        .maybeSingle();

    if (created) {
        rpsGame = created;
        subscribeToRpsGame(created.id);
    }
}

function subscribeToRpsGame(gameId) {
    if (rpsSubscription) supabaseClient.removeChannel(rpsSubscription);
    rpsSubscription = supabaseClient
        .channel('rps_game_' + gameId)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rps_games',
            filter: `id=eq.${gameId}`
        }, (payload) => {
            handleRpsRealtime(payload.new);
        })
        .subscribe();
}

async function handleRpsRealtime(newGame) {
    const prevRound = rpsGame ? rpsGame.round_number : 0;
    rpsGame = newGame;

    const searchActive = document.getElementById('online-search-screen').classList.contains('active');
    const gameActive = document.getElementById('online-game-screen').classList.contains('active');

    if (newGame.status === 'playing' && searchActive && !rpsEnteringGame) {
        rpsEnteringGame = true;
        updateSearchText('حریف پیدا شد. در حال ورود...');
        setTimeout(() => {
            enterRpsGame();
        }, 150);
        return;
    }

    if (!gameActive) return;

    if (newGame.round_number !== prevRound && newGame.status === 'playing') {
        if (newGame.last_round_p1 && newGame.last_round_p2) {
            rpsShowingReveal = true;
            renderRpsGame();
            setTimeout(() => {
                rpsShowingReveal = false;
                if (rpsGame && rpsGame.round_number === newGame.round_number) {
                    rpsLocalRoundStart = Date.now();
                    rpsTimeoutFired = false;
                    startRpsTimer();
                    renderRpsGame();
                }
            }, RPS_REVEAL_MS);
        } else {
            rpsShowingReveal = false;
            rpsLocalRoundStart = Date.now();
            rpsTimeoutFired = false;
            startRpsTimer();
        }
    }

    renderRpsGame();

    if (newGame.status === 'playing' && newGame.player1_choice && newGame.player2_choice && !newGame.last_round_p1) {
        processRpsRound();
    }

    checkRpsGameEnd();
}

async function fetchRpsPlayerProfiles() {
    if (!rpsGame) return;
    const names = [rpsGame.player1_name, rpsGame.player2_name].filter(Boolean);
    if (names.length === 0) return;
    const toFetch = names.filter(n => !cachedAvatarMap[n] || cachedAvatarMap[n].custom_avatar_url === undefined);
    if (toFetch.length === 0) return;
    const { data } = await supabaseClient.from('profiles').select('name, custom_avatar_url').in('name', toFetch);
    if (data) {
        data.forEach(p => {
            if (!cachedAvatarMap[p.name]) cachedAvatarMap[p.name] = {};
            cachedAvatarMap[p.name].custom_avatar_url = p.custom_avatar_url;
        });
    }
}

async function enterRpsGame() {
    showScreen('online-game-screen');
    const titleEl = document.getElementById('game-title-name');
    if (titleEl) titleEl.innerText = 'سنگ کاغذ قیچی';
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';

    if (!rpsGame || rpsGame.status !== 'finished') {
        rpsRewarded = false;
    }

    rpsShowingReveal = false;
    if (rpsGame && rpsGame.round_started_at) {
        const dbStart = new Date(rpsGame.round_started_at).getTime();
        if (!isNaN(dbStart)) {
            rpsLocalRoundStart = dbStart;
        } else {
            rpsLocalRoundStart = Date.now();
        }
    } else {
        rpsLocalRoundStart = Date.now();
    }
    rpsTimeoutFired = false;

    renderRpsGame();

    if (rpsGame && rpsGame.status === 'playing') {
        startRpsTimer();
    }

    checkRpsGameEnd();

    fetchRpsPlayerProfiles().then(() => {
        if (rpsGame) renderRpsGame();
    });
}

function renderRpsGame() {
    const body = document.getElementById('online-game-body');
    if (!body || !rpsGame) return;

    if (!document.getElementById('rps-container')) {
        body.innerHTML = `
            <div class="rps-container" id="rps-container">
                <div class="rps-info">
                    <div class="rps-player">
                        <img class="rps-player-avatar" id="rps-my-avatar" src="${defaultAvatar}" alt="من">
                        <span class="rps-player-name">من</span>
                        <span class="rps-player-score" id="rps-my-score">0</span>
                    </div>
                    <div class="rps-status-col">
                        <div class="rps-round" id="rps-round">دور ۱</div>
                        <div class="rps-status" id="rps-status-text"></div>
                        <div class="rps-timer" id="rps-timer"></div>
                    </div>
                    <div class="rps-player">
                        <img class="rps-player-avatar" id="rps-opp-avatar" src="${defaultAvatar}" alt="حریف">
                        <span class="rps-player-name" id="rps-opp-name"></span>
                        <span class="rps-player-score" id="rps-opp-score">0</span>
                    </div>
                </div>
                <div class="rps-reveal" id="rps-reveal"></div>
                <div class="rps-choices" id="rps-choices">
                    <button class="rps-choice" data-choice="rock" onclick="pickRps('rock')">✊</button>
                    <button class="rps-choice" data-choice="paper" onclick="pickRps('paper')">✋</button>
                    <button class="rps-choice" data-choice="scissors" onclick="pickRps('scissors')">✌️</button>
                </div>
            </div>
        `;
    }

    const isPlayer1 = rpsGame.player1_name === currentName;
    const myScore = isPlayer1 ? rpsGame.player1_score : rpsGame.player2_score;
    const oppScore = isPlayer1 ? rpsGame.player2_score : rpsGame.player1_score;
    const myChoice = isPlayer1 ? rpsGame.player1_choice : rpsGame.player2_choice;
    const oppChoice = isPlayer1 ? rpsGame.player2_choice : rpsGame.player1_choice;
    const oppName = isPlayer1 ? rpsGame.player2_name : rpsGame.player1_name;

    const myScoreEl = document.getElementById('rps-my-score');
    if (myScoreEl) myScoreEl.textContent = myScore;

    const oppScoreEl = document.getElementById('rps-opp-score');
    if (oppScoreEl) oppScoreEl.textContent = oppScore;

    const roundEl = document.getElementById('rps-round');
    if (roundEl) roundEl.textContent = 'دور ' + rpsGame.round_number;

    const oppNameEl = document.getElementById('rps-opp-name');
    if (oppNameEl) oppNameEl.textContent = oppName || 'در انتظار...';

    const myAvatarEl = document.getElementById('rps-my-avatar');
    if (myAvatarEl) myAvatarEl.src = currentCustomAvatarUrl || defaultAvatar;

    const oppAvatarEl = document.getElementById('rps-opp-avatar');
    if (oppAvatarEl && oppName) {
        const oppProfile = cachedAvatarMap[oppName];
        oppAvatarEl.src = (oppProfile && oppProfile.custom_avatar_url) ? oppProfile.custom_avatar_url : defaultAvatar;
    }

    const statusEl = document.getElementById('rps-status-text');
    if (statusEl) {
        if (rpsGame.status === 'finished') {
            statusEl.textContent = 'بازی تمام شد';
        } else if (rpsGame.status === 'waiting') {
            statusEl.textContent = 'در انتظار...';
        } else if (rpsShowingReveal) {
            statusEl.textContent = 'نتیجه دور قبل';
        } else if (myChoice && !oppChoice) {
            statusEl.textContent = 'منتظر حریف...';
        } else if (!myChoice && oppChoice) {
            statusEl.textContent = 'نوبت شماست';
        } else if (myChoice && oppChoice) {
            statusEl.textContent = 'در حال پردازش...';
        } else {
            statusEl.textContent = 'انتخاب کن!';
        }
    }

    const revealEl = document.getElementById('rps-reveal');
    if (revealEl) {
        if (rpsShowingReveal && rpsGame.last_round_p1 && rpsGame.last_round_p2) {
            const myLast = isPlayer1 ? rpsGame.last_round_p1 : rpsGame.last_round_p2;
            const oppLast = isPlayer1 ? rpsGame.last_round_p2 : rpsGame.last_round_p1;
            const result = rpsGame.last_round_result;

            let resultText = '';
            let resultColor = '';
            if (result === 'draw') {
                resultText = 'مساوی';
                resultColor = '#9ca3af';
            } else if ((result === 'player1' && isPlayer1) || (result === 'player2' && !isPlayer1)) {
                resultText = 'بردی!';
                resultColor = '#22c55e';
            } else {
                resultText = 'باختی';
                resultColor = '#f87171';
            }

            revealEl.innerHTML = `
                <div class="rps-reveal-item">${RPS_EMOJI[myLast] || ''}</div>
                <div class="rps-reveal-result" style="color:${resultColor};">${resultText}</div>
                <div class="rps-reveal-item">${RPS_EMOJI[oppLast] || ''}</div>
            `;
            revealEl.style.display = 'flex';
        } else {
            revealEl.innerHTML = '';
            revealEl.style.display = 'none';
        }
    }

    const choicesEl = document.getElementById('rps-choices');
    if (choicesEl) {
        const canPick = rpsGame.status === 'playing' && !myChoice && !rpsShowingReveal;
        const buttons = choicesEl.querySelectorAll('.rps-choice');
        buttons.forEach(btn => {
            const choice = btn.dataset.choice;
            btn.classList.remove('selected', 'disabled');
            if (myChoice === choice) {
                btn.classList.add('selected');
            }
            if (!canPick) {
                btn.classList.add('disabled');
            }
        });
    }
}

async function pickRps(choice) {
    if (!rpsGame || rpsGame.status !== 'playing') return;
    if (!RPS_CHOICES.includes(choice)) return;
    if (rpsShowingReveal) return;

    const isPlayer1 = rpsGame.player1_name === currentName;
    const myChoice = isPlayer1 ? rpsGame.player1_choice : rpsGame.player2_choice;
    if (myChoice) return;

    const updateObj = {};
    updateObj[isPlayer1 ? 'player1_choice' : 'player2_choice'] = choice;
    updateObj.updated_at = new Date().toISOString();

    await supabaseClient
        .from('rps_games')
        .update(updateObj)
        .eq('id', rpsGame.id)
        .is(isPlayer1 ? 'player1_choice' : 'player2_choice', null);
}

async function processRpsRound() {
    if (!rpsGame || rpsGame.status !== 'playing') return;
    if (!rpsGame.player1_choice || !rpsGame.player2_choice) return;
    if (rpsGame.last_round_p1 && rpsGame.last_round_p2) return;

    const p1 = rpsGame.player1_choice;
    const p2 = rpsGame.player2_choice;
    const currentRound = rpsGame.round_number;

    let roundResult;
    if (p1 === p2) {
        roundResult = 'draw';
    } else if (
        (p1 === 'rock' && p2 === 'scissors') ||
        (p1 === 'paper' && p2 === 'rock') ||
        (p1 === 'scissors' && p2 === 'paper')
    ) {
        roundResult = 'player1';
    } else {
        roundResult = 'player2';
    }

    const newP1Score = rpsGame.player1_score + (roundResult === 'player1' ? 1 : 0);
    const newP2Score = rpsGame.player2_score + (roundResult === 'player2' ? 1 : 0);
    let newStatus = 'playing';
    let finalResult = null;

    if (newP1Score >= 2) {
        newStatus = 'finished';
        finalResult = 'player1_win';
    } else if (newP2Score >= 2) {
        newStatus = 'finished';
        finalResult = 'player2_win';
    }

    await supabaseClient
        .from('rps_games')
        .update({
            player1_score: newP1Score,
            player2_score: newP2Score,
            round_number: currentRound + 1,
            player1_choice: null,
            player2_choice: null,
            last_round_p1: p1,
            last_round_p2: p2,
            last_round_result: roundResult,
            status: newStatus,
            result: finalResult,
            round_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', rpsGame.id)
        .eq('round_number', currentRound);
}

function startRpsTimer() {
    if (rpsTimerInterval) clearInterval(rpsTimerInterval);
    rpsTimerInterval = setInterval(() => {
        if (!rpsGame || rpsGame.status !== 'playing') {
            const timerEl = document.getElementById('rps-timer');
            if (timerEl) timerEl.textContent = '';
            return;
        }

        if (rpsShowingReveal) {
            const timerEl = document.getElementById('rps-timer');
            if (timerEl) { timerEl.textContent = ''; timerEl.classList.remove('urgent'); }
            return;
        }

        const isPlayer1 = rpsGame.player1_name === currentName;
        const myChoice = isPlayer1 ? rpsGame.player1_choice : rpsGame.player2_choice;

        if (myChoice) {
            const timerEl = document.getElementById('rps-timer');
            if (timerEl) { timerEl.textContent = '✓'; timerEl.classList.remove('urgent'); }
            return;
        }

        const elapsed = Math.max(0, Math.floor((Date.now() - rpsLocalRoundStart) / 1000));
        const remaining = RPS_ROUND_SECONDS - elapsed;
        const timerEl = document.getElementById('rps-timer');

        if (timerEl) {
            if (remaining > 0) {
                timerEl.textContent = remaining + 's';
                if (remaining <= 5) timerEl.classList.add('urgent');
                else timerEl.classList.remove('urgent');
            } else {
                timerEl.textContent = '0s';
                timerEl.classList.add('urgent');
                if (!rpsTimeoutFired) {
                    rpsTimeoutFired = true;
                    handleRpsTimeout();
                }
            }
        }
    }, 500);
}

async function handleRpsTimeout() {
    if (!rpsGame || rpsGame.status !== 'playing') return;
    if (rpsShowingReveal) return;

    const isPlayer1 = rpsGame.player1_name === currentName;
    const myChoice = isPlayer1 ? rpsGame.player1_choice : rpsGame.player2_choice;
    if (myChoice) return;

    const randomChoice = RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)];
    const updateObj = {};
    updateObj[isPlayer1 ? 'player1_choice' : 'player2_choice'] = randomChoice;
    updateObj.updated_at = new Date().toISOString();

    await supabaseClient
        .from('rps_games')
        .update(updateObj)
        .eq('id', rpsGame.id)
        .is(isPlayer1 ? 'player1_choice' : 'player2_choice', null);
}

function checkRpsGameEnd() {
    if (!rpsGame) return;
    if (rpsGame.status !== 'finished') return;
    if (document.getElementById('rps-result-overlay')) return;

    const isPlayer1 = rpsGame.player1_name === currentName;
    const leftPlayer1 = rpsGame.result === 'player1_left';
    const isLeftResult = rpsGame.result === 'player1_left' || rpsGame.result === 'player2_left';

    let iWon, iLeft;
    if (isLeftResult) {
        iLeft = (leftPlayer1 && isPlayer1) || (!leftPlayer1 && !isPlayer1);
        iWon = !iLeft;
    } else {
        iLeft = false;
        iWon = (rpsGame.result === 'player1_win' && isPlayer1) || (rpsGame.result === 'player2_win' && !isPlayer1);
    }

    let titleHTML = '';
    let titleColor = '';
    let bodyHTML = '';

    if (iWon) {
        titleHTML = iLeft ? 'حریف رفت، بردی! 🎉' : 'بردی! 😃';
        titleColor = '#22c55e';
        bodyHTML = `
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">+10</span>
                <span class="ttt-achievement-icon">${TTT_TROPHY_ICON}</span>
            </div>
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">+50</span>
                <span class="ttt-achievement-icon">${TTT_COIN_ICON}</span>
            </div>
        `;
        if (!rpsRewarded) {
            rpsRewarded = true;
            currentTrophies += 10;
            currentCoins += 50;
            updateCoinsUI();
            syncToDatabase();
        }
    } else {
        titleHTML = 'باختی! ☹️';
        titleColor = '#f87171';
        bodyHTML = `
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">-5</span>
                <span class="ttt-achievement-icon">${TTT_TROPHY_ICON}</span>
            </div>
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">-25</span>
                <span class="ttt-achievement-icon">${TTT_COIN_ICON}</span>
            </div>
        `;
        if (!rpsRewarded) {
            rpsRewarded = true;
            currentTrophies = Math.max(0, currentTrophies - 5);
            currentCoins = Math.max(0, currentCoins - 25);
            updateCoinsUI();
            syncToDatabase();
        }
    }

    if (rpsTimerInterval) clearInterval(rpsTimerInterval);

    const overlay = document.createElement('div');
    overlay.className = 'ttt-result-overlay';
    overlay.id = 'rps-result-overlay';
    overlay.innerHTML = `
        <div class="ttt-result-content">
            <div class="ttt-result-title" style="color:${titleColor};">${titleHTML}</div>
            ${bodyHTML}
            <div class="ttt-result-buttons">
                <button class="ttt-result-btn secondary" onclick="exitRpsGame()">خروج</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function exitRpsGame() {
    const overlay = document.getElementById('rps-result-overlay');
    if (overlay) overlay.remove();
    if (rpsTimerInterval) { clearInterval(rpsTimerInterval); rpsTimerInterval = null; }
    if (rpsSubscription) { supabaseClient.removeChannel(rpsSubscription); rpsSubscription = null; }
    rpsGame = null;
    rpsEnteringGame = false;
    rpsTimeoutFired = false;
    rpsRewarded = false;
    rpsShowingReveal = false;
    showScreen('two-player-screen');
}

function confirmLeaveGameRps() {
    if (!rpsGame || rpsGame.status !== 'playing') {
        leaveOnlineGameRps();
        return;
    }
    if (tttLeaveConfirmOpen) return;
    tttLeaveConfirmOpen = true;
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.add('blurred');
    const modal = document.getElementById('leave-game-modal');
    if (modal) modal.classList.add('active');
}

async function confirmLeaveGameYesRps() {
    closeLeaveGameModal();
    if (rpsGame && rpsGame.status === 'playing') {
        const isPlayer1 = rpsGame.player1_name === currentName;
        const result = isPlayer1 ? 'player1_left' : 'player2_left';
        await supabaseClient.from('rps_games').update({
            status: 'finished',
            result: result,
            updated_at: new Date().toISOString()
        }).eq('id', rpsGame.id);
        rpsRewarded = true;
        currentTrophies = Math.max(0, currentTrophies - 5);
        currentCoins = Math.max(0, currentCoins - 25);
        updateCoinsUI();
        syncToDatabase();
    }
    leaveOnlineGameRps();
}

function leaveOnlineGameRps() {
    if (rpsSubscription) { supabaseClient.removeChannel(rpsSubscription); rpsSubscription = null; }
    if (rpsTimerInterval) { clearInterval(rpsTimerInterval); rpsTimerInterval = null; }
    const overlay = document.getElementById('rps-result-overlay');
    if (overlay) overlay.remove();
    const modal = document.getElementById('leave-game-modal');
    if (modal) modal.classList.remove('active');
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.remove('blurred');
    tttLeaveConfirmOpen = false;
    rpsGame = null;
    rpsEnteringGame = false;
    rpsTimeoutFired = false;
    rpsRewarded = false;
    rpsShowingReveal = false;
    showScreen('two-player-screen');
}

function cancelOnlineSearchRps() {
    if (rpsSubscription) { supabaseClient.removeChannel(rpsSubscription); rpsSubscription = null; }
    if (rpsGame && rpsGame.status === 'waiting' && rpsGame.player1_name === currentName) {
        supabaseClient.from('rps_games').delete().eq('id', rpsGame.id).then();
        currentCoins += 25;
        updateCoinsUI();
        syncToDatabase();
    }
    rpsGame = null;
    rpsEnteringGame = false;
    showScreen('two-player-screen');
}

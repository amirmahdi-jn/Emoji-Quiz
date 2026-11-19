let tttGame = null;
let tttSubscription = null;
let tttTimerInterval = null;
let tttEnteringGame = false;
let tttLocalTurnStart = 0;
let tttTimeoutFired = false;
let tttLeaveConfirmOpen = false;
let tttRewarded = false;
let tttMovePending = false;
let tttSearchInterval = null;
let tttSearching = false;
let tttEntryPaid = false;

const TTT_TROPHY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const TTT_COIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`;

function clearTTTSearchInterval() {
    if (tttSearchInterval) { clearInterval(tttSearchInterval); tttSearchInterval = null; }
}

function tttPayEntry() {
    if (tttEntryPaid) return true;
    if (currentCoins < 25) return false;
    currentCoins -= 25;
    tttEntryPaid = true;
    updateAllStatsUI();
    syncToDatabase();
    return true;
}

function tttRefundEntry() {
    if (!tttEntryPaid) return;
    currentCoins += 25;
    tttEntryPaid = false;
    updateAllStatsUI();
    syncToDatabase();
}

async function tttCleanupWaitingGame() {
    if (!tttGame) return;
    if (tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
        await supabaseClient.from('ttt_games').delete().eq('id', tttGame.id);
    }
}

async function startTTTMatchmaking() {
    if (tttSearching) return;
    tttSearching = true;
    tttEnteringGame = false;
    clearTTTSearchInterval();

    try {
        const { data: waitingGames } = await supabaseClient
            .from('ttt_games')
            .select('*')
            .eq('status', 'waiting')
            .neq('player1_name', currentName)
            .order('created_at', { ascending: true })
            .limit(1);

        if (waitingGames && waitingGames.length > 0) {
            const game = waitingGames[0];
            const mySymbol = game.player1_symbol === 'X' ? 'O' : 'X';
            const now = new Date().toISOString();
            const { data } = await supabaseClient
                .from('ttt_games')
                .update({
                    player2_name: currentName,
                    player2_symbol: mySymbol,
                    status: 'playing',
                    current_turn: game.player1_name,
                    updated_at: now
                })
                .eq('id', game.id)
                .eq('status', 'waiting')
                .select()
                .maybeSingle();

            if (data) {
                tttGame = data;
                subscribeToTTTGame(data.id);
                updateSearchText('حریف پیدا شد. در حال ورود به بازی...');
                tttSearching = false;
                if (!tttEnteringGame) {
                    tttEnteringGame = true;
                    enterTTTGame();
                }
                return;
            }
        }

        const mySymbol = Math.random() < 0.5 ? 'X' : 'O';
        const { data: created, error } = await supabaseClient
            .from('ttt_games')
            .insert({
                player1_name: currentName,
                player1_symbol: mySymbol,
                player2_symbol: mySymbol === 'X' ? 'O' : 'X',
                current_turn: currentName,
                status: 'waiting',
                board: ["","","","","","","","",""]
            })
            .select()
            .maybeSingle();

        if (!created || error) {
            tttSearching = false;
            tttRefundEntry();
            updateSearchText('خطا در ساخت بازی. سکه برگشت داده شد.');
            return;
        }

        tttGame = created;
        subscribeToTTTGame(created.id);

        tttSearchInterval = setInterval(async () => {
            if (!tttGame || tttGame.status !== 'waiting') { clearTTTSearchInterval(); return; }
            const { data: check } = await supabaseClient
                .from('ttt_games')
                .select('*')
                .eq('id', tttGame.id)
                .maybeSingle();
            if (check && check.status === 'playing' && check.player2_name) {
                clearTTTSearchInterval();
                tttGame = check;
                tttSearching = false;
                if (!tttEnteringGame && document.getElementById('online-search-screen').classList.contains('active')) {
                    tttEnteringGame = true;
                    updateSearchText('حریف پیدا شد. در حال ورود به بازی...');
                    enterTTTGame();
                }
            }
        }, 2000);
    } catch (e) {
        tttSearching = false;
        tttRefundEntry();
        updateSearchText('خطا در اتصال. دوباره تلاش کنید.');
    }
}

function subscribeToTTTGame(gameId) {
    if (tttSubscription) supabaseClient.removeChannel(tttSubscription);
    tttSubscription = supabaseClient
        .channel('ttt_game_' + gameId)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'ttt_games',
            filter: `id=eq.${gameId}`
        }, (payload) => {
            if (!payload.new) return;
            tttGame = payload.new;

            const searchActive = document.getElementById('online-search-screen').classList.contains('active');
            const gameActive = document.getElementById('online-game-screen').classList.contains('active');

            if (tttGame.status === 'playing' && searchActive && !tttEnteringGame) {
                clearTTTSearchInterval();
                tttSearching = false;
                tttEnteringGame = true;
                updateSearchText('حریف پیدا شد. در حال ورود به بازی...');
                enterTTTGame();
            } else if (gameActive) {
                tttMovePending = false;
                if (tttGame.status === 'playing') {
                    resetTTTTimer();
                    startTTTTimer();
                }
                renderTTTGame();
                checkTTTGameEnd();
            }
        })
        .subscribe();
}

async function fetchTTTPlayerProfiles() {
    if (!tttGame) return;
    const names = [tttGame.player1_name, tttGame.player2_name].filter(Boolean);
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

function enterTTTGame() {
    clearTTTSearchInterval();
    showScreen('online-game-screen');
    const titleEl = document.getElementById('game-title-name');
    if (titleEl) titleEl.innerText = 'دوز';
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    tttRewarded = false;
    tttMovePending = false;
    resetTTTTimer();
    if (tttGame && tttGame.status === 'playing') startTTTTimer();
    fetchTTTPlayerProfiles().then(() => {
        if (tttGame) renderTTTGame();
        checkTTTGameEnd();
    });
}

function renderTTTGame() {
    const body = document.getElementById('online-game-body');
    if (!body || !tttGame) return;

    if (!document.getElementById('ttt-board')) {
        body.innerHTML = `
            <div class="ttt-container">
                <div class="ttt-info">
                    <div class="ttt-player">
                        <img class="ttt-player-avatar" id="ttt-my-avatar" src="${defaultAvatar}" alt="من">
                        <span class="ttt-player-name">من</span>
                        <span class="ttt-player-symbol" id="ttt-my-symbol"></span>
                    </div>
                    <div class="ttt-status-col">
                        <div class="ttt-status" id="ttt-status-text"></div>
                        <div class="ttt-timer" id="ttt-timer"></div>
                    </div>
                    <div class="ttt-player">
                        <img class="ttt-player-avatar" id="ttt-opp-avatar" src="${defaultAvatar}" alt="حریف">
                        <span class="ttt-player-name" id="ttt-opp-name"></span>
                        <span class="ttt-player-symbol" id="ttt-opp-symbol"></span>
                    </div>
                </div>
                <div class="ttt-board" id="ttt-board"></div>
            </div>
        `;
    }

    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    const oppSymbol = isPlayer1 ? tttGame.player2_symbol : tttGame.player1_symbol;
    const oppName = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    const isMyTurn = tttGame.current_turn === currentName;

    const mySymEl = document.getElementById('ttt-my-symbol');
    if (mySymEl) { mySymEl.textContent = mySymbol; mySymEl.className = 'ttt-player-symbol ' + mySymbol.toLowerCase(); }

    const oppSymEl = document.getElementById('ttt-opp-symbol');
    if (oppSymEl) { oppSymEl.textContent = oppSymbol; oppSymEl.className = 'ttt-player-symbol ' + oppSymbol.toLowerCase(); }

    const oppNameEl = document.getElementById('ttt-opp-name');
    if (oppNameEl) oppNameEl.textContent = oppName || 'در انتظار...';

    const myAvatarEl = document.getElementById('ttt-my-avatar');
    if (myAvatarEl) myAvatarEl.src = currentCustomAvatarUrl || defaultAvatar;

    const oppAvatarEl = document.getElementById('ttt-opp-avatar');
    if (oppAvatarEl && oppName) {
        const oppProfile = cachedAvatarMap[oppName];
        oppAvatarEl.src = (oppProfile && oppProfile.custom_avatar_url) ? oppProfile.custom_avatar_url : defaultAvatar;
    }

    const statusEl = document.getElementById('ttt-status-text');
    if (statusEl) {
        if (tttGame.status === 'finished') {
            statusEl.textContent = 'بازی تمام شد';
        } else if (tttGame.status === 'waiting') {
            statusEl.textContent = 'در انتظار...';
        } else {
            statusEl.textContent = isMyTurn ? 'نوبت شماست' : 'نوبت حریف';
        }
    }

    renderTTTBoard();
}

function renderTTTBoard() {
    const boardEl = document.getElementById('ttt-board');
    if (!boardEl || !tttGame) return;

    const board = tttGame.board || ["","","","","","","","",""];
    const isMyTurn = tttGame.current_turn === currentName && tttGame.status === 'playing' && !tttMovePending;
    const winningCells = getTTTWinningCells(board);

    boardEl.innerHTML = '';
    board.forEach((cell, idx) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'ttt-cell';
        if (cell === 'X') cellEl.classList.add('x', 'filled');
        else if (cell === 'O') cellEl.classList.add('o', 'filled');
        if (winningCells.includes(idx)) cellEl.classList.add('winning');
        cellEl.textContent = cell;
        if (isMyTurn && !cell && !winningCells.length && tttGame.status === 'playing') {
            cellEl.onclick = () => makeTTTMove(idx);
        }
        boardEl.appendChild(cellEl);
    });
}

function getTTTWinningCells(board) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return line;
        }
    }
    return [];
}

function getTTTResult() {
    if (!tttGame) return null;
    const board = tttGame.board || [];
    const winningCells = getTTTWinningCells(board);
    if (winningCells.length) {
        const winnerSym = board[winningCells[0]];
        const player1Won = tttGame.player1_symbol === winnerSym;
        return player1Won ? 'player1_win' : 'player2_win';
    }
    if (board.length === 9 && board.every(c => c)) {
        return 'draw';
    }
    return null;
}

async function makeTTTMove(index) {
    if (!tttGame || tttGame.status !== 'playing') return;
    if (tttGame.current_turn !== currentName) return;
    if (tttMovePending) return;
    const board = [...(tttGame.board || ["","","","","","","","",""])];
    if (board[index]) return;

    tttMovePending = true;

    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    board[index] = mySymbol;

    const winningCells = getTTTWinningCells(board);
    const isDraw = board.every(c => c);
    let newStatus = 'playing';
    let nextTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    let result = null;

    if (winningCells.length) {
        newStatus = 'finished';
        result = isPlayer1 ? 'player1_win' : 'player2_win';
    } else if (isDraw) {
        newStatus = 'finished';
        result = 'draw';
    }

    const updateData = {
        board: board,
        current_turn: nextTurn,
        status: newStatus,
        updated_at: new Date().toISOString()
    };
    if (result) updateData.result = result;

    const { data, error } = await supabaseClient
        .from('ttt_games')
        .update(updateData)
        .eq('id', tttGame.id)
        .eq('current_turn', currentName)
        .eq('status', 'playing')
        .select()
        .maybeSingle();

    if (error || !data) {
        tttMovePending = false;
        return;
    }

    tttGame = data;
    resetTTTTimer();
    if (tttGame.status === 'playing') startTTTTimer();
    renderTTTGame();
    checkTTTGameEnd();
}

function resetTTTTimer() {
    tttLocalTurnStart = Date.now();
    tttTimeoutFired = false;
}

function startTTTTimer() {
    if (tttTimerInterval) clearInterval(tttTimerInterval);
    tttTimerInterval = setInterval(() => {
        if (!tttGame || tttGame.status !== 'playing') {
            const timerEl = document.getElementById('ttt-timer');
            if (timerEl) timerEl.textContent = '';
            return;
        }
        const elapsed = Math.floor((Date.now() - tttLocalTurnStart) / 1000);
        const remaining = 30 - elapsed;
        const timerEl = document.getElementById('ttt-timer');
        if (timerEl) {
            if (remaining > 0) {
                timerEl.textContent = remaining + 's';
                if (remaining <= 10) timerEl.classList.add('urgent');
                else timerEl.classList.remove('urgent');
            } else {
                timerEl.textContent = '0s';
                timerEl.classList.add('urgent');
                if (!tttTimeoutFired && tttGame.current_turn === currentName) {
                    tttTimeoutFired = true;
                    handleTTTTimeout();
                }
            }
        }
    }, 500);
}

async function handleTTTTimeout() {
    if (!tttGame || tttGame.status !== 'playing') return;
    if (tttGame.current_turn !== currentName) return;
    if (tttMovePending) return;

    tttMovePending = true;

    const board = [...(tttGame.board || ["","","","","","","","",""])];
    const emptyCells = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
    if (emptyCells.length === 0) { tttMovePending = false; return; }
    const randomIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    board[randomIdx] = mySymbol;

    const winningCells = getTTTWinningCells(board);
    const isDraw = board.every(c => c);
    let newStatus = 'playing';
    let nextTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    let result = null;

    if (winningCells.length) {
        newStatus = 'finished';
        result = isPlayer1 ? 'player1_win' : 'player2_win';
    } else if (isDraw) {
        newStatus = 'finished';
        result = 'draw';
    }

    const updateData = {
        board: board,
        current_turn: nextTurn,
        status: newStatus,
        updated_at: new Date().toISOString()
    };
    if (result) updateData.result = result;

    const { data, error } = await supabaseClient
        .from('ttt_games')
        .update(updateData)
        .eq('id', tttGame.id)
        .eq('current_turn', currentName)
        .eq('status', 'playing')
        .select()
        .maybeSingle();

    if (error || !data) {
        tttMovePending = false;
        return;
    }

    tttGame = data;
    resetTTTTimer();
    if (tttGame.status === 'playing') startTTTTimer();
    renderTTTGame();
    checkTTTGameEnd();
}

function checkTTTGameEnd() {
    if (!tttGame) return;
    if (tttGame.status !== 'finished') return;
    if (document.getElementById('ttt-result-overlay')) return;

    const result = tttGame.result || getTTTResult();
    if (!result) return;

    const isPlayer1 = tttGame.player1_name === currentName;
    const leftPlayer1 = result === 'player1_left';
    const isLeftResult = result === 'player1_left' || result === 'player2_left';

    let iWon, iLeft;
    if (isLeftResult) {
        iLeft = (leftPlayer1 && isPlayer1) || (!leftPlayer1 && !isPlayer1);
        iWon = !iLeft;
    } else {
        iLeft = false;
        iWon = (result === 'player1_win' && isPlayer1) || (result === 'player2_win' && !isPlayer1);
    }

    let titleHTML = '';
    let titleColor = '';
    let bodyHTML = '';

    if (result === 'draw') {
        titleHTML = 'مساوی! 🤝';
        titleColor = '#9ca3af';
        bodyHTML = `
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">+25</span>
                <span class="ttt-achievement-icon">${TTT_COIN_ICON}</span>
            </div>
        `;
        if (!tttRewarded) {
            tttRewarded = true;
            currentCoins += 25;
            updateAllStatsUI();
            syncToDatabase();
        }
    } else if (iWon) {
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
        if (!tttRewarded) {
            tttRewarded = true;
            currentTrophies += 10;
            currentCoins += 50;
            updateAllStatsUI();
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
        if (!tttRewarded) {
            tttRewarded = true;
            currentTrophies = Math.max(0, currentTrophies - 5);
            currentCoins = Math.max(0, currentCoins - 25);
            updateAllStatsUI();
            syncToDatabase();
        }
    }

    if (tttTimerInterval) clearInterval(tttTimerInterval);

    const overlay = document.createElement('div');
    overlay.className = 'ttt-result-overlay';
    overlay.id = 'ttt-result-overlay';
    overlay.innerHTML = `
        <div class="ttt-result-content">
            <div class="ttt-result-title" style="color:${titleColor};">${titleHTML}</div>
            ${bodyHTML}
            <div class="ttt-result-buttons">
                <button class="ttt-result-btn secondary" onclick="exitTTTGame()">خروج</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function exitTTTGame() {
    const overlay = document.getElementById('ttt-result-overlay');
    if (overlay) overlay.remove();
    if (tttTimerInterval) { clearInterval(tttTimerInterval); tttTimerInterval = null; }
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    clearTTTSearchInterval();
    tttGame = null;
    tttEnteringGame = false;
    tttTimeoutFired = false;
    tttRewarded = false;
    tttMovePending = false;
    tttSearching = false;
    tttEntryPaid = false;
    showScreen('two-player-screen');
}

function confirmLeaveGame() {
    if (!tttGame || tttGame.status !== 'playing') {
        leaveOnlineGame();
        return;
    }
    if (tttLeaveConfirmOpen) return;
    tttLeaveConfirmOpen = true;
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.add('blurred');
    const modal = document.getElementById('leave-game-modal');
    if (modal) modal.classList.add('active');
}

function closeLeaveGameModal() {
    tttLeaveConfirmOpen = false;
    const modal = document.getElementById('leave-game-modal');
    if (modal) modal.classList.remove('active');
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.remove('blurred');
}

async function confirmLeaveGameYes() {
    closeLeaveGameModal();
    if (tttGame && tttGame.status === 'playing') {
        const isPlayer1 = tttGame.player1_name === currentName;
        const result = isPlayer1 ? 'player1_left' : 'player2_left';
        const nextTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
        const updateData = {
            status: 'finished',
            result: result,
            current_turn: nextTurn,
            updated_at: new Date().toISOString()
        };
        await supabaseClient.from('ttt_games').update(updateData).eq('id', tttGame.id);
        tttRewarded = true;
        currentTrophies = Math.max(0, currentTrophies - 5);
        currentCoins = Math.max(0, currentCoins - 25);
        updateAllStatsUI();
        syncToDatabase();
    }
    leaveOnlineGame();
}

async function leaveOnlineGame() {
    await tttCleanupWaitingGame();
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    if (tttTimerInterval) { clearInterval(tttTimerInterval); tttTimerInterval = null; }
    clearTTTSearchInterval();
    const overlay = document.getElementById('ttt-result-overlay');
    if (overlay) overlay.remove();
    const modal = document.getElementById('leave-game-modal');
    if (modal) modal.classList.remove('active');
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) activeScreen.classList.remove('blurred');
    tttLeaveConfirmOpen = false;
    tttGame = null;
    tttEnteringGame = false;
    tttTimeoutFired = false;
    tttRewarded = false;
    tttMovePending = false;
    tttSearching = false;
    tttEntryPaid = false;
    showScreen('two-player-screen');
}

function updateSearchText(text) {
    const el = document.getElementById('search-status-text');
    if (el) el.textContent = text;
}

function openOnlineGame(gameType) {
    if (gameType !== 'tictactoe') return;
    if (currentName === 'Guest' || currentName.startsWith('Guest.')) {
        showGuestModal('برای ورود به این بخش، ابتدا باید نام بگذارید.');
        return;
    }
    if (currentCoins < 25) {
        openModal('no-coin-modal');
        return;
    }
    if (!tttPayEntry()) {
        openModal('no-coin-modal');
        return;
    }
    const nameEl = document.getElementById('search-game-name');
    if (nameEl) nameEl.innerText = 'دوز';
    updateSearchText('منتظر پیوستن حریف...');
    showScreen('online-search-screen');
    startTTTMatchmaking();
}

async function cancelOnlineSearch() {
    clearTTTSearchInterval();
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    await tttCleanupWaitingGame();
    tttRefundEntry();
    tttGame = null;
    tttEnteringGame = false;
    tttMovePending = false;
    tttSearching = false;
    showScreen('two-player-screen');
        }

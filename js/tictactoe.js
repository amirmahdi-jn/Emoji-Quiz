let tttGame = null;
let tttSubscription = null;
let tttTimerInterval = null;
let tttEnteringGame = false;
let tttLocalTurnStart = 0;
let tttTimeoutFired = false;

const TTT_TROPHY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const TTT_DIAMOND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3 8 9l4 13 4-13-2.5-6"/><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/><path d="M2 9h20"/></svg>`;

async function startTTTMatchmaking() {
    tttEnteringGame = false;

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
        const { data: joined } = await supabaseClient
            .from('ttt_games')
            .update({
                player2_name: currentName,
                player2_symbol: mySymbol,
                status: 'playing',
                updated_at: now
            })
            .eq('id', game.id)
            .eq('status', 'waiting')
            .select()
            .maybeSingle();

        if (joined) {
            tttGame = joined;
            subscribeToTTTGame(joined.id);
            updateSearchText('حریف پیدا شد. در حال ورود به بازی...');
            setTimeout(() => {
                if (!tttEnteringGame) {
                    tttEnteringGame = true;
                    enterTTTGame();
                }
            }, 500);
            return;
        }
    }

    const mySymbol = Math.random() < 0.5 ? 'X' : 'O';
    const { data: created } = await supabaseClient
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

    if (created) {
        tttGame = created;
        subscribeToTTTGame(created.id);
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
            tttGame = payload.new;
            const searchActive = document.getElementById('online-search-screen').classList.contains('active');
            const gameActive = document.getElementById('online-game-screen').classList.contains('active');

            if (tttGame.status === 'playing' && searchActive && !tttEnteringGame) {
                tttEnteringGame = true;
                updateSearchText('حریف پیدا شد. در حال ورود به بازی...');
                setTimeout(() => {
                    enterTTTGame();
                }, 500);
            } else if (gameActive) {
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
    const { data } = await supabaseClient.from('profiles').select('name, custom_avatar_url').in('name', names);
    if (data) {
        data.forEach(p => {
            if (!cachedAvatarMap[p.name]) cachedAvatarMap[p.name] = {};
            cachedAvatarMap[p.name].custom_avatar_url = p.custom_avatar_url;
        });
    }
}

async function enterTTTGame() {
    showScreen('online-game-screen');
    const titleEl = document.getElementById('game-title-name');
    if (titleEl) titleEl.innerText = 'دوز';
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    await fetchTTTPlayerProfiles();
    renderTTTGame();
    if (tttGame && tttGame.status === 'playing') {
        resetTTTTimer();
        startTTTTimer();
    }
    checkTTTGameEnd();
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
    const isMyTurn = tttGame.current_turn === currentName && tttGame.status === 'playing';
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
    const board = [...(tttGame.board || ["","","","","","","","",""])];
    if (board[index]) return;

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

    const { error } = await supabaseClient
        .from('ttt_games')
        .update(updateData)
        .eq('id', tttGame.id);

    if (error && result) {
        delete updateData.result;
        await supabaseClient.from('ttt_games').update(updateData).eq('id', tttGame.id);
    }
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
    }, 250);
}

async function handleTTTTimeout() {
    if (!tttGame || tttGame.status !== 'playing') return;
    if (tttGame.current_turn !== currentName) return;

    const board = [...(tttGame.board || ["","","","","","","","",""])];
    const emptyCells = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
    if (emptyCells.length === 0) return;
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

    const { error } = await supabaseClient
        .from('ttt_games')
        .update(updateData)
        .eq('id', tttGame.id);

    if (error && result) {
        delete updateData.result;
        await supabaseClient.from('ttt_games').update(updateData).eq('id', tttGame.id);
    }
}

function checkTTTGameEnd() {
    if (!tttGame) return;
    if (tttGame.status !== 'finished') return;
    if (document.getElementById('ttt-result-overlay')) return;

    const result = tttGame.result || getTTTResult();
    if (!result) return;

    const isPlayer1 = tttGame.player1_name === currentName;
    const oppName = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;

    let titleHTML = '';
    let titleColor = '';
    let trophyHTML = '';

    if (result === 'draw') {
        titleHTML = 'مساوی! 😐';
        titleColor = '#9ca3af';
    } else {
        const iWon = (result === 'player1_win' && isPlayer1) || (result === 'player2_win' && !isPlayer1);
        if (iWon) {
            titleHTML = 'بردی! 🏆';
            titleColor = '#22c55e';
            trophyHTML = `
                <div class="ttt-achievements-title">دستاورد</div>
                <div class="ttt-achievement-row">
                    <span class="ttt-achievement-num">+1</span>
                    <span class="ttt-achievement-icon">${TTT_TROPHY_ICON}</span>
                </div>
                <div class="ttt-achievement-row">
                    <span class="ttt-achievement-num">+25</span>
                    <span class="ttt-achievement-icon">${TTT_DIAMOND_ICON}</span>
                </div>
            `;
        } else {
            titleHTML = 'باختی! 😢';
            titleColor = '#f87171';
        }
    }

    if (result !== 'draw') {
        const iWon = (result === 'player1_win' && isPlayer1) || (result === 'player2_win' && !isPlayer1);
        if (iWon) {
            currentDiamonds += 25;
            updateCoinsUI();
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
            ${trophyHTML}
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
    tttGame = null;
    tttEnteringGame = false;
    tttTimeoutFired = false;
    showScreen('two-player-screen');
}

function leaveOnlineGame() {
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    if (tttTimerInterval) { clearInterval(tttTimerInterval); tttTimerInterval = null; }
    const overlay = document.getElementById('ttt-result-overlay');
    if (overlay) overlay.remove();
    tttGame = null;
    tttEnteringGame = false;
    tttTimeoutFired = false;
    showScreen('two-player-screen');
}

function updateSearchText(text) {
    const el = document.getElementById('search-status-text');
    if (el) el.textContent = text;
}

function openOnlineGame(gameType) {
    if (gameType !== 'tictactoe') return;
    if (currentCoins < 25) {
        openModal('no-coin-modal');
        return;
    }
    currentCoins -= 25;
    updateCoinsUI();
    syncToDatabase();
    const nameEl = document.getElementById('search-game-name');
    if (nameEl) nameEl.innerText = 'دوز';
    updateSearchText('منتظر پیوستن حریف...');
    showScreen('online-search-screen');
    startTTTMatchmaking();
}

function cancelOnlineSearch() {
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    if (tttGame && tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
        supabaseClient.from('ttt_games').delete().eq('id', tttGame.id).then();
    }
    tttGame = null;
    tttEnteringGame = false;
    showScreen('two-player-screen');
}

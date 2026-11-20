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
    });
    
    if (tttGame) {
        renderTTTGame();
        checkTTTGameEnd();
    }
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

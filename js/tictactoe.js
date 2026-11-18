let tttGame = null;
let tttSubscription = null;
let tttTimerInterval = null;
let tttEnteringGame = false;

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
                turn_started_at: now,
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
    const now = new Date().toISOString();
    const { data: created } = await supabaseClient
        .from('ttt_games')
        .insert({
            player1_name: currentName,
            player1_symbol: mySymbol,
            player2_symbol: mySymbol === 'X' ? 'O' : 'X',
            current_turn: currentName,
            status: 'waiting',
            board: ["","","","","","","","",""],
            turn_started_at: now
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
                renderTTTGame();
                checkTTTGameEnd();
                if (tttGame.status === 'playing' && !tttTimerInterval) {
                    startTTTTimer();
                }
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
    updateTTTTimerDisplay();
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
        cellEl.className = 'ttt-cell' + (cell ? ' filled ' + cell.toLowerCase() : '');
        if (winningCells.includes(idx)) cellEl.classList.add('winning');
        cellEl.textContent = cell || '';
        if (!cell && isMyTurn) {
            cellEl.onclick = () => handleTTTCellClick(idx);
        }
        boardEl.appendChild(cellEl);
    });
}

const TTT_PATTERNS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function getTTTWinningCells(board) {
    for (const p of TTT_PATTERNS) {
        if (board[p[0]] && board[p[0]] === board[p[1]] && board[p[0]] === board[p[2]]) return p;
    }
    return [];
}

function checkTTTWinner(board) {
    for (const p of TTT_PATTERNS) {
        if (board[p[0]] && board[p[0]] === board[p[1]] && board[p[0]] === board[p[2]]) return board[p[0]];
    }
    if (board.every(c => c !== '')) return 'draw';
    return null;
}

async function handleTTTCellClick(index) {
    if (!tttGame || tttGame.status !== 'playing') return;
    if (tttGame.current_turn !== currentName) return;
    
    const board = [...(tttGame.board || ["","","","","","","","",""])];
    if (board[index]) return;
    
    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    board[index] = mySymbol;
    
    const winner = checkTTTWinner(board);
    const nextTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    const now = new Date().toISOString();
    
    const oldGame = { ...tttGame };
    tttGame = {
        ...tttGame,
        board: board,
        current_turn: nextTurn,
        turn_started_at: now,
        status: winner ? 'finished' : 'playing',
        winner: winner || null
    };
    renderTTTGame();
    if (winner) checkTTTGameEnd();
    
    const updates = {
        board: board,
        current_turn: nextTurn,
        turn_started_at: now,
        updated_at: now
    };
    if (winner) {
        updates.status = 'finished';
        updates.winner = winner;
    }
    
    const { error } = await supabaseClient.from('ttt_games').update(updates).eq('id', oldGame.id);
    if (error) {
        tttGame = oldGame;
        renderTTTGame();
    }
}

function startTTTTimer() {
    stopTTTTimer();
    tttTimerInterval = setInterval(tickTTTTimer, 500);
    tickTTTTimer();
}

function stopTTTTimer() {
    if (tttTimerInterval) {
        clearInterval(tttTimerInterval);
        tttTimerInterval = null;
    }
}

function toPersianNumber(num) {
    const digits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    return String(num).replace(/\d/g, d => digits[parseInt(d)]);
}

function updateTTTTimerDisplay() {
    const timerEl = document.getElementById('ttt-timer');
    if (!timerEl || !tttGame) return;
    
    if (tttGame.status !== 'playing') {
        timerEl.textContent = '';
        timerEl.classList.remove('urgent');
        return;
    }
    
    const startedAt = tttGame.turn_started_at ? new Date(tttGame.turn_started_at).getTime() : Date.now();
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = Math.max(0, 10000 - elapsedMs);
    const remainingSec = Math.ceil(remainingMs / 1000);
    
    timerEl.textContent = toPersianNumber(remainingSec);
    if (remainingSec <= 3) {
        timerEl.classList.add('urgent');
    } else {
        timerEl.classList.remove('urgent');
    }
}

function tickTTTTimer() {
    if (!tttGame) return;
    if (tttGame.status !== 'playing') {
        stopTTTTimer();
        updateTTTTimerDisplay();
        return;
    }
    
    updateTTTTimerDisplay();
    
    const startedAt = tttGame.turn_started_at ? new Date(tttGame.turn_started_at).getTime() : Date.now();
    const elapsedMs = Date.now() - startedAt;
    
    if (elapsedMs >= 10000) {
        handleTTTTimeout();
    }
}

async function handleTTTTimeout() {
    if (!tttGame || tttGame.status !== 'playing') return;
    
    const startedAt = tttGame.turn_started_at ? new Date(tttGame.turn_started_at).getTime() : Date.now();
    if (Date.now() - startedAt < 10000) return;
    
    const oldCurrentTurn = tttGame.current_turn;
    const isPlayer1 = oldCurrentTurn === tttGame.player1_name;
    const newTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    const now = new Date().toISOString();
    
    tttGame = {
        ...tttGame,
        current_turn: newTurn,
        turn_started_at: now
    };
    renderTTTGame();
    
    await supabaseClient.from('ttt_games')
        .update({
            current_turn: newTurn,
            turn_started_at: now,
            updated_at: now
        })
        .eq('id', tttGame.id)
        .eq('current_turn', oldCurrentTurn);
}

function checkTTTGameEnd() {
    if (!tttGame) return;
    if (tttGame.status !== 'finished') return;
    if (document.getElementById('ttt-result-overlay')) return;
    
    stopTTTTimer();
    
    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    const winner = tttGame.winner;
    
    let titleClass, titleText;
    if (winner === 'draw') {
        titleClass = 'draw';
        titleText = 'مساوی!';
    } else if (winner === mySymbol) {
        titleClass = 'win';
        titleText = 'بردی! 😃';
    } else {
        titleClass = 'lose';
        titleText = 'باختی! ☹️';
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'ttt-result-overlay';
    overlay.className = 'ttt-result-overlay';
    overlay.innerHTML = `
        <div class="ttt-result-content">
            <div class="ttt-result-title ${titleClass}">${titleText}</div>
            <div class="ttt-result-buttons">
                <button class="ttt-result-btn secondary" onclick="leaveTTTGame()">خروج</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function cancelTTTSearch() {
    stopTTTTimer();
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    
    if (tttGame && tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
        await supabaseClient.from('ttt_games').delete().eq('id', tttGame.id);
    }
    
    tttGame = null;
    tttEnteringGame = false;
}

async function leaveTTTGame() {
    stopTTTTimer();
    const existing = document.getElementById('ttt-result-overlay');
    if (existing) existing.remove();
    
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    
    if (tttGame) {
        if (tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
            await supabaseClient.from('ttt_games').delete().eq('id', tttGame.id);
        } else if (tttGame.status === 'playing') {
            const oppSymbol = tttGame.player1_name === currentName ? tttGame.player2_symbol : tttGame.player1_symbol;
            await supabaseClient.from('ttt_games').update({
                status: 'finished',
                winner: oppSymbol,
                updated_at: new Date().toISOString()
            }).eq('id', tttGame.id);
        }
    }
    
    tttGame = null;
    tttEnteringGame = false;
    currentOnlineGame = null;
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    showScreen('two-player-screen');
}

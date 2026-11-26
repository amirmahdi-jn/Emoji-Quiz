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

            const searchActive = document.getElementById('online-search-screen')?.classList.contains('active');
            const gameActive = document.getElementById('online-game-screen')?.classList.contains('active');

            if (tttGame.status === 'playing' && searchActive && !tttEnteringGame) {
                clearTTTSearchInterval();
                tttSearching = false;
                tttEnteringGame = true;
                enterTTTGame(payload.new);
            } else if (gameActive) {
                tttMovePending = false;
                if (tttGame.status === 'playing') {
                    resetTTTTimer(tttGame.updated_at);
                    startTTTTimer();
                }
                renderTTTGame();
                checkTTTGameEnd();
            }
        })
        .subscribe();

    subscribeToTTTPresence(gameId);
}

function subscribeToTTTPresence(gameId) {
    if (tttPresenceChannel) {
        supabaseClient.removeChannel(tttPresenceChannel);
        tttPresenceChannel = null;
    }
    const opponentName = tttGame && tttGame.player1_name === currentName
        ? tttGame.player2_name : tttGame?.player1_name;
    if (!opponentName) return;

    const channel = supabaseClient.channel('ttt_presence_' + gameId, {
        config: { presence: { key: currentName } }
    });
    tttPresenceChannel = channel;

    channel
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const left = (leftPresences || []).some(p => p.name === opponentName || key === opponentName);
            if (left && tttGame?.status === 'playing') handleTTTOpponentDisconnected(opponentName);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try {
                    await channel.track({ name: currentName, game_id: gameId, connected_at: new Date().toISOString() });
                } catch (e) {}
            }
        });
}

async function handleTTTOpponentDisconnected(opponentName) {
    if (!tttGame || tttGame.status !== 'playing') return;
    const playerLeft = tttGame.player1_name === opponentName ? 'player1_left' : 'player2_left';
    const { data } = await supabaseClient
        .from('ttt_games')
        .update({
            status: 'finished',
            result: playerLeft,
            updated_at: new Date().toISOString()
        })
        .eq('id', tttGame.id)
        .eq('status', 'playing')
        .select()
        .maybeSingle();
    if (data) {
        tttGame = data;
        renderTTTGame();
        checkTTTGameEnd();
    }
}

async function fetchTTTPlayerProfiles() {
    if (!tttGame) return;
    const names = [tttGame.player1_name, tttGame.player2_name].filter(Boolean);
    if (names.length === 0) return;
    const toFetch = names.filter(n => !cachedAvatarMap[n] || cachedAvatarMap[n].custom_avatar_url === undefined || cachedAvatarMap[n].active_frame === undefined);
    if (toFetch.length === 0) return;
    const { data } = await supabaseClient.from('profiles').select('name, custom_avatar_url, active_frame').in('name', toFetch);
    if (data) {
        data.forEach(p => {
            if (!cachedAvatarMap[p.name]) cachedAvatarMap[p.name] = {};
            cachedAvatarMap[p.name].custom_avatar_url = p.custom_avatar_url;
            cachedAvatarMap[p.name].active_frame = p.active_frame;
        });
    }
}

function enterTTTGame(game = null) {
    if (game && game.status === 'playing') tttGame = game;
    if (!tttGame || !['playing', 'finished'].includes(tttGame.status) || !tttGame.player1_name || !tttGame.player2_name) return;
    clearTTTSearchInterval();
    if (tttQueuePresenceChannel) { try { tttQueuePresenceChannel.untrack(); } catch (e) {} supabaseClient.removeChannel(tttQueuePresenceChannel); tttQueuePresenceChannel = null; }
    showScreen('online-game-screen');
    updateAllStatsUI();
    const titleEl = document.getElementById('game-title-name');
    if (titleEl) titleEl.innerText = 'بازی دوز';
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    tttRewarded = false;
    tttMovePending = false;
    resetTTTTimer(tttGame.updated_at);
    if (tttGame && tttGame.status === 'playing') startTTTTimer();
    
    fetchTTTPlayerProfiles().then(() => {
        if (tttGame && document.getElementById('online-game-screen')?.classList.contains('active')) renderTTTGame();
    }).catch(() => {});
    
    if (tttGame) {
        renderTTTGame();
        checkTTTGameEnd();
    }
}

function renderTTTGame() {
    const body = document.getElementById('online-game-body');
    if (!body || !tttGame || !['playing', 'finished'].includes(tttGame.status)) return;
    if (!Array.isArray(tttGame.board)) {
        try { tttGame.board = typeof tttGame.board === 'string' ? JSON.parse(tttGame.board) : []; } catch (e) { tttGame.board = []; }
    }
    if (tttGame.board.length !== 9) tttGame.board = Array.from({ length: 9 }, (_, i) => tttGame.board[i] || '');

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
    const infoEl = body.querySelector('.ttt-info');
    if (infoEl) infoEl.style.flexDirection = isPlayer1 ? 'row-reverse' : 'row';
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
    if (myAvatarEl) { myAvatarEl.src = currentCustomAvatarUrl || defaultAvatar; applyFrameToElement(myAvatarEl, currentFrame); }

    const oppAvatarEl = document.getElementById('ttt-opp-avatar');
    if (oppAvatarEl && oppName) {
        const oppProfile = cachedAvatarMap[oppName];
        oppAvatarEl.src = (oppProfile && oppProfile.custom_avatar_url) ? oppProfile.custom_avatar_url : defaultAvatar;
        applyFrameToElement(oppAvatarEl, oppProfile ? oppProfile.active_frame : 'none');
    }

    const statusEl = document.getElementById('ttt-status-text');
    if (statusEl) {
        if (tttGame.status === 'finished') {
            statusEl.textContent = 'بازی تمام شد.';
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
    resetTTTTimer(tttGame.updated_at);
    if (tttGame.status === 'playing') startTTTTimer();
    renderTTTGame();
    checkTTTGameEnd();
}

function resetTTTTimer(updatedAt = null) {
    const serverTurnStart = updatedAt ? Date.parse(updatedAt) : NaN;
    tttLocalTurnStart = Number.isFinite(serverTurnStart) ? serverTurnStart : Date.now();
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
        const elapsed = Math.max(0, (Date.now() - tttLocalTurnStart) / 1000);
        const remaining = Math.max(0, Math.ceil(TTT_TURN_SECONDS - elapsed));
        const timerEl = document.getElementById('ttt-timer');
        if (timerEl) {
            if (remaining > 0) {
                timerEl.textContent = remaining + 's';
                if (remaining <= 5) timerEl.classList.add('urgent');
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
    }, 100);
}

async function handleTTTTimeout() {
    if (!tttGame || tttGame.status !== 'playing') return;
    if (tttGame.current_turn !== currentName || tttMovePending) return;

    tttMovePending = true;
    const isPlayer1 = tttGame.player1_name === currentName;
    const nextTurn = isPlayer1 ? tttGame.player2_name : tttGame.player1_name;
    const updateData = {
        current_turn: nextTurn,
        status: 'playing',
        updated_at: new Date().toISOString()
    };

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
    tttMovePending = false;
    resetTTTTimer(tttGame.updated_at);
    if (tttTimerInterval) { clearInterval(tttTimerInterval); tttTimerInterval = null; }
    startTTTTimer();
    renderTTTGame();
    checkTTTGameEnd();
}

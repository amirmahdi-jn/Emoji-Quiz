let tttGame = null;
let tttSubscription = null;

async function startTTTMatchmaking() {
    updateSearchText('در حال جستجوی حریف...');
    
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
        const { data: joined } = await supabaseClient
            .from('ttt_games')
            .update({
                player2_name: currentName,
                player2_symbol: mySymbol,
                status: 'playing',
                updated_at: new Date().toISOString()
            })
            .eq('id', game.id)
            .eq('status', 'waiting')
            .select()
            .maybeSingle();
        
        if (joined) {
            tttGame = joined;
            updateSearchText('حریف پیدا شد! در حال ورود به بازی...');
            setTimeout(() => {
                subscribeToTTTGame(joined.id);
                enterTTTGame();
            }, 700);
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
        updateSearchText('منتظر پیوستن حریف...');
        subscribeToTTTGame(created.id);
    } else {
        updateSearchText('خطا در ساخت بازی. لطفاً دوباره تلاش کنید.');
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
            
            if (tttGame.status === 'playing' && searchActive) {
                updateSearchText('حریف پیدا شد! در حال ورود به بازی...');
                setTimeout(() => enterTTTGame(), 700);
            } else if (gameActive) {
                renderTTTGame();
                checkTTTGameEnd();
            }
        })
        .subscribe();
}

function enterTTTGame() {
    showScreen('online-game-screen');
    const titleEl = document.getElementById('game-title-name');
    if (titleEl) titleEl.innerText = 'دوز';
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    renderTTTGame();
}

function renderTTTGame() {
    const body = document.getElementById('online-game-body');
    if (!body || !tttGame) return;
    
    if (!document.getElementById('ttt-board')) {
        body.innerHTML = `
            <div class="ttt-container">
                <div class="ttt-info">
                    <div class="ttt-player">
                        <span class="ttt-player-name">من</span>
                        <span class="ttt-player-symbol" id="ttt-my-symbol"></span>
                    </div>
                    <div class="ttt-status" id="ttt-status-text"></div>
                    <div class="ttt-player">
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
    
    const oldGame = { ...tttGame };
    tttGame = {
        ...tttGame,
        board: board,
        current_turn: nextTurn,
        status: winner ? 'finished' : 'playing',
        winner: winner || null
    };
    renderTTTGame();
    if (winner) checkTTTGameEnd();
    
    const updates = {
        board: board,
        current_turn: nextTurn,
        updated_at: new Date().toISOString()
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

function checkTTTGameEnd() {
    if (!tttGame) return;
    if (tttGame.status !== 'finished') return;
    if (document.getElementById('ttt-result-overlay')) return;
    
    const isPlayer1 = tttGame.player1_name === currentName;
    const mySymbol = isPlayer1 ? tttGame.player1_symbol : tttGame.player2_symbol;
    const winner = tttGame.winner;
    
    let titleClass, titleText;
    if (winner === 'draw') {
        titleClass = 'draw';
        titleText = 'مساوی!';
    } else if (winner === mySymbol) {
        titleClass = 'win';
        titleText = 'بردی! 🎉';
    } else {
        titleClass = 'lose';
        titleText = 'باختی!';
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
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    
    if (tttGame && tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
        await supabaseClient.from('ttt_games').delete().eq('id', tttGame.id);
    }
    
    tttGame = null;
}

async function leaveTTTGame() {
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
    currentOnlineGame = null;
    const body = document.getElementById('online-game-body');
    if (body) body.innerHTML = '';
    showScreen('two-player-screen');
}

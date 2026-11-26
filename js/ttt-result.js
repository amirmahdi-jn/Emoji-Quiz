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
        if (!tttRewarded && !hasTTTRewardBeenApplied(tttGame.id)) {
            tttRewarded = true;
            markTTTRewardApplied(tttGame.id);
            currentCoins += 25;
            updateAllStatsUI();
            syncToDatabase();
        }
    } else if (iWon) {
        titleHTML = isLeftResult ? 'حریف بازی رو ترک کرد. 😅' : 'بردی! 😃';
        titleColor = isLeftResult ? '#fcd34d' : '#22c55e';
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
        if (!tttRewarded && !hasTTTRewardBeenApplied(tttGame.id)) {
            tttRewarded = true;
            markTTTRewardApplied(tttGame.id);
            currentTrophies += 10;
            currentCoins += 50;
            updateAllStatsUI();
            syncToDatabase();
        }
    } else {
        titleHTML = isLeftResult ? 'بازی رو ترک کردی! 😐' : 'باختی! ☹️';
        titleColor = isLeftResult ? '#a16207' : '#f87171';
        bodyHTML = `
            <div class="ttt-achievement-row">
                <span class="ttt-achievement-num">-5</span>
                <span class="ttt-achievement-icon">${TTT_TROPHY_ICON}</span>
            </div>
        `;
        if (!tttRewarded && !hasTTTRewardBeenApplied(tttGame.id)) {
            tttRewarded = true;
            markTTTRewardApplied(tttGame.id);
            currentTrophies = Math.max(0, currentTrophies - 5);
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
    if (tttPresenceChannel) { supabaseClient.removeChannel(tttPresenceChannel); tttPresenceChannel = null; }
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
        const { data, error } = await supabaseClient
            .from('ttt_games')
            .update(updateData)
            .eq('id', tttGame.id)
            .eq('status', 'playing')
            .select()
            .maybeSingle();
        if (error || !data) {
            return;
        }
        tttGame = data;
        checkTTTGameEnd();
        return;
    }
    leaveOnlineGame();
}

async function leaveOnlineGame() {
    await tttCleanupWaitingGame();
    if (tttPresenceChannel) { supabaseClient.removeChannel(tttPresenceChannel); tttPresenceChannel = null; }
    if (tttQueuePresenceChannel) { try { await tttQueuePresenceChannel.untrack(); } catch (e) {} supabaseClient.removeChannel(tttQueuePresenceChannel); tttQueuePresenceChannel = null; }
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

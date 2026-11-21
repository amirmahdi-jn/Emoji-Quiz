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
                    enterTTTGame();
                }
            }
        }, 500);
    } catch (e) {
        tttSearching = false;
        tttRefundEntry();
        updateSearchText('خطا در اتصال. دوباره تلاش کنید.');
    }
}

function updateSearchText(text) {
    const el = document.getElementById('search-status-text');
    if (el) el.textContent = text;
}

function openOnlineGame(gameType) {
    if (gameType !== 'tictactoe') return;
    if (currentName === 'Guest' || currentName.startsWith('Guest.')) {
        showGuestModal();
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
    updateSearchText('منتظر پیوستن حریف ⏳️');
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

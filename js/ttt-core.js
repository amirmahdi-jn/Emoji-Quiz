let tttGame = null;
let tttSubscription = null;
let tttPresenceChannel = null;
let tttQueuePresenceChannel = null;
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
let tttSearchToken = 0;

const TTT_TURN_SECONDS = 15;
const TTT_TROPHY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
const TTT_COIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`;

function clearTTTSearchInterval() {
    if (tttSearchInterval) { clearInterval(tttSearchInterval); tttSearchInterval = null; }
}

function getTTTRewardStorageKey(gameId) {
    return `ttt_rewarded_${gameId}_${currentName}`;
}

function hasTTTRewardBeenApplied(gameId) {
    try { return localStorage.getItem(getTTTRewardStorageKey(gameId)) === '1'; }
    catch (e) { return false; }
}

function markTTTRewardApplied(gameId) {
    try { localStorage.setItem(getTTTRewardStorageKey(gameId), '1'); } catch (e) {}
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

async function tttRefundEntry() {
    if (!tttEntryPaid) return;
    currentCoins += 25;
    tttEntryPaid = false;
    updateAllStatsUI();
    await syncToDatabase();
}

async function tttCleanupWaitingGame() {
    if (!tttGame) return;
    if (tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
        await supabaseClient.from('ttt_games').delete().eq('id', tttGame.id).eq('status', 'waiting');
    }
}

function tttQueuePresenceNames() {
    if (!tttQueuePresenceChannel) return [];
    const state = tttQueuePresenceChannel.presenceState();
    return Object.keys(state).map(key => {
        const records = state[key] || [];
        return records.find(p => p.name)?.name || key;
    });
}

async function tttSubscribeToQueuePresence(token) {
    if (tttQueuePresenceChannel) {
        try { await supabaseClient.removeChannel(tttQueuePresenceChannel); } catch (e) {}
        tttQueuePresenceChannel = null;
    }
    const channel = supabaseClient.channel('ttt_matchmaking_presence', {
        config: { presence: { key: currentName } }
    });
    tttQueuePresenceChannel = channel;
    return new Promise((resolve, reject) => {
        channel.subscribe(async (status) => {
            if (token !== tttSearchToken || !tttSearching) return;
            if (status === 'SUBSCRIBED') {
                try {
                    await channel.track({ name: currentName, searching: true, started_at: new Date().toISOString() });
                    resolve(true);
                } catch (error) { reject(error); }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                reject(new Error('Queue presence subscription failed'));
            }
        });
    });
}

async function startTTTMatchmaking() {
    if (tttSearching) return;
    tttSearching = true;
    tttEnteringGame = false;
    const token = ++tttSearchToken;
    clearTTTSearchInterval();

    const enterMatchedGame = (game) => {
        if (token !== tttSearchToken || !tttSearching || !game) return;
        tttGame = game;
        tttSearching = false;
        clearTTTSearchInterval();
        if (tttQueuePresenceChannel) {
            try { tttQueuePresenceChannel.untrack(); } catch (e) {}
            supabaseClient.removeChannel(tttQueuePresenceChannel);
            tttQueuePresenceChannel = null;
        }
        if (!tttEnteringGame) {
            tttEnteringGame = true;
            subscribeToTTTGame(game.id);
            enterTTTGame(game);
        }
    };

    const ensureWaitingRow = async () => {
        if (tttGame && tttGame.status === 'waiting' && tttGame.player1_name === currentName) return tttGame;
        const mySymbol = Math.random() < 0.5 ? 'X' : 'O';
        const { data, error } = await supabaseClient
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
        if (!error && data && token === tttSearchToken && tttSearching) {
            tttGame = data;
            subscribeToTTTGame(data.id);
            return data;
        }
        return null;
    };

    let searchBusy = false;
    const searchForOpponent = async () => {
        if (searchBusy || token !== tttSearchToken || !tttSearching) return;
        searchBusy = true;
        try {
        const activeSearchers = tttQueuePresenceNames();
        const { data: waitingGames, error: waitingError } = await supabaseClient
            .from('ttt_games')
            .select('*')
            .eq('status', 'waiting')
            .neq('player1_name', currentName)
            .order('created_at', { ascending: true })
            .limit(20);
        if (token !== tttSearchToken || !tttSearching || waitingError) return;

        const candidate = (waitingGames || []).find(g => activeSearchers.includes(g.player1_name));
        if (candidate) {
            const mySymbol = candidate.player1_symbol === 'X' ? 'O' : 'X';
            const { data, error } = await supabaseClient
                .from('ttt_games')
                .update({
                    player2_name: currentName,
                    player2_symbol: mySymbol,
                    status: 'playing',
                    current_turn: candidate.player1_name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', candidate.id)
                .eq('status', 'waiting')
                .eq('player1_name', candidate.player1_name)
                .select()
                .maybeSingle();
            if (data && !error) {
                enterMatchedGame(data);
                return;
            }
        }

        if (tttGame && tttGame.status === 'waiting' && tttGame.player1_name === currentName) {
            const { data: currentRow } = await supabaseClient
                .from('ttt_games')
                .select('*')
                .eq('id', tttGame.id)
                .maybeSingle();
            if (token !== tttSearchToken || !tttSearching) return;
            if (currentRow && currentRow.status === 'playing' && currentRow.player2_name) {
                enterMatchedGame(currentRow);
                return;
            }
            if (!currentRow || currentRow.status !== 'waiting') {
                tttGame = null;
                        }
        }
        await ensureWaitingRow();
        } catch (e) {
        } finally {
            searchBusy = false;
        }
    };

    try {
        await tttSubscribeToQueuePresence(token);
        if (token !== tttSearchToken || !tttSearching) return;
        await supabaseClient.from('ttt_games').delete().eq('status', 'waiting').eq('player1_name', currentName);
        tttGame = null;
        searchForOpponent();
        tttSearchInterval = setInterval(searchForOpponent, 500);
    } catch (e) {
        if (token !== tttSearchToken || !tttSearching) return;
        if (tttQueuePresenceChannel) {
            try { await tttQueuePresenceChannel.untrack(); } catch (e) {}
            try { await supabaseClient.removeChannel(tttQueuePresenceChannel); } catch (e) {}
            tttQueuePresenceChannel = null;
        }
        tttSearching = false;
        setTimeout(() => {
            if (token === tttSearchToken && document.getElementById('online-search-screen')?.classList.contains('active')) startTTTMatchmaking();
        }, 1000);
    }
}

function updateSearchText() {
    const el = document.getElementById('search-status-text');
    if (el) el.textContent = 'منتظر پیوستن حریف ⏳️';
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
    updateSearchText('در حال جستجوی حریف...');
    showScreen('online-search-screen');
    startTTTMatchmaking();
}

async function cancelOnlineSearch() {
    tttSearchToken++;
    tttSearching = false;
    clearTTTSearchInterval();
    if (tttQueuePresenceChannel) {
        try { await tttQueuePresenceChannel.untrack(); } catch (e) {}
        try { await supabaseClient.removeChannel(tttQueuePresenceChannel); } catch (e) {}
        tttQueuePresenceChannel = null;
    }
    if (tttSubscription) { supabaseClient.removeChannel(tttSubscription); tttSubscription = null; }
    await tttCleanupWaitingGame();
    await tttRefundEntry();
    tttGame = null;
    tttEnteringGame = false;
    tttMovePending = false;
    showScreen('two-player-screen');
}

const SUPABASE_URL = 'https://zyxdpxzgciuyjtdbzyan.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jzvXqMoJxMY16HRtpHe2rQ_-3WY9u-q';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ensure every visitor has a Supabase Anonymous Auth session before app data loads.
const anonymousAuthReady = (async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
        const { error: authError } = await supabaseClient.auth.signInAnonymously();
        if (authError) throw authError;
    }
})();

const defaultAvatar = 'avatar0.jpg';

let currentCoins = 100;
let currentDiamonds = 50;
let currentTrophies = 0;

let currentCustomAvatarUrl = null;
let currentName = 'Guest';



let chatSubscription = null;

let currentPaymentKey = null;
let currentPaymentAmount = 0;
let currentPaymentType = null;
let currentPanelTab = 'top-players';

let currentFrame = 'none';
let unlockedFrames = [];
let unlockedStickerPacks = [];

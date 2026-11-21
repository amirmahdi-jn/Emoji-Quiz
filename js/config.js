const SUPABASE_URL = 'https://zyxdpxzgciuyjtdbzyan.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jzvXqMoJxMY16HRtpHe2rQ_-3WY9u-q';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultAvatar = 'avatar0.jpg';

let currentLevelIndex = 0;
let currentChapter = 1;
let currentCoins = 100;
let currentDiamonds = 50;
let currentTrophies = 0;
let currentWord = [];
let currentGuess = [];
let unlockedLevels = 1;
let solvedLevels = {};
let removeHintUses = 0;
const TOTAL_LEVELS = 180;
const LEVELS_PER_CHAPTER = 15;
const TOTAL_CHAPTERS = 12;

let currentCustomAvatarUrl = null;
let currentName = 'Guest';

let lastGiftOpen = null;
let lastChallengeDate = null;
let challengeCorrect = false;

const PROFILE_KEY = 'emoji_profile_v7';
const STORAGE_KEY = 'emojiQuizProgress_v7';

let giftInterval = null;
let dailyChallengeInterval = null;
let chatSubscription = null;

let currentPaymentKey = null;
let currentPaymentAmount = 0;
let currentPaymentType = null;
let currentPanelTab = 'top-players';

const ICONS = {
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>`
};

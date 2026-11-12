const SUPABASE_URL = 'https://tkhvcfqqxxodhwgmdjiq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tFVmD-I9atRWGIpR0JvHDQ_p7rqHgja';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultAvatar = 'avatar0.jpg';
const avatarImages = ['avatar1.jpg','avatar2.jpg','avatar3.jpg','avatar4.jpg','avatar5.jpg','avatar6.jpg'];

let currentLevelIndex = 0;
let currentChapter = 1;
let currentCoins = 10;
let currentDiamonds = 10;
let currentWord = [];
let currentGuess = [];
let unlockedLevels = 1;
let solvedLevels = {};
let removeHintUses = 0;
const TOTAL_LEVELS = 135;
const LEVELS_PER_CHAPTER = 15;
const TOTAL_CHAPTERS = 9;

let currentAvatarIndex = -1;
let currentName = 'Guest.0';

const GIFT_KEY = 'gift_last_open_v6';
const DAILY_KEY = 'emoji_daily_challenge_v6';
const PROFILE_KEY = 'emoji_profile_v6';
const STORAGE_KEY = 'emojiQuizProgress_v6';

let giftInterval = null;
let dailyChallengeInterval = null;
let chatSubscription = null;

const purchaseCodes = {
    "coin_100":     ["482917", "930145", "617283"],
    "coin_200":     ["105938", "728461", "395027"],
    "coin_300":     ["583019", "246173", "908425"],
    "coin_400":     ["704826", "391582", "862740"],
    "coin_500":     ["264915", "837406", "419058"],
    "coin_1000":    ["951374", "628095", "173846"],
    "diamond_10":   ["508927", "371640", "826195"],
    "diamond_20":   ["637482", "195803", "740268"],
    "diamond_30":   ["820491", "576028", "384751"],
    "diamond_40":   ["946173", "208536", "513829"],
    "diamond_50":   ["137264", "689052", "420937"],
    "diamond_100":  ["729584", "463871", "918240"]
};
const USED_CODES_KEY = 'emojiQuizUsedCodes_v1';

let currentPaymentKey = null;
let currentPaymentAmount = 0;
let currentPaymentType = null;
let currentPanelTab = 'top-players';

const colors = [
    '#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', 
    '#0d9488', '#ea580c', '#4f46e5', '#c026d3', '#475569'
];

const ICONS = {
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>`
};

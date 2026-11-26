const SUPABASE_URL = 'https://npsjsbsuwyfbxdxnfcak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7BxR1MiRsEebKIfmsviOpw_qR1wX0K9';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

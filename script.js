const SUPABASE_URL = 'https://tkhvcfqqxxodhwgmdjiq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tFVmD-I9atRWGIpR0JvHDQ_p7rqHgja';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultAvatar = 'avatar0.jpg';

const avatarImages = [
    'avatar1.jpg',
    'avatar2.jpg',
    'avatar3.jpg',
    'avatar4.jpg',
    'avatar5.jpg',
    'avatar6.jpg'
];

const gameData = [
    { id: 1, emojis: ['🐬', '🧑'], answer: 'پسر دلفینی', letters: ['پ','س','ر',' ','د','ل','ف','ی','ن','ی'] },
    { id: 2, emojis: ['🧊', '🌅'], answer: 'عصر یخبندان', letters: ['ع','ص','ر',' ','ی','خ','ب','ن','د','ا','ن'] },
    { id: 3, emojis: ['👨‍🍳', '🐁'], answer: 'موش سرآشپز', letters: ['م','و','ش',' ','س','ر','آ','ش','پ','ز'] },
    { id: 4, emojis: ['👢', '🐈‍⬛'], answer: 'گربه چکمه پوش', letters: ['گ','ر','ب','ه',' ','چ','ک','م','ه',' ','پ','و','ش'] },
    { id: 5, emojis: ['🌾', '📚'], answer: 'دانشجو', letters: ['د','ا','ن','ش','ج','و'] },
    { id: 6, emojis: ['💰', '✋️'], answer: 'دستمال', letters: ['د','س','ت','م','ا','ل'] },
    { id: 7, emojis: ['✉️', '🏙'], answer: 'روزنامه', letters: ['ر','و','ز','ن','ا','م','ه'] },
    { id: 8, emojis: ['🍞', '🦷'], answer: 'دندان', letters: ['د','ن','د','ا','ن'] },
    { id: 9, emojis: ['🕳', '🧊'], answer: 'یخچال', letters: ['ی','خ','چ','ا','ل'] },
    { id: 10, emojis: ['🛏', '🦶'], answer: 'پایتخت', letters: ['پ','ا','ی','ت','خ','ت'] },
    { id: 11, emojis: ['👫', '🚕'], answer: 'آژانس دوستی', letters: ['آ','ژ','ا','ن','س',' ','د','و','س','ت','ی'] },
    { id: 12, emojis: ['🌧', '🎶'], answer: 'آوای باران', letters: ['آ','و','ا','ی',' ','ب','ا','ر','ا','ن'] },
    { id: 13, emojis: ['🇮🇷', '🔧'], answer: 'ساخت ایران', letters: ['س','ا','خ','ت',' ','ا','ی','ر','ا','ن'] },
    { id: 14, emojis: ['💧', '🌹'], answer: 'گلاب', letters: ['گ','ل','ا','ب'] },
    { id: 15, emojis: ['🥶', '🩸'], answer: 'خون سرد', letters: ['خ','و','ن',' ','س','ر','د'] },
    { id: 16, emojis: ['🍗', '🛶'], answer: 'قایقران', letters: ['ق','ا','ی','ق','ر','ا','ن'] },
    { id: 17, emojis: ['💧', '👔'], answer: 'کتاب', letters: ['ک','ت','ا','ب'] },
    { id: 18, emojis: ['🥓', '🎲'], answer: 'تاس کباب', letters: ['ت','ا','س',' ','ک','ب','ا','ب'] },
    { id: 19, emojis: ['🏔', '🍜'], answer: 'رشته کوه', letters: ['ر','ش','ت','ه',' ','ک','و','ه'] },
    { id: 20, emojis: ['🛁', '🚗'], answer: 'کاروان', letters: ['ک','ا','ر','و','ا','ن'] },
    { id: 21, emojis: ['🍋', '💧'], answer: 'آبلیمو', letters: ['آ','ب','ل','ی','م','و'] },
    { id: 22, emojis: ['🍗', '🗣'], answer: 'سخنران', letters: ['س','خ','ن','ر','ا','ن'] },
    { id: 23, emojis: ['🛁', '👖'], answer: 'لیوان', letters: ['ل','ی','و','ا','ن'] },
    { id: 24, emojis: ['😭', '🌷'], answer: 'لاله زار', letters: ['ل','ا','ل','ه',' ','ز','ا','ر'] },
    { id: 25, emojis: ['🎨', '👨‍🦯'], answer: 'کور رنگی', letters: ['ک','و','ر',' ','ر','ن','گ','ی'] },
    { id: 26, emojis: ['🧂', '🪵'], answer: 'چوب شور', letters: ['چ','و','ب',' ','ش','و','ر'] },
    { id: 27, emojis: ['🚚', '🚪'], answer: 'دربار', letters: ['د','ر','ب','ا','ر'] },
    { id: 28, emojis: ['🍌', '🥛'], answer: 'شیر موز', letters: ['ش','ی','ر',' ','م','و','ز'] },
    { id: 29, emojis: ['🐔', '🥚'], answer: 'تخم مرغ', letters: ['ت','خ','م',' ','م','ر','غ'] },
    { id: 30, emojis: ['🥩', '🔩'], answer: 'پیچ گوشتی', letters: ['پ','ی','چ',' ','گ','و','ش','ت','ی'] },
    { id: 31, emojis: ['🩸', '🐴'], answer: 'خرخون', letters: ['خ','ر','خ','و','ن'] },
    { id: 32, emojis: ['🗝', '🤴'], answer: 'شاه کلید', letters: ['ش','ا','ه',' ','ک','ل','ی','د'] },
    { id: 33, emojis: ['🏠', '🌹'], answer: 'گلخانه', letters: ['گ','ل','خ','ا','ن','ه'] },
    { id: 34, emojis: ['🏔', '💧'], answer: 'آب معدنی', letters: ['آ','ب',' ','م','ع','د','ن','ی'] },
    { id: 35, emojis: ['🪡', '👞'], answer: 'کفشدوزک', letters: ['ک','ف','ش','د','و','ز','ک'] },
    { id: 36, emojis: ['🪦', '🪨'], answer: 'سنگ قبر', letters: ['س','ن','گ',' ','ق','ب','ر'] },
    { id: 37, emojis: ['📜', '🫀'], answer: 'دل نوشته', letters: ['د','ل',' ','ن','و','ش','ت','ه'] },
    { id: 38, emojis: ['🧵', '🛞'], answer: 'چرخ خیاطی', letters: ['چ','ر','خ',' ','خ','ی','ا','ط','ی'] },
    { id: 39, emojis: ['🌞', '👓'], answer: 'عینک آفتابی', letters: ['ع','ی','ن','ک',' ','آ','ف','ت','ا','ب','ی'] },
    { id: 40, emojis: ['💪', '🔦'], answer: 'چراغ قوه', letters: ['چ','ر','ا','غ',' ','ق','و','ه'] },
    { id: 41, emojis: ['⚡️', '🧹'], answer: 'جارو برقی', letters: ['ج','ا','ر','و',' ','ب','ر','ق','ی'] },
    { id: 42, emojis: ['😴', '💡'], answer: 'چراغ خواب', letters: ['چ','ر','ا','غ',' ','خ','و','ا','ب'] },
    { id: 43, emojis: ['🔧', '☕️'], answer: 'قهوه ساز', letters: ['ق','ه','و','ه',' ','س','ا','ز'] },
    { id: 44, emojis: ['🧑', '🌹'], answer: 'گل پسر', letters: ['گ','ل',' ','پ','س','ر'] },
    { id: 45, emojis: ['🧱', '🕒'], answer: 'ساعت دیواری', letters: ['س','ا','ع','ت',' ','د','ی','و','ا','ر','ی'] },
    { id: 46, emojis: ['👩', '🦁'], answer: 'شیر زن', letters: ['ش','ی','ر',' ','ز','ن'] },
    { id: 47, emojis: ['😘', '✋️'], answer: 'دست بوس', letters: ['د','س','ت',' ','ب','و','س'] },
    { id: 48, emojis: ['💔', '🫀'], answer: 'دل شکسته', letters: ['د','ل',' ','ش','ک','س','ت','ه'] },
    { id: 49, emojis: ['🔵', '🌹'], answer: 'گلابی', letters: ['گ','ل','ا','ب','ی'] },
    { id: 50, emojis: ['🪎', '🐄'], answer: 'گاو صندوق', letters: ['گ','ا','و',' ','ص','ن','د','و','ق'] },
    { id: 51, emojis: ['🏃‍♂️', '👟'], answer: 'کفش ورزشی', letters: ['ک','ف','ش',' ','و','ر','ز','ش','ی'] },
    { id: 52, emojis: ['💵', '👛'], answer: 'کیف پول', letters: ['ک','ی','ف',' ','پ','و','ل'] },
    { id: 53, emojis: ['🏦', '💳'], answer: 'کارت بانکی', letters: ['ک','ا','ر','ت',' ','ب','ا','ن','ک','ی'] },
    { id: 54, emojis: ['⏳️', '👀'], answer: 'چشم انتظار', letters: ['چ','ش','م',' ','ا','ن','ت','ظ','ا','ر'] },
    { id: 55, emojis: ['🧘‍♀️', '🫀'], answer: 'دل آرام', letters: ['د','ل',' ','آ','ر','ا','م'] },
    { id: 56, emojis: ['🎨', '💧'], answer: 'آبرنگ', letters: ['آ','ب','ر','ن','گ'] },
    { id: 57, emojis: ['🦶', '👣'], answer: 'رد پا', letters: ['ر','د',' ','پ','ا'] },
    { id: 58, emojis: ['💍', '🧙‍♂️'], answer: 'ارباب حلقه ها', letters: ['ا','ر','ب','ا','ب',' ','ح','ل','ق','ه',' ','ه','ا'] },
    { id: 59, emojis: ['🕸', '👨'], answer: 'مرد عنکبوتی', letters: ['م','ر','د',' ','ع','ن','ک','ب','و','ت','ی'] },
    { id: 60, emojis: ['👨', '🦇'], answer: 'بتمن', letters: ['ب','ت','م','ن'] },
    { id: 61, emojis: ['☝️', '🫆'], answer: 'اثر انگشت', letters: ['ا','ث','ر',' ','ا','ن','گ','ش','ت'] },
    { id: 62, emojis: ['👀', '🤏'], answer: 'ذره بین', letters: ['ذ','ر','ه',' ','ب','ی','ن'] },
    { id: 63, emojis: ['🪵', '🕵‍♂️'], answer: 'کارآگاه درختی', letters: ['ک','ا','ر','آ','گ','ا','ه',' ','د','ر','خ','ت','ی'] },
    { id: 64, emojis: ['📎', '✋️'], answer: 'دستگیره', letters: ['د','س','ت','گ','ی','ر','ه'] },
    { id: 65, emojis: ['🧛‍♂️', '🩸'], answer: 'خون آشام', letters: ['خ','و','ن',' ','آ','ش','ا','م'] },
    { id: 66, emojis: ['⛺️', '🆕️'], answer: 'نیوکمپ', letters: ['ن','ی','و','ک','م','پ'] },
    { id: 67, emojis: ['🥂', '🌃'], answer: 'شب نشینی', letters: ['ش','ب',' ','ن','ش','ی','ن','ی'] },
    { id: 68, emojis: ['☎️', '🎼'], answer: 'سلفون', letters: ['س','ل','ف','و','ن'] },
    { id: 69, emojis: ['👫', '✋️'], answer: 'دست دوستی', letters: ['د','س','ت',' ','د','و','س','ت','ی'] },
    { id: 70, emojis: ['👶', '👋'], answer: 'خداحافظ بچه', letters: ['خ','د','ا','ح','ا','ف','ظ',' ','ب','چ','ه'] },
    { id: 71, emojis: ['🌍', '🍎'], answer: 'سیب زمینی', letters: ['س','ی','ب',' ','ز','م','ی','ن','ی'] },
    { id: 72, emojis: ['🍯', '🌙'], answer: 'ماه عسل', letters: ['م','ا','ه',' ','ع','س','ل'] },
    { id: 73, emojis: ['🎨', '📄'], answer: 'کاغذ رنگی', letters: ['ک','ا','غ','ذ',' ','ر','ن','گ','ی'] },
    { id: 74, emojis: ['🔙', '💅'], answer: 'لاک پشت', letters: ['ل','ا','ک',' ','پ','ش','ت'] },
    { id: 75, emojis: ['👂', '🎮'], answer: 'بازیگوش', letters: ['ب','ا','ز','ی','گ','و','ش'] },
    { id: 76, emojis: ['🔝', '☕️'], answer: 'تی تاپ', letters: ['ت','ی',' ','ت','ا','پ'] },
    { id: 77, emojis: ['🦅', '👨‍🦲'], answer: 'سرباز', letters: ['س','ر','ب','ا','ز'] },
    { id: 78, emojis: ['🦁', '🕯'], answer: 'شمشیر', letters: ['ش','م','ش','ی','ر'] },
    { id: 79, emojis: ['🥩', '🛞'], answer: 'چرخ گوشت', letters: ['چ','ر','خ',' ','گ','و','ش','ت'] },
    { id: 80, emojis: ['🛞', '2️⃣'], answer: 'دوچرخه', letters: ['د','و','چ','ر','خ','ه'] },
    { id: 81, emojis: ['👴', '🏠'], answer: 'خانه سالمندان', letters: ['خ','ا','ن','ه',' ','س','ا','ل','م','ن','د','ا','ن'] },
    { id: 82, emojis: ['⬛️', '🛏'], answer: 'تخته سیاه', letters: ['ت','خ','ت','ه',' ','س','ی','ا','ه'] },
    { id: 83, emojis: ['🇲🇽', '🌽'], answer: 'ذرت مکزیکی', letters: ['ذ','ر','ت',' ','م','ک','ز','ی','ک','ی'] },
    { id: 84, emojis: ['✍️', '👨‍🦲'], answer: 'سرنوشت', letters: ['س','ر','ن','و','ش','ت'] },
    { id: 85, emojis: ['✅️', '➕️'], answer: 'پلاستيک', letters: ['پ','ل','ا','س','ت','ي','ک'] },
    { id: 86, emojis: ['🚪', '🦶'], answer: 'پادری', letters: ['پ','ا','د','ر','ی'] },
    { id: 87, emojis: ['🍓', '🚽'], answer: 'توالت فرنگی', letters: ['ت','و','ا','ل','ت',' ','ف','ر','ن','گ','ی'] },
    { id: 88, emojis: ['🍫', '🥛'], answer: 'شیر کاکائو', letters: ['ش','ی','ر',' ','ک','ا','ک','ا','ئ','و'] },
    { id: 89, emojis: ['📚', '🧮'], answer: 'حساب کتاب', letters: ['ح','س','ا','ب',' ','ک','ت','ا','ب'] },
    { id: 90, emojis: ['🪏', '🍎'], answer: 'سیبیل', letters: ['س','ی','ب','ی','ل'] },
    { id: 91, emojis: ['🐍', '🅱️'], answer: 'بیمار', letters: ['ب','ی','م','ا','ر'] },
    { id: 92, emojis: ['⛽️', '🛏'], answer: 'تخته گاز', letters: ['ت','خ','ت','ه',' ','گ','ا','ز'] },
    { id: 93, emojis: ['🛁', '🧄'], answer: 'سیروان', letters: ['س','ی','ر','و','ا','ن'] },
    { id: 94, emojis: ['🌍', '🏆'], answer: 'جام جهانی', letters: ['ج','ا','م',' ','ج','ه','ا','ن','ی'] },
    { id: 95, emojis: ['🐛', '👨'], answer: 'بابا کرم', letters: ['ب','ا','ب','ا',' ','ک','ر','م'] },
    { id: 96, emojis: ['🔥', '💧'], answer: 'آب جوش', letters: ['آ','ب',' ','ج','و','ش'] },
    { id: 97, emojis: ['🔵', '🦈'], answer: 'نهنگ آبی', letters: ['ن','ه','ن','گ',' ','آ','ب','ی'] },
    { id: 98, emojis: ['👂', '🤴'], answer: 'شاهگوش', letters: ['ش','ا','ه','گ','و','ش'] },
    { id: 99, emojis: ['🐊', '😢'], answer: 'اشک تمساح', letters: ['ا','ش','ک',' ','ت','م','س','ا','ح'] },
    { id: 100, emojis: ['🧱', '4️⃣'], answer: 'چار دیواری', letters: ['چ','ا','ر',' ','د','ی','و','ا','ر','ی'] },
    { id: 101, emojis: ['🦁', '🦷'], answer: 'دندان شیری', letters: ['د','ن','د','ا','ن',' ','ش','ی','ر','ی'] },
    { id: 102, emojis: ['🧂', '🥒'], answer: 'خیار شور', letters: ['خ','ی','ا','ر',' ','ش','و','ر'] },
    { id: 103, emojis: ['🌳', '👑'], answer: 'سلطان جنگل', letters: ['س','ل','ط','ا','ن',' ','ج','ن','گ','ل'] },
    { id: 104, emojis: ['🪢', '📘'], answer: 'کتابدار', letters: ['ک','ت','ا','ب','د','ا','ر'] },
    { id: 105, emojis: ['👅', '🩹'], answer: 'زخم زبان', letters: ['ز','خ','م',' ','ز','ب','ا','ن'] },
    { id: 106, emojis: ['🧑', '👖'], answer: 'لیمو', letters: ['ل','ی','م','و'] },
    { id: 107, emojis: ['🇨🇳', '🔚'], answer: 'ته چین', letters: ['ت','ه',' ','چ','ی','ن'] },
    { id: 108, emojis: ['🏐', '🧺'], answer: 'بسکتبال', letters: ['ب','س','ک','ت','ب','ا','ل'] },
    { id: 109, emojis: ['🕸', '3️⃣'], answer: 'سه تار', letters: ['س','ه',' ','ت','ا','ر'] },
    { id: 110, emojis: ['🖊', '🥒'], answer: 'خیار قلمی', letters: ['خ','ی','ا','ر',' ','ق','ل','م','ی'] },
    { id: 111, emojis: ['🇨🇳', '🪶'], answer: 'پرچین', letters: ['پ','ر','چ','ی','ن'] },
    { id: 112, emojis: ['🦄', '1️⃣'], answer: 'تک شاخ', letters: ['ت','ک',' ','ش','ا','خ'] },
    { id: 113, emojis: ['🌊', '🥷'], answer: 'دزد دریایی', letters: ['د','ز','د',' ','د','ر','ی','ا','ی','ی'] },
    { id: 114, emojis: ['👷', '👶'], answer: 'بچه مهندس', letters: ['ب','چ','ه',' ','م','ه','ن','د','س'] },
    { id: 115, emojis: ['🪨', '7️⃣'], answer: 'هفت سنگ', letters: ['ه','ف','ت',' ','س','ن','گ'] },
    { id: 116, emojis: ['🏹', '🎨'], answer: 'رنگین کمان', letters: ['ر','ن','گ','ی','ن',' ','ک','م','ا','ن'] },
    { id: 117, emojis: ['🔫', '7️⃣'], answer: 'هفت تیر', letters: ['ه','ف','ت',' ','ت','ی','ر'] },
    { id: 118, emojis: ['🖊', '🔋'], answer: 'باتری قلمی', letters: ['ب','ا','ت','ر','ی',' ','ق','ل','م','ی'] },
    { id: 119, emojis: ['🪨', '🌷'], answer: 'گل سنگ', letters: ['گ','ل',' ','س','ن','گ'] },
    { id: 120, emojis: ['🌕', '🐺'], answer: 'گرگینه', letters: ['گ','ر','گ','ی','ن','ه'] },
    { id: 121, emojis: ['🪨', '🥖'], answer: 'نان سنگک', letters: ['ن','ا','ن',' ','س','ن','گ','ک'] },
    { id: 122, emojis: ['🪜', '🐍'], answer: 'مار پله', letters: ['م','ا','ر',' ','پ','ل','ه'] },
    { id: 123, emojis: ['🔭', '⭐️'], answer: 'ستاره شناس', letters: ['س','ت','ا','ر','ه',' ','ش','ن','ا','س'] },
    { id: 124, emojis: ['🍹', '🍋'], answer: 'لیموناد', letters: ['ل','ی','م','و','ن','ا','د'] },
    { id: 125, emojis: ['🐻', '🧸'], answer: 'عروسک خرسی', letters: ['ع','ر','و','س','ک',' ','خ','ر','س','ی'] },
    { id: 126, emojis: ['🧿', '👁'], answer: 'چشم نظر', letters: ['چ','ش','م',' ','ن','ظ','ر'] },
    { id: 127, emojis: ['🦸', '☁️'], answer: 'ابر قهرمان', letters: ['ا','ب','ر',' ','ق','ه','ر','م','ا','ن'] },
    { id: 128, emojis: ['🥀', '🌹'], answer: 'گل پژمرده', letters: ['گ','ل',' ','پ','ژ','م','ر','د','ه'] },
    { id: 129, emojis: ['🏅', '🔥'], answer: 'آتش نشان', letters: ['آ','ت','ش',' ','ن','ش','ا','ن'] },
    { id: 130, emojis: ['🧮', '🚙'], answer: 'ماشین حساب', letters: ['م','ا','ش','ی','ن',' ','ح','س','ا','ب'] },
    { id: 131, emojis: ['❄️', '🧍'], answer: 'آدم برفی', letters: ['آ','د','م',' ','ب','ر','ف','ی'] },
    { id: 132, emojis: ['👻', '🏠'], answer: 'خانه ارواح', letters: ['خ','ا','ن','ه',' ','ا','ر','و','ا','ح'] },
    { id: 133, emojis: ['🏐', '🦶'], answer: 'فوتبال', letters: ['ف','و','ت','ب','ا','ل'] },
    { id: 134, emojis: ['👂', '🦓'], answer: 'خرگوش', letters: ['خ','ر','گ','و','ش'] },
    { id: 135, emojis: ['🐁', '🪤'], answer: 'تله موش', letters: ['ت','ل','ه',' ','م','و','ش'] }
];

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
let currentName = 'بدون نام';

const GIFT_KEY = 'gift_last_open_v6';
const DAILY_KEY = 'emoji_daily_challenge_v6';
const PROFILE_KEY = 'emoji_profile_v6';
const STORAGE_KEY = 'emojiQuizProgress_v6';

let giftInterval = null;
let dailyChallengeInterval = null;

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

let chatSubscription = null;
let privateSubscription = null;

function loadUsedCodes() {
    try {
        const raw = localStorage.getItem(USED_CODES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function markCodeUsed(code) {
    const used = loadUsedCodes();
    if (!used.includes(code)) {
        used.push(code);
        try { localStorage.setItem(USED_CODES_KEY, JSON.stringify(used)); } catch (e) {}
    }
}

function isCodeUsed(code) {
    return loadUsedCodes().includes(code);
}

function openPayment(key, amount, type) {
    currentPaymentKey = key;
    currentPaymentAmount = amount;
    currentPaymentType = type;
    const input = document.getElementById('tokenInput');
    if (input) { input.value = ''; input.disabled = false; }
    const result = document.getElementById('paymentResult');
    if (result) { result.textContent = ''; result.className = 'payment-result'; }
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    if (target && overlay) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
}

function cancelPaymentToken() {
    const input = document.getElementById('tokenInput');
    if (input) input.value = '';
    const result = document.getElementById('paymentResult');
    if (result) { result.textContent = ''; result.className = 'payment-result'; }
}

function confirmPaymentToken() {
    const input = document.getElementById('tokenInput');
    const result = document.getElementById('paymentResult');
    if (!input || !result) return;
    const code = (input.value || '').trim();
    if (!/^\d{6}$/.test(code)) {
        result.textContent = 'کد باید دقیقاً ۶ رقم باشد.';
        result.className = 'payment-result fail';
        return;
    }
    const validList = purchaseCodes[currentPaymentKey] || [];
    if (!validList.includes(code)) {
        result.textContent = 'کد وارد شده معتبر نیست.';
        result.className = 'payment-result fail';
        return;
    }
    if (isCodeUsed(code)) {
        result.textContent = 'این کد قبلاً استفاده شده است.';
        result.className = 'payment-result fail';
        return;
    }
    markCodeUsed(code);
    if (currentPaymentType === 'coin') {
        currentCoins += currentPaymentAmount;
    } else if (currentPaymentType === 'diamond') {
        currentDiamonds += currentPaymentAmount;
    }
    updateCoinsUI();
    saveProgress();
    result.textContent = currentPaymentAmount + ' ' + (currentPaymentType === 'coin' ? 'سکه' : 'الماس') + ' با موفقیت اضافه شد.';
    result.className = 'payment-result success';
    input.value = '';
    input.disabled = true;
    setTimeout(() => { input.disabled = false; }, 2000);
}

function saveProgress() {
    const progress = {
        currentCoins: currentCoins,
        currentDiamonds: currentDiamonds,
        unlockedLevels: unlockedLevels,
        solvedLevels: solvedLevels,
        currentChapter: currentChapter,
        currentLevelIndex: currentLevelIndex
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
}

function loadProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const p = JSON.parse(saved);
            currentCoins = typeof p.currentCoins === 'number' ? p.currentCoins : 10;
            currentDiamonds = typeof p.currentDiamonds === 'number' ? p.currentDiamonds : 10;
            unlockedLevels = typeof p.unlockedLevels === 'number' ? p.unlockedLevels : 1;
            solvedLevels = p.solvedLevels && typeof p.solvedLevels === 'object' ? p.solvedLevels : {};
            currentChapter = typeof p.currentChapter === 'number' ? p.currentChapter : 1;
            currentLevelIndex = typeof p.currentLevelIndex === 'number' ? p.currentLevelIndex : 0;
        }
    } catch (e) {}
}

function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: currentName, avatarIndex: currentAvatarIndex })); } catch (e) {}
}

function loadProfile() {
    try {
        const saved = localStorage.getItem(PROFILE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            currentName = data.name || 'بدون نام';
            currentAvatarIndex = typeof data.avatarIndex === 'number' ? data.avatarIndex : -1;
        } else {
            currentName = 'بدون نام';
            currentAvatarIndex = -1;
        }
    } catch (e) {
        currentName = 'بدون نام';
        currentAvatarIndex = -1;
    }
}

function updateProfileUI() {
    const nameEl = document.getElementById('profileNameDisplay');
    const avatarEl = document.getElementById('headerAvatar');
    if (nameEl) nameEl.innerText = currentName;
    if (avatarEl) {
        if (currentAvatarIndex >= 0 && avatarImages[currentAvatarIndex]) {
            avatarEl.src = avatarImages[currentAvatarIndex];
        } else {
            avatarEl.src = defaultAvatar;
        }
    }
}

const ICONS = {
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>`
};

function updateCoinsUI() {
    const hc = document.getElementById('header-coins');
    if (hc) hc.innerText = currentCoins;
    const hd = document.getElementById('header-diamonds');
    if (hd) hd.innerText = currentDiamonds;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    if (screenId === 'chapters-screen') renderChapters();
    if (screenId === 'levels-screen') renderLevels();
}

function openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(modalId);
    if (target) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
    if (modalId === 'challenge-modal') initDailyChallenge();
    if (modalId === 'gift-modal') startGiftTimer();
    if (modalId === 'profile-modal') renderAvatars();
    if (modalId === 'chat-modal') initChat();
    if (modalId === 'private-chat-modal') initPrivateChat();
    if (modalId === 'leaderboard-modal') initLeaderboard();
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    if (giftInterval) { clearInterval(giftInterval); giftInterval = null; }
    if (dailyChallengeInterval) { clearInterval(dailyChallengeInterval); dailyChallengeInterval = null; }
}

function openNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    const input = document.getElementById('nameInput');
    if (!overlay || !input) return;
    input.value = currentName === 'بدون نام' ? '' : currentName;
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 200);
}

function closeNameModal() {
    const overlay = document.getElementById('name-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}

function saveName() {
    const input = document.getElementById('nameInput');
    if (!input) return;
    let raw = input.value.trim();
    currentName = raw.length > 0 ? raw : 'بدون نام';
    saveProfile();
    updateProfileUI();
    closeNameModal();
}

function renderAvatars() {
    const row1 = document.getElementById('row1');
    const row2 = document.getElementById('row2');
    const preview = document.getElementById('modalPreview');
    if (!row1 || !row2) return;
    row1.innerHTML = '';
    row2.innerHTML = '';
    avatarImages.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'avatar-item';
        const img = document.createElement('img');
        img.src = src;
        item.appendChild(img);
        item.onclick = () => {
            currentAvatarIndex = idx;
            if (preview) preview.src = src;
            saveProfile();
            updateProfileUI();
        };
        if (idx < 3) row1.appendChild(item);
        else row2.appendChild(item);
    });
    if (preview) preview.src = (currentAvatarIndex >= 0) ? avatarImages[currentAvatarIndex] : defaultAvatar;
}

function startGiftTimer() {
    const giftTimerEl = document.getElementById('giftTimer');
    if (!giftTimerEl) return;
    if (giftInterval) clearInterval(giftInterval);
    updateGiftTimer();
    giftInterval = setInterval(updateGiftTimer, 1000);
}

function updateGiftTimer() {
    const giftTimerEl = document.getElementById('giftTimer');
    if (!giftTimerEl) return;
    const lastOpen = localStorage.getItem(GIFT_KEY);
    if (!lastOpen) { giftTimerEl.textContent = '--:--:--'; return; }
    const elapsed = Date.now() - parseInt(lastOpen);
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) {
        giftTimerEl.textContent = '۰:۰۰:۰۰';
        if (giftInterval) { clearInterval(giftInterval); giftInterval = null; }
        return;
    }
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((remaining % (60 * 1000)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    giftTimerEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
}

function openGift(boxNumber) {
    const lastOpen = localStorage.getItem(GIFT_KEY);
    if (lastOpen) {
        const elapsed = Date.now() - parseInt(lastOpen);
        if (elapsed < 24 * 60 * 60 * 1000) { openModal('attention-modal'); return; }
    }

    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
    const prizes = [
        { type: 'coin', amount: 10, msg: 'تبریک! ۱۰ سکه برنده شدید.' },
        { type: 'empty', amount: 0, msg: 'متاسفانه هیچ جایزه‌ای برنده نشدید.' },
        { type: 'diamond', amount: 10, msg: 'تبریک! ۱۰ الماس برنده شدید.' }
    ];
    const shuffled = [0, 1, 2];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (seed + i * 7) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const prize = prizes[shuffled[boxNumber - 1]] || prizes[0];

    if (prize.type === 'coin') {
        currentCoins += prize.amount;
        updateCoinsUI();
    } else if (prize.type === 'diamond') {
        currentDiamonds += prize.amount;
        updateCoinsUI();
    }

    const msgEl = document.getElementById('giftResultMsg');
    if (msgEl) {
        msgEl.textContent = prize.msg;
        msgEl.style.color = prize.type === 'empty' ? '#f87171' : '#4ade80';
    }

    localStorage.setItem(GIFT_KEY, Date.now().toString());
    saveProgress();
    openModal('gift-result-modal');
}

const dailyQuestions = [
    { emoji1: '🦶', emoji2: '🛌', emoji3: '☕', answer: 'پاتختی' },
    { emoji1: '🅾', emoji2: '2️⃣', emoji3: '😘', answer: 'اتوبوس' },
    { emoji1: '🏠', emoji2: '🆕', emoji3: '🎻', answer: 'خانه نو ساز' },
    { emoji1: '🌹', emoji2: '🪶', emoji3: 'ی', answer: 'گلپری' },
    { emoji1: '💧', emoji2: '🪢', emoji3: '🏠', answer: 'آبدارخانه' },
    { emoji1: '👩', emoji2: 'ج', emoji3: '🪏', answer: 'زنجبیل' },
    { emoji1: '🧹', emoji2: '✋', emoji3: '☕', answer: 'جارو دستی' }
];

function initDailyChallenge() {
    const container = document.getElementById('challengeContent');
    if (!container) return;
    const dayOfMonth = new Date().getDate();
    const questionIndex = (dayOfMonth - 1) % dailyQuestions.length;
    const todayQuestion = dailyQuestions[questionIndex];
    container.innerHTML =
        '<div class="challenge-emoji-row"><span>' + todayQuestion.emoji1 + '</span><span>' + todayQuestion.emoji2 + '</span><span>' + todayQuestion.emoji3 + '</span></div>' +
        '<div class="challenge-timer" id="dailyTimer">--:--:--</div>' +
        '<div class="challenge-input-row">' +
        '<input type="text" id="dailyInput" placeholder="پاسخ..." autocomplete="off">' +
        '<button class="challenge-btn" id="dailySubmitBtn">ثبت</button>' +
        '</div>' +
        '<div class="challenge-result" id="dailyResult"></div>';
    const dailyInput = document.getElementById('dailyInput');
    const dailySubmit = document.getElementById('dailySubmitBtn');
    const dailyResult = document.getElementById('dailyResult');
    const timerEl = document.getElementById('dailyTimer');

    function getDailyState() {
        const saved = localStorage.getItem(DAILY_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const today = new Date().toDateString();
                if (data.date === today) return data;
            } catch (e) {}
        }
        return null;
    }
    function setDailyState(answered, correct) {
        const today = new Date().toDateString();
        localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, answered: answered, correct: correct }));
    }
    const state = getDailyState();
    if (state && state.answered) {
        dailyInput.disabled = true;
        dailySubmit.disabled = true;
        if (state.correct) {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (درست)';
            dailyResult.className = 'challenge-result success';
        } else {
            dailyResult.textContent = 'امروز را پاسخ داده‌اید. (نادرست)';
            dailyResult.className = 'challenge-result fail';
        }
    }
    function updateDailyTimer() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const diff = midnight - now;
        if (diff <= 0) { timerEl.textContent = '۰:۰۰:۰۰'; return; }
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        const pad = (n) => String(n).padStart(2, '0');
        timerEl.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs);
    }
    updateDailyTimer();
    if (dailyChallengeInterval) clearInterval(dailyChallengeInterval);
    dailyChallengeInterval = setInterval(updateDailyTimer, 1000);
    dailySubmit.addEventListener('click', () => {
        if (dailyInput.disabled) return;
        const answer = dailyInput.value.trim();
        if (!answer) { dailyResult.textContent = 'لطفاً پاسخ را وارد کنید.'; dailyResult.className = 'challenge-result'; return; }
        const isCorrect = (answer === todayQuestion.answer);
        setDailyState(true, isCorrect);
        dailyInput.disabled = true;
        dailySubmit.disabled = true;
        if (isCorrect) {
            currentDiamonds += 5;
            updateCoinsUI();
            dailyResult.textContent = 'درست! ۵ الماس دریافت کردید.';
            dailyResult.className = 'challenge-result success';
        } else {
            dailyResult.textContent = 'نادرست. پاسخ صحیح : «' + todayQuestion.answer + '»';
            dailyResult.className = 'challenge-result fail';
        }
        saveProgress();
    });
    dailyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') dailySubmit.click(); });
}

function buildProgressRing(percent) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
        <div class="chapter-progress">
            <svg viewBox="0 0 44 44">
                <circle class="progress-track" cx="22" cy="22" r="${radius}" stroke-width="4" fill="none"/>
                <circle class="progress-value" cx="22" cy="22" r="${radius}" stroke-width="4" fill="none"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            </svg>
            <span class="progress-text-sm">${Math.round(percent)}%</span>
        </div>
    `;
}

function getSolvedInChapter(chapterNum) {
    const chapterStart = (chapterNum - 1) * LEVELS_PER_CHAPTER;
    let count = 0;
    for (let i = chapterStart; i < chapterStart + LEVELS_PER_CHAPTER; i++) {
        if (solvedLevels[i]) count++;
    }
    return count;
}

function isChapterUnlocked(chapterNum) {
    if (chapterNum === 1) return true;
    const prevChapterStart = (chapterNum - 2) * LEVELS_PER_CHAPTER;
    for (let i = prevChapterStart; i < prevChapterStart + LEVELS_PER_CHAPTER; i++) {
        if (!solvedLevels[i]) return false;
    }
    return true;
}

function renderChapters() {
    const chaptersGrid = document.getElementById('chapters-grid');
    if (!chaptersGrid) return;
    let html = '';
    for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
        const isUnlocked = isChapterUnlocked(i);
        const solvedInChapter = getSolvedInChapter(i);
        const percent = (solvedInChapter / LEVELS_PER_CHAPTER) * 100;
        let stageText = "";
        if (i === 1) stageText = "مرحله ۱ تا ۱۵";
        else if (i === 2) stageText = "مرحله ۱۶ تا ۳۰";
        else if (i === 3) stageText = "مرحله ۳۱ تا ۴۵";
        else if (i === 4) stageText = "مرحله ۴۶ تا ۶۰";
        else if (i === 5) stageText = "مرحله ۶۱ تا ۷۵";
        else if (i === 6) stageText = "مرحله ۷۶ تا ۹۰";
        else if (i === 7) stageText = "مرحله ۹۱ تا ۱۰۵";
        else if (i === 8) stageText = "مرحله ۱۰۶ تا ۱۲۰";
        else if (i === 9) stageText = "مرحله ۱۲۱ تا ۱۳۵";
        if (isUnlocked) {
            html += `<div class="chapter-card" onclick="openChapter(${i})"><h3>فصل ${i}</h3><p>${stageText}</p>${buildProgressRing(percent)}</div>`;
        } else {
            html += `<div class="chapter-card locked"><h3>فصل ${i}</h3><p>${stageText}</p><span class="lock-icon">${ICONS.lock}</span></div>`;
        }
    }
    chaptersGrid.innerHTML = html;
}

function openChapter(chapterNum) {
    currentChapter = chapterNum;
    const title = document.getElementById('level-header-title');
    if (title) title.innerText = `فصل ${chapterNum}`;
    saveProgress();
    showScreen('levels-screen');
}

function renderLevels() {
    const levelsGrid = document.getElementById('levels-grid');
    if (!levelsGrid) return;
    levelsGrid.innerHTML = '';
    const chapterStart = (currentChapter - 1) * LEVELS_PER_CHAPTER + 1;
    const chapterEnd = currentChapter * LEVELS_PER_CHAPTER;
    for (let i = chapterStart; i <= chapterEnd; i++) {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'level-card';
        if (i > unlockedLevels) {
            levelDiv.classList.add('locked');
            levelDiv.innerHTML = `<span>${i}</span><span class="lock-icon">${ICONS.lock}</span>`;
        } else {
            if (solvedLevels[i - 1]) {
                levelDiv.classList.add('completed');
                levelDiv.innerHTML = `<span>${i}</span><span class="level-completed-icon">${ICONS.check}</span>`;
            } else {
                levelDiv.classList.add('active-level');
                levelDiv.innerHTML = `<span>${i}</span>`;
            }
            levelDiv.onclick = () => startLevel(i - 1);
        }
        levelsGrid.appendChild(levelDiv);
    }
    const solvedInChapter = getSolvedInChapter(currentChapter);
    const progress = (solvedInChapter / LEVELS_PER_CHAPTER) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${progress}%`;
    const ptext = document.getElementById('progress-text');
    if (ptext) ptext.innerText = `${solvedInChapter} از ${LEVELS_PER_CHAPTER} مرحله حل شده`;
}

function startLevel(index) {
    currentLevelIndex = index;
    removeHintUses = 0;
    const levelData = gameData[index];
    if (!levelData) return;
    const gameLevel = document.getElementById('game-level');
    if (gameLevel) gameLevel.innerText = `مرحله ${index + 1}`;
    const gameChapter = document.getElementById('game-chapter');
    if (gameChapter) gameChapter.innerText = `فصل ${Math.ceil((index + 1) / LEVELS_PER_CHAPTER)}`;
    const emojiContainer = document.getElementById('emoji-question');
    if (emojiContainer) emojiContainer.innerHTML = levelData.emojis.map(e => `<span>${e}</span>`).join('');
    currentWord = levelData.letters;
    currentGuess = new Array(currentWord.length).fill('');
    renderSlots();
    renderKeyboard();
    updateCoinsUI();
    saveProgress();
    showScreen('game-screen');
}

function renderSlots() {
    const slotsContainer = document.getElementById('answer-slots');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '';
    let row = document.createElement('div');
    row.className = 'word-row';
    currentWord.forEach((char, index) => {
        if (char === ' ') {
            slotsContainer.appendChild(row);
            row = document.createElement('div');
            row.className = 'word-row';
        } else {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerText = currentGuess[index];
            slot.onclick = () => removeLetter(index);
            row.appendChild(slot);
        }
    });
    slotsContainer.appendChild(row);
}

function getAvailableLetters(wordArr) {
    let letters = wordArr.filter(c => c !== ' ');
    const extraPool = ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ح', 'ژ', 'چ', 'پ', 'گ', 'ک', 'م', 'ط', 'ظ', 'ذ', 'ز', 'ی', 'س', 'ش', 'ل', 'ت', 'ب'];
    let extraCount = 6;
    let shuffled = extraPool.sort(() => 0.5 - Math.random());
    for (let char of shuffled) {
        if (!letters.includes(char) && extraCount > 0) { letters.push(char); extraCount--; }
    }
    return letters.sort(() => 0.5 - Math.random());
}

function renderKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    keyboard.innerHTML = '';
    const keys = getAvailableLetters(currentWord);
    keys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'key';
        btn.innerText = key;
        btn.onclick = () => handleKeyPress(key, btn);
        keyboard.appendChild(btn);
    });
}

function handleKeyPress(letter, btnElement) {
    let emptyIndex = -1;
    for (let i = 0; i < currentGuess.length; i++) {
        if (currentGuess[i] === '' && currentWord[i] !== ' ') { emptyIndex = i; break; }
    }
    if (emptyIndex !== -1) {
        currentGuess[emptyIndex] = letter;
        renderSlots();
        btnElement.classList.add('used');
        const allFilled = currentGuess.every((g, i) => g !== '' || currentWord[i] === ' ');
        if (allFilled) checkAnswer();
    }
}

function removeLetter(index) {
    if (currentGuess[index] !== '' && currentWord[index] !== ' ') {
        const letter = currentGuess[index];
        currentGuess[index] = '';
        renderSlots();
        document.querySelectorAll('.key').forEach(k => { if (k.innerText === letter) k.classList.remove('used'); });
    }
}

function checkAnswer() {
    const guessClean = currentGuess.join('').replace(/\s+/g, '');
    const answerClean = gameData[currentLevelIndex].answer.replace(/\s+/g, '');
    if (guessClean === answerClean) {
        if (!solvedLevels[currentLevelIndex]) { currentCoins += 5; solvedLevels[currentLevelIndex] = true; }
        if (currentLevelIndex + 1 === unlockedLevels && unlockedLevels < TOTAL_LEVELS) unlockedLevels++;
        updateCoinsUI();
        saveProgress();
        const correctEl = document.getElementById('correct-answer-text');
        if (correctEl) correctEl.innerText = gameData[currentLevelIndex].answer;
        const winModal = document.getElementById('win-modal');
        if (winModal) winModal.classList.add('active');
    } else {
        const board = document.querySelector('.emoji-board');
        if (board) board.classList.add('shake-anim');
        setTimeout(() => {
            if (board) board.classList.remove('shake-anim');
            currentGuess = new Array(currentWord.length).fill('');
            renderSlots();
            document.querySelectorAll('.key').forEach(k => k.classList.remove('used'));
        }, 400);
    }
}

function nextLevel() {
    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.classList.remove('active');
    const chapterLastLevel = currentChapter * LEVELS_PER_CHAPTER - 1;
    if (currentLevelIndex === chapterLastLevel) {
        const ccModal = document.getElementById('chapter-complete-modal');
        if (ccModal) ccModal.classList.add('active');
        return;
    }
    if (currentLevelIndex < TOTAL_LEVELS - 1) startLevel(currentLevelIndex + 1);
    else showScreen('levels-screen');
}

function goToNextChapter() {
    const ccModal = document.getElementById('chapter-complete-modal');
    if (ccModal) ccModal.classList.remove('active');
    if (currentChapter < TOTAL_CHAPTERS) {
        currentChapter++;
        saveProgress();
        startLevel((currentChapter - 1) * LEVELS_PER_CHAPTER);
    }
}

function buyHint(type) {
    if (type === 'remove' && removeHintUses >= 3) return;
    let cost = 0;
    if (type === 'remove') cost = 25;
    if (type === 'letter') cost = 5;
    if (type === 'reveal') cost = 50;
    if (currentCoins >= cost) {
        currentCoins -= cost;
        updateCoinsUI();
        saveProgress();
        if (type === 'reveal') {
            currentGuess = [...currentWord];
            renderSlots();
            checkAnswer();
        } else if (type === 'letter') {
            let emptyIndex = -1;
            for (let i = 0; i < currentGuess.length; i++) {
                if (currentGuess[i] === '' && currentWord[i] !== ' ') { emptyIndex = i; break; }
            }
            if (emptyIndex !== -1) {
                const correctLetter = currentWord[emptyIndex];
                currentGuess[emptyIndex] = correctLetter;
                renderSlots();
                document.querySelectorAll('.key').forEach(k => { if (k.innerText === correctLetter) k.classList.add('used'); });
                const allFilled = currentGuess.every((g, i) => g !== '' || currentWord[i] === ' ');
                if (allFilled) checkAnswer();
            }
        } else if (type === 'remove') {
            removeHintUses++;
            const keys = document.querySelectorAll('.key:not(.used)');
            let removed = 0;
            keys.forEach(k => {
                if (removed < 2 && !currentWord.includes(k.innerText)) { k.classList.add('used'); removed++; }
            });
        }
    } else {
        const ncModal = document.getElementById('no-coin-modal');
        if (ncModal) ncModal.classList.add('active');
    }
}

function checkOnlineStatus() {
    const overlay = document.getElementById('offline-overlay');
    if (!overlay) return;
    if (!navigator.onLine) overlay.classList.add('active');
    else overlay.classList.remove('active');
}

// --- سیستم چت، لیدربورد و پروفایل ---

async function initChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">در حال اتصال...</div>';

    const { data, error } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: true }).limit(50);
    if (error) { chatMessages.innerHTML = 'خطا در اتصال.'; return; }

    chatMessages.innerHTML = data.length === 0 ? '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">هنوز پیامی نیست.</div>' : '';
    data.forEach(msg => appendChatMessage(msg.sender_name, msg.text));

    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatSubscription = supabaseClient.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => appendChatMessage(payload.new.sender_name, payload.new.text)).subscribe();
}

function appendChatMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    if (chatMessages.innerHTML.includes('هنوز پیامی') || chatMessages.innerHTML.includes('در حال اتصال')) chatMessages.innerHTML = '';
    
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 8px; font-size: 0.85rem; align-self: flex-start; width: 100%; word-break: break-word;';
    msgDiv.innerHTML = `<span style="color: #00e5ff; font-weight: bold; font-size: 0.75rem; display: block; margin-bottom: 4px;">${sender}:</span><span>${text}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    await supabaseClient.from('messages').insert([{ text: text, sender_name: currentName }]);
}

async function initPrivateChat() {
    const receiver = document.getElementById('private-receiver').value.trim();
    const privateMessages = document.getElementById('private-messages');
    if (!receiver) { privateMessages.innerHTML = '<div style="text-align: center; color: #f87171; font-size: 0.8rem; margin-top: 10px;">نام کاربری را وارد کنید.</div>'; return; }
    
    privateMessages.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">در حال اتصال...</div>';

    const { data, error } = await supabaseClient
        .from('private_messages')
        .select('*')
        .or(`and(sender_name.eq.${currentName},receiver_name.eq.${receiver}),and(sender_name.eq.${receiver},receiver_name.eq.${currentName})`)
        .order('created_at', { ascending: true });

    if (error) { privateMessages.innerHTML = 'خطا در اتصال.'; return; }

    privateMessages.innerHTML = data.length === 0 ? '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">هنوز پیامی نیست.</div>' : '';
    data.forEach(msg => appendPrivateMessage(msg.sender_name, msg.text));

    if (privateSubscription) supabaseClient.removeChannel(privateSubscription);
    privateSubscription = supabaseClient.channel('private_messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, 
        (payload) => {
            const msg = payload.new;
            if ((msg.sender_name === currentName && msg.receiver_name === receiver) || 
                (msg.sender_name === receiver && msg.receiver_name === currentName)) {
                appendPrivateMessage(msg.sender_name, msg.text);
            }
        }).subscribe();
}

function appendPrivateMessage(sender, text) {
    const privateMessages = document.getElementById('private-messages');
    if (!privateMessages) return;
    if (privateMessages.innerHTML.includes('هنوز پیامی') || privateMessages.innerHTML.includes('در حال اتصال')) privateMessages.innerHTML = '';
    
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 8px; font-size: 0.85rem; align-self: flex-start; width: 100%; word-break: break-word;';
    msgDiv.innerHTML = `<span style="color: #ff4081; font-weight: bold; font-size: 0.75rem; display: block; margin-bottom: 4px;">${sender}:</span><span>${text}</span>`;
    privateMessages.appendChild(msgDiv);
    privateMessages.scrollTop = privateMessages.scrollHeight;
}

async function sendPrivateMessage() {
    const input = document.getElementById('private-input');
    const receiver = document.getElementById('private-receiver').value.trim();
    if (!input || !input.value.trim() || !receiver) return;
    const text = input.value.trim();
    input.value = '';
    await supabaseClient.from('private_messages').insert([{ text: text, sender_name: currentName, receiver_name: receiver }]);
}

async function initLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">در حال دریافت...</div>';

    // برای سادگی، لیدربورد بر اساس جدول `profiles` (که ما ساختیم) کار می‌کند.
    // (ما فعلاً کاری نمی‌کنیم که امتیاز کاربران به طور خودکار در Supabase آپدیت شود،
    // اما شما می‌توانید از API Supabase برای آپدیت پروفایل استفاده کنید)
    const { data, error } = await supabaseClient.from('profiles').select('name, coins').order('coins', { ascending: false }).limit(10);
    if (error) { leaderboardList.innerHTML = 'خطا در دریافت.'; return; }

    if (data.length === 0) {
        leaderboardList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 10px;">هیچ پروفایلی ثبت نشده.</div>';
        return;
    }

    leaderboardList.innerHTML = '';
    data.forEach((profile, index) => {
        const row = document.createElement('div');
        row.style.cssText = 'background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: bold;';
        row.innerHTML = `<span style="color: #f1c40f;">${index + 1}. ${profile.name}</span><span style="color: #fff;">${profile.coins} سکه</span>`;
        leaderboardList.appendChild(row);
    });
}

window.addEventListener('load', () => {
    loadProgress();
    loadProfile();
    updateProfileUI();
    updateCoinsUI();
    renderChapters();
    checkOnlineStatus();

    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            renderChapters();
            showScreen('chapters-screen');
        });
    }

    const offlineBtn = document.getElementById('offline-close-btn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            if (navigator.onLine) checkOnlineStatus();
            else { checkOnlineStatus(); setTimeout(checkOnlineStatus, 100); }
        });
    }

    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmPaymentToken();
        });
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    const privateChatBtn = document.getElementById('private-chat-btn'); // Wait, I added to menu button
    const privateReceiver = document.getElementById('private-receiver');
    if (privateReceiver) {
        privateReceiver.addEventListener('change', initPrivateChat); // Reload chat when user changes receiver
    }

    const privateInput = document.getElementById('private-input');
    if (privateInput) {
        privateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendPrivateMessage();
        });
    }
});

window.addEventListener('offline', checkOnlineStatus);
window.addEventListener('online', checkOnlineStatus);

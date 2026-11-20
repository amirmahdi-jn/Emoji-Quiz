const EYE_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`;

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = EYE_CLOSED;
    } else {
        input.type = 'password';
        btn.innerHTML = EYE_OPEN;
    }
}

function switchAccountTab(tab) {
    document.querySelectorAll('.account-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('account-register-form').style.display = tab === 'register' ? 'flex' : 'none';
    document.getElementById('account-login-form').style.display = tab === 'login' ? 'flex' : 'none';
}

function showAuthMessage(type, title, text) {
    const modal = document.getElementById('auth-message-modal');
    if (!modal) return;
    const iconEl = document.getElementById('auth-message-icon');
    const titleEl = document.getElementById('auth-message-title');
    const textEl = document.getElementById('auth-message-text');
    if (iconEl) {
        iconEl.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    }
    if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = type === 'success' ? '#22c55e' : type === 'error' ? '#f87171' : '#ffffff';
    }
    if (textEl) textEl.textContent = text;
    modal.classList.add('active');
}

function closeAuthMessage() {
    const modal = document.getElementById('auth-message-modal');
    if (modal) modal.classList.remove('active');
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

async function handleRegister() {
    const usernameEl = document.getElementById('reg-username');
    const passwordEl = document.getElementById('reg-password');
    const btn = document.getElementById('register-submit-btn');

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) { showAuthMessage('error', 'خطا', 'لطفاً همه فیلدها را پر کنید.'); return; }
    if (!/^[a-zA-Z0-9]{3,10}$/.test(username)) { showAuthMessage('error', 'خطا', 'نام کاربری باید ۳ تا ۱۰ کاراکتر انگلیسی باشد.'); return; }
    if (password.length < 7) { showAuthMessage('error', 'خطا', 'رمز عبور باید حداقل ۷ کاراکتر باشد.'); return; }
    if (!/^[A-Za-z0-9_.]+$/.test(password)) { showAuthMessage('error', 'خطا', 'رمز فقط می‌تواند شامل حروف، اعداد، _ و . باشد.'); return; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) { showAuthMessage('error', 'خطا', 'رمز باید ترکیبی از حروف بزرگ، کوچک و اعداد باشد.'); return; }

    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ثبت نام...'; }

    try {
        let userId = window.currentUserId;
        let isAnon = window.currentUserIsAnonymous;

        if (!userId) {
            const { data } = await supabaseClient.auth.signInAnonymously();
            if (!data.user) throw new Error('اتصال برقرار نشد.');
            userId = data.user.id;
            isAnon = true;
            window.currentUserId = userId;
            window.currentUserIsAnonymous = true;
        }

        if (isAnon === false) {
            showAuthMessage('error', 'خطا', 'شما قبلاً ثبت‌نام کرده‌اید.');
            return;
        }

        const email = username + '@game.local';
        const { error: authError } = await supabaseClient.auth.updateUser({ email, password });
        if (authError) throw authError;

        const { error: profileError } = await supabaseClient.from('profiles').update({ name: username }).eq('user_id', userId);
        if (profileError) throw new Error('خطا در ذخیره نام کاربری');

        currentName = username;
        window.currentUserIsAnonymous = false;
        updateProfileUI();

        const badge = document.getElementById('profileAccountBadge');
        if (badge) badge.innerHTML = `<span style="color:#22c55e;">● حساب ثبت‌شده</span>`;

        usernameEl.value = '';
        passwordEl.value = '';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }

        closeModal();
        showAuthMessage('success', 'ثبت نام موفق', 'حساب شما با موفقیت ایجاد شد.');
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        showAuthMessage('error', 'خطا در ثبت نام', e.message || 'مشکل نامشخص');
    }
}

async function handleLogin() {
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    const btn = document.getElementById('login-submit-btn');

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) { showAuthMessage('error', 'خطا', 'لطفاً همه فیلدها را پر کنید.'); return; }

    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'در حال ورود...'; }

    try {
        const email = username + '@game.local';
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await loadProfile();
        updateProfileUI();
        updateCoinsUI();
        renderChapters();

        usernameEl.value = '';
        passwordEl.value = '';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }

        closeModal();
        showAuthMessage('success', 'ورود موفق', 'خوش آمدید!');
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        showAuthMessage('error', 'خطا در ورود', 'نام کاربری یا رمز عبور اشتباه است.');
    }
}

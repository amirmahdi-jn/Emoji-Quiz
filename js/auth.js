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
    document.getElementById('account-register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('account-login-form').style.display = tab === 'login' ? 'block' : 'none';
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !password) { alert('لطفاً همه فیلدها را پر کنید.'); return; }
    if (!/^[a-zA-Z0-9]{3,10}$/.test(username)) { alert('نام کاربری باید ۳ تا ۱۰ کاراکتر انگلیسی باشد.'); return; }
    if (password.length < 7) { alert('رمز عبور باید حداقل ۷ کاراکتر باشد.'); return; }
    if (!/^[A-Za-z0-9_.]+$/.test(password)) { alert('رمز فقط می‌تواند شامل حروف، اعداد، _ و . باشد.'); return; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) { alert('رمز باید ترکیبی از حروف بزرگ، کوچک و اعداد باشد.'); return; }

    try {
        let user = await getCurrentUser();
        if (!user) {
            const { data } = await supabaseClient.auth.signInAnonymously();
            user = data.user;
        }
        if (!user) throw new Error('اتصال برقرار نشد.');
        if (!user.is_anonymous) { alert('شما قبلاً ثبت‌نام کرده‌اید.'); return; }

        const email = username + '@game.local';
        const { error } = await supabaseClient.auth.updateUser({ email, password });
        if (error) throw error;

        await supabaseClient.from('profiles').update({ name: username }).eq('user_id', user.id);

        alert('ثبت نام با موفقیت انجام شد!');
        closeModal();
        location.reload();
    } catch (e) {
        alert('خطا در ثبت نام: ' + (e.message || 'مشکل نامشخص'));
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) { alert('لطفاً همه فیلدها را پر کنید.'); return; }

    try {
        const email = username + '@game.local';
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        alert('ورود موفق!');
        closeModal();
        location.reload();
    } catch (e) {
        alert('نام کاربری یا رمز عبور اشتباه است.');
    }
}

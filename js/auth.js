async function registerWithUsername(username, password) {
    const email = username + '@game.local';
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ name: username })
        .eq('user_id', data.user.id);
    if (profileError) throw profileError;
    return data.user;
}

async function loginWithUsername(username, password) {
    const email = username + '@game.local';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

async function signInAsGuest() {
    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
}

async function logoutAccount() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

function switchAccountTab(tab) {
    document.querySelectorAll('.account-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('account-register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('account-login-form').style.display = tab === 'login' ? 'block' : 'none';
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !password) { alert('لطفا همه فیلدها را پر کنید.'); return; }
    if (password.length < 8) { alert('رمز عبور باید حداقل 8 کاراکتر باشد.'); return; }
    if (!/^[A-Za-z0-9_.]+$/.test(password)) { alert('رمز عبور فقط می‌تواند شامل حروف انگلیسی، اعداد، _ و . باشد.'); return; }
    try {
        await registerWithUsername(username, password);
        alert('ثبت نام با موفقیت انجام شد.');
        closeModal();
        location.reload();
    } catch (e) {
        alert('خطا در ثبت نام: ' + e.message);
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) { alert('لطفا همه فیلدها را پر کنید.'); return; }
    try {
        await loginWithUsername(username, password);
        alert('ورود موفق.');
        closeModal();
        location.reload();
    } catch (e) {
        alert('نام کاربری یا رمز عبور اشتباه است.');
    }
}

async function handleLogout() {
    await logoutAccount();
}

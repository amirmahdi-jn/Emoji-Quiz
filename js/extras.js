function closeSimpleModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
    const overlay = document.getElementById('modal-overlay');
    if (overlay && !overlay.querySelector('.modal-box.active')) overlay.classList.remove('active');
    document.body.style.pointerEvents = '';
}

function closeNoCoinModal() {
    closeSimpleModal('no-coin-modal');
}

function closeNoDiamondModal() {
    closeSimpleModal('no-diamond-modal');
}

let onlineStatusCheckId = 0;

async function checkOnlineStatus() {
    const overlay = document.getElementById('offline-overlay');
    if (!overlay) return false;

    const checkId = ++onlineStatusCheckId;
    let isConnected = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
            method: 'GET',
            headers: { apikey: SUPABASE_ANON_KEY },
            cache: 'no-store',
            signal: controller.signal
        });
        isConnected = true;
    } catch (error) {
        isConnected = false;
    } finally {
        clearTimeout(timeoutId);
    }

    if (checkId !== onlineStatusCheckId) return isConnected;

    if (!isConnected) {
        overlay.classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        return false;
    }

    overlay.classList.remove('active');
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && !document.querySelector('.screen.active')) mainMenu.classList.add('active');
    return true;
}

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

function checkOnlineStatus() {
    const overlay = document.getElementById('offline-overlay');
    if (!overlay) return;
    if (!navigator.onLine) {
        overlay.classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    } else {
        overlay.classList.remove('active');
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu && !document.querySelector('.screen.active')) mainMenu.classList.add('active');
    }
}

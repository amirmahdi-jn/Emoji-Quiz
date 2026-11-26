let modalPriority = 2147483000;

function bringModalToFront(element) {
    if (!element) return;
    const root = element.matches('.modal-box')
        ? document.getElementById('modal-overlay')
        : element.closest('#modal-overlay, .modal, #name-modal-overlay, #alert-modal, #duplicate-alert-modal, #offline-overlay, .ttt-result-overlay, .chat-custom-modal');
    if (!root || !root.classList.contains('active')) return;
    modalPriority += 1;
    root.style.setProperty('z-index', String(modalPriority), 'important');
}

const modalObserver = new MutationObserver(records => {
    records.forEach(record => {
        if (record.type === 'attributes' && record.attributeName === 'class') {
            const element = record.target;
            if (element.classList.contains('active')) bringModalToFront(element);
            return;
        }
        if (record.type === 'childList') {
            record.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.classList.contains('active')) bringModalToFront(node);
                node.querySelectorAll('.active').forEach(element => bringModalToFront(element));
            });
        }
    });
});

modalObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    childList: true,
    subtree: true
});

document.addEventListener('click', event => {
    const element = event.target.closest('#modal-overlay, .modal, #name-modal-overlay, #alert-modal, #duplicate-alert-modal, #offline-overlay, .ttt-result-overlay, .chat-custom-modal');
    if (element) bringModalToFront(element);
}, true);

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

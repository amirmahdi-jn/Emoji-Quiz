const modalLayerSelector = '#modal-overlay, .modal, #name-modal-overlay, #alert-modal, #duplicate-alert-modal, #offline-overlay, .ttt-result-overlay, .chat-custom-modal, .private-chat-window, [role="dialog"], [aria-modal="true"]';
let modalPriority = 1000;

function getModalLayer(element) {
    if (!(element instanceof Element)) return null;
    const modalBox = element.closest('.modal-box');
    if (modalBox) return modalBox.closest('#modal-overlay') || modalBox;
    return element.closest(modalLayerSelector);
}

function isModalLayerVisible(layer) {
    if (!layer || layer.hasAttribute('hidden')) return false;
    if (layer.classList.contains('active')) return true;
    const style = getComputedStyle(layer);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function bringModalToFront(element) {
    const layer = getModalLayer(element);
    if (!isModalLayerVisible(layer)) return;

    if (modalPriority >= 2147483000) {
        modalPriority = 1000;
        document.querySelectorAll(modalLayerSelector).forEach(item => {
            if (isModalLayerVisible(item)) {
                modalPriority += 1;
                item.style.setProperty('z-index', String(modalPriority), 'important');
            } else {
                item.style.removeProperty('z-index');
            }
        });
    }

    modalPriority += 1;
    layer.style.setProperty('z-index', String(modalPriority), 'important');
}

const modalObserver = new MutationObserver(records => {
    records.forEach(record => {
        if (record.type === 'childList') {
            record.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                bringModalToFront(node);
                node.querySelectorAll(modalLayerSelector + ', .modal-box.active').forEach(item => bringModalToFront(item));
            });
            return;
        }

        const layer = getModalLayer(record.target);
        if (layer && isModalLayerVisible(layer)) bringModalToFront(record.target);
    });
});

modalObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'hidden', 'aria-hidden'],
    childList: true,
    subtree: true
});

document.addEventListener('click', event => {
    bringModalToFront(event.target);
}, true);

document.querySelectorAll(modalLayerSelector).forEach(layer => {
    if (isModalLayerVisible(layer)) bringModalToFront(layer);
});

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

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

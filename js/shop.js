function openPayment(key, amount, type) {
    currentPaymentKey = key;
    currentPaymentAmount = amount;
    currentPaymentType = type;
    document.querySelectorAll('.modal-box, .guide-modal-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    if (target && overlay) {
        target.classList.add('active');
        overlay.classList.add('active');
    }
}

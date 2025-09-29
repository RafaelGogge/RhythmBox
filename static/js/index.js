document.addEventListener('DOMContentLoaded', function() {
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', function() {
            enterBtn.disabled = true;
            enterBtn.textContent = 'Entrando...';
            setTimeout(() => {
                window.location.href = '/buscar';
            }, 600);
        });
    }
});

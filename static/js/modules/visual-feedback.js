/**
 * Módulo de feedback visual
 * Gerencia notificações, toasts e alertas
 */

export class VisualFeedback {
    /**
     * Exibe notificação de sucesso ao favoritar
     * @param {string} trackName - Nome da música
     */
    static showFavoriteSuccess(trackName) {
        Swal.fire({
            icon: 'success',
            title: 'Favorito adicionado!',
            html: `<strong>${trackName}</strong> foi adicionado aos favoritos.`,
            showConfirmButton: false,
            timer: 1800,
            background: '#fffbe6',
            color: '#222',
            customClass: {
                popup: 'shadow-lg rounded',
                title: 'fw-bold',
            }
        });
    }

    /**
     * Exibe notificação de erro
     * @param {string} title - Título do erro
     * @param {string} message - Mensagem de erro
     */
    static showError(title, message) {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            showConfirmButton: true
        });
    }

    /**
     * Exibe toast genérico
     * @param {string} message - Mensagem
     * @param {string} type - Tipo: 'success' ou 'error'
     */
    static showToast(message, type = 'success') {
        const toast = document.getElementById('feedbackToast');
        if (!toast) return;

        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header strong');
        const toastIcon = toast.querySelector('.toast-header i');

        toastBody.textContent = message;
        toast.classList.remove('error', 'success');

        if (type === 'error') {
            toast.classList.add('error');
            toastHeader.textContent = 'Erro';
            toastIcon.className = 'bi bi-exclamation-circle-fill text-danger me-2';
        } else {
            toast.classList.add('success');
            toastHeader.textContent = 'Sucesso';
            toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
        }

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    /**
     * Atualiza estado visual do botão
     * @param {HTMLElement} button - Botão a ser atualizado
     * @param {boolean} isFavorited - Se está favoritado
     */
    static updateFavoriteButton(button, isFavorited) {
        const icon = button.querySelector('i');
        if (!icon) return;

        if (isFavorited) {
            button.classList.add('favorited');
            icon.classList.remove('bi-heart');
            icon.classList.add('bi-heart-fill');
        } else {
            button.classList.remove('favorited');
            icon.classList.remove('bi-heart-fill');
            icon.classList.add('bi-heart');
        }
    }
}

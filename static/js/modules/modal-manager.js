/**
 * Módulo de gerenciamento de modais
 * Controla criação, exibição e fechamento de modais
 */

export class ModalManager {
    constructor() {
        this.activeModals = new Map();
    }

    /**
     * Cria e exibe modal de confirmação
     * @param {Object} config - Configuração do modal
     * @returns {Promise<boolean>} Promessa que resolve com true se confirmado
     */
    showConfirmationModal(config) {
        return new Promise((resolve) => {
            const modalId = `modal-${Date.now()}`;
            const modalHTML = this.createConfirmationModalHTML(config, modalId);

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const modal = document.getElementById(modalId);
            const cancelBtn = modal.querySelector('.modal-cancel-btn');
            const confirmBtn = modal.querySelector('.modal-confirm-btn');

            // Armazenar referência
            this.activeModals.set(modalId, modal);

            // Mostrar modal com animação
            setTimeout(() => modal.classList.add('active'), 10);

            // Função para fechar modal
            const closeModal = (confirmed = false) => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    this.activeModals.delete(modalId);
                }, 300);
                resolve(confirmed);
            };

            // Event listeners
            cancelBtn.addEventListener('click', () => closeModal(false));
            confirmBtn.addEventListener('click', () => closeModal(true));

            // Fechar ao clicar no backdrop
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(false);
            });

            // Fechar com ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Cria HTML do modal de confirmação
     * @param {Object} config - Configuração do modal
     * @param {string} modalId - ID único do modal
     * @returns {string} HTML do modal
     */
    createConfirmationModalHTML(config, modalId) {
        const {
            icon = 'warning',
            title = 'Confirmar ação',
            message = 'Você tem certeza?',
            details = null,
            warning = null,
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            confirmClass = 'modal-confirm-btn',
            cancelClass = 'modal-cancel-btn'
        } = config;

        const iconSVG = this.getIconSVG(icon);

        return `
            <div class="delete-modal-overlay" id="${modalId}">
                <div class="delete-modal-container">
                    <div class="delete-modal-icon">
                        ${iconSVG}
                    </div>
                    <h3 class="delete-modal-title">${this.escapeHtml(title)}</h3>
                    ${details ? `<p class="delete-modal-playlist-name">"${this.escapeHtml(details)}"</p>` : ''}
                    <div class="delete-modal-message">
                        <p>${this.escapeHtml(message)}</p>
                        ${warning ? `
                            <p class="delete-modal-warning">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                                    <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                                </svg>
                                ${this.escapeHtml(warning)}
                            </p>
                        ` : ''}
                    </div>
                    <div class="delete-modal-actions">
                        <button class="delete-modal-btn ${cancelClass} modal-cancel-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            ${this.escapeHtml(cancelText)}
                        </button>
                        <button class="delete-modal-btn ${confirmClass} modal-confirm-btn">
                            ${this.getConfirmIconSVG()}
                            ${this.escapeHtml(confirmText)}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cria e exibe modal informativo
     * @param {Object} config - Configuração do modal
     */
    showInfoModal(config) {
        const {
            icon = 'info',
            title = 'Informação',
            message = '',
            buttonText = 'OK'
        } = config;

        const modalId = `info-modal-${Date.now()}`;
        const iconSVG = this.getIconSVG(icon);

        const modalHTML = `
            <div class="delete-modal-overlay" id="${modalId}">
                <div class="delete-modal-container">
                    <div class="delete-modal-icon">
                        ${iconSVG}
                    </div>
                    <h3 class="delete-modal-title">${this.escapeHtml(title)}</h3>
                    <div class="delete-modal-message">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="delete-modal-actions">
                        <button class="delete-modal-btn delete-modal-cancel modal-ok-btn">
                            ${this.escapeHtml(buttonText)}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById(modalId);
        const okBtn = modal.querySelector('.modal-ok-btn');

        this.activeModals.set(modalId, modal);

        setTimeout(() => modal.classList.add('active'), 10);

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                this.activeModals.delete(modalId);
            }, 300);
        };

        okBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Fecha todos os modais ativos
     */
    closeAllModals() {
        this.activeModals.forEach((modal) => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
        this.activeModals.clear();
    }

    /**
     * Obtém SVG do ícone baseado no tipo
     * @param {string} type - Tipo de ícone
     * @returns {string} SVG do ícone
     */
    getIconSVG(type) {
        const icons = {
            warning: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>',
            error: '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>',
            success: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
            info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
            delete: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'
        };

        const path = icons[type] || icons.info;
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                ${path}
            </svg>
        `;
    }

    /**
     * Obtém SVG do ícone de confirmação
     * @returns {string} SVG do ícone
     */
    getConfirmIconSVG() {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        `;
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

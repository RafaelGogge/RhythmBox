/**
 * Módulo de gerenciamento de estados de carregamento
 * Controla spinners, skeletons e feedback visual de loading
 */

export class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
    }

    /**
     * Mostra indicador de carregamento normal
     * @param {string} containerId - ID do container
     * @param {Object} options - Opções de configuração
     */
    show(containerId, options = {}) {
        const {
            type = 'spinner', // 'spinner' ou 'skeleton'
            message = 'Carregando...',
            overlay = true
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return;

        const loaderId = `loader-${Date.now()}`;
        const loaderHTML = type === 'skeleton'
            ? this.createSkeletonLoader(message)
            : this.createSpinnerLoader(message, overlay);

        container.insertAdjacentHTML('beforeend', loaderHTML);

        const loader = container.querySelector('.loading-indicator');
        if (loader) {
            loader.dataset.loaderId = loaderId;
            this.activeLoaders.set(loaderId, { container, loader });
        }

        return loaderId;
    }

    /**
     * Mostra indicador de carregamento de todas as músicas
     * @param {string} containerId - ID do container
     */
    showLoadingAll(containerId) {
        return this.show(containerId, {
            type: 'spinner',
            message: `
                <div style="text-align: center; margin-top: 1rem;">
                    <strong>Carregando todas as músicas...</strong>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                        Isso pode levar alguns segundos
                    </p>
                </div>
            `,
            overlay: true
        });
    }

    /**
     * Remove indicador de carregamento
     * @param {string} loaderId - ID do loader ou container
     */
    hide(loaderId) {
        // Tentar remover por ID do loader
        if (this.activeLoaders.has(loaderId)) {
            const { loader } = this.activeLoaders.get(loaderId);
            if (loader) {
                loader.remove();
            }
            this.activeLoaders.delete(loaderId);
            return;
        }

        // Tentar remover por ID do container
        const container = document.getElementById(loaderId);
        if (container) {
            const loaders = container.querySelectorAll('.loading-indicator');
            loaders.forEach(loader => loader.remove());
        }
    }

    /**
     * Remove todos os loaders ativos
     */
    hideAll() {
        this.activeLoaders.forEach(({ loader }) => {
            if (loader) loader.remove();
        });
        this.activeLoaders.clear();
    }

    /**
     * Cria loader com spinner
     * @param {string} message - Mensagem de carregamento
     * @param {boolean} overlay - Se deve ter overlay
     * @returns {string} HTML do loader
     */
    createSpinnerLoader(message, overlay) {
        const overlayClass = overlay ? 'with-overlay' : '';

        return `
            <div class="loading-indicator ${overlayClass}">
                <div class="loading-content">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <div class="loading-message">${message}</div>
                </div>
            </div>
        `;
    }

    /**
     * Cria loader com skeleton
     * @param {string} message - Mensagem de carregamento
     * @returns {string} HTML do skeleton
     */
    createSkeletonLoader(message) {
        return `
            <div class="loading-indicator skeleton-loader">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
                <div class="skeleton-grid">
                    ${Array(6).fill(0).map(() => `
                        <div class="skeleton-card">
                            <div class="skeleton skeleton-image"></div>
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-text short"></div>
                        </div>
                    `).join('')}
                </div>
                ${message ? `<div class="skeleton-message">${message}</div>` : ''}
            </div>
        `;
    }

    /**
     * Mostra loading em um botão
     * @param {HTMLElement} button - Botão
     * @param {string} loadingText - Texto durante loading
     * @returns {Function} Função para restaurar estado original
     */
    buttonLoading(button, loadingText = 'Carregando...') {
        if (!button) return () => { };

        const originalText = button.innerHTML;
        const originalDisabled = button.disabled;

        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${loadingText}
        `;

        // Retorna função para restaurar estado
        return () => {
            button.disabled = originalDisabled;
            button.innerHTML = originalText;
        };
    }

    /**
     * Executa ação com loading automático
     * @param {Function} action - Função assíncrona a executar
     * @param {string} containerId - ID do container
     * @param {Object} options - Opções de loading
     * @returns {Promise} Resultado da ação
     */
    async withLoading(action, containerId, options = {}) {
        const loaderId = this.show(containerId, options);

        try {
            const result = await action();
            return result;
        } finally {
            this.hide(loaderId);
        }
    }

    /**
     * Cria barra de progresso
     * @param {string} containerId - ID do container
     * @param {number} progress - Progresso (0-100)
     * @returns {string} ID da barra de progresso
     */
    showProgress(containerId, progress = 0) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const progressId = `progress-${Date.now()}`;
        const progressHTML = `
            <div class="progress-indicator" data-progress-id="${progressId}">
                <div class="progress">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${progress}%"
                         aria-valuenow="${progress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${progress}%
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', progressHTML);
        return progressId;
    }

    /**
     * Atualiza progresso
     * @param {string} progressId - ID da barra de progresso
     * @param {number} progress - Novo progresso (0-100)
     */
    updateProgress(progressId, progress) {
        const indicator = document.querySelector(`[data-progress-id="${progressId}"]`);
        if (!indicator) return;

        const progressBar = indicator.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            progressBar.textContent = `${progress}%`;
        }
    }

    /**
     * Remove barra de progresso
     * @param {string} progressId - ID da barra de progresso
     */
    hideProgress(progressId) {
        const indicator = document.querySelector(`[data-progress-id="${progressId}"]`);
        if (indicator) {
            indicator.remove();
        }
    }
}

/**
 * Módulo de efeitos visuais para botões de perfil
 * Gerencia auto-click com barra de progresso
 */

export class ProfileButtonEffects {
    constructor() {
        this.hoverTimer = null;
        this.progressBar = null;
    }

    /**
     * Inicializa efeitos nos botões de perfil
     */
    init() {
        const spotifyButton = document.querySelector('.btn-spotify-profile');
        const youtubeButton = document.querySelector('.btn-youtube-profile');

        if (spotifyButton) this.attachEvents(spotifyButton);
        if (youtubeButton) this.attachEvents(youtubeButton);
    }

    /**
     * Cria barra de progresso horizontal
     * @param {HTMLElement} button - Elemento do botão
     */
    createProgressBar(button) {
        // Remove barra anterior se existir
        if (this.progressBar) {
            this.progressBar.remove();
        }

        // Cria nova barra de progresso
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'auto-click-progress-bar';

        button.appendChild(this.progressBar);

        // Force reflow para iniciar animação
        this.progressBar.offsetHeight;
        this.progressBar.classList.add('filling');

        return this.progressBar;
    }
}

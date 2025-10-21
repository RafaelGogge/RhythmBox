// =============================
// RhythmBox - buscar.js
// JS da tela inicial, organizado e comentado
// =============================

import { ProfileButtonEffects } from './modules/buscar-visual-effects.js';
import { FavoritesAPI } from './modules/buscar-api.js';
import { VisualFeedback } from './modules/visual-feedback.js';

// Instâncias dos módulos
const favoritesAPI = new FavoritesAPI();

/**
 * Adiciona uma música aos favoritos via AJAX e exibe feedback visual.
 * @param {string} trackId - ID da música
 * @param {string} trackName - Nome da música
 * @param {HTMLElement} button - Elemento do botão clicado
 */
async function favoritarMusica(trackId, trackName, button) {
    // Previne múltiplos cliques
    if (button.disabled) return;
    button.disabled = true;

    const result = await favoritesAPI.addToFavorites(trackId);

    if (result.success) {
        // Atualiza visual do botão
        VisualFeedback.updateFavoriteButton(button, true);

        // Mostra feedback de sucesso
        VisualFeedback.showFavoriteSuccess(trackName);

        // Reativa o botão após um tempo
        setTimeout(() => {
            button.disabled = false;
        }, 2000);
    } else {
        button.disabled = false;
        VisualFeedback.showError('Erro ao favoritar', result.message);
    }
}

// =============================
// Inicialização
// =============================

document.addEventListener('DOMContentLoaded', function () {
    // Inicializa efeitos visuais dos botões de perfil
    const profileEffects = new ProfileButtonEffects();
    profileEffects.init();
});

// Expor função globalmente para uso em HTML
window.favoritarMusica = favoritarMusica;

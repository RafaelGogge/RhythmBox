/**
 * Módulo de efeitos visuais 3D para cards de playlist
 * Gerencia parallax, flip e animações
 */

export class Playlist3DEffects {
    /**
     * Atualiza posição do ponteiro para parallax
     * @param {HTMLElement} card - Card da playlist
     * @param {PointerEvent} event - Evento do mouse
     */
    static updateCardPointer(card, event) {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calcula posição relativa (-1 a 1)
        const ratioX = (x / rect.width - 0.5) * 2;
        const ratioY = (y / rect.height - 0.5) * 2;

        // Limita valores
        const pointerX = Math.max(-1, Math.min(1, ratioX));
        const pointerY = Math.max(-1, Math.min(1, ratioY));

        // Atualiza variáveis CSS
        card.style.setProperty('--pointer-x', pointerX.toFixed(2));
        card.style.setProperty('--pointer-y', pointerY.toFixed(2));
    }

    /**
     * Reseta posição do card para estado padrão
     * @param {HTMLElement} card - Card da playlist
     */
    static resetCardPosition(card) {
        card.style.setProperty('--pointer-x', '0');
        card.style.setProperty('--pointer-y', '0');
    }

    /**
     * Vira o card (flip)
     * @param {HTMLElement} cardContent - Conteúdo do card
     */
    static flipCard(cardContent) {
        cardContent.classList.toggle('flipped');
    }

    /**
     * Ativa card com animação progressiva
     * @param {HTMLElement} item - Item da lista
     * @param {number} delay - Delay em ms
     */
    static activateCard(item, delay = 0) {
        setTimeout(() => {
            const card = item.querySelector('.playlist-card-3d');
            if (!card) return;

            // Remove o glare após a animação inicial
            setTimeout(() => {
                const glare = card.querySelector('.card-3d-glare');
                if (glare) {
                    glare.style.display = 'none';
                }
            }, 650);

            // Ativa interatividade
            setTimeout(() => {
                card.dataset.active = 'true';
            }, 800);
        }, delay);
    }

    /**
     * Mostra menu de opções com animação
     * @param {HTMLElement} menu - Menu de opções
     * @param {HTMLElement} card - Card da playlist
     */
    static showOptionsMenu(menu, card) {
        menu.style.display = 'flex';
        setTimeout(() => {
            menu.classList.add('active');
        }, 10);
    }

    /**
     * Esconde menu de opções com animação
     * @param {HTMLElement} menu - Menu de opções
     * @param {HTMLElement} card - Card da playlist
     */
    static hideOptionsMenu(menu, card) {
        menu.classList.remove('active');
        setTimeout(() => {
            menu.style.display = 'none';
            if (card) {
                card.classList.remove('menu-open');
            }
        }, 300);
    }
}

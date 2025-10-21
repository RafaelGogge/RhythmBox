/**
 * Módulo de funções utilitárias
 * Funções auxiliares usadas em toda aplicação
 */

export class Utils {
    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Capitaliza nome (primeira letra maiúscula)
     * @param {string} name - Nome em minúsculas
     * @returns {string} Nome capitalizado
     */
    static capitalizeName(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Debounce - limita execução de função
     * @param {Function} func - Função a ser executada
     * @param {number} delay - Delay em ms
     * @returns {Function} Função com debounce
     */
    static debounce(func, delay = 300) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Formata número com separador de milhares
     * @param {number} num - Número a formatar
     * @returns {string} Número formatado
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    /**
     * Verifica se elemento está visível no viewport
     * @param {HTMLElement} element - Elemento a verificar
     * @returns {boolean} Se está visível
     */
    static isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

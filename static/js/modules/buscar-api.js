/**
 * Módulo de API para gerenciamento de favoritos
 * Lida com chamadas ao servidor e validações
 */

export class FavoritesAPI {
    constructor() {
        this.endpoint = '/favoritos';
    }

    /**
     * Adiciona uma música aos favoritos
     * @param {string} trackId - ID da música
     * @returns {Promise<Object>} Resposta da API
     */
    async addToFavorites(trackId) {
        try {
            const response = await axios.post(`${this.endpoint}/add/${trackId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error,
                message: this.extractErrorMessage(error)
            };
        }
    }

    /**
     * Remove uma música dos favoritos
     * @param {string} trackId - ID da música
     * @returns {Promise<Object>} Resposta da API
     */
    async removeFromFavorites(trackId) {
        try {
            const response = await axios.post(`${this.endpoint}/remove/${trackId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error,
                message: this.extractErrorMessage(error)
            };
        }
    }

    /**
     * Extrai mensagem de erro da resposta
     * @param {Error} error - Objeto de erro
     * @returns {string} Mensagem de erro
     */
    extractErrorMessage(error) {
        if (error.response && error.response.data && error.response.data.message) {
            return error.response.data.message;
        }
        return 'Não foi possível completar a operação.';
    }
}

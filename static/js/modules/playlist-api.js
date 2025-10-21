/**
 * Módulo de API para gerenciamento de playlists
 * Lida com operações CRUD de playlists
 */

export class PlaylistAPI {
    constructor() {
        this.endpoint = '/playlists';
    }

    /**
     * Remove playlist (apenas da visualização)
     * @param {string} playlistId - ID da playlist
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async deletePlaylist(playlistId) {
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `${this.endpoint}/delete/${playlistId}`;
            document.body.appendChild(form);
            form.submit();
            return true;
        } catch (error) {
            console.error('Erro ao remover playlist:', error);
            return false;
        }
    }

    /**
     * Redireciona para edição de playlist
     * @param {string} playlistId - ID da playlist
     */
    navigateToEdit(playlistId) {
        window.location.href = `${this.endpoint}/edit/${playlistId}`;
    }

    /**
     * Redireciona para adicionar músicas
     * @param {string} playlistId - ID da playlist
     */
    navigateToAdd(playlistId) {
        window.location.href = `${this.endpoint}/${playlistId}/add`;
    }

    /**
     * Redireciona para visualizar playlist
     * @param {string} url - URL da playlist
     */
    navigateToView(url) {
        window.location.href = url;
    }
}




// =============================
// RhythmBox - buscar.js
// JS da tela inicial, organizado e comentado
// =============================

/**
 * Adiciona uma música aos favoritos via AJAX e exibe feedback visual.
 * @param {string} trackId - ID da música
 * @param {string} trackName - Nome da música
 */
function favoritarMusica(trackId, trackName) {
    axios.post('/adicionar_favorito', new URLSearchParams({track_id: trackId}))
        .then(function(response) {
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
        })
        .catch(function(error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao favoritar',
                text: 'Não foi possível adicionar aos favoritos.',
                showConfirmButton: true
            });
        });
}

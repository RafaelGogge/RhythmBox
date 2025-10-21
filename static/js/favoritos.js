/* ============================= */
/* FAVORITOS.JS                 */
/* Gerenciamento de favoritos   */
/* ============================= */

/* ========================================
   VARIÁVEIS GLOBAIS
   ======================================== */

// Filtros e Busca
let allArtists = []; // Lista de artistas únicos da página atual

// Paginação (inicializada com dados do servidor)
let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;
let totalPages = 1;

/* ========================================
   INICIALIZAÇÃO
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
    console.log('🎵 Inicializando página de favoritos...');

    // Carregar dados de paginação do servidor
    loadPaginationData();

    // Inicializar componentes
    extractArtists();
    initializeArtistFilter();
    initializeSearch();
    initializeRemoveButtons();
    initializeSorting();
    initializePagination();

    console.log('✅ Favoritos.js carregado com sucesso!');
});

/**
 * Carrega dados de paginação fornecidos pelo servidor
 */
function loadPaginationData() {
    if (window.PAGINATION_DATA) {
        currentPage = window.PAGINATION_DATA.currentPage;
        itemsPerPage = window.PAGINATION_DATA.itemsPerPage;
        totalItems = window.PAGINATION_DATA.totalItems;
        totalPages = window.PAGINATION_DATA.totalPages;

        console.log(`📊 Paginação: Página ${currentPage}/${totalPages}, ${itemsPerPage} por página`);
    }
}

/* ========================================
   EXTRAÇÃO E FILTRO DE ARTISTAS
   ======================================== */

/**
 * Extrai artistas únicos da página atual
 * Separa artistas por delimitadores comuns (,  & feat. ft. with)
 */
function extractArtists() {
    const cards = document.querySelectorAll('.favorite-card');
    const artistsSet = new Set();

    cards.forEach(card => {
        const artistName = card.getAttribute('data-artist-name');
        if (artistName && artistName.trim()) {
            // Separar artistas por delimitadores comuns
            const separators = /[,&]|\sfeat\.?\s|\sft\.?\s|\swith\s/i;
            const artists = artistName.split(separators);

            // Adicionar cada artista individualmente
            artists.forEach(artist => {
                const cleanArtist = artist.trim().toLowerCase();
                if (cleanArtist) {
                    artistsSet.add(cleanArtist);
                }
            });
        }
    });

    // Converter para array e ordenar alfabeticamente
    allArtists = Array.from(artistsSet).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
    );

    console.log(`📊 ${allArtists.length} artistas únicos encontrados`);
}

/**
 * Inicializa o filtro de artistas
 */
function initializeArtistFilter() {
    const artistFilter = document.getElementById('artistFilter');
    if (!artistFilter) return;

    // Preencher o select com os artistas
    populateArtistFilter();

    // Restaurar filtro salvo
    const savedArtist = localStorage.getItem('favoritos-artist-filter');
    if (savedArtist && savedArtist !== 'all') {
        artistFilter.value = savedArtist;
        filterByArtist(savedArtist);
    }

    // Evento de mudança
    artistFilter.addEventListener('change', function (e) {
        const selectedArtist = e.target.value;
        localStorage.setItem('favoritos-artist-filter', selectedArtist);
        filterByArtist(selectedArtist);
    });
}

/**
 * Preenche o select de filtro com artistas únicos
 */
function populateArtistFilter() {
    const artistFilter = document.getElementById('artistFilter');
    if (!artistFilter) return;

    // Verificar se está mostrando todas as músicas
    const showingAll = itemsPerPage >= 9999;
    const allText = showingAll ?
        '🎵 Todos os artistas (todas as músicas)' :
        '🎵 Todos os artistas (página atual)';

    // Limpar e adicionar opção "Todos"
    artistFilter.innerHTML = `<option value="all">${allText}</option>`;

    // Adicionar cada artista com capitalização
    allArtists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = capitalizeArtistName(artist);
        artistFilter.appendChild(option);
    });

    // Adicionar contador de músicas por artista
    updateArtistCounts();
}

/**
 * Atualiza contadores de músicas por artista
 */
function updateArtistCounts() {
    const artistFilter = document.getElementById('artistFilter');
    if (!artistFilter) return;

    const cards = document.querySelectorAll('.favorite-card');
    const artistCounts = {};

    // Contar músicas por artista (busca parcial)
    cards.forEach(card => {
        const artistName = card.getAttribute('data-artist-name');
        if (artistName) {
            const lowerArtistName = artistName.toLowerCase();

            // Para cada artista único, verificar se está presente
            allArtists.forEach(artist => {
                if (lowerArtistName.includes(artist)) {
                    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
                }
            });
        }
    });

    // Atualizar opções com contadores
    Array.from(artistFilter.options).forEach(option => {
        if (option.value !== 'all') {
            const count = artistCounts[option.value] || 0;
            const artistName = capitalizeArtistName(option.value);
            option.textContent = `${artistName} (${count})`;
        }
    });
}

/**
 * Filtra músicas por artista selecionado
 * @param {string} artistName - Nome do artista ou 'all'
 */
function filterByArtist(artistName) {
    const cards = document.querySelectorAll('.favorite-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const cardArtist = card.getAttribute('data-artist-name');

        // Busca parcial: artista selecionado contido no nome do artista da música
        const matchesArtist = artistName === 'all' ||
            (cardArtist && cardArtist.toLowerCase().includes(artistName.toLowerCase()));

        if (matchesArtist) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Limpar busca quando filtrar por artista
    if (artistName !== 'all') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
    }

    console.log(`🔍 Filtro por artista: ${visibleCount} músicas visíveis`);
}

/* ========================================
   BUSCA DE MÚSICAS
   ======================================== */

/**
 * Inicializa busca em tempo real
 */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const artistFilter = document.getElementById('artistFilter');
        const selectedArtist = artistFilter ? artistFilter.value : 'all';

        performSearch(searchTerm, selectedArtist);
    });
}

/**
 * Realiza busca combinada (termo + filtro de artista)
 * @param {string} searchTerm - Termo de busca
 * @param {string} selectedArtist - Artista selecionado
 */
function performSearch(searchTerm, selectedArtist) {
    const cards = document.querySelectorAll('.favorite-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const trackName = card.getAttribute('data-track-name') || '';
        const artistName = card.getAttribute('data-artist-name') || '';

        // Verificar correspondência com busca
        const matchesSearch = !searchTerm ||
            trackName.includes(searchTerm) ||
            artistName.includes(searchTerm);

        // Verificar correspondência com filtro de artista
        const matchesArtist = selectedArtist === 'all' ||
            artistName.includes(selectedArtist.toLowerCase());

        if (matchesSearch && matchesArtist) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    console.log(`🔍 Busca: "${searchTerm}" - ${visibleCount} resultados`);
}

/* ========================================
   ORDENAÇÃO DE MÚSICAS
   ======================================== */

/**
 * Inicializa controle de ordenação
 */
function initializeSorting() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;

    // Aplicar valor atual do servidor
    if (window.PAGINATION_DATA && window.PAGINATION_DATA.sort) {
        sortSelect.value = window.PAGINATION_DATA.sort;
    }

    sortSelect.addEventListener('change', function (e) {
        applySorting(e.target.value);
    });
}

/**
 * Aplica ordenação selecionada (recarrega página)
 * @param {string} sortType - Tipo de ordenação
 */
function applySorting(sortType) {
    const url = new URL(window.location.href);
    url.searchParams.set('sort', sortType);
    url.searchParams.set('page', '1'); // Voltar para página 1

    // Preservar limite de itens
    const limitSelect = document.getElementById('itemsPerPageSelect');
    if (limitSelect && limitSelect.value === 'all') {
        url.searchParams.set('limit', '9999');
    } else if (window.PAGINATION_DATA) {
        url.searchParams.set('limit', String(window.PAGINATION_DATA.itemsPerPage));
    }

    window.location.href = url.toString();
}

/* ========================================
   REMOÇÃO DE FAVORITOS
   ======================================== */

/**
 * Inicializa botões de remoção
 */
function initializeRemoveButtons() {
    const removeButtons = document.querySelectorAll('.btn-remove-favorite');

    removeButtons.forEach(button => {
        button.addEventListener('click', async function (e) {
            e.stopPropagation();

            const trackId = this.getAttribute('data-track-id');
            const trackName = this.getAttribute('data-track-name');

            if (!trackId) return;

            await removeFromFavorites(trackId, trackName, this);
        });
    });
}

/**
 * Remove música dos favoritos
 * @param {string} trackId - ID da música
 * @param {string} trackName - Nome da música
 * @param {HTMLElement} button - Botão clicado
 */
async function removeFromFavorites(trackId, trackName, button) {
    // Confirmar remoção com SweetAlert2
    const result = await Swal.fire({
        title: 'Remover dos Favoritos?',
        html: `
            <div style="text-align: center;">
                <i class="bi bi-heartbreak" style="font-size: 3rem; color: #A66660;"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem; color: #333;">
                    Tem certeza que deseja remover<br>
                    <strong style="color: #D9A86C;">"${trackName}"</strong><br>
                    dos seus favoritos?
                </p>
            </div>
        `,
        icon: null,
        showCancelButton: true,
        confirmButtonColor: '#A66660',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash-fill"></i> Sim, remover',
        cancelButtonText: '<i class="bi bi-x-circle"></i> Cancelar',
        background: '#FFF8F0',
        customClass: {
            popup: 'animated-popup',
            confirmButton: 'swal-btn-confirm',
            cancelButton: 'swal-btn-cancel'
        },
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        }
    });

    if (!result.isConfirmed) return;

    // Desabilitar botão e mostrar loading
    button.disabled = true;
    button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

    try {
        const response = await fetch(`/favoritos/remove/${trackId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const responseData = await response.json();

        if (responseData.success) {
            // Remover card com animação
            const card = button.closest('.favorite-card');
            card.classList.add('removing');

            setTimeout(() => {
                card.remove();

                // Atualizar UI
                extractArtists();
                populateArtistFilter();
                checkEmptyState();

                // Mostrar sucesso com SweetAlert2
                Swal.fire({
                    title: 'Removida!',
                    html: `<i class="bi bi-check-circle" style="font-size: 3rem; color: #28a745;"></i><br><br>A música foi removida dos seus favoritos.`,
                    icon: null,
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#FFF8F0',
                    customClass: {
                        popup: 'animated-popup'
                    }
                });
            }, 300);
        } else {
            throw new Error(responseData.message || 'Erro ao remover música');
        }
    } catch (error) {
        console.error('❌ Erro ao remover favorito:', error);

        // Mostrar erro com SweetAlert2
        Swal.fire({
            title: 'Erro!',
            html: `<i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i><br><br>Não foi possível remover a música dos favoritos.`,
            icon: null,
            confirmButtonColor: '#A66660',
            background: '#FFF8F0',
            customClass: {
                popup: 'animated-popup'
            }
        });

        // Reabilitar botão
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-heart-fill"></i>';
    }
}

/* ========================================
   PAGINAÇÃO (SERVER-SIDE)
   ======================================== */

/**
 * Inicializa controles de paginação
 */
function initializePagination() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    // Configurar botões de navegação
    setupNavigationButtons();

    // Configurar seletor de itens por página
    setupItemsPerPageSelector();

    // Atualizar UI inicial
    updatePaginationControls();
}

/**
 * Configura botões de navegação de páginas
 */
function setupNavigationButtons() {
    const btnFirst = document.getElementById('btnFirstPage');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const btnLast = document.getElementById('btnLastPage');

    if (btnFirst) btnFirst.addEventListener('click', () => goToPage(1));
    if (btnPrev) btnPrev.addEventListener('click', () => goToPage(currentPage - 1));
    if (btnNext) btnNext.addEventListener('click', () => goToPage(currentPage + 1));
    if (btnLast) btnLast.addEventListener('click', () => goToPage(totalPages));
}

/**
 * Configura seletor de itens por página
 */
function setupItemsPerPageSelector() {
    const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
    if (!itemsPerPageSelect) return;

    // Sincronizar com valor atual
    itemsPerPageSelect.value = itemsPerPage >= 9999 ? 'all' : itemsPerPage.toString();

    itemsPerPageSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        const newLimit = value === 'all' ? 9999 : parseInt(value);

        currentPage = 1; // Sempre voltar para página 1
        itemsPerPage = newLimit;
        loadPage(currentPage, itemsPerPage);
    });
}

/**
 * Navega para página específica
 * @param {number} page - Número da página
 */
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadPage(currentPage, itemsPerPage);
}

/**
 * Carrega página do servidor
 * @param {number} page - Número da página
 * @param {number} limit - Itens por página
 */
async function loadPage(page, limit) {
    const isLoadingAll = limit >= 9999;

    try {
        // Mostrar loading
        isLoadingAll ? showLoadingAll() : showLoading();

        const response = await fetch(`/api/favoritos?page=${page}&limit=${limit}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro ao carregar favoritos');
        }

        // Atualizar dados de paginação
        currentPage = data.page;
        totalItems = data.total;
        totalPages = data.total_pages;

        // Renderizar músicas
        renderTracks(data.tracks);

        // Atualizar controles
        updatePaginationControls();

        // Limpar filtros ao mudar de página (exceto quando carregar todas)
        if (!isLoadingAll) {
            clearFilters();
        }

        // Scroll suave para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log(`✅ Página ${page} carregada com sucesso`);

    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        showToast('Erro ao carregar músicas', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Renderiza lista de músicas
 * @param {Array} tracks - Array de músicas
 */
function renderTracks(tracks) {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    // Limpar grid
    grid.innerHTML = '';

    // Renderizar cada música
    tracks.forEach(track => {
        const card = createTrackCard(track);
        grid.appendChild(card);
    });

    // Reinicializar event listeners
    initializeRemoveButtons();

    // Re-extrair artistas e atualizar filtro
    extractArtists();
    populateArtistFilter();
}

/**
 * Cria card HTML para uma música
 * @param {Object} track - Dados da música
 * @returns {HTMLElement} Card HTML
 */
function createTrackCard(track) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.setAttribute('data-track-id', track.id);
    card.setAttribute('data-track-name', track.name.toLowerCase());
    card.setAttribute('data-artist-name', track.artist.toLowerCase());

    const imageUrl = track.image_url || '/static/img/default-album.png';

    card.innerHTML = `
        <div class="card-image">
            <img src="${imageUrl}" 
                 alt="${escapeHtml(track.name)}" 
                 loading="lazy" 
                 onerror="this.onerror=null;this.src='/static/img/default-album.png';">
        </div>
        <div class="card-info">
            <h5 class="track-name" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</h5>
            <p class="artist-name" title="${escapeHtml(track.artist)}">${escapeHtml(track.artist)}</p>
            ${track.album ? `<p class="album-name" title="${escapeHtml(track.album)}">${escapeHtml(track.album)}</p>` : ''}
        </div>
        <div class="card-actions">
            <button class="btn-remove-favorite"
                    data-track-id="${track.id}"
                    data-track-name="${escapeHtml(track.name)}"
                    title="Remover dos favoritos"
                    aria-label="Remover ${escapeHtml(track.name)} dos favoritos">
                <i class="bi bi-heart-fill"></i>
            </button>
            <a href="https://open.spotify.com/track/${track.id}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="btn-spotify" 
               title="Abrir no Spotify"
               aria-label="Abrir ${escapeHtml(track.name)} no Spotify">
                <i class="bi bi-spotify"></i>
            </a>
        </div>
    `;

    return card;
}

/**
 * Atualiza controles visuais de paginação
 */
function updatePaginationControls() {
    const showingAll = itemsPerPage >= 9999;

    // Calcular range
    const start = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    // Atualizar contadores (topo e rodapé)
    updateCounters(start, end, showingAll);

    // Atualizar informações de página
    updatePageInfo();

    // Atualizar estado dos botões
    updateNavigationButtonsState(showingAll);
}

/**
 * Atualiza contadores de músicas exibidas
 * @param {number} start - Índice inicial
 * @param {number} end - Índice final
 * @param {boolean} showingAll - Se está mostrando todas
 */
function updateCounters(start, end, showingAll) {
    // Contadores do topo
    const startElTop = document.querySelector('.page-range-start');
    const endElTop = document.querySelector('.page-range-end');
    const totalElTop = document.querySelector('.pagination-total');

    // Contadores do rodapé
    const startEl = document.getElementById('pageRangeStart');
    const endEl = document.getElementById('pageRangeEnd');
    const totalEl = document.getElementById('paginationTotal');

    if (showingAll) {
        // Formato simplificado quando mostrando todas
        const displayStart = totalItems > 0 ? 1 : 0;
        if (startEl) startEl.textContent = displayStart;
        if (endEl) endEl.textContent = totalItems;
        if (startElTop) startElTop.textContent = displayStart;
        if (endElTop) endElTop.textContent = totalItems;
    } else {
        if (startEl) startEl.textContent = start;
        if (endEl) endEl.textContent = end;
        if (startElTop) startElTop.textContent = start;
        if (endElTop) endElTop.textContent = end;
    }

    if (totalEl) totalEl.textContent = totalItems;
    if (totalElTop) totalElTop.textContent = totalItems;
}

/**
 * Atualiza informações de página atual/total
 */
function updatePageInfo() {
    const currentPageEl = document.getElementById('currentPageNum');
    const totalPagesEl = document.getElementById('totalPages');

    if (currentPageEl) currentPageEl.textContent = totalPages > 0 ? currentPage : 0;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
}

/**
 * Atualiza estado dos botões de navegação
 * @param {boolean} showingAll - Se está mostrando todas
 */
function updateNavigationButtonsState(showingAll) {
    const btnFirst = document.getElementById('btnFirstPage');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const btnLast = document.getElementById('btnLastPage');
    const paginationControls = document.querySelector('.pagination-controls');

    if (showingAll) {
        // Ocultar controles quando mostrando todas
        if (paginationControls) paginationControls.style.display = 'none';
    } else {
        // Mostrar controles e atualizar estado
        if (paginationControls) paginationControls.style.display = 'flex';
        if (btnFirst) btnFirst.disabled = currentPage <= 1;
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
        if (btnLast) btnLast.disabled = currentPage >= totalPages;
    }
}

/* ========================================
   LOADING E FEEDBACK VISUAL
   ======================================== */

/**
 * Mostra indicador de carregamento normal
 */
function showLoading() {
    const grid = document.getElementById('favoritesGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div class="spinner-border text-warning" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="mt-3">Carregando músicas...</p>
            </div>
        `;
    }
}

/**
 * Mostra indicador de carregamento de todas as músicas
 */
function showLoadingAll() {
    const grid = document.getElementById('favoritesGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="loading-container" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div class="spinner-border text-warning" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="mt-3"><strong>Carregando TODAS as suas músicas favoritas...</strong></p>
                <p class="text-muted" style="font-size: 0.9rem;">Isso pode levar alguns segundos ⏳</p>
            </div>
        `;
    }
}

/**
 * Remove indicador de carregamento
 */
function hideLoading() {
    const loading = document.querySelector('.loading-container');
    if (loading) {
        loading.remove();
    }
}

/**
 * Exibe toast de feedback
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: 'success' ou 'error'
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('feedbackToast');
    if (!toast) return;

    const toastBody = toast.querySelector('.toast-body');
    const toastHeader = toast.querySelector('.toast-header strong');
    const toastIcon = toast.querySelector('.toast-header i');

    // Atualizar conteúdo
    toastBody.textContent = message;

    // Remover classes anteriores
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

    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

/* ========================================
   FUNÇÕES AUXILIARES
   ======================================== */

/**
 * Capitaliza nome de artista
 * @param {string} name - Nome em minúsculas
 * @returns {string} Nome capitalizado
 */
function capitalizeArtistName(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Limpa todos os filtros ativos
 */
function clearFilters() {
    const artistFilter = document.getElementById('artistFilter');
    const searchInput = document.getElementById('searchInput');

    if (artistFilter) artistFilter.value = 'all';
    if (searchInput) searchInput.value = '';

    localStorage.removeItem('favoritos-artist-filter');
}

/**
 * Verifica se há músicas e redireciona se vazio
 */
function checkEmptyState() {
    const cards = document.querySelectorAll('.favorite-card');
    if (cards.length === 0) {
        location.reload();
    }
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ========================================
   API PÚBLICA
   ======================================== */

/**
 * Adiciona música aos favoritos (para uso em outras páginas)
 * @param {string} trackId - ID da música
 * @param {string} trackName - Nome da música
 * @returns {Promise<boolean>} Sucesso da operação
 */
window.addToFavorites = async function (trackId, trackName) {
    try {
        const response = await fetch(`/favoritos/add/${trackId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            showToast(`"${trackName}" adicionada aos favoritos!`, 'success');
            return true;
        } else {
            throw new Error(result.message || 'Erro ao adicionar música');
        }
    } catch (error) {
        console.error('❌ Erro ao adicionar favorito:', error);
        showToast('Erro ao adicionar aos favoritos', 'error');
        return false;
    }
};

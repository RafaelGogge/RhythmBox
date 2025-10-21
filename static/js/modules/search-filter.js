/**
 * Módulo de busca e filtros
 * Gerencia busca em tempo real e filtros de artistas
 */

export class SearchFilter {
    constructor(config = {}) {
        this.allArtists = [];
        this.cardSelector = config.cardSelector || '.favorite-card';
        this.searchInputId = config.searchInputId || 'searchInput';
        this.artistFilterId = config.artistFilterId || 'artistFilter';
        this.onFilterChange = config.onFilterChange || (() => { });
    }

    /**
     * Extrai artistas únicos dos cards
     * Separa artistas por delimitadores comuns (, & feat. ft. with)
     */
    extractArtists() {
        const cards = document.querySelectorAll(this.cardSelector);
        const artistsSet = new Set();

        cards.forEach(card => {
            const artistName = card.dataset.artistName;
            if (!artistName) return;

            // Separar por delimitadores comuns
            const delimiters = /[,&]|\sfeat\.|\sft\.|\swith\s/i;
            const artists = artistName.split(delimiters);

            artists.forEach(artist => {
                const cleanArtist = artist.trim();
                if (cleanArtist) {
                    artistsSet.add(cleanArtist);
                }
            });
        });

        // Converter para array e ordenar alfabeticamente
        this.allArtists = Array.from(artistsSet).sort((a, b) =>
            a.localeCompare(b, 'pt-BR')
        );

        console.log(`📊 ${this.allArtists.length} artistas únicos encontrados`);
        return this.allArtists;
    }

    /**
     * Inicializa filtro de artistas
     */
    initializeArtistFilter() {
        const artistFilter = document.getElementById(this.artistFilterId);
        if (!artistFilter) return;

        // Preencher o select com os artistas
        this.populateArtistFilter();

        // Restaurar filtro salvo
        this.restoreSavedFilter();

        // Evento de mudança
        artistFilter.addEventListener('change', (e) => {
            const selectedArtist = e.target.value;
            localStorage.setItem('favoritos-artist-filter', selectedArtist);
            this.filterByArtist(selectedArtist);
        });
    }

    /**
     * Preenche select de filtro com artistas únicos
     */
    populateArtistFilter() {
        const artistFilter = document.getElementById(this.artistFilterId);
        if (!artistFilter) return;

        // Verificar se está mostrando todas as músicas
        const showingAll = this.isShowingAll();
        const allText = showingAll
            ? '🎵 Todos os artistas (todas as músicas)'
            : '🎵 Todos os artistas (página atual)';

        // Limpar e adicionar opção "Todos"
        artistFilter.innerHTML = `<option value="all">${allText}</option>`;

        // Adicionar cada artista com capitalização
        this.allArtists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = this.capitalizeArtistName(artist);
            artistFilter.appendChild(option);
        });

        // Adicionar contador de músicas por artista
        this.updateArtistCounts();
    }

    /**
     * Atualiza contadores de músicas por artista
     */
    updateArtistCounts() {
        const artistFilter = document.getElementById(this.artistFilterId);
        if (!artistFilter) return;

        const cards = document.querySelectorAll(this.cardSelector);
        const artistCounts = {};

        // Contar músicas por artista (busca parcial)
        cards.forEach(card => {
            const artistName = card.dataset.artistName;
            if (!artistName) return;

            this.allArtists.forEach(artist => {
                if (artistName.includes(artist)) {
                    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
                }
            });
        });

        // Atualizar opções com contadores
        Array.from(artistFilter.options).forEach(option => {
            if (option.value === 'all') return;

            const count = artistCounts[option.value] || 0;
            const capitalizedName = this.capitalizeArtistName(option.value);
            option.textContent = `${capitalizedName} (${count})`;
        });
    }

    /**
     * Filtra músicas por artista selecionado
     * @param {string} artistName - Nome do artista ou 'all'
     */
    filterByArtist(artistName) {
        const cards = document.querySelectorAll(this.cardSelector);
        let visibleCount = 0;

        cards.forEach(card => {
            const cardArtist = card.dataset.artistName;

            if (artistName === 'all' || cardArtist.includes(artistName)) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Limpar busca quando filtrar por artista
        if (artistName !== 'all') {
            const searchInput = document.getElementById(this.searchInputId);
            if (searchInput) searchInput.value = '';
        }

        this.onFilterChange(visibleCount);
        console.log(`🔍 Filtro por artista: ${visibleCount} músicas visíveis`);
    }

    /**
     * Inicializa busca em tempo real
     */
    initializeSearch() {
        const searchInput = document.getElementById(this.searchInputId);
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            const artistFilter = document.getElementById(this.artistFilterId);
            const selectedArtist = artistFilter ? artistFilter.value : 'all';
            this.performSearch(searchTerm, selectedArtist);
        });
    }

    /**
     * Realiza busca combinada (termo + filtro de artista)
     * @param {string} searchTerm - Termo de busca
     * @param {string} selectedArtist - Artista selecionado
     */
    performSearch(searchTerm, selectedArtist) {
        const cards = document.querySelectorAll(this.cardSelector);
        let visibleCount = 0;

        cards.forEach(card => {
            const trackName = card.dataset.trackName;
            const artistName = card.dataset.artistName;

            const matchesSearch = !searchTerm ||
                trackName.includes(searchTerm) ||
                artistName.includes(searchTerm);

            const matchesArtist = selectedArtist === 'all' ||
                artistName.includes(selectedArtist);

            if (matchesSearch && matchesArtist) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        this.onFilterChange(visibleCount);
        console.log(`🔍 Busca: "${searchTerm}" - ${visibleCount} resultados`);
    }

    /**
     * Limpa todos os filtros ativos
     */
    clearFilters() {
        const searchInput = document.getElementById(this.searchInputId);
        const artistFilter = document.getElementById(this.artistFilterId);

        if (searchInput) searchInput.value = '';
        if (artistFilter) artistFilter.value = 'all';

        localStorage.removeItem('favoritos-artist-filter');
        this.filterByArtist('all');
    }

    /**
     * Restaura filtro salvo do localStorage
     */
    restoreSavedFilter() {
        const savedArtist = localStorage.getItem('favoritos-artist-filter');
        const artistFilter = document.getElementById(this.artistFilterId);

        if (savedArtist && savedArtist !== 'all' && artistFilter) {
            artistFilter.value = savedArtist;
            this.filterByArtist(savedArtist);
        }
    }

    /**
     * Capitaliza nome de artista
     * @param {string} name - Nome em minúsculas
     * @returns {string} Nome capitalizado
     */
    capitalizeArtistName(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Verifica se está mostrando todos os itens
     * @returns {boolean} Se está mostrando todos
     */
    isShowingAll() {
        const selector = document.getElementById('itemsPerPageSelect');
        return selector && selector.value === 'all';
    }

    /**
     * Obtém estatísticas de busca/filtro
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        const cards = document.querySelectorAll(this.cardSelector);
        const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');

        return {
            totalCards: cards.length,
            visibleCards: visibleCards.length,
            totalArtists: this.allArtists.length
        };
    }
}

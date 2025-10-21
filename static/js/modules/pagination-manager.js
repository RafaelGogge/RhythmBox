/**
 * Módulo de gerenciamento de paginação
 * Controla navegação entre páginas e carregamento de dados
 */

export class PaginationManager {
    constructor(config = {}) {
        this.currentPage = config.currentPage || 1;
        this.itemsPerPage = config.itemsPerPage || 20;
        this.totalItems = config.totalItems || 0;
        this.totalPages = config.totalPages || 1;
        this.endpoint = config.endpoint || '/favoritos/paginate';
        this.onDataLoaded = config.onDataLoaded || (() => { });
        this.onLoadingStart = config.onLoadingStart || (() => { });
        this.onLoadingEnd = config.onLoadingEnd || (() => { });
    }

    /**
     * Carrega dados de paginação do servidor
     * @param {Object} paginationData - Dados de paginação do servidor
     */
    loadPaginationData(paginationData) {
        if (!paginationData) return;

        this.currentPage = paginationData.current_page || 1;
        this.itemsPerPage = paginationData.items_per_page || 20;
        this.totalItems = paginationData.total_items || 0;
        this.totalPages = paginationData.total_pages || 1;

        console.log(`📊 Paginação carregada: Página ${this.currentPage}/${this.totalPages}`);
    }

    /**
     * Inicializa controles de paginação
     */
    initializeControls() {
        this.setupNavigationButtons();
        this.setupItemsPerPageSelector();
        this.updateUI();
    }

    /**
     * Configura botões de navegação
     */
    setupNavigationButtons() {
        const btnFirst = document.getElementById('btnFirstPage');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');
        const btnLast = document.getElementById('btnLastPage');

        if (btnFirst) btnFirst.addEventListener('click', () => this.goToPage(1));
        if (btnPrev) btnPrev.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        if (btnNext) btnNext.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        if (btnLast) btnLast.addEventListener('click', () => this.goToPage(this.totalPages));
    }

    /**
     * Configura seletor de itens por página
     */
    setupItemsPerPageSelector() {
        const selector = document.getElementById('itemsPerPageSelect');
        if (!selector) return;

        // Sincronizar com valor atual
        selector.value = this.itemsPerPage >= 9999 ? 'all' : this.itemsPerPage.toString();

        selector.addEventListener('change', (e) => {
            const value = e.target.value;
            const newLimit = value === 'all' ? 9999 : parseInt(value);
            this.changeItemsPerPage(newLimit);
        });
    }

    /**
     * Navega para página específica
     * @param {number} page - Número da página
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadPage(this.currentPage, this.itemsPerPage);
    }

    /**
     * Muda quantidade de itens por página
     * @param {number} limit - Novo limite de itens
     */
    changeItemsPerPage(limit) {
        this.itemsPerPage = limit;
        this.currentPage = 1; // Voltar para página 1
        this.loadPage(this.currentPage, this.itemsPerPage);
    }

    /**
     * Carrega página do servidor
     * @param {number} page - Número da página
     * @param {number} limit - Itens por página
     */
    async loadPage(page, limit) {
        const isLoadingAll = limit >= 9999;

        try {
            this.onLoadingStart(isLoadingAll);

            const response = await axios.get(this.endpoint, {
                params: {
                    page: page,
                    limit: limit,
                    sort: this.getSortType()
                }
            });

            if (response.data && response.data.success) {
                const data = response.data;

                // Atualizar dados de paginação
                this.currentPage = data.current_page;
                this.itemsPerPage = data.items_per_page;
                this.totalItems = data.total_items;
                this.totalPages = data.total_pages;

                // Callback com dados carregados
                this.onDataLoaded(data.tracks);

                // Atualizar UI
                this.updateUI();

                console.log(`✅ Página ${page} carregada: ${data.tracks.length} itens`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar página:', error);
            this.showError('Erro ao carregar dados');
        } finally {
            this.onLoadingEnd();
        }
    }

    /**
     * Atualiza interface de paginação
     */
    updateUI() {
        this.updatePageInfo();
        this.updateCounters();
        this.updateNavigationButtons();
    }

    /**
     * Atualiza informações de página atual/total
     */
    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (!pageInfo) return;

        const showingAll = this.itemsPerPage >= 9999;
        pageInfo.textContent = showingAll
            ? 'Todas'
            : `${this.currentPage} / ${this.totalPages}`;
    }

    /**
     * Atualiza contadores de itens exibidos
     */
    updateCounters() {
        const showingAll = this.itemsPerPage >= 9999;
        const start = showingAll ? 1 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = showingAll ? this.totalItems : Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

        const itemsCountElement = document.getElementById('itemsCount');
        if (itemsCountElement) {
            itemsCountElement.textContent = showingAll
                ? `Mostrando todas as ${this.totalItems} músicas`
                : `Mostrando ${start}-${end} de ${this.totalItems} músicas`;
        }
    }

    /**
     * Atualiza estado dos botões de navegação
     */
    updateNavigationButtons() {
        const showingAll = this.itemsPerPage >= 9999;

        const btnFirst = document.getElementById('btnFirstPage');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');
        const btnLast = document.getElementById('btnLastPage');

        if (showingAll) {
            [btnFirst, btnPrev, btnNext, btnLast].forEach(btn => {
                if (btn) btn.disabled = true;
            });
        } else {
            if (btnFirst) btnFirst.disabled = this.currentPage === 1;
            if (btnPrev) btnPrev.disabled = this.currentPage === 1;
            if (btnNext) btnNext.disabled = this.currentPage === this.totalPages;
            if (btnLast) btnLast.disabled = this.currentPage === this.totalPages;
        }
    }

    /**
     * Obtém tipo de ordenação atual
     * @returns {string} Tipo de ordenação
     */
    getSortType() {
        const sortSelect = document.getElementById('sortSelect');
        return sortSelect ? sortSelect.value : 'date_desc';
    }

    /**
     * Exibe mensagem de erro
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        console.error(message);
        // Você pode integrar com VisualFeedback aqui
    }

    /**
     * Obtém dados atuais de paginação
     * @returns {Object} Dados de paginação
     */
    getPaginationData() {
        return {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            totalPages: this.totalPages
        };
    }
}

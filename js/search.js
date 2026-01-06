/**
 * FarmHub - Search Module
 * Global search functionality across all data
 */

const Search = {
    /**
     * Open search modal
     */
    async openSearch() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'search-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--white);
                z-index: 1001;
                display: flex;
                flex-direction: column;
            ">
                <div style="padding: 16px; border-bottom: 1px solid var(--gray-200);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button id="search-close" class="header-btn" style="background: none; border: none;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <input type="text" id="search-input" class="form-control" 
                               placeholder="Search goats, records..." 
                               style="flex: 1; font-size: 16px;">
                    </div>
                </div>
                <div id="search-results" style="flex: 1; overflow-y: auto; padding: 16px;">
                    <div class="empty-state small">
                        <i class="fas fa-search"></i>
                        <p>Type to search...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#search-input');
        const results = modal.querySelector('#search-results');
        const closeBtn = modal.querySelector('#search-close');

        // Focus input
        setTimeout(() => input.focus(), 100);

        // Search on input
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.performSearch(input.value, results), 300);
        });

        // Close handlers
        closeBtn.addEventListener('click', () => this.closeSearch());
        modal.querySelector('.modal-overlay').addEventListener('click', () => this.closeSearch());
    },

    closeSearch() {
        const modal = document.getElementById('search-modal');
        if (modal) modal.remove();
    },

    /**
     * Perform search across all data
     */
    async performSearch(query, resultsContainer) {
        if (!query || query.length < 2) {
            resultsContainer.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-search"></i>
                    <p>Type at least 2 characters...</p>
                </div>
            `;
            return;
        }

        const q = query.toLowerCase();
        const results = [];

        // Search goats
        const goats = await FarmDB.Goats.getAll();
        for (const goat of goats) {
            if (goat.tagId?.toLowerCase().includes(q) ||
                goat.name?.toLowerCase().includes(q) ||
                goat.breed?.toLowerCase().includes(q)) {
                results.push({
                    type: 'goat',
                    icon: 'fa-paw',
                    title: `${goat.tagId}${goat.name ? ' - ' + goat.name : ''}`,
                    subtitle: `${goat.sex} • ${goat.breed || 'Unknown breed'}`,
                    action: () => {
                        this.closeSearch();
                        Pages.goatDetail(goat.id);
                    }
                });
            }
        }

        // Search vaccinations
        const vaccinations = await FarmDB.getAll('vaccinations');
        for (const v of vaccinations) {
            if (v.vaccineName?.toLowerCase().includes(q)) {
                const goat = await FarmDB.Goats.get(v.goatId);
                results.push({
                    type: 'vaccination',
                    icon: 'fa-syringe',
                    title: v.vaccineName,
                    subtitle: `${goat?.tagId || 'Unknown'} • ${Components.formatDate(v.dateGiven)}`,
                    action: () => {
                        this.closeSearch();
                        if (goat) Pages.goatDetail(goat.id);
                    }
                });
            }
        }

        // Render results
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${query}"</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map((r, i) => `
            <div class="list-item search-result" data-index="${i}" style="cursor: pointer;">
                <div class="list-item-avatar" style="background: var(--primary-50);">
                    <i class="fas ${r.icon}" style="color: var(--primary-600);"></i>
                </div>
                <div class="list-item-content">
                    <div class="list-item-title">${r.title}</div>
                    <div class="list-item-subtitle">${r.subtitle}</div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
            </div>
        `).join('');

        // Add click handlers
        resultsContainer.querySelectorAll('.search-result').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                results[index].action();
            });
        });
    }
};

// Export
window.Search = Search;

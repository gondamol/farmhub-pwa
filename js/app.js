/**
 * FarmHub - Main Application
 * App initialization and navigation
 */

// ============================================
// APP STATE
// ============================================
const App = {
    currentPage: 'dashboard',
    isOnline: navigator.onLine,

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        console.log('🐐 FarmHub Starting...');

        try {
            // Initialize database
            await FarmDB.init();
            await FarmDB.seedDefaults();
            console.log('✓ Database initialized');

            // Initialize UI
            Toast.init();
            this.setupNavigation();
            this.setupOfflineDetection();
            this.setupSidebar();
            this.setupQuickAdd();
            this.setupSearch();

            // Load initial page
            await this.navigate('dashboard');

            // Hide splash screen
            this.hideSplash();

            console.log('✓ FarmHub Ready!');
        } catch (err) {
            console.error('❌ Init error:', err);
            Toast.error('Failed to initialize app');
        }
    },

    hideSplash() {
        const splash = document.getElementById('splash-screen');
        const appShell = document.getElementById('app-shell');

        setTimeout(() => {
            splash.classList.add('fade-out');
            appShell.classList.remove('hidden');

            setTimeout(() => splash.remove(), 500);
        }, 500);
    },

    // ============================================
    // NAVIGATION
    // ============================================
    setupNavigation() {
        // Sidebar menu items
        document.querySelectorAll('.menu-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(item.dataset.page);
                this.closeSidebar();
            });
        });

        // Bottom nav items
        document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(item.dataset.page);
            });
        });

        // Section links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.section-link[data-page]');
            if (link) {
                e.preventDefault();
                this.navigate(link.dataset.page);
            }
        });
    },

    async navigate(page) {
        this.currentPage = page;

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            goats: 'My Goats',
            vaccinations: 'Vaccinations',
            deworming: 'Deworming',
            breeding: 'Breeding',
            kidding: 'Kidding',
            finances: 'Finances',
            projections: '5-Year Projection',
            guides: 'Farming Guides',
            reminders: 'Reminders',
            backup: 'Export/Import'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        // Update active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Load page content
        const pageMap = {
            dashboard: () => Pages.dashboard(),
            goats: () => Pages.goats(),
            vaccinations: () => Pages.guides(), // For now, show guides
            deworming: () => Pages.guides(),
            breeding: () => Pages.breeding(),
            kidding: () => Pages.breeding(),
            finances: () => Pages.finances(),
            projections: () => Pages.projections(),
            guides: () => Pages.guides(),
            reminders: () => Pages.reminders(),
            backup: () => Pages.backup()
        };

        const loader = pageMap[page];
        if (loader) {
            await loader();
        } else {
            document.getElementById('main-content').innerHTML = `
                <div class="page">
                    <div class="empty-state">
                        <i class="fas fa-hammer"></i>
                        <h3>Coming Soon</h3>
                        <p>This page is under construction.</p>
                    </div>
                </div>
            `;
        }

        // Scroll to top
        document.getElementById('main-content').scrollTop = 0;
    },

    // ============================================
    // SIDEBAR
    // ============================================
    setupSidebar() {
        const menuBtn = document.getElementById('menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('sidebar-close');

        menuBtn.addEventListener('click', () => this.openSidebar());
        closeBtn.addEventListener('click', () => this.closeSidebar());
        overlay.addEventListener('click', () => this.closeSidebar());
    },

    openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-overlay').classList.add('visible');
        document.getElementById('sidebar-overlay').classList.remove('hidden');
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
        setTimeout(() => {
            document.getElementById('sidebar-overlay').classList.add('hidden');
        }, 300);
    },

    // ============================================
    // QUICK ADD MODAL
    // ============================================
    setupQuickAdd() {
        const addBtn = document.querySelector('.bottom-nav-item.add-btn');
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Modal.show('quick-add-modal');
        });

        // Quick add action handlers
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Modal.hide();
                Actions.handle(btn.dataset.action);
            });
        });
    },

    // ============================================
    // OFFLINE DETECTION
    // ============================================
    setupOfflineDetection() {
        const banner = document.getElementById('offline-banner');

        const updateOnlineStatus = () => {
            this.isOnline = navigator.onLine;
            if (this.isOnline) {
                banner.classList.remove('visible');
            } else {
                banner.classList.add('visible');
                banner.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    },

    // ============================================
    // SEARCH
    // ============================================
    setupSearch() {
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (window.Search) {
                    Search.openSearch();
                }
            });
        }
    }
};

// ============================================
// ACTIONS HANDLER
// ============================================
const Actions = {
    async handle(action, context = {}) {
        const actions = {
            'add-goat': () => this.addGoat(),
            'add-vaccination': () => this.addVaccination(context.goatId),
            'vaccinate-goat': () => this.addVaccination(context.goatId),
            'add-deworming': () => this.addDeworming(context.goatId),
            'deworm-goat': () => this.addDeworming(context.goatId),
            'add-breeding': () => this.addBreeding(),
            'add-kidding': () => this.addKidding(),
            'add-income': () => this.addFinancial('Income'),
            'add-expense': () => this.addFinancial('Expense'),
            'add-weight': () => this.addWeight(context.goatId),
            'weigh-goat': () => this.addWeight(context.goatId),
            'edit-goat': () => this.editGoat(context.goatId)
        };

        const handler = actions[action];
        if (handler) {
            await handler();
        } else {
            console.warn('Unknown action:', action);
        }
    },

    async addGoat() {
        const does = await FarmDB.Goats.getDoes();
        const bucks = await FarmDB.Goats.getBucks();

        Form.createFormModal('Add New Goat', [
            { name: 'tagId', label: 'Tag ID', type: 'text', required: true, placeholder: 'e.g., G001' },
            { name: 'name', label: 'Name', type: 'text', placeholder: 'Optional nickname' },
            {
                name: 'sex', label: 'Sex', type: 'select', required: true, options: [
                    { value: 'Female', label: 'Female (Doe)' },
                    { value: 'Male', label: 'Male (Buck)' },
                    { value: 'Castrated', label: 'Castrated' }
                ]
            },
            {
                name: 'breed', label: 'Breed', type: 'select', options: [
                    { value: 'East African', label: 'East African' },
                    { value: 'Galla', label: 'Galla' },
                    { value: 'Boer', label: 'Boer' },
                    { value: 'Toggenburg', label: 'Toggenburg' },
                    { value: 'Alpine', label: 'Alpine' },
                    { value: 'Cross', label: 'Cross/Mixed' }
                ]
            },
            { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { name: 'color', label: 'Color', type: 'text', placeholder: 'e.g., Brown and white' },
            {
                name: 'source', label: 'Source', type: 'select', options: [
                    { value: 'Born on Farm', label: 'Born on Farm' },
                    { value: 'Purchased', label: 'Purchased' },
                    { value: 'Gift', label: 'Gift' }
                ]
            },
            { name: 'damId', label: 'Dam (Mother)', type: 'select', options: does.map(d => ({ value: d.id, label: `${d.tagId}${d.name ? ' - ' + d.name : ''}` })) },
            { name: 'sireId', label: 'Sire (Father)', type: 'select', options: bucks.map(b => ({ value: b.id, label: `${b.tagId}${b.name ? ' - ' + b.name : ''}` })) }
        ], async (data) => {
            // Convert empty strings to null
            for (const key in data) {
                if (data[key] === '') data[key] = null;
            }
            data.status = 'Active';

            await FarmDB.Goats.add(data);
            Toast.success('Goat added successfully!');
            App.navigate('goats');
        });
    },

    async addVaccination(preselectedGoatId = null) {
        const goats = await FarmDB.Goats.getActive();
        const vaccineTypes = await FarmDB.getAll('vaccineTypes');

        Form.createFormModal('Record Vaccination', [
            {
                name: 'goatId', label: 'Goat', type: 'select', required: true,
                value: preselectedGoatId,
                options: goats.map(g => ({ value: g.id, label: `${g.tagId}${g.name ? ' - ' + g.name : ''}` }))
            },
            {
                name: 'vaccineTypeId', label: 'Vaccine', type: 'select', required: true,
                options: vaccineTypes.map(v => ({ value: v.id, label: v.name }))
            },
            { name: 'dateGiven', label: 'Date Given', type: 'date', required: true, value: Form.today() },
            { name: 'nextDueDate', label: 'Next Due Date', type: 'date' },
            { name: 'batchNumber', label: 'Batch Number', type: 'text' },
            { name: 'notes', label: 'Notes', type: 'textarea' }
        ], async (data) => {
            const vaccine = vaccineTypes.find(v => v.id == data.vaccineTypeId);
            data.vaccineName = vaccine?.name || 'Unknown';

            await FarmDB.Vaccinations.add(data);
            Toast.success('Vaccination recorded!');

            if (preselectedGoatId) {
                Pages.goatDetail(preselectedGoatId);
            } else {
                App.navigate('dashboard');
            }
        });
    },

    async addDeworming(preselectedGoatId = null) {
        const goats = await FarmDB.Goats.getActive();
        const dewormerTypes = await FarmDB.getAll('dewormerTypes');

        Form.createFormModal('Record Deworming', [
            {
                name: 'goatId', label: 'Goat', type: 'select', required: true,
                value: preselectedGoatId,
                options: goats.map(g => ({ value: g.id, label: `${g.tagId}${g.name ? ' - ' + g.name : ''}` }))
            },
            {
                name: 'dewormerTypeId', label: 'Dewormer', type: 'select',
                options: dewormerTypes.map(d => ({ value: d.id, label: `${d.name} (${d.drugClass})` }))
            },
            { name: 'dateGiven', label: 'Date Given', type: 'date', required: true, value: Form.today() },
            {
                name: 'famachaScore', label: 'FAMACHA Score', type: 'select', options: [
                    { value: '1', label: '1 - Deep Red (Healthy)' },
                    { value: '2', label: '2 - Pink-Red (Healthy)' },
                    { value: '3', label: '3 - Pink (Monitor)' },
                    { value: '4', label: '4 - Pale Pink (Deworm)' },
                    { value: '5', label: '5 - White (Urgent!)' }
                ]
            },
            {
                name: 'reason', label: 'Reason', type: 'select', options: [
                    { value: 'Routine', label: 'Routine (Scheduled)' },
                    { value: 'FAMACHA', label: 'FAMACHA Score' },
                    { value: 'Treatment', label: 'Treatment (Signs of worms)' },
                    { value: 'Quarantine', label: 'Quarantine (New arrival)' }
                ]
            },
            { name: 'notes', label: 'Notes', type: 'textarea' }
        ], async (data) => {
            const dewormer = dewormerTypes.find(d => d.id == data.dewormerTypeId);
            data.dewormerName = dewormer?.name || 'Unknown';

            await FarmDB.Dewormings.add(data);
            Toast.success('Deworming recorded!');

            if (preselectedGoatId) {
                Pages.goatDetail(preselectedGoatId);
            } else {
                App.navigate('dashboard');
            }
        });
    },

    async addBreeding() {
        const does = await FarmDB.Goats.getDoes();
        const bucks = await FarmDB.Goats.getBucks();

        if (does.length === 0) {
            Toast.warning('No does available for breeding');
            return;
        }

        Form.createFormModal('Record Breeding', [
            {
                name: 'doeId', label: 'Doe (Female)', type: 'select', required: true,
                options: does.map(d => ({ value: d.id, label: `${d.tagId}${d.name ? ' - ' + d.name : ''}` }))
            },
            {
                name: 'buckId', label: 'Buck (Male)', type: 'select', required: true,
                options: bucks.map(b => ({ value: b.id, label: `${b.tagId}${b.name ? ' - ' + b.name : ''}` }))
            },
            { name: 'breedingDate', label: 'Breeding Date', type: 'date', required: true, value: Form.today() },
            { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'e.g., Observed heat signs, confirmed mating' }
        ], async (data) => {
            await FarmDB.Breedings.add(data);
            Toast.success('Breeding recorded! Expected kidding date calculated.');
            App.navigate('breeding');
        });
    },

    async addKidding() {
        const does = await FarmDB.Goats.getDoes();

        Form.createFormModal('Record Kidding', [
            {
                name: 'doeId', label: 'Doe (Mother)', type: 'select', required: true,
                options: does.map(d => ({ value: d.id, label: `${d.tagId}${d.name ? ' - ' + d.name : ''}` }))
            },
            { name: 'kiddingDate', label: 'Kidding Date', type: 'date', required: true, value: Form.today() },
            { name: 'totalKids', label: 'Total Kids Born', type: 'number', required: true },
            { name: 'liveKids', label: 'Live Kids', type: 'number', required: true },
            { name: 'stillborn', label: 'Stillborn', type: 'number' },
            {
                name: 'difficulty', label: 'Difficulty', type: 'select', options: [
                    { value: 'Normal', label: 'Normal (No assistance)' },
                    { value: 'Assisted', label: 'Assisted (Minor help)' },
                    { value: 'Difficult', label: 'Difficult (Major intervention)' }
                ]
            },
            { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'e.g., 2 males, 1 female' }
        ], async (data) => {
            // Store kidding record
            await window.FarmDB.add('kiddings', data);
            Toast.success('Kidding recorded! Remember to add the kids as new goats.');
            App.navigate('breeding');
        });
    },

    async addFinancial(category) {
        const goats = await FarmDB.Goats.getAll();

        const subcategories = category === 'Income'
            ? [
                { value: 'Goat Sale', label: 'Goat Sale' },
                { value: 'Milk Sale', label: 'Milk Sale' },
                { value: 'Manure Sale', label: 'Manure Sale' },
                { value: 'Breeding Fee', label: 'Breeding Fee' },
                { value: 'Other', label: 'Other Income' }
            ]
            : [
                { value: 'Feed', label: 'Feed & Fodder' },
                { value: 'Veterinary', label: 'Veterinary & Medicine' },
                { value: 'Labor', label: 'Labor' },
                { value: 'Transport', label: 'Transport' },
                { value: 'Housing', label: 'Housing & Equipment' },
                { value: 'Goat Purchase', label: 'Goat Purchase' },
                { value: 'Other', label: 'Other Expense' }
            ];

        Form.createFormModal(`Add ${category}`, [
            { name: 'date', label: 'Date', type: 'date', required: true, value: Form.today() },
            { name: 'subcategory', label: 'Type', type: 'select', required: true, options: subcategories },
            { name: 'amount', label: 'Amount (KES)', type: 'number', required: true, placeholder: '0' },
            { name: 'description', label: 'Description', type: 'text', placeholder: 'Optional details' },
            {
                name: 'goatId', label: 'Related Goat', type: 'select',
                options: goats.map(g => ({ value: g.id, label: `${g.tagId}${g.name ? ' - ' + g.name : ''}` }))
            }
        ], async (data) => {
            data.category = category;
            data.amount = parseFloat(data.amount) || 0;

            await FarmDB.Finances.add(data);
            Toast.success(`${category} recorded!`);
            App.navigate('finances');
        });
    },

    async addWeight(goatId) {
        if (!goatId) {
            Toast.warning('Please select a goat first');
            return;
        }

        Form.createFormModal('Record Weight', [
            { name: 'date', label: 'Date', type: 'date', required: true, value: Form.today() },
            { name: 'weight', label: 'Weight (kg)', type: 'number', required: true, placeholder: '0.0' },
            { name: 'notes', label: 'Notes', type: 'textarea' }
        ], async (data) => {
            data.goatId = goatId;
            data.weight = parseFloat(data.weight) || 0;

            await window.FarmDB.add('weights', data);
            Toast.success('Weight recorded!');
            Pages.goatDetail(goatId);
        });
    },

    async editGoat(goatId) {
        const goat = await FarmDB.Goats.get(goatId);
        if (!goat) {
            Toast.error('Goat not found');
            return;
        }

        Form.createFormModal('Edit Goat', [
            { name: 'tagId', label: 'Tag ID', type: 'text', required: true, value: goat.tagId },
            { name: 'name', label: 'Name', type: 'text', value: goat.name || '' },
            {
                name: 'sex', label: 'Sex', type: 'select', required: true, value: goat.sex, options: [
                    { value: 'Female', label: 'Female (Doe)' },
                    { value: 'Male', label: 'Male (Buck)' },
                    { value: 'Castrated', label: 'Castrated' }
                ]
            },
            { name: 'breed', label: 'Breed', type: 'text', value: goat.breed || '' },
            { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', value: goat.dateOfBirth || '' },
            { name: 'color', label: 'Color', type: 'text', value: goat.color || '' },
            {
                name: 'status', label: 'Status', type: 'select', value: goat.status, options: [
                    { value: 'Active', label: 'Active' },
                    { value: 'Sold', label: 'Sold' },
                    { value: 'Deceased', label: 'Deceased' }
                ]
            }
        ], async (data) => {
            for (const key in data) {
                if (data[key] === '') data[key] = null;
            }

            await FarmDB.Goats.update(goatId, data);
            Toast.success('Goat updated!');
            Pages.goatDetail(goatId);
        });
    }
};

// Export
window.App = App;
window.Actions = Actions;

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

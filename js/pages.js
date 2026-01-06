/**
 * FarmHub - Page Renderers
 * Each function renders a specific page
 */

const Pages = {
    // ============================================
    // DASHBOARD PAGE
    // ============================================
    async dashboard() {
        const template = document.getElementById('dashboard-template');
        const content = template.content.cloneNode(true);

        // Load stats
        const stats = await FarmDB.Goats.getStats();
        const pregnancies = await FarmDB.Breedings.getActive();

        content.getElementById('stat-total-goats').textContent = stats.total;
        content.getElementById('stat-does').textContent = stats.does;
        content.getElementById('stat-bucks').textContent = stats.bucks;
        content.getElementById('stat-pregnant').textContent = pregnancies.length;

        // Update sidebar badges
        document.getElementById('goat-count').textContent = stats.total;

        // Render to page
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        main.appendChild(content);

        // Load upcoming tasks
        const reminders = await FarmDB.Reminders.getPending(14);
        const tasksContainer = document.getElementById('upcoming-tasks');
        tasksContainer.innerHTML = '';

        if (reminders.length > 0) {
            for (const reminder of reminders.slice(0, 3)) {
                const item = Components.reminderListItem(reminder, async (r) => {
                    await FarmDB.Reminders.complete(r.id);
                    Toast.success('Task completed!');
                    this.dashboard(); // Refresh
                });
                tasksContainer.appendChild(item);
            }
            const count = document.getElementById('reminder-count');
            if (count) count.textContent = reminders.length;
        } else {
            tasksContainer.appendChild(Components.emptyState('fa-check-circle', 'All caught up! No pending tasks.', true));
        }

        // Load active pregnancies
        const pregnanciesContainer = document.getElementById('active-pregnancies');
        pregnanciesContainer.innerHTML = '';

        if (pregnancies.length > 0) {
            for (const breeding of pregnancies.slice(0, 3)) {
                const doe = await FarmDB.Goats.get(breeding.doeId);
                const item = Components.pregnancyListItem(breeding, doe);
                pregnanciesContainer.appendChild(item);
            }
        } else {
            pregnanciesContainer.appendChild(Components.emptyState('fa-heart', 'No active pregnancies.', true));
        }

        // Load financial summary
        const monthSummary = await FarmDB.Finances.getMonthSummary();
        document.getElementById('monthly-income').textContent = Components.formatMoney(monthSummary.totalIncome);
        document.getElementById('monthly-expense').textContent = Components.formatMoney(monthSummary.totalExpense);
        document.getElementById('monthly-profit').textContent = Components.formatMoney(monthSummary.profit);

        // Attach action handlers
        this.attachActionHandlers();
    },

    // ============================================
    // GOATS LIST PAGE
    // ============================================
    async goats() {
        const goats = await FarmDB.Goats.getAll();
        const activeGoats = goats.filter(g => g.status === 'Active');
        const soldGoats = goats.filter(g => g.status === 'Sold');
        const deceasedGoats = goats.filter(g => g.status === 'Deceased');

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <!-- Filter Tabs -->
                <div class="goat-filter-tabs">
                    <button class="filter-tab active" data-filter="Active">Active (${activeGoats.length})</button>
                    <button class="filter-tab" data-filter="Sold">Sold (${soldGoats.length})</button>
                    <button class="filter-tab" data-filter="Deceased">Deceased (${deceasedGoats.length})</button>
                    <button class="filter-tab" data-filter="All">All (${goats.length})</button>
                </div>
                
                <!-- Add Button -->
                <button class="btn btn-primary btn-block" data-action="add-goat" style="margin-bottom: 16px;">
                    <i class="fas fa-plus"></i> Add New Goat
                </button>
                
                <!-- Goat List -->
                <div id="goat-list" class="card-list"></div>
            </div>
        `;

        // Render goats
        this.renderGoatList(activeGoats);

        // Filter handler
        main.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                main.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const filter = tab.dataset.filter;
                const filtered = filter === 'All' ? goats : goats.filter(g => g.status === filter);
                this.renderGoatList(filtered);
            });
        });

        this.attachActionHandlers();
    },

    renderGoatList(goats) {
        const container = document.getElementById('goat-list');
        container.innerHTML = '';

        if (goats.length === 0) {
            container.appendChild(Components.emptyState('fa-paw', 'No goats found. Add your first goat!'));
            return;
        }

        for (const goat of goats) {
            const item = Components.goatListItem(goat, (g) => this.goatDetail(g.id));
            container.appendChild(item);
        }
    },

    // ============================================
    // GOAT DETAIL PAGE
    // ============================================
    async goatDetail(goatId) {
        const goat = await FarmDB.Goats.get(goatId);
        if (!goat) {
            Toast.error('Goat not found');
            return this.goats();
        }

        const vaccinations = await FarmDB.Vaccinations.getByGoat(goatId);
        const dewormings = await FarmDB.Dewormings.getByGoat(goatId);

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <!-- Header Card -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-body" style="text-align: center; padding: 24px;">
                        <div class="list-item-avatar ${goat.sex === 'Female' ? 'female' : 'male'}" 
                             style="width: 80px; height: 80px; margin: 0 auto 16px; font-size: 32px;">
                            ${goat.tagId?.substring(0, 2) || '??'}
                        </div>
                        <h2 style="margin-bottom: 4px;">${goat.tagId}</h2>
                        ${goat.name ? `<p style="color: var(--gray-500); margin-bottom: 8px;">${goat.name}</p>` : ''}
                        <span class="badge badge-${goat.status === 'Active' ? 'success' : 'info'}">${goat.status}</span>
                        <span class="badge badge-${goat.sex === 'Female' ? 'danger' : 'info'}" style="margin-left: 4px;">${goat.sex}</span>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="action-grid" style="margin-bottom: 16px;">
                    <button class="action-card" data-action="vaccinate-goat" data-goat-id="${goatId}">
                        <i class="fas fa-syringe"></i>
                        <span>Vaccinate</span>
                    </button>
                    <button class="action-card" data-action="deworm-goat" data-goat-id="${goatId}">
                        <i class="fas fa-pills"></i>
                        <span>Deworm</span>
                    </button>
                    <button class="action-card" data-action="weigh-goat" data-goat-id="${goatId}">
                        <i class="fas fa-weight"></i>
                        <span>Weight</span>
                    </button>
                    <button class="action-card" data-action="edit-goat" data-goat-id="${goatId}">
                        <i class="fas fa-edit"></i>
                        <span>Edit</span>
                    </button>
                </div>
                
                <!-- Details Card -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title">Details</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        ${this.detailRow('Breed', goat.breed || 'East African')}
                        ${this.detailRow('Age', FarmDB.Goats.formatAge(goat))}
                        ${this.detailRow('Date of Birth', Components.formatDate(goat.dateOfBirth) || 'Unknown')}
                        ${this.detailRow('Color', goat.color || '-')}
                        ${this.detailRow('Source', goat.source || '-')}
                        ${goat.purchasePrice ? this.detailRow('Purchase Price', Components.formatMoney(goat.purchasePrice)) : ''}
                    </div>
                </div>
                
                <!-- Vaccination History -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-syringe text-info"></i> Vaccinations</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        ${vaccinations.length > 0 ? vaccinations.slice(0, 5).map(v => `
                            <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100);">
                                <strong>${v.vaccineName || 'Vaccination'}</strong>
                                <span style="float: right; color: var(--gray-500);">${Components.formatDate(v.dateGiven)}</span>
                            </div>
                        `).join('') : '<div style="padding: 16px; text-align: center; color: var(--gray-400);">No vaccinations recorded</div>'}
                    </div>
                </div>
                
                <!-- Deworming History -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-pills text-warning"></i> Dewormings</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        ${dewormings.length > 0 ? dewormings.slice(0, 5).map(d => `
                            <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100);">
                                <strong>${d.dewormerName || 'Deworming'}</strong>
                                ${d.famachaScore ? `<span class="badge badge-warning" style="margin-left: 8px;">FAMACHA ${d.famachaScore}</span>` : ''}
                                <span style="float: right; color: var(--gray-500);">${Components.formatDate(d.dateGiven)}</span>
                            </div>
                        `).join('') : '<div style="padding: 16px; text-align: center; color: var(--gray-400);">No dewormings recorded</div>'}
                    </div>
                </div>
                
                <!-- Back Button -->
                <button class="btn btn-secondary btn-block" onclick="Pages.goats()">
                    <i class="fas fa-arrow-left"></i> Back to List
                </button>
            </div>
        `;

        this.attachActionHandlers();
    },

    detailRow(label, value) {
        return `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between;">
                <span style="color: var(--gray-500);">${label}</span>
                <span style="font-weight: 500;">${value}</span>
            </div>
        `;
    },

    // ============================================
    // BREEDING PAGE
    // ============================================
    async breeding() {
        const pregnancies = await FarmDB.Breedings.getActive();
        const does = await FarmDB.Goats.getDoes();
        const bucks = await FarmDB.Goats.getBucks();

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <button class="btn btn-primary btn-block" data-action="add-breeding" style="margin-bottom: 16px;">
                    <i class="fas fa-heart"></i> Record Breeding
                </button>
                
                <!-- Active Pregnancies -->
                <div class="section">
                    <h2 class="section-title"><i class="fas fa-heart text-danger"></i> Active Pregnancies (${pregnancies.length})</h2>
                    <div id="pregnancy-list" class="card-list"></div>
                </div>
                
                <!-- Available Does -->
                <div class="section">
                    <h2 class="section-title"><i class="fas fa-venus text-danger"></i> Does (${does.length})</h2>
                    <div class="card-list">
                        ${does.slice(0, 5).map(doe => `
                            <div class="list-item">
                                <div class="list-item-avatar female">${doe.tagId?.substring(0, 2)}</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${doe.tagId}${doe.name ? ' - ' + doe.name : ''}</div>
                                    <div class="list-item-subtitle">${doe.breed || 'East African'}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${does.length === 0 ? '<div class="empty-state small"><p>No does in herd</p></div>' : ''}
                    </div>
                </div>
                
                <!-- Available Bucks -->
                <div class="section">
                    <h2 class="section-title"><i class="fas fa-mars text-info"></i> Bucks (${bucks.length})</h2>
                    <div class="card-list">
                        ${bucks.slice(0, 3).map(buck => `
                            <div class="list-item">
                                <div class="list-item-avatar male">${buck.tagId?.substring(0, 2)}</div>
                                <div class="list-item-content">
                                    <div class="list-item-title">${buck.tagId}${buck.name ? ' - ' + buck.name : ''}</div>
                                    <div class="list-item-subtitle">${buck.breed || 'East African'}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${bucks.length === 0 ? '<div class="empty-state small"><p>No bucks in herd</p></div>' : ''}
                    </div>
                </div>
            </div>
        `;

        // Render pregnancies
        const pregnancyList = document.getElementById('pregnancy-list');
        if (pregnancies.length > 0) {
            for (const breeding of pregnancies) {
                const doe = await FarmDB.Goats.get(breeding.doeId);
                const item = Components.pregnancyListItem(breeding, doe);
                pregnancyList.appendChild(item);
            }
        } else {
            pregnancyList.appendChild(Components.emptyState('fa-heart', 'No active pregnancies', true));
        }

        this.attachActionHandlers();
    },

    // ============================================
    // FINANCES PAGE
    // ============================================
    async finances() {
        const summary = await FarmDB.Finances.getSummary();

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <!-- Summary Cards -->
                <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 16px;">
                    <div class="stat-card" style="background: #dcfce7;">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="color: var(--success);">${Components.formatMoney(summary.totalIncome)}</span>
                            <span class="stat-label">Income</span>
                        </div>
                    </div>
                    <div class="stat-card" style="background: #fee2e2;">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="color: var(--danger);">${Components.formatMoney(summary.totalExpense)}</span>
                            <span class="stat-label">Expenses</span>
                        </div>
                    </div>
                    <div class="stat-card" style="background: var(--primary-50);">
                        <div class="stat-content" style="text-align: center; width: 100%;">
                            <span class="stat-value" style="color: var(--primary-700);">${Components.formatMoney(summary.profit)}</span>
                            <span class="stat-label">Profit</span>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <button class="btn btn-primary" data-action="add-income">
                        <i class="fas fa-plus"></i> Income
                    </button>
                    <button class="btn btn-danger" data-action="add-expense">
                        <i class="fas fa-minus"></i> Expense
                    </button>
                </div>
                
                <!-- Recent Transactions -->
                <div class="section">
                    <h2 class="section-title">Recent Transactions</h2>
                    <div class="card">
                        <div class="card-body" style="padding: 0;">
                            ${summary.records.length > 0 ? summary.records.map(r => `
                                <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 500;">${r.subcategory || r.category}</div>
                                        <div style="font-size: 13px; color: var(--gray-500);">${Components.formatDate(r.date)}${r.description ? ' • ' + r.description : ''}</div>
                                    </div>
                                    <div style="font-weight: 600; color: ${r.category === 'Income' ? 'var(--success)' : 'var(--danger)'};">
                                        ${r.category === 'Income' ? '+' : '-'}${Components.formatMoney(r.amount)}
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-state small"><p>No transactions yet</p></div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachActionHandlers();
    },

    // ============================================
    // GUIDES PAGE
    // ============================================
    async guides() {
        const vaccineTypes = await FarmDB.getAll('vaccineTypes');
        const dewormerTypes = await FarmDB.getAll('dewormerTypes');

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <!-- Vaccine Guide -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header" style="background: var(--primary-50);">
                        <h3 class="card-title"><i class="fas fa-syringe text-primary"></i> Vaccination Schedule</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        ${vaccineTypes.map(v => `
                            <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>${v.name}</strong>
                                    ${v.isCritical ? '<span class="badge badge-danger">Critical</span>' : ''}
                                </div>
                                <div style="font-size: 13px; color: var(--gray-500); margin-top: 4px;">
                                    ${v.frequencyMonths === 0 ? 'Once (Lifetime)' : `Every ${v.frequencyMonths} months`} • Min age: ${v.minAgeMonths} months
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- FAMACHA Guide -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header" style="background: #fef3c7;">
                        <h3 class="card-title"><i class="fas fa-eye text-warning"></i> FAMACHA Scoring</h3>
                    </div>
                    <div class="card-body">
                        <p style="margin-bottom: 12px;">Check the inner lower eyelid color:</p>
                        <div style="display: flex; gap: 8px; text-align: center;">
                            <div style="flex: 1; padding: 12px 8px; background: #dc2626; color: white; border-radius: 8px;">
                                <strong>1</strong><br><small>Deep Red</small>
                            </div>
                            <div style="flex: 1; padding: 12px 8px; background: #ef4444; color: white; border-radius: 8px;">
                                <strong>2</strong><br><small>Pink-Red</small>
                            </div>
                            <div style="flex: 1; padding: 12px 8px; background: #f59e0b; color: white; border-radius: 8px;">
                                <strong>3</strong><br><small>Pink</small>
                            </div>
                            <div style="flex: 1; padding: 12px 8px; background: #fcd34d; color: var(--gray-800); border-radius: 8px;">
                                <strong>4</strong><br><small>Pale</small>
                            </div>
                            <div style="flex: 1; padding: 12px 8px; background: #f9fafb; color: var(--gray-800); border-radius: 8px; border: 1px solid var(--gray-300);">
                                <strong>5</strong><br><small>White</small>
                            </div>
                        </div>
                        <p style="margin-top: 12px; font-size: 13px; color: var(--gray-600);">
                            <strong>1-2:</strong> No treatment needed<br>
                            <strong>3:</strong> Monitor closely<br>
                            <strong>4-5:</strong> Deworm immediately!
                        </p>
                    </div>
                </div>
                
                <!-- Dewormer Classes -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-pills text-info"></i> Dewormer Classes (Rotate!)</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        ${dewormerTypes.map(d => `
                            <div style="padding: 12px 16px; border-bottom: 1px solid var(--gray-100);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>${d.name}</strong>
                                    <span class="badge badge-info">${d.drugClass}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // ============================================
    // REMINDERS PAGE
    // ============================================
    async reminders() {
        const reminders = await FarmDB.Reminders.getPending(60);

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <h2 class="section-title" style="margin-bottom: 16px;">
                    <i class="fas fa-bell text-warning"></i> Upcoming Tasks
                </h2>
                <div id="reminder-list" class="card-list"></div>
            </div>
        `;

        const list = document.getElementById('reminder-list');
        if (reminders.length > 0) {
            for (const reminder of reminders) {
                const item = Components.reminderListItem(reminder, async (r) => {
                    await FarmDB.Reminders.complete(r.id);
                    Toast.success('Task completed!');
                    this.reminders(); // Refresh
                });
                list.appendChild(item);
            }
        } else {
            list.appendChild(Components.emptyState('fa-check-circle', 'All caught up! No pending tasks.'));
        }
    },

    // ============================================
    // 5-YEAR PROJECTION PAGE
    // ============================================
    async projections() {
        const stats = await FarmDB.Goats.getStats();

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <h2 class="section-title" style="margin-bottom: 16px;">
                    <i class="fas fa-chart-line text-primary"></i> 5-Year Business Projection
                </h2>
                
                <!-- Input Form -->
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-sliders-h"></i> Your Farm Parameters</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Starting Does</label>
                                <input type="number" class="form-control" id="proj-does" value="${stats.does || 20}" min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Starting Bucks</label>
                                <input type="number" class="form-control" id="proj-bucks" value="${stats.bucks || 2}" min="1">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Kids per Doe/Year</label>
                                <input type="number" class="form-control" id="proj-kidding-rate" value="1.5" step="0.1" min="0.5" max="3">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Kid Survival Rate (%)</label>
                                <input type="number" class="form-control" id="proj-survival" value="85" min="50" max="100">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Male Sale Price (KES)</label>
                                <input type="number" class="form-control" id="proj-male-price" value="7000" step="500">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Monthly Cost/Goat (KES)</label>
                                <input type="number" class="form-control" id="proj-monthly-cost" value="350" step="50">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Monthly Labor Cost (KES)</label>
                                <input type="number" class="form-control" id="proj-labor" value="5000" step="500">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Initial Investment (KES)</label>
                                <input type="number" class="form-control" id="proj-investment" value="200000" step="10000">
                            </div>
                        </div>
                        
                        <button class="btn btn-primary btn-block" id="calculate-btn">
                            <i class="fas fa-calculator"></i> Calculate Projection
                        </button>
                    </div>
                </div>
                
                <!-- Results Container -->
                <div id="projection-results"></div>
            </div>
        `;

        // Calculate button handler
        document.getElementById('calculate-btn').addEventListener('click', () => {
            const params = {
                startingDoes: parseInt(document.getElementById('proj-does').value) || 20,
                startingBucks: parseInt(document.getElementById('proj-bucks').value) || 2,
                kiddingRate: parseFloat(document.getElementById('proj-kidding-rate').value) || 1.5,
                kidSurvivalRate: (parseInt(document.getElementById('proj-survival').value) || 85) / 100,
                maleSalePrice: parseInt(document.getElementById('proj-male-price').value) || 7000,
                feedCostPerGoat: parseInt(document.getElementById('proj-monthly-cost').value) || 350,
                laborCost: parseInt(document.getElementById('proj-labor').value) || 5000,
                initialInvestment: parseInt(document.getElementById('proj-investment').value) || 200000
            };

            const projection = Projections.calculate(params);
            const report = Projections.generateReport(projection);

            document.getElementById('projection-results').innerHTML = report;
            Toast.success('Projection calculated!');
        });

        // Auto-calculate on load
        setTimeout(() => {
            document.getElementById('calculate-btn').click();
        }, 100);
    },

    // ============================================
    // BACKUP PAGE
    // ============================================
    async backup() {
        const stats = await FarmDB.Goats.getStats();

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="page">
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-database"></i> Your Data</h3>
                    </div>
                    <div class="card-body">
                        <p style="margin-bottom: 16px;">Total goats: <strong>${stats.total}</strong></p>
                        <p style="color: var(--gray-500); font-size: 13px;">
                            All data is stored locally on this device. Export regularly to keep a backup.
                        </p>
                    </div>
                </div>
                
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-download"></i> Export Data</h3>
                    </div>
                    <div class="card-body">
                        <p style="margin-bottom: 16px; color: var(--gray-600);">
                            Download all your farm data as a JSON file for backup.
                        </p>
                        <button class="btn btn-primary btn-block" id="export-btn">
                            <i class="fas fa-download"></i> Export to JSON
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-upload"></i> Import Data</h3>
                    </div>
                    <div class="card-body">
                        <p style="margin-bottom: 16px; color: var(--gray-600);">
                            Restore data from a previously exported JSON file.
                        </p>
                        <input type="file" id="import-input" accept=".json" style="display: none;">
                        <button class="btn btn-secondary btn-block" id="import-btn">
                            <i class="fas fa-upload"></i> Import from JSON
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Export handler
        document.getElementById('export-btn').addEventListener('click', async () => {
            try {
                const data = await FarmDB.exportAllData();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `farmhub-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                Toast.success('Data exported successfully!');
            } catch (err) {
                Toast.error('Export failed: ' + err.message);
            }
        });

        // Import handler
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-input').click();
        });

        document.getElementById('import-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (confirm('This will replace all existing data. Continue?')) {
                    await FarmDB.importAllData(data);
                    Toast.success('Data imported successfully!');
                    this.backup(); // Refresh
                }
            } catch (err) {
                Toast.error('Import failed: ' + err.message);
            }
        });
    },

    // ============================================
    // HELPER: Attach Action Handlers
    // ============================================
    attachActionHandlers() {
        document.querySelectorAll('[data-action]').forEach(el => {
            el.addEventListener('click', (e) => {
                const action = el.dataset.action;
                const goatId = el.dataset.goatId;
                Actions.handle(action, { goatId });
            });
        });
    }
};

// Export
window.Pages = Pages;

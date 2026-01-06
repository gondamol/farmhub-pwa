/**
 * FarmHub - UI Components
 * Reusable UI components and utilities
 */

// ============================================
// TOAST NOTIFICATIONS
// ============================================
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

// ============================================
// MODAL HANDLER
// ============================================
const Modal = {
    current: null,

    show(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('visible'), 10);
        this.current = modal;

        // Close on overlay click
        const overlay = modal.querySelector('.modal-overlay');
        overlay?.addEventListener('click', () => this.hide());

        // Close on escape key
        document.addEventListener('keydown', this.handleEscape);
    },

    hide() {
        if (!this.current) return;

        this.current.classList.remove('visible');
        setTimeout(() => {
            this.current.classList.add('hidden');
            this.current = null;
        }, 300);

        document.removeEventListener('keydown', this.handleEscape);
    },

    handleEscape(e) {
        if (e.key === 'Escape') Modal.hide();
    }
};

// ============================================
// FORM UTILITIES
// ============================================
const Form = {
    /**
     * Create a form modal dynamically
     */
    createFormModal(title, fields, onSubmit) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'dynamic-form-modal';

        let fieldsHtml = '';
        for (const field of fields) {
            fieldsHtml += this.createFieldHtml(field);
        }

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-sheet">
                <div class="modal-handle"></div>
                <h2 class="modal-title">${title}</h2>
                <form id="dynamic-form">
                    ${fieldsHtml}
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="Modal.hide()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#dynamic-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                await onSubmit(data);
                Modal.hide();
                setTimeout(() => modal.remove(), 300);
            } catch (err) {
                Toast.error('Error: ' + err.message);
            }
        });

        Modal.show('dynamic-form-modal');
    },

    createFieldHtml(field) {
        const { name, label, type = 'text', required = false, options = [], value = '', placeholder = '' } = field;

        let input = '';

        if (type === 'select') {
            const optionsHtml = options.map(opt =>
                `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
            input = `<select class="form-control" name="${name}" id="${name}" ${required ? 'required' : ''}>
                <option value="">Select ${label}</option>
                ${optionsHtml}
            </select>`;
        } else if (type === 'textarea') {
            input = `<textarea class="form-control" name="${name}" id="${name}" rows="3" 
                placeholder="${placeholder}" ${required ? 'required' : ''}>${value}</textarea>`;
        } else {
            input = `<input type="${type}" class="form-control" name="${name}" id="${name}" 
                value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>`;
        }

        return `
            <div class="form-group">
                <label class="form-label" for="${name}">${label}${required ? ' *' : ''}</label>
                ${input}
            </div>
        `;
    },

    /**
     * Get current date in YYYY-MM-DD format
     */
    today() {
        return new Date().toISOString().split('T')[0];
    }
};

// ============================================
// LIST ITEM COMPONENTS
// ============================================
const Components = {
    /**
     * Create a goat list item
     */
    goatListItem(goat, onClick) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.cursor = 'pointer';

        const sexClass = goat.sex === 'Female' ? 'female' : 'male';
        const initials = goat.tagId?.substring(0, 2) || '??';
        const age = FarmDB.Goats.formatAge(goat);

        item.innerHTML = `
            <div class="list-item-avatar ${sexClass}">${initials}</div>
            <div class="list-item-content">
                <div class="list-item-title">${goat.tagId}${goat.name ? ' - ' + goat.name : ''}</div>
                <div class="list-item-subtitle">${goat.breed || 'East African'} • ${age}</div>
            </div>
            <span class="badge badge-${goat.status === 'Active' ? 'success' : 'info'}">${goat.status}</span>
        `;

        if (onClick) {
            item.addEventListener('click', () => onClick(goat));
        }

        return item;
    },

    /**
     * Create a pregnancy list item
     */
    pregnancyListItem(breeding, doe) {
        const item = document.createElement('div');
        item.className = 'list-item';

        const daysUntil = this.daysUntil(breeding.expectedKiddingDate);
        const badgeClass = daysUntil <= 7 ? 'danger' : daysUntil <= 14 ? 'warning' : 'info';

        item.innerHTML = `
            <div class="list-item-avatar female">${doe?.tagId?.substring(0, 2) || '??'}</div>
            <div class="list-item-content">
                <div class="list-item-title">${doe?.tagId || 'Unknown'}${doe?.name ? ' - ' + doe.name : ''}</div>
                <div class="list-item-subtitle">Expected: ${this.formatDate(breeding.expectedKiddingDate)}</div>
            </div>
            <span class="badge badge-${badgeClass}">${daysUntil} days</span>
        `;

        return item;
    },

    /**
     * Create a reminder list item
     */
    reminderListItem(reminder, onComplete) {
        const item = document.createElement('div');
        item.className = 'list-item';

        const daysUntil = this.daysUntil(reminder.dueDate);
        const overdue = daysUntil < 0;
        const badgeClass = overdue ? 'danger' : daysUntil <= 3 ? 'warning' : 'info';
        const badgeText = overdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `${daysUntil} days`;

        const icon = {
            'Vaccination': 'fa-syringe',
            'Deworming': 'fa-pills',
            'Kidding': 'fa-baby',
            'Breeding': 'fa-heart'
        }[reminder.type] || 'fa-bell';

        item.innerHTML = `
            <div class="list-item-avatar" style="background: var(--warning); font-size: 16px;">
                <i class="fas ${icon}"></i>
            </div>
            <div class="list-item-content">
                <div class="list-item-title">${reminder.title}</div>
                <div class="list-item-subtitle">${reminder.description || ''}</div>
            </div>
            <span class="badge badge-${badgeClass}">${badgeText}</span>
        `;

        if (onComplete) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-primary';
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.marginLeft = '8px';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                onComplete(reminder);
            });
            item.appendChild(btn);
        }

        return item;
    },

    /**
     * Create empty state
     */
    emptyState(icon, message, small = false) {
        const div = document.createElement('div');
        div.className = `empty-state ${small ? 'small' : ''}`;
        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <p>${message}</p>
        `;
        return div;
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    /**
     * Calculate days until a date
     */
    daysUntil(dateString) {
        if (!dateString) return 0;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return Math.round((date - today) / (1000 * 60 * 60 * 24));
    },

    /**
     * Format currency
     */
    formatMoney(amount) {
        return 'KES ' + Number(amount || 0).toLocaleString();
    }
};

// Export
window.Toast = Toast;
window.Modal = Modal;
window.Form = Form;
window.Components = Components;

/**
 * FarmHub - IndexedDB Database Module
 * Offline-first data storage with full CRUD operations
 */

const DB_NAME = 'FarmHubDB';
const DB_VERSION = 2;

// Database instance
let db = null;

// Store definitions. Indexes listed here are created on upgrade for both new
// and existing stores, so adding an index only requires bumping DB_VERSION.
const STORES = {
    goats: { keyPath: 'id', autoIncrement: true, indexes: { tagId: { unique: true }, status: {}, sex: {} } },
    vaccinations: { keyPath: 'id', autoIncrement: true, indexes: { goatId: {}, nextDueDate: {} } },
    dewormings: { keyPath: 'id', autoIncrement: true, indexes: { goatId: {} } },
    breedings: { keyPath: 'id', autoIncrement: true, indexes: { doeId: {}, outcome: {} } },
    kiddings: { keyPath: 'id', autoIncrement: true },
    healthEvents: { keyPath: 'id', autoIncrement: true },
    weights: { keyPath: 'id', autoIncrement: true },
    finances: { keyPath: 'id', autoIncrement: true, indexes: { category: {}, date: {} } },
    reminders: { keyPath: 'id', autoIncrement: true, indexes: { dueDate: {}, isCompleted: {} } },
    vaccineTypes: { keyPath: 'id', autoIncrement: true },
    dewormerTypes: { keyPath: 'id', autoIncrement: true },
    settings: { keyPath: 'key' }
};

// Fields that reference another record's auto-increment id. Form values and
// data-* attributes arrive as strings, so these are coerced to numbers on
// write or index lookups silently return nothing.
const REF_FIELDS = ['goatId', 'doeId', 'buckId', 'damId', 'sireId', 'vaccineTypeId', 'dewormerTypeId', 'breedingId'];

function toKey(storeName, id) {
    if (STORES[storeName]?.autoIncrement && typeof id === 'string' && /^\d+$/.test(id)) {
        return Number(id);
    }
    return id;
}

function normalizeRefs(record) {
    for (const field of REF_FIELDS) {
        const value = record[field];
        if (value === '') {
            record[field] = null;
        } else if (typeof value === 'string' && /^\d+$/.test(value)) {
            record[field] = Number(value);
        }
    }
    return record;
}

/**
 * Initialize the database
 */
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const transaction = event.target.transaction;
            
            for (const [storeName, { indexes = {}, ...options }] of Object.entries(STORES)) {
                const store = database.objectStoreNames.contains(storeName)
                    ? transaction.objectStore(storeName)
                    : database.createObjectStore(storeName, options);
                
                for (const [indexName, indexOptions] of Object.entries(indexes)) {
                    if (!store.indexNames.contains(indexName)) {
                        store.createIndex(indexName, indexName, { unique: false, ...indexOptions });
                    }
                }
                
                // v1 stored reference ids as strings; convert them in place
                if (event.oldVersion > 0 && event.oldVersion < 2) {
                    store.openCursor().onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (!cursor) return;
                        const before = JSON.stringify(cursor.value);
                        const after = normalizeRefs({ ...cursor.value });
                        if (JSON.stringify(after) !== before) cursor.update(after);
                        cursor.continue();
                    };
                }
            }
        };
    });
}

/**
 * Generic CRUD Operations
 */
async function add(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        normalizeRefs(data);
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        data.syncStatus = 'pending';
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function update(storeName, id, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        normalizeRefs(data);
        
        // First get the existing record
        const getRequest = store.get(toKey(storeName, id));
        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (!existing) {
                reject(new Error('Record not found'));
                return;
            }
            
            const updated = { ...existing, ...data, updatedAt: new Date().toISOString(), syncStatus: 'pending' };
            const putRequest = store.put(updated);
            putRequest.onsuccess = () => resolve(updated);
            putRequest.onerror = () => reject(putRequest.error);
        };
    });
}

async function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(toKey(storeName, id));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function get(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(toKey(storeName, id));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(REF_FIELDS.includes(indexName) ? toKey(storeName, value) : value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function count(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Goat-specific operations
 */
const Goats = {
    async add(goat) {
        return add('goats', goat);
    },
    
    async update(id, data) {
        return update('goats', id, data);
    },
    
    async delete(id) {
        return remove('goats', id);
    },
    
    async get(id) {
        return get('goats', id);
    },
    
    async getAll(status = null) {
        const goats = await getAll('goats');
        if (status) {
            return goats.filter(g => g.status === status);
        }
        return goats;
    },
    
    async getActive() {
        return this.getAll('Active');
    },
    
    async getDoes() {
        const goats = await this.getActive();
        return goats.filter(g => g.sex === 'Female');
    },
    
    async getBucks() {
        const goats = await this.getActive();
        return goats.filter(g => g.sex === 'Male');
    },
    
    async getStats() {
        const goats = await this.getActive();
        return {
            total: goats.length,
            does: goats.filter(g => g.sex === 'Female').length,
            bucks: goats.filter(g => g.sex === 'Male').length,
            kids: goats.filter(g => this.isKid(g)).length
        };
    },
    
    isKid(goat) {
        if (!goat.dateOfBirth) return false;
        const ageMonths = this.getAgeMonths(goat);
        return ageMonths < 6;
    },
    
    getAgeMonths(goat) {
        if (!goat.dateOfBirth) return null;
        const birth = new Date(goat.dateOfBirth);
        const now = new Date();
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        return months;
    },
    
    formatAge(goat) {
        const months = this.getAgeMonths(goat);
        if (months === null) return 'Unknown';
        if (months < 12) return `${months} months`;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
        return `${years}y ${remainingMonths}m`;
    }
};

/**
 * Breeding operations
 */
const Breedings = {
    async add(breeding) {
        // Calculate expected kidding date (150 days from breeding)
        const breedingDate = new Date(breeding.breedingDate);
        const expectedKidding = new Date(breedingDate);
        expectedKidding.setDate(expectedKidding.getDate() + 150);
        breeding.expectedKiddingDate = expectedKidding.toISOString().split('T')[0];
        breeding.outcome = 'Pending';
        
        const id = await add('breedings', breeding);
        
        // Create reminder for expected kidding
        await Reminders.add({
            goatId: breeding.doeId,
            type: 'Kidding',
            dueDate: breeding.expectedKiddingDate,
            title: 'Expected Kidding',
            description: 'Prepare kidding pen. Check on doe frequently.',
            priority: 'High'
        });
        
        return id;
    },
    
    async getActive() {
        const all = await getAll('breedings');
        return all.filter(b => b.outcome === 'Pending');
    },
    
    async getByDoe(doeId) {
        return getAllByIndex('breedings', 'doeId', doeId);
    },
    
    async updateOutcome(id, outcome, actualDate = null, notes = null) {
        return update('breedings', id, { outcome, actualKiddingDate: actualDate, outcomeNotes: notes });
    }
};

/**
 * Vaccination operations
 */
const Vaccinations = {
    async add(vaccination) {
        return add('vaccinations', vaccination);
    },
    
    async getByGoat(goatId) {
        return getAllByIndex('vaccinations', 'goatId', goatId);
    },
    
    async getDue() {
        const all = await getAll('vaccinations');
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 30);
        
        return all.filter(v => {
            if (!v.nextDueDate) return false;
            const dueDate = new Date(v.nextDueDate);
            return dueDate <= future;
        });
    }
};

/**
 * Deworming operations
 */
const Dewormings = {
    async add(deworming) {
        return add('dewormings', deworming);
    },
    
    async getByGoat(goatId) {
        return getAllByIndex('dewormings', 'goatId', goatId);
    }
};

/**
 * Financial operations
 */
const Finances = {
    async add(record) {
        return add('finances', record);
    },
    
    async getAll() {
        const records = await getAll('finances');
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    
    async getSummary(startDate = null, endDate = null) {
        let records = await this.getAll();
        
        if (startDate) {
            records = records.filter(r => new Date(r.date) >= new Date(startDate));
        }
        if (endDate) {
            records = records.filter(r => new Date(r.date) <= new Date(endDate));
        }
        
        const income = records.filter(r => r.category === 'Income').reduce((sum, r) => sum + r.amount, 0);
        const expense = records.filter(r => r.category === 'Expense').reduce((sum, r) => sum + r.amount, 0);
        
        return {
            totalIncome: income,
            totalExpense: expense,
            profit: income - expense,
            records: records.slice(0, 20)
        };
    },
    
    async getMonthSummary() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return this.getSummary(startOfMonth);
    }
};

/**
 * Reminder operations
 */
const Reminders = {
    async add(reminder) {
        reminder.isCompleted = false;
        return add('reminders', reminder);
    },
    
    async getPending(daysAhead = 30) {
        const all = await getAll('reminders');
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + daysAhead);
        
        return all.filter(r => !r.isCompleted && new Date(r.dueDate) <= future)
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },
    
    async complete(id) {
        return update('reminders', id, { isCompleted: true, completedAt: new Date().toISOString() });
    }
};

/**
 * Seed default data
 */
// Dosing and safety text shown to farmers; have a vet confirm any change.
const ALBENDAZOLE_NOTE = 'Broad spectrum, also treats liver fluke. Do NOT give in the first month of pregnancy (can cause birth defects). Dose by weight as on the label; goats need a higher dose than sheep.';

async function seedDefaultData() {
    const vaccineTypes = await getAll('vaccineTypes');
    if (vaccineTypes.length === 0) {
        const defaultVaccines = [
            { name: 'PPR', description: 'Peste des Petits Ruminants (Goat Plague)', frequencyMonths: 0, minAgeMonths: 3, isCritical: true, notes: 'Single dose provides lifetime immunity. Critical vaccine.' },
            { name: 'CCPP', description: 'Contagious Caprine Pleuropneumonia', frequencyMonths: 12, minAgeMonths: 3, isCritical: true, notes: 'Annual vaccination. Give before cold/dusty seasons.' },
            { name: 'Enterotoxaemia', description: 'Clostridial disease (Overeating disease)', frequencyMonths: 6, minAgeMonths: 2, isCritical: true, notes: 'Give twice yearly. Critical before lush pasture seasons.' },
            { name: 'Tetanus', description: 'Clostridium tetani', frequencyMonths: 12, minAgeMonths: 2, isCritical: false, notes: 'Important after castration or injuries.' },
            { name: 'Goat Pox', description: 'Capripoxvirus', frequencyMonths: 12, minAgeMonths: 3, isCritical: false, notes: 'Annual vaccination if disease is in your area.' },
            { name: 'Foot Rot', description: 'Dichelobacter nodosus', frequencyMonths: 6, minAgeMonths: 6, isCritical: false, notes: 'Only if foot rot is a problem in your area.' }
        ];
        
        for (const vaccine of defaultVaccines) {
            await add('vaccineTypes', vaccine);
        }
    }
    
    const dewormerTypes = await getAll('dewormerTypes');
    if (dewormerTypes.length === 0) {
        const defaultDewormers = [
            { name: 'Albendazole', drugClass: 'Benzimidazoles', notes: ALBENDAZOLE_NOTE },
            { name: 'Fenbendazole', drugClass: 'Benzimidazoles', notes: 'Broad spectrum. Safe for young kids and pregnant does.' },
            { name: 'Ivermectin', drugClass: 'Macrocyclic Lactones', notes: 'Effective against roundworms and external parasites. 0.2mg/kg.' },
            { name: 'Levamisole', drugClass: 'Imidazothiazoles', notes: 'Fast acting. Do not overdose - narrow safety margin.' }
        ];
        
        for (const dewormer of defaultDewormers) {
            await add('dewormerTypes', dewormer);
        }
    } else {
        // Early builds wrongly seeded albendazole as safe in pregnancy
        const albendazole = dewormerTypes.find(d => d.name === 'Albendazole' && /Safe during pregnancy/.test(d.notes || ''));
        if (albendazole) {
            await update('dewormerTypes', albendazole.id, { notes: ALBENDAZOLE_NOTE });
        }
    }
}

/**
 * Export/Import for backup
 */
async function exportAllData() {
    const data = {};
    for (const storeName of Object.keys(STORES)) {
        data[storeName] = await getAll(storeName);
    }
    return data;
}

async function importAllData(data) {
    for (const [storeName, records] of Object.entries(data)) {
        if (!STORES[storeName]) continue;
        
        // Clear existing data
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        // Add imported records
        for (const record of records) {
            await add(storeName, record);
        }
    }
}

// Export for use in other modules
window.FarmDB = {
    init: initDatabase,
    seedDefaults: seedDefaultData,
    Goats,
    Breedings,
    Vaccinations,
    Dewormings,
    Finances,
    Reminders,
    getAll,
    exportAllData,
    importAllData
};

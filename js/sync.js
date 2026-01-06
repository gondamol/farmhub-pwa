/**
 * FarmHub - Cloud Sync Module
 * Handles synchronization with Cloudflare Workers backend
 */

const CloudSync = {
    // API endpoint - change this when deploying
    API_URL: 'https://farmhub-api.YOUR_SUBDOMAIN.workers.dev', // Replace with your Cloudflare Worker URL

    // Device ID for conflict resolution
    deviceId: null,

    // Sync status
    isSyncing: false,
    lastSyncTime: null,

    /**
     * Initialize cloud sync
     */
    async init() {
        // Get or create device ID
        this.deviceId = localStorage.getItem('farmhub_device_id');
        if (!this.deviceId) {
            this.deviceId = this.generateDeviceId();
            localStorage.setItem('farmhub_device_id', this.deviceId);
        }

        // Get last sync time
        this.lastSyncTime = localStorage.getItem('farmhub_last_sync');

        // Listen for online status
        window.addEventListener('online', () => this.syncIfNeeded());

        console.log('☁️ Cloud sync initialized, device:', this.deviceId.substring(0, 8));
    },

    /**
     * Generate unique device ID
     */
    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Check if sync is needed and perform if online
     */
    async syncIfNeeded() {
        if (!navigator.onLine) {
            console.log('⚪ Offline, skipping sync');
            return;
        }

        // Don't sync more than once per minute
        const now = Date.now();
        if (this.lastSyncTime && (now - this.lastSyncTime) < 60000) {
            console.log('⚪ Sync too recent, skipping');
            return;
        }

        await this.sync();
    },

    /**
     * Perform full sync
     */
    async sync() {
        if (this.isSyncing) {
            console.log('⚪ Already syncing');
            return;
        }

        if (!navigator.onLine) {
            Toast.warning('Cannot sync while offline');
            return;
        }

        this.isSyncing = true;
        console.log('🔄 Starting sync...');

        try {
            // Get all local data
            const localData = await FarmDB.exportAllData();

            // Send to server
            const response = await fetch(this.API_URL + '/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    lastSync: this.lastSyncTime,
                    data: localData
                })
            });

            if (!response.ok) {
                throw new Error('Sync failed: ' + response.status);
            }

            const serverData = await response.json();

            // Merge server data with local (server wins for conflicts)
            if (serverData.data) {
                await this.mergeServerData(serverData.data);
            }

            // Update last sync time
            this.lastSyncTime = Date.now();
            localStorage.setItem('farmhub_last_sync', this.lastSyncTime);

            console.log('✅ Sync complete');
            Toast.success('Data synced to cloud!');

        } catch (error) {
            console.error('❌ Sync error:', error);
            Toast.error('Sync failed. Data saved locally.');
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * Merge server data with local data
     */
    async mergeServerData(serverData) {
        // Simple merge strategy: server wins for conflicts based on updatedAt
        for (const [storeName, records] of Object.entries(serverData)) {
            if (!records || records.length === 0) continue;

            const localRecords = await FarmDB.getAll(storeName);
            const localMap = new Map(localRecords.map(r => [r.id, r]));

            for (const serverRecord of records) {
                const localRecord = localMap.get(serverRecord.id);

                if (!localRecord) {
                    // New record from server
                    await FarmDB.add(storeName, serverRecord);
                } else if (new Date(serverRecord.updatedAt) > new Date(localRecord.updatedAt)) {
                    // Server is newer
                    await FarmDB.update(storeName, serverRecord.id, serverRecord);
                }
                // If local is newer, keep local (will be pushed on next sync)
            }
        }
    },

    /**
     * Force push all data to server (for initial setup or recovery)
     */
    async forcePush() {
        if (!navigator.onLine) {
            Toast.warning('Cannot push while offline');
            return;
        }

        try {
            const localData = await FarmDB.exportAllData();

            const response = await fetch(this.API_URL + '/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceId: this.deviceId,
                    data: localData,
                    forceOverwrite: true
                })
            });

            if (!response.ok) {
                throw new Error('Push failed: ' + response.status);
            }

            Toast.success('All data pushed to cloud!');

        } catch (error) {
            console.error('Push error:', error);
            Toast.error('Push failed: ' + error.message);
        }
    },

    /**
     * Force pull all data from server
     */
    async forcePull() {
        if (!navigator.onLine) {
            Toast.warning('Cannot pull while offline');
            return;
        }

        try {
            const response = await fetch(this.API_URL + '/pull?deviceId=' + this.deviceId);

            if (!response.ok) {
                throw new Error('Pull failed: ' + response.status);
            }

            const serverData = await response.json();

            if (serverData.data) {
                if (confirm('This will replace all local data with cloud data. Continue?')) {
                    await FarmDB.importAllData(serverData.data);
                    Toast.success('Data restored from cloud!');
                    location.reload();
                }
            }

        } catch (error) {
            console.error('Pull error:', error);
            Toast.error('Pull failed: ' + error.message);
        }
    },

    /**
     * Get sync status for UI
     */
    getStatus() {
        return {
            isOnline: navigator.onLine,
            isSyncing: this.isSyncing,
            lastSync: this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString() : 'Never',
            deviceId: this.deviceId?.substring(0, 8) + '...'
        };
    }
};

// Export
window.CloudSync = CloudSync;

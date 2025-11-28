import { StaffMember, CheckInLog } from '../types';

const DB_NAME = 'FalgatesRiceDB';
const DB_VERSION = 2; // Incremented to support new object store
const STAFF_STORE = 'staff';
const CHECKIN_STORE = 'check_ins';

class LocalDatabase {
  private db: IDBDatabase | null = null;

  async connect(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject('Error opening database');

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create Staff Store if not exists
        if (!db.objectStoreNames.contains(STAFF_STORE)) {
          db.createObjectStore(STAFF_STORE, { keyPath: 'id' });
        }

        // Create Check-In Logs Store if not exists
        if (!db.objectStoreNames.contains(CHECKIN_STORE)) {
          const checkInStore = db.createObjectStore(CHECKIN_STORE, { keyPath: 'id', autoIncrement: true });
          checkInStore.createIndex('staffId', 'staffId', { unique: false });
          checkInStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addStaff(staff: StaffMember): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([STAFF_STORE], 'readwrite');
      const store = transaction.objectStore(STAFF_STORE);
      const request = store.add(staff);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error adding staff: ID might already exist');
    });
  }

  async getAllStaff(): Promise<StaffMember[]> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([STAFF_STORE], 'readonly');
      const store = transaction.objectStore(STAFF_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as StaffMember[]);
      request.onerror = () => reject('Error fetching staff');
    });
  }

  async deleteStaff(id: string): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([STAFF_STORE], 'readwrite');
      const store = transaction.objectStore(STAFF_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error deleting staff');
    });
  }

  async getNextId(): Promise<string> {
    await this.connect();
    const staff = await this.getAllStaff();
    if (staff.length === 0) return 'FG0001';

    const maxNum = staff.reduce((max, s) => {
      const numStr = s.id.replace(/[^0-9]/g, '');
      const num = parseInt(numStr, 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    const nextNum = maxNum + 1;
    return `FG${nextNum.toString().padStart(4, '0')}`;
  }

  // --- Check-In Logging Methods ---

  async logCheckIn(log: CheckInLog): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([CHECKIN_STORE], 'readwrite');
      const store = transaction.objectStore(CHECKIN_STORE);
      // Remove id if present to let autoIncrement handle it, though strictly not required if undefined
      const { id, ...logData } = log; 
      const request = store.add(logData);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }

  async getRecentCheckIns(limit: number = 50): Promise<CheckInLog[]> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([CHECKIN_STORE], 'readonly');
      const store = transaction.objectStore(CHECKIN_STORE);
      const index = store.index('timestamp');
      
      // Open cursor in reverse order (newest first)
      const request = index.openCursor(null, 'prev');
      const results: CheckInLog[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject('Error fetching check-ins');
    });
  }

  async clearAllData(): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([STAFF_STORE, CHECKIN_STORE], 'readwrite');
      
      transaction.onerror = () => reject('Error clearing data');
      transaction.oncomplete = () => resolve();

      transaction.objectStore(STAFF_STORE).clear();
      transaction.objectStore(CHECKIN_STORE).clear();
    });
  }

  async exportAllData(): Promise<void> {
    await this.connect();
    const staff = await this.getAllStaff();
    
    const checkIns = await new Promise<CheckInLog[]>((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const transaction = this.db.transaction([CHECKIN_STORE], 'readonly');
      const store = transaction.objectStore(CHECKIN_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error fetching checkins');
    });

    const exportData = {
        timestamp: Date.now(),
        staff,
        checkIns
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `falgates_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const dbService = new LocalDatabase();
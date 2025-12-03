// Offline storage utilities for Tauri app
// Uses IndexedDB for storing data locally when offline

const DB_NAME = 'chatapp_offline';
const DB_VERSION = 1;

interface OfflineMessage {
  id: string;
  conversationId?: string;
  groupId?: string;
  content: string;
  type: string;
  timestamp: number;
  synced: boolean;
}

interface CachedConversation {
  id: string;
  data: any;
  lastUpdated: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for pending messages to be synced
        if (!db.objectStoreNames.contains('pendingMessages')) {
          const messageStore = db.createObjectStore('pendingMessages', { keyPath: 'id' });
          messageStore.createIndex('conversationId', 'conversationId', { unique: false });
          messageStore.createIndex('groupId', 'groupId', { unique: false });
          messageStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store for cached conversations
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }

        // Store for cached groups
        if (!db.objectStoreNames.contains('groups')) {
          db.createObjectStore('groups', { keyPath: 'id' });
        }

        // Store for cached messages
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
          msgStore.createIndex('groupId', 'groupId', { unique: false });
        }

        // Store for user profile
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }
      };
    });
  }

  // Save a message to be synced later when online
  async savePendingMessage(message: Omit<OfflineMessage, 'synced'>): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMessages'], 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const request = store.put({ ...message, synced: false });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending messages to sync
  async getPendingMessages(): Promise<OfflineMessage[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMessages'], 'readonly');
      const store = transaction.objectStore('pendingMessages');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark a message as synced
  async markMessageSynced(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMessages'], 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const message = getRequest.result;
        if (message) {
          message.synced = true;
          const putRequest = store.put(message);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete synced messages
  async clearSyncedMessages(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingMessages'], 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(true));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cache conversation data
  async cacheConversation(id: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.put({ id, data, lastUpdated: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached conversation
  async getCachedConversation(id: string): Promise<CachedConversation | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache messages for a conversation
  async cacheMessages(conversationId: string, messages: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    for (const message of messages) {
      store.put({ ...message, conversationId, cachedAt: Date.now() });
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cached messages for a conversation
  async getCachedMessages(conversationId: string): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Save user profile for offline access
  async saveUserProfile(profile: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userProfile'], 'readwrite');
      const store = transaction.objectStore('userProfile');
      const request = store.put({ id: 'current', ...profile, cachedAt: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached user profile
  async getUserProfile(): Promise<any | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userProfile'], 'readonly');
      const store = transaction.objectStore('userProfile');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all cached data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const stores = ['pendingMessages', 'conversations', 'groups', 'messages', 'userProfile'];
    
    for (const storeName of stores) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
    }
  }
}

export const offlineStorage = new OfflineStorage();
export default offlineStorage;

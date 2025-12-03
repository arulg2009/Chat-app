"use client";

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from './offline-storage';

interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOnline: Date | null;
}

interface PendingAction {
  id: string;
  type: 'message' | 'reaction' | 'read';
  data: any;
  timestamp: number;
}

export function useOnlineStatus() {
  // Always start with true on server to avoid hydration mismatch
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isReconnecting: false,
    lastOnline: null,
  });
  
  const [mounted, setMounted] = useState(false);

  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mark as mounted and set initial status
    setMounted(true);
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? new Date() : null,
    }));

    // Initialize offline storage
    offlineStorage.init().catch(console.error);

    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        isReconnecting: true,
        lastOnline: new Date(),
      }));
      
      // Sync pending messages when back online
      syncPendingData().finally(() => {
        setStatus(prev => ({ ...prev, isReconnecting: false }));
      });
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isReconnecting: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending data when coming back online
  const syncPendingData = useCallback(async () => {
    try {
      const pendingMessages = await offlineStorage.getPendingMessages();
      
      for (const message of pendingMessages) {
        try {
          const endpoint = message.groupId 
            ? `/api/groups/${message.groupId}/messages`
            : `/api/conversations/${message.conversationId}/messages`;
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: message.content,
              type: message.type,
            }),
          });
          
          if (res.ok) {
            await offlineStorage.markMessageSynced(message.id);
          }
        } catch (err) {
          console.error('Failed to sync message:', err);
        }
      }
      
      // Clear synced messages
      await offlineStorage.clearSyncedMessages();
    } catch (err) {
      console.error('Error syncing pending data:', err);
    }
  }, []);

  // Queue a message for sending (works offline)
  const queueMessage = useCallback(async (
    content: string,
    type: string,
    conversationId?: string,
    groupId?: string
  ) => {
    const messageId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (status.isOnline) {
      // Try to send immediately
      try {
        const endpoint = groupId 
          ? `/api/groups/${groupId}/messages`
          : `/api/conversations/${conversationId}/messages`;
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, type }),
        });
        
        if (res.ok) {
          return { success: true, data: await res.json() };
        }
      } catch (err) {
        // Fall through to offline storage
      }
    }
    
    // Store for later sync
    await offlineStorage.savePendingMessage({
      id: messageId,
      conversationId,
      groupId,
      content,
      type,
      timestamp: Date.now(),
    });
    
    return { success: false, offlineId: messageId };
  }, [status.isOnline]);

  // Cache data for offline access
  const cacheConversation = useCallback(async (id: string, data: any) => {
    await offlineStorage.cacheConversation(id, data);
  }, []);

  const getCachedConversation = useCallback(async (id: string) => {
    return offlineStorage.getCachedConversation(id);
  }, []);

  const cacheMessages = useCallback(async (conversationId: string, messages: any[]) => {
    await offlineStorage.cacheMessages(conversationId, messages);
  }, []);

  const getCachedMessages = useCallback(async (conversationId: string) => {
    return offlineStorage.getCachedMessages(conversationId);
  }, []);

  return {
    ...status,
    pendingActions,
    queueMessage,
    syncPendingData,
    cacheConversation,
    getCachedConversation,
    cacheMessages,
    getCachedMessages,
  };
}

export default useOnlineStatus;

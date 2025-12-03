"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface RealtimeMessage {
  type: "message" | "typing" | "status" | "reaction" | "read" | "ping";
  conversationId?: string;
  groupId?: string;
  data?: any;
}

interface UseRealtimeOptions {
  conversationId?: string;
  groupId?: string;
  onMessage?: (data: any) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onStatusChange?: (data: { userId: string; status: string }) => void;
  onReaction?: (data: any) => void;
  onRead?: (data: any) => void;
  enabled?: boolean;
}

// Global event emitter for real-time updates across components
class RealtimeEventEmitter {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

export const realtimeEmitter = new RealtimeEventEmitter();

// Fast polling with adaptive intervals - starts fast, slows down when idle
export function useRealtime({
  conversationId,
  groupId,
  onMessage,
  onTyping,
  onStatusChange,
  onReaction,
  onRead,
  enabled = true,
}: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const lastMessageRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const failCountRef = useRef(0);
  
  // Adaptive polling: faster when active, slower when idle
  const getPollingInterval = useCallback(() => {
    if (document.hidden) return 10000; // 10s when tab is hidden
    if (failCountRef.current > 3) return 5000; // 5s after errors
    return 2000; // 2s normal (fast polling for real-time feel)
  }, []);

  const poll = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const endpoint = conversationId 
        ? `/api/conversations/${conversationId}/messages?since=${lastMessageRef.current || ''}`
        : groupId 
        ? `/api/groups/${groupId}/messages?since=${lastMessageRef.current || ''}`
        : null;

      if (!endpoint) return;

      const res = await fetch(endpoint, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsConnected(true);
        failCountRef.current = 0;
        
        // Process new messages
        if (data.messages && data.messages.length > 0) {
          const newMessages = data.messages.filter(
            (m: any) => m.id !== lastMessageRef.current
          );
          if (newMessages.length > 0) {
            lastMessageRef.current = newMessages[newMessages.length - 1].id;
            newMessages.forEach((msg: any) => {
              onMessage?.(msg);
              realtimeEmitter.emit('message', { conversationId, groupId, message: msg });
            });
          }
        }
        
        // Process typing indicators
        if (data.typing) {
          onTyping?.(data.typing);
        }
      } else {
        failCountRef.current++;
      }
    } catch (error) {
      failCountRef.current++;
      if (failCountRef.current > 5) {
        setIsConnected(false);
      }
    }
  }, [conversationId, groupId, enabled, onMessage, onTyping]);

  useEffect(() => {
    if (!enabled || (!conversationId && !groupId)) return;

    // Initial poll
    poll();

    // Set up adaptive polling
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(poll, getPollingInterval());
    };

    startPolling();

    // Visibility change handler - poll faster when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        poll(); // Immediate poll when tab becomes visible
      }
      startPolling(); // Restart with new interval
    };

    // Focus handler - poll immediately on focus
    const handleFocus = () => {
      poll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversationId, groupId, enabled, poll, getPollingInterval]);

  // Subscribe to global events
  useEffect(() => {
    const unsubMessage = realtimeEmitter.subscribe('message', (data) => {
      if (
        (conversationId && data.conversationId === conversationId) ||
        (groupId && data.groupId === groupId)
      ) {
        onMessage?.(data.message);
      }
    });

    return () => {
      unsubMessage();
    };
  }, [conversationId, groupId, onMessage]);

  return { isConnected };
}

// Hook for dashboard to get updates across all conversations
export function useDashboardRealtime(onUpdate: () => void) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const poll = async () => {
      if (document.hidden) return;
      onUpdate();
    };

    // Poll every 5 seconds for dashboard (balance between freshness and resources)
    pollIntervalRef.current = setInterval(poll, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        poll();
      }
    };

    const handleFocus = () => {
      poll();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onUpdate]);
}

// Optimistic update helpers
export function optimisticAddMessage<T extends { id: string }>(
  messages: T[],
  newMessage: T
): T[] {
  // Check if message already exists (by temp or real id)
  if (messages.some(m => m.id === newMessage.id)) {
    return messages;
  }
  return [...messages, newMessage];
}

export function optimisticReplaceMessage<T extends { id: string }>(
  messages: T[],
  tempId: string,
  realMessage: T
): T[] {
  return messages.map(m => m.id === tempId ? realMessage : m);
}

export function optimisticRemoveMessage<T extends { id: string }>(
  messages: T[],
  messageId: string
): T[] {
  return messages.filter(m => m.id !== messageId);
}

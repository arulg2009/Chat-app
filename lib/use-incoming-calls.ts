"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Call } from "@/lib/use-webrtc";

interface UseIncomingCallsOptions {
  enabled?: boolean;
  pollInterval?: number;
}

export function useIncomingCalls(options: UseIncomingCallsOptions = {}) {
  const { enabled = true, pollInterval = 3000 } = options;
  const { data: session, status } = useSession();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  const checkForCalls = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/calls");
      if (!res.ok) return;

      const data = await res.json();

      if (data.incomingCall && !incomingCall) {
        setIncomingCall(data.incomingCall);
      } else if (!data.incomingCall && incomingCall) {
        // Call was cancelled or timed out
        setIncomingCall(null);
      }

      if (data.activeCall) {
        setActiveCall(data.activeCall);
      }
    } catch (err) {
      console.error("Error checking for calls:", err);
    }
  }, [session?.user?.id, incomingCall]);

  useEffect(() => {
    if (!enabled || status !== "authenticated") return;

    // Initial check
    checkForCalls();

    // Poll for incoming calls
    const interval = setInterval(checkForCalls, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, status, checkForCalls, pollInterval]);

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const rejectIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await fetch(`/api/calls/${incomingCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
    } catch (err) {
      console.error("Error rejecting call:", err);
    }

    setIncomingCall(null);
  }, [incomingCall]);

  return {
    incomingCall,
    activeCall,
    dismissIncomingCall,
    rejectIncomingCall,
    checkForCalls,
  };
}

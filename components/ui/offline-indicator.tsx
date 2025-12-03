"use client";

import { useOnlineStatus } from "@/lib/use-online-status";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function OfflineIndicator() {
  const { isOnline, isReconnecting } = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) return null;
  
  if (isOnline && !isReconnecting) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all duration-300",
        isReconnecting
          ? "bg-yellow-500 text-yellow-950"
          : "bg-red-500 text-white"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isReconnecting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Reconnecting... Syncing messages</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline. Messages will be sent when connected.</span>
          </>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;

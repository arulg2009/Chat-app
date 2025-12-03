"use client";

import { cn } from "@/lib/utils";

// Basic skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      {...props}
    />
  );
}

// WhatsApp-style chat list skeleton
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="mt-1.5 h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// WhatsApp-style message skeleton
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn("flex gap-2 mb-3", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      )}
      <div
        className={cn(
          "rounded-2xl p-3 max-w-[70%] animate-pulse",
          isOwn
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-gray-100 dark:bg-gray-800"
        )}
      >
        <div className="h-3 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2" />
        <div className="h-3 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
        <div className="h-2 w-12 bg-gray-300 dark:bg-gray-600 rounded mt-2 ml-auto" />
      </div>
    </div>
  );
}

// Messages list skeleton
export function MessagesListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col p-4 space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
}

// User list skeleton
export function UserListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Group card skeleton
export function GroupCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="flex gap-4">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Conversation header skeleton
export function ConversationHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// Full page loading with WhatsApp-style animation
export function PageLoadingSkeleton({ type = "dashboard" }: { type?: "dashboard" | "chat" | "profile" }) {
  if (type === "chat") {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <ConversationHeaderSkeleton />
        <div className="flex-1 overflow-hidden">
          <MessagesListSkeleton count={10} />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (type === "profile") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-4">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // Dashboard skeleton
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-hidden">
          <ChatListSkeleton count={8} />
        </div>
      </div>
      
      {/* Main content placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

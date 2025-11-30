"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: Array<{ name: string | null }>;
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name || "Someone"} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name || "Someone"} and ${users[1].name || "someone"} are typing`;
    } else {
      return `${users[0].name || "Someone"} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm text-gray-500", className)}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}

interface TypingIndicatorBubbleProps {
  className?: string;
}

export function TypingIndicatorBubble({ className }: TypingIndicatorBubbleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm",
        className
      )}
    >
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ALL_REACTIONS = [
  "👍", "👎", "❤️", "🔥", "😂", "😮", "😢", "😡", "🎉", "🤔",
  "👏", "🙏", "💯", "✅", "❌", "⭐", "💪", "🤝", "👋", "🥳",
];

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{ id: string; name: string | null }>;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  isOwn?: boolean;
}

export function MessageReactions({ reactions, onReact, isOwn }: MessageReactionsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 mt-1",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {reactions.map((reaction) => (
        <div key={reaction.emoji} className="relative">
          <button
            onClick={() => onReact(reaction.emoji)}
            onMouseEnter={() => setShowTooltip(reaction.emoji)}
            onMouseLeave={() => setShowTooltip(null)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition",
              reaction.hasReacted
                ? "bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"
                : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <span>{reaction.emoji}</span>
            <span className="text-gray-600 dark:text-gray-300">{reaction.count}</span>
          </button>

          {/* Tooltip showing who reacted */}
          {showTooltip === reaction.emoji && reaction.users.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
              {reaction.users.slice(0, 5).map((u) => u.name).join(", ")}
              {reaction.users.length > 5 && ` +${reaction.users.length - 5} more`}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: "left" | "right";
}

export function ReactionPicker({ onSelect, onClose, position = "right" }: ReactionPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={cn(
        "absolute bottom-full mb-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2",
        position === "left" ? "right-0" : "left-0"
      )}
    >
      <div className="flex gap-1">
        {(showAll ? ALL_REACTIONS : QUICK_REACTIONS).map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition hover:scale-110"
          >
            {emoji}
          </button>
        ))}
        {!showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            +
          </button>
        )}
      </div>

      {showAll && (
        <div className="flex flex-wrap gap-1 mt-2 max-w-[200px]">
          {ALL_REACTIONS.slice(6).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

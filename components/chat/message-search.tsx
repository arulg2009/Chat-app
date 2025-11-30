"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: {
    name: string | null;
  };
  highlight?: {
    start: number;
    end: number;
  };
}

interface MessageSearchProps {
  conversationType: "conversation" | "group";
  conversationId: string;
  onResultClick: (messageId: string) => void;
  onClose: () => void;
}

export function MessageSearch({
  conversationType,
  conversationId,
  onResultClick,
  onClose,
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchMessages();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, dateFilter]);

  const searchMessages = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const endpoint =
        conversationType === "group"
          ? `/api/groups/${conversationId}/messages/search`
          : `/api/conversations/${conversationId}/messages/search`;

      const params = new URLSearchParams({
        q: query,
        ...(dateFilter !== "all" && { dateFilter }),
      });

      const res = await fetch(`${endpoint}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          onResultClick(results[selectedIndex].id);
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Date filter */}
        <div className="flex gap-2 mt-3">
          {[
            { value: "all", label: "All time" },
            { value: "today", label: "Today" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value as typeof dateFilter)}
              className={cn(
                "px-3 py-1 text-sm rounded-full transition",
                dateFilter === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : query && results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages found for "{query}"</p>
          </div>
        ) : results.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((result, idx) => (
              <button
                key={result.id}
                onClick={() => onResultClick(result.id)}
                className={cn(
                  "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition",
                  idx === selectedIndex && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    {result.sender.name || "Unknown"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(result.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {result.type === "image" ? (
                    <span className="italic">📷 Photo</span>
                  ) : result.type === "voice" || result.type === "audio" ? (
                    <span className="italic">🎤 Voice message</span>
                  ) : (
                    highlightMatch(result.content, query)
                  )}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Search for messages in this conversation</p>
            <p className="text-sm mt-1">Use ↑↓ to navigate, Enter to select</p>
          </div>
        )}
      </div>

      {/* Navigation hint */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              Navigate
            </span>
            <span>Enter to view</span>
          </div>
        </div>
      )}
    </div>
  );
}

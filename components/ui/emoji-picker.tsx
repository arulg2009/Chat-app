"use client";

import React, { useState } from "react";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥"],
  "Gestures": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "✋", "🖖", "👏", "🙌", "👐", "🤲", "🙏", "💪", "🦾", "🦿"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💌"],
  "Objects": ["📱", "💻", "🖥️", "📷", "📸", "🎥", "📞", "☎️", "📺", "📻", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎤", "🎧", "📀", "💿", "📼"],
  "Symbols": ["✅", "❌", "❓", "❗", "💯", "🔥", "⭐", "🌟", "✨", "⚡", "💥", "💫", "🎉", "🎊", "🏆", "🥇", "🥈", "🥉", "🎯", "💡"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");
  const [search, setSearch] = useState("");

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
  };

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const displayEmojis = search
    ? allEmojis.filter((e) => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory];

  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-72 z-50">
      {/* Search */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg outline-none"
        />
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
              className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition ${
                activeCategory === category
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {displayEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            onClick={() => handleEmojiClick(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}

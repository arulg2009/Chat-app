"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Forward, Users, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  name: string;
  image?: string | null;
  type: "conversation" | "group";
  lastMessage?: string;
}

interface ForwardMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: {
    id: string;
    content: string;
    type: string;
  };
  onForward: (targetId: string, targetType: "conversation" | "group") => Promise<void>;
}

export function ForwardMessageDialog({
  isOpen,
  onClose,
  message,
  onForward,
}: ForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Fetch both conversations and groups
      const [convRes, groupRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/groups"),
      ]);

      const convData = convRes.ok ? await convRes.json() : [];
      const groupData = groupRes.ok ? await groupRes.json() : [];

      const allConversations: Conversation[] = [
        ...convData.map((c: any) => ({
          id: c.id,
          name: c.name || c.users?.[0]?.user?.name || "Chat",
          image: c.users?.[0]?.user?.image,
          type: "conversation" as const,
        })),
        ...groupData.map((g: any) => ({
          id: g.id,
          name: g.name,
          image: g.image,
          type: "group" as const,
        })),
      ];

      setConversations(allConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleForward = async () => {
    if (selected.length === 0) return;

    setForwarding(true);
    try {
      for (const id of selected) {
        const conv = conversations.find((c) => c.id === id);
        if (conv) {
          await onForward(id, conv.type);
        }
      }
      onClose();
    } catch (error) {
      console.error("Error forwarding message:", error);
    } finally {
      setForwarding(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward Message
          </DialogTitle>
        </DialogHeader>

        {/* Message preview */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
          {message.type === "image" ? (
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                <img
                  src={message.content}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-gray-500">Photo</span>
            </div>
          ) : message.type === "voice" || message.type === "audio" ? (
            <span className="text-gray-500">🎤 Voice message</span>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
              {message.content}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversation list */}
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => toggleSelection(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition",
                  selected.includes(conv.id) && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition",
                    selected.includes(conv.id)
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300"
                  )}
                >
                  {selected.includes(conv.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                <Avatar className="w-10 h-10">
                  <AvatarImage src={conv.image || undefined} />
                  <AvatarFallback
                    className={cn(
                      "text-white text-sm",
                      conv.type === "group"
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-gradient-to-br from-blue-500 to-cyan-500"
                    )}
                  >
                    {getInitials(conv.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{conv.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {conv.type === "group" ? (
                      <>
                        <Users className="w-3 h-3" /> Group
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3 h-3" /> Chat
                      </>
                    )}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selected.length === 0 || forwarding}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {forwarding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Forward className="w-4 h-4 mr-2" />
                Forward {selected.length > 0 && `(${selected.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

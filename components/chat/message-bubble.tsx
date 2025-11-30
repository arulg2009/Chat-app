"use client";

import React, { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Reply,
  Forward,
  Trash2,
  Copy,
  MoreVertical,
  Check,
  CheckCheck,
  Smile,
  Download,
  ZoomIn,
} from "lucide-react";
import { MessageReactions, ReactionPicker } from "./message-reactions";
import { VoiceMessagePlayer } from "./voice-message";
import { cn } from "@/lib/utils";

export interface MessageData {
  id: string;
  content: string;
  type: "text" | "image" | "file" | "audio" | "voice" | "system";
  senderId: string;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  metadata?: {
    duration?: number;
    filename?: string;
    fileSize?: number;
    forwardedFrom?: { name: string; groupName?: string };
    mimeType?: string;
  };
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    type?: string;
    sender: { name: string | null };
  } | null;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string | null }>;
    hasReacted: boolean;
  }>;
  readBy?: Array<{ userId: string; readAt: string }>;
  status?: "sending" | "sent" | "delivered" | "read";
}

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  onReply?: (message: MessageData) => void;
  onForward?: (message: MessageData) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onImageClick?: (imageUrl: string) => void;
  showAvatar?: boolean;
  showSenderName?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  onReply,
  onForward,
  onDelete,
  onReact,
  onImageClick,
  showAvatar = true,
  showSenderName = true,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopy = async () => {
    if (message.type === "text") {
      await navigator.clipboard.writeText(message.content);
    }
  };

  const handleReaction = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactionPicker(false);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case "sending":
        return <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />;
      case "sent":
        return <Check className="w-3.5 h-3.5" />;
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5" />;
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Check className="w-3.5 h-3.5" />;
    }
  };

  // Deleted message
  if (message.isDeleted) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[70%] rounded-2xl px-4 py-2 italic text-sm",
            isOwn
              ? "bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-tr-sm"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-tl-sm"
          )}
        >
          <span className="flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            This message was deleted
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={cn("flex group", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex gap-2 max-w-[70%]",
          isOwn ? "flex-row-reverse" : ""
        )}
      >
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={message.sender.image || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
              {getInitials(message.sender.name)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1">
          {/* Sender name */}
          {!isOwn && showSenderName && (
            <p className="text-xs text-gray-500 mb-1 ml-1">
              {message.sender.name}
            </p>
          )}

          {/* Forwarded indicator */}
          {message.isForwarded && (
            <p className="text-xs text-gray-500 mb-1 ml-1 flex items-center gap-1">
              <Forward className="w-3 h-3" />
              Forwarded
              {message.metadata?.forwardedFrom && (
                <span>from {message.metadata.forwardedFrom.name}</span>
              )}
            </p>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <div
              className={cn(
                "mb-1 border-l-2 pl-2 py-1 text-xs",
                isOwn
                  ? "border-blue-400 bg-blue-500/10 rounded-r-lg"
                  : "border-gray-400 bg-gray-500/10 rounded-r-lg"
              )}
            >
              <p className="font-medium text-gray-600 dark:text-gray-300">
                {message.replyTo.sender.name}
              </p>
              <p className="text-gray-500 truncate">
                {message.replyTo.type === "image"
                  ? "📷 Photo"
                  : message.replyTo.type === "voice"
                  ? "🎤 Voice message"
                  : message.replyTo.content.slice(0, 50)}
                {message.replyTo.content.length > 50 && "..."}
              </p>
            </div>
          )}

          {/* Message content */}
          <div className="relative">
            <div
              className={cn(
                "rounded-2xl overflow-hidden",
                message.type === "image" || message.type === "voice"
                  ? ""
                  : "px-4 py-2",
                isOwn
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                  : "bg-white dark:bg-gray-800 rounded-tl-sm shadow-sm border"
              )}
            >
              {/* Text message */}
              {message.type === "text" && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              {/* Image message */}
              {message.type === "image" && (
                <div className="relative group/image">
                  <img
                    src={message.content}
                    alt="Shared image"
                    className="max-w-[300px] max-h-[300px] rounded-lg object-cover cursor-pointer"
                    onClick={() => onImageClick?.(message.content)}
                  />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                    <button
                      onClick={() => onImageClick?.(message.content)}
                      className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition"
                    >
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <a
                      href={message.content}
                      download
                      className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4 text-white" />
                    </a>
                  </div>
                </div>
              )}

              {/* Voice message */}
              {(message.type === "voice" || message.type === "audio") && (
                <div className={cn("p-3", isOwn ? "" : "")}>
                  <VoiceMessagePlayer
                    src={message.content}
                    duration={message.metadata?.duration}
                    isOwn={isOwn}
                  />
                </div>
              )}

              {/* Time and status */}
              <div
                className={cn(
                  "flex items-center gap-1 mt-1",
                  message.type === "image" ? "absolute bottom-2 right-2 bg-black/50 px-1.5 py-0.5 rounded text-white" : "",
                  isOwn && message.type !== "image" ? "justify-end text-blue-200" : "text-gray-500"
                )}
              >
                {message.isEdited && (
                  <span className="text-xs opacity-70">edited</span>
                )}
                <span className="text-xs">{formatTime(message.createdAt)}</span>
                {renderStatusIcon()}
              </div>
            </div>

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <MessageReactions
                reactions={message.reactions}
                onReact={(emoji) => onReact?.(message.id, emoji)}
                isOwn={isOwn}
              />
            )}

            {/* Action buttons on hover */}
            <div
              className={cn(
                "absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
              )}
            >
              {/* Quick reaction */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <Smile className="w-4 h-4 text-gray-500" />
              </button>

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "start" : "end"}>
                  <DropdownMenuItem onClick={() => onReply?.(message)}>
                    <Reply className="w-4 h-4 mr-2" /> Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onForward?.(message)}>
                    <Forward className="w-4 h-4 mr-2" /> Forward
                  </DropdownMenuItem>
                  {message.type === "text" && (
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isOwn && (
                    <DropdownMenuItem
                      onClick={() => onDelete?.(message.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reaction picker */}
            {showReactionPicker && (
              <ReactionPicker
                onSelect={handleReaction}
                onClose={() => setShowReactionPicker(false)}
                position={isOwn ? "left" : "right"}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Loader2,
  Search,
  Reply,
  Forward,
  Copy,
  CheckCheck,
  Check,
  Mic,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  MessageReactions,
  ReactionPicker,
  TypingIndicator,
  ImageViewer,
  MessageSearch,
  ForwardMessageDialog,
} from "@/components/chat";
import { VoiceRecorder, VoiceMessagePlayer } from "@/components/chat/voice-message";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  metadata?: any;
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
}

interface ConversationData {
  id: string;
  name: string | null;
  isGroup: boolean;
  users: Array<{
    userId: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      status: string;
    };
  }>;
  messages: Message[];
}

export default function ConversationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && conversationId) {
      fetchConversation();
      // Faster polling - 2 seconds for real-time feel
      const interval = setInterval(() => {
        if (!document.hidden) fetchConversation();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status, conversationId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  useEffect(() => {
    if (highlightedMessageId) {
      const element = document.getElementById(`message-${highlightedMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedMessageId(null), 2000);
      }
    }
  }, [highlightedMessageId]);

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?includeConversation=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setConversation({ ...data.conversation, messages: data.messages || [] });
        }
        setLoading(false);
      } else if (res.status === 404) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error fetching conversation:", err);
      setLoading(false);
    }
  };

  const updateTypingStatus = async (typing: boolean) => {
    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping: typing }),
      });
    } catch (err) {
      // Ignore errors
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    updateTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const sendMessage = async (content: string, type: string = "text", metadata?: any) => {
    if (!content.trim() && type === "text") return;

    // Optimistic update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content,
      type,
      senderId: session?.user?.id || "",
      createdAt: new Date().toISOString(),
      sender: {
        id: session?.user?.id || "",
        name: session?.user?.name || null,
        image: session?.user?.image || null,
      },
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        type: replyingTo.type,
        sender: replyingTo.sender,
      } : null,
      metadata,
    };

    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, optimisticMessage],
    } : null);
    
    const savedMessage = message;
    const savedReplyingTo = replyingTo;
    setMessage("");
    setReplyingTo(null);
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          type,
          replyToId: savedReplyingTo?.id,
          metadata,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Replace temp message with real one
        setConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.map(m => m.id === tempId ? { ...newMsg, readBy: [] } : m),
        } : null);
        updateTypingStatus(false);
      } else {
        // Rollback on error
        setConversation(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => m.id !== tempId),
        } : null);
        setMessage(savedMessage);
        setReplyingTo(savedReplyingTo);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Rollback on error
      setConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(m => m.id !== tempId),
      } : null);
      setMessage(savedMessage);
      setReplyingTo(savedReplyingTo);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const type = file.type.startsWith("image/") ? "image" : "file";
        await sendMessage(data.url, type, {
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        });
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setIsRecordingVoice(false);
    setSendingVoice(true);
    
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `voice-${Date.now()}.webm`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await sendMessage(data.url, "voice", {
          duration,
          mimeType: "audio/webm",
        });
      }
    } catch (err) {
      console.error("Error uploading voice message:", err);
    } finally {
      setSendingVoice(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // Optimistic update for instant feedback
    setConversation(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map(m => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          const existingIdx = reactions.findIndex(r => r.emoji === emoji);
          if (existingIdx >= 0) {
            const existing = reactions[existingIdx];
            if (existing.hasReacted) {
              if (existing.count === 1) {
                return { ...m, reactions: reactions.filter((_, i) => i !== existingIdx) };
              }
              return { ...m, reactions: reactions.map((r, i) => i === existingIdx ? { ...r, count: r.count - 1, hasReacted: false } : r) };
            } else {
              return { ...m, reactions: reactions.map((r, i) => i === existingIdx ? { ...r, count: r.count + 1, hasReacted: true } : r) };
            }
          } else {
            return { ...m, reactions: [...reactions, { emoji, count: 1, users: [], hasReacted: true }] };
          }
        }),
      };
    });
    setActiveReactionPicker(null);
    
    try {
      await fetch(`/api/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getOtherUser = () => {
    if (!conversation) return null;
    return conversation.users.find((u) => u.user.id !== session?.user?.id)?.user;
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getImageMessages = () => {
    return (conversation?.messages || [])
      .filter((m) => m.type === "image")
      .map((m) => ({ url: m.content, caption: m.metadata?.filename }));
  };

  // Show loading skeleton immediately for fast perceived performance
  if (loading || !conversation) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="h-16 sm:h-14 px-2 sm:px-4 pt-2 sm:pt-0 flex items-center gap-2 sm:gap-3 border-b bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-11 w-11 touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
          </Button>
          <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
            <div className="w-16 h-3 bg-muted rounded animate-pulse mt-1" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.id) {
    return null;
  }

  const otherUser = getOtherUser();
  const currentUserId = session.user.id;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 sm:h-14 px-2 sm:px-4 pt-2 sm:pt-0 flex items-center gap-2 sm:gap-3 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0 h-11 w-11 touch-manipulation"
        >
          <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>

        <Avatar className="w-11 h-11 sm:w-10 sm:h-10 shrink-0">
          <AvatarImage src={otherUser?.image || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
            {getInitials(otherUser?.name || null)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate text-base">{otherUser?.name || "Unknown"}</h1>
          <p className="text-xs text-muted-foreground">
            {otherUser?.status === "online" ? (
              <span className="text-green-500">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} className="h-11 w-11 touch-manipulation">
            <Search className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 touch-manipulation">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/dashboard")} className="h-11">
                Back to Chats
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          conversation.messages.map((msg, index) => {
            const isOwn = msg.senderId === session.user.id;
            const showAvatar =
              !isOwn &&
              (index === 0 || conversation.messages[index - 1].senderId !== msg.senderId);

            return (
              <div
                key={msg.id}
                id={`message-${msg.id}`}
                className={cn(
                  "flex gap-2 group",
                  isOwn ? "justify-end" : "justify-start",
                  highlightedMessageId === msg.id && "animate-pulse bg-primary/10 -mx-4 px-4 py-2 rounded-lg"
                )}
              >
                {!isOwn && showAvatar ? (
                  <Avatar className="w-8 h-8 shrink-0 mt-auto">
                    <AvatarImage src={msg.sender.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                      {getInitials(msg.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : !isOwn ? (
                  <div className="w-8 shrink-0" />
                ) : null}

                <div className={cn("max-w-[80%] sm:max-w-[75%] flex flex-col", isOwn && "items-end")}>
                  {msg.replyTo && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mb-1 max-w-full truncate">
                      <Reply className="w-3 h-3 inline mr-1" />
                      Replying to {msg.replyTo.sender.name}: {msg.replyTo.content}
                    </div>
                  )}

                  {msg.isForwarded && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Forward className="w-3 h-3" /> Forwarded
                    </div>
                  )}

                  <div className="relative">
                    {msg.type === "image" ? (
                      <div
                        className={cn(
                          "rounded-2xl overflow-hidden cursor-pointer",
                          isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                        )}
                        onClick={() => {
                          const images = getImageMessages();
                          const idx = images.findIndex((img) => img.url === msg.content);
                          setImageViewerIndex(idx >= 0 ? idx : 0);
                          setShowImageViewer(true);
                        }}
                      >
                        <img
                          src={msg.content}
                          alt="Shared image"
                          className="max-w-full max-h-64 object-cover"
                        />
                      </div>
                    ) : msg.type === "voice" || msg.type === "audio" ? (
                      <div
                        className={cn(
                          "px-3 py-2 rounded-2xl min-w-[250px]",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <VoiceMessagePlayer
                          src={msg.content}
                          duration={msg.metadata?.duration}
                          isOwn={isOwn}
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl text-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm",
                          msg.isDeleted && "italic text-muted-foreground"
                        )}
                      >
                        {msg.isDeleted ? "This message was deleted" : msg.content}
                      </div>
                    )}

                    {/* Message actions */}
                    <div
                      className={cn(
                        "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card border rounded-lg shadow-sm p-0.5",
                        isOwn ? "right-full mr-1" : "left-full ml-1"
                      )}
                    >
                      <button
                        className="p-1.5 hover:bg-muted rounded"
                        onClick={() => setReplyingTo(msg)}
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-muted rounded"
                        onClick={() => setActiveReactionPicker(msg.id)}
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-muted rounded"
                        onClick={() => copyMessage(msg.content)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-muted rounded"
                        onClick={() => setForwardingMessage(msg)}
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {activeReactionPicker === msg.id && (
                      <ReactionPicker
                        onSelect={(emoji) => handleReaction(msg.id, emoji)}
                        onClose={() => setActiveReactionPicker(null)}
                      />
                    )}
                  </div>

                  {msg.reactions && msg.reactions.length > 0 && (
                    <MessageReactions
                      reactions={msg.reactions}
                      onReact={(emoji) => handleReaction(msg.id, emoji)}
                      isOwn={isOwn}
                    />
                  )}

                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {msg.isEdited && (
                      <span className="text-[10px] text-muted-foreground">(edited)</span>
                    )}
                    {isOwn && (
                      msg.readBy && msg.readBy.length > 0 ? (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Check className="w-3 h-3 text-gray-400" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="px-4 py-2">
          <TypingIndicator users={[{ name: otherUser?.name || "Someone" }]} />
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to {replyingTo.sender.name}
            </p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <ArrowLeft className="w-4 h-4 rotate-45" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card">
        {isRecordingVoice ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || sendingVoice}
              className="h-11 w-11 shrink-0 touch-manipulation"
            >
              {uploadingFile ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </Button>

            <div className="relative hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-11 w-11 touch-manipulation"
              >
                <Smile className="w-5 h-5" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2">
                  <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                </div>
              )}
            </div>

            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 h-11 text-base"
            />

            {message.trim() ? (
              <Button
                onClick={handleSendMessage}
                disabled={sending}
                className="shrink-0 h-11 w-11 sm:w-auto sm:px-4 touch-manipulation"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRecordingVoice(true)}
                disabled={sendingVoice}
                className="shrink-0 h-11 w-11 touch-manipulation"
              >
                {sendingVoice ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Search dialog */}
      {showSearch && (
        <MessageSearch
          conversationType="conversation"
          conversationId={conversationId}
          onClose={() => setShowSearch(false)}
          onResultClick={(messageId: string) => {
            setHighlightedMessageId(messageId);
            setShowSearch(false);
          }}
        />
      )}

      {/* Image viewer */}
      {showImageViewer && (
        <ImageViewer
          images={getImageMessages()}
          initialIndex={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* Forward dialog */}
      {forwardingMessage && (
        <ForwardMessageDialog
          isOpen={true}
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={async (targetId, targetType) => {
            setForwardingMessage(null);
          }}
        />
      )}
    </div>
  );
}

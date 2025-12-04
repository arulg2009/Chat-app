"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Users,
  UserPlus,
  LogOut,
  Crown,
  Shield,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  UserMinus,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  Mic,
  Search,
  Reply,
  Forward,
  Copy,
  ZoomIn,
  Download,
  CheckCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import {
  MessageReactions,
  ReactionPicker,
  VoiceMessagePlayer,
  VoiceRecorder,
  TypingIndicator,
  ImageViewer,
  MessageSearch,
  ForwardMessageDialog,
} from "@/components/chat";
import { cn } from "@/lib/utils";

interface GroupMember {
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    status: string;
  };
}

interface MessageReaction {
  emoji: string;
  count: number;
  users: Array<{ id: string; name: string | null }>;
  hasReacted: boolean;
}

interface GroupMessage {
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
  reactions?: MessageReaction[];
  readBy?: Array<{ userId: string; readAt: string }>;
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isPrivate: boolean;
  maxMembers: number;
  creatorId: string;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  members: GroupMember[];
  messages: GroupMessage[];
  _count: {
    members: number;
    messages: number;
  };
  isMember: boolean;
  userRole: string | null;
}

export default function GroupChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; filename: string } | null>(null);
  
  // New states for features
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [forwardingMessage, setForwardingMessage] = useState<GroupMessage | null>(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ name: string | null }>>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  // Invite members states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string | null; image: string | null; status: string }>>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && groupId) {
      fetchGroup();
      // Adaptive polling - faster when active, slower when idle/hidden
      const poll = () => {
        if (!document.hidden) {
          if (group) fetchGroupMessages();
        }
      };
      const pollTyping = () => {
        if (!document.hidden) fetchTypingUsers();
      };
      
      const messageInterval = setInterval(poll, document.hidden ? 10000 : 2000);
      const typingInterval = setInterval(pollTyping, 2500);
      
      // Immediate poll on visibility change and focus
      const handleVisibility = () => {
        if (!document.hidden) {
          if (group) fetchGroupMessages();
          fetchTypingUsers();
        }
      };
      const handleFocus = () => {
        if (group) fetchGroupMessages();
      };
      
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(messageInterval);
        clearInterval(typingInterval);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [status, groupId]);

  // Fetch only new messages (faster than full group fetch)
  const fetchGroupMessages = async () => {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/messages?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setGroup(prev => {
            if (!prev) return prev;
            // Merge new messages, avoiding duplicates
            const existingIds = new Set(prev.messages.map(m => m.id));
            const newMsgs = data.messages.filter((m: GroupMessage) => !existingIds.has(m.id));
            if (newMsgs.length > 0) {
              return { ...prev, messages: [...prev.messages, ...newMsgs] };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      // Ignore polling errors
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [group?.messages, scrollToBottom]);

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId) {
      const element = document.getElementById(`message-${highlightedMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedMessageId(null), 2000);
      }
    }
  }, [highlightedMessageId]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setNewGroupName(data.name);
        // Mark messages as read
        if (data.messages.length > 0) {
          markMessagesAsRead(data.messages.map((m: GroupMessage) => m.id));
        }
      } else if (res.status === 404) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error fetching group:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        setAllUsers(users);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleAddMember = async (userId: string) => {
    setAddingMember(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchGroup();
        // Remove user from list since they're now a member
        setAllUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add member");
      }
    } catch (err) {
      console.error("Error adding member:", err);
    } finally {
      setAddingMember(null);
    }
  };

  const openInviteModal = () => {
    setShowInviteModal(true);
    fetchAllUsers();
  };

  const fetchTypingUsers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/typing`);
      if (res.ok) {
        const data = await res.json();
        setTypingUsers(data);
      }
    } catch (err) {
      // Ignore errors
    }
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    try {
      await fetch(`/api/groups/${groupId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTyping }),
      });
    } catch (err) {
      // Ignore errors
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Throttle typing indicator updates
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      updateTypingStatus(true);
      lastTypingRef.current = now;
    }

    // Clear typing after 3 seconds of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    try {
      await fetch(`/api/groups/${groupId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
    } catch (err) {
      // Ignore errors
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !pendingImage) || !group || sending) return;

    const content = pendingImage ? pendingImage.url : message.trim();
    const type = pendingImage ? "image" : "text";
    const messageToSend = message;
    const replyToMessage = replyingTo;
    
    // Create optimistic message immediately
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: GroupMessage = {
      id: optimisticId,
      content,
      type,
      senderId: session?.user?.id || "",
      createdAt: new Date().toISOString(),
      sender: {
        id: session?.user?.id || "",
        name: session?.user?.name || null,
        image: session?.user?.image || null,
      },
      replyTo: replyToMessage ? {
        id: replyToMessage.id,
        content: replyToMessage.content,
        type: replyToMessage.type,
        sender: { name: replyToMessage.sender.name },
      } : null,
      reactions: [],
      readBy: [],
    };
    
    // Update UI immediately (optimistic)
    setGroup((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev
    );
    setMessage("");
    setPendingImage(null);
    setImagePreview(null);
    setReplyingTo(null);
    updateTypingStatus(false);
    setSending(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          type,
          replyToId: replyToMessage?.id || null,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Replace optimistic message with real one
        setGroup((prev) =>
          prev ? { 
            ...prev, 
            messages: prev.messages.map(m => m.id === optimisticId ? newMsg : m)
          } : prev
        );
      } else {
        // Remove optimistic message on failure
        setGroup((prev) =>
          prev ? { ...prev, messages: prev.messages.filter(m => m.id !== optimisticId) } : prev
        );
        setMessage(messageToSend);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message on error
      setGroup((prev) =>
        prev ? { ...prev, messages: prev.messages.filter(m => m.id !== optimisticId) } : prev
      );
      setMessage(messageToSend);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    setIsRecordingVoice(false);
    
    try {
      // Upload the voice message
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");
      formData.append("type", "voice");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadResult = await uploadRes.json();

      // Send the message
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadResult.url,
          type: "voice",
          metadata: { duration },
          replyToId: replyingTo?.id || null,
        }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setGroup((prev) =>
          prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
        );
        setReplyingTo(null);
      }
    } catch (err) {
      console.error("Error sending voice message:", err);
      alert("Failed to send voice message");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // Optimistic update for instant feedback
    setGroup(prev => {
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
      await fetch(`/api/groups/${groupId}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;

    // Optimistic update - instant delete
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, isDeleted: true } : m
            ),
          }
        : prev
    );

    try {
      await fetch(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Error copying message:", err);
    }
  };

  const handleForwardMessage = async (targetId: string, targetType: "conversation" | "group") => {
    if (!forwardingMessage) return;

    try {
      const endpoint = targetType === "group"
        ? `/api/groups/${targetId}/messages`
        : `/api/conversations/${targetId}/messages`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: forwardingMessage.content,
          type: forwardingMessage.type,
          isForwarded: true,
          metadata: {
            forwardedFrom: {
              name: forwardingMessage.sender.name,
              groupName: group?.name,
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to forward message");
      }
    } catch (err) {
      console.error("Error forwarding message:", err);
      throw err;
    }
  };

  const handleJoinGroup = async () => {
    // Optimistic update - show as member immediately
    setGroup(prev => prev ? { 
      ...prev, 
      isMember: true, 
      userRole: 'member',
      members: [...prev.members, {
        userId: session?.user?.id || '',
        role: 'member',
        joinedAt: new Date().toISOString(),
        user: {
          id: session?.user?.id || '',
          name: session?.user?.name || null,
          image: session?.user?.image || null,
          status: 'online'
        }
      }],
      _count: { ...prev._count, members: prev._count.members + 1 }
    } : prev);

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
      });
      if (!res.ok) {
        // Rollback on error
        const err = await res.json();
        await fetchGroup();
        alert(err.error || "Failed to join group");
      }
    } catch (err) {
      console.error("Error joining group:", err);
      await fetchGroup(); // Rollback
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to leave group");
      }
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (res.ok) {
        setGroup((prev) => (prev ? { ...prev, name: newGroupName.trim() } : prev));
        setEditingName(false);
      }
    } catch (err) {
      console.error("Error updating group:", err);
    }
  };

  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    
    setUploadingGroupPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "group");
      
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        const updateRes = await fetch(`/api/groups/${groupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url }),
        });
        if (updateRes.ok) {
          setGroup((prev) => (prev ? { ...prev, image: url } : prev));
        }
      }
    } catch (err) {
      console.error("Error uploading group photo:", err);
    } finally {
      setUploadingGroupPhoto(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchGroup();
      }
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  const handlePromoteMember = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        await fetchGroup();
      }
    } catch (err) {
      console.error("Error promoting member:", err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "message");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const result = await res.json();
      setPendingImage({ url: result.url, filename: result.filename });
    } catch (err) {
      console.error("Upload error:", err);
      alert(err instanceof Error ? err.message : "Failed to upload image");
      setImagePreview(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const cancelPendingImage = () => {
    setPendingImage(null);
    setImagePreview(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSearchResultClick = (messageId: string) => {
    setShowSearch(false);
    setHighlightedMessageId(messageId);
  };

  const openImageViewer = (imageUrl: string) => {
    const images = group?.messages
      .filter((m) => m.type === "image" && !m.isDeleted)
      .map((m) => ({ url: m.content, id: m.id, sender: m.sender })) || [];
    const index = images.findIndex((img) => img.url === imageUrl);
    setImageViewerIndex(index >= 0 ? index : 0);
    setShowImageViewer(true);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "creator":
        return (
          <Badge variant="default" className="ml-2 bg-yellow-500">
            <Crown className="w-3 h-3 mr-1" /> Creator
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default" className="ml-2 bg-blue-500">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdmin = group?.userRole === "creator" || group?.userRole === "admin";
  const isCreator = group?.userRole === "creator";

  // Get images for the viewer
  const imageMessages = group?.messages
    .filter((m) => m.type === "image" && !m.isDeleted)
    .map((m) => ({ url: m.content, id: m.id, sender: m.sender })) || [];

  // Show loading skeleton immediately for fast perceived performance
  if (loading || !group) {
    return (
      <div className="h-[100dvh] flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* Header skeleton */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 sm:py-4 pt-4 sm:pt-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="w-32 h-4 bg-muted rounded animate-pulse" />
              <div className="w-20 h-3 bg-muted rounded animate-pulse mt-1" />
            </div>
          </div>
        </div>
        {/* Messages skeleton - WhatsApp style */}
        <div className="flex-1 overflow-hidden p-4 space-y-3">
          {[false, false, true, false, true, true, false, true].map((isOwn, i) => (
            <div key={i} className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 50}ms` }}>
              {!isOwn && <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />}
              <div className={`rounded-2xl p-3 max-w-[70%] animate-pulse ${isOwn ? "bg-blue-100 dark:bg-blue-900/30" : "bg-white dark:bg-gray-800"}`}>
                {!isOwn && <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-2" />}
                <div className="h-3 w-36 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-2 w-10 bg-gray-300 dark:bg-gray-600 rounded mt-2 ml-auto" />
              </div>
            </div>
          ))}
        </div>
        {/* Input skeleton */}
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.id) return null;

  const currentUserId = session.user.id;

  return (
    <div className="h-[100dvh] flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Search overlay */}
        {showSearch && (
          <MessageSearch
            conversationType="group"
            conversationId={groupId}
            onResultClick={handleSearchResultClick}
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 sm:py-4 pt-4 sm:pt-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>

            <div className="relative">
              <input
                ref={groupPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleGroupPhotoUpload}
                className="hidden"
              />
              {group.image ? (
                <Avatar className="w-11 h-11 sm:w-12 sm:h-12">
                  <AvatarImage src={group.image} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-sm">
                    {group.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {group.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => groupPhotoInputRef.current?.click()}
                  disabled={uploadingGroupPhoto}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-primary-foreground hover:opacity-90 shadow-md disabled:opacity-50"
                >
                  {uploadingGroupPhoto ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ImageIcon className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editingName && isAdmin ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                  <button onClick={handleUpdateGroupName} className="p-2 touch-manipulation">
                    <Check className="w-5 h-5 text-green-500" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="p-2 touch-manipulation">
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ) : (
                <h2
                  className="text-base sm:text-lg font-semibold cursor-pointer truncate"
                  onClick={() => isAdmin && setEditingName(true)}
                >
                  {group.name}
                </h2>
              )}
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {group._count.members} member{group._count.members !== 1 ? "s" : ""}
                {typingUsers.length > 0 && (
                  <span className="text-blue-500 ml-2">
                    • {typingUsers.map((u) => u.name).join(", ")} typing...
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => setShowSearch(true)}
              className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg touch-manipulation"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowMembers(!showMembers)}
              className={cn(
                "p-2.5 sm:p-2 rounded-lg touch-manipulation",
                showMembers ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200"
              )}
            >
              <Users className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg touch-manipulation">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMembers(true)}>
                  <Users className="w-4 h-4 mr-2" /> View Members
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => setEditingName(true)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLeaveGroup} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {!group.isMember ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                {group.image ? (
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={group.image} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl font-bold">
                      {group.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {group.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                <p className="text-gray-500 mb-4">{group.description || "No description"}</p>
                <p className="text-sm text-gray-400 mb-4">{group._count.members} members</p>
                <Button onClick={handleJoinGroup} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <UserPlus className="w-4 h-4 mr-2" /> Join Group
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {group.messages.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                group.messages.map((msg) => {
                  const isOwn = msg.senderId === session.user?.id;
                  const isHighlighted = highlightedMessageId === msg.id;

                  // Deleted message
                  if (msg.isDeleted) {
                    return (
                      <div
                        key={msg.id}
                        id={`message-${msg.id}`}
                        className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                      >
                        <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 italic text-sm bg-gray-200 dark:bg-gray-700 text-gray-500">
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
                      key={msg.id}
                      id={`message-${msg.id}`}
                      className={cn(
                        "flex group transition-colors duration-500",
                        isOwn ? "justify-end" : "justify-start",
                        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/30 -mx-4 px-4 py-2 rounded-lg"
                      )}
                    >
                      <div className={cn("flex gap-2 max-w-[85%] sm:max-w-[70%]", isOwn ? "flex-row-reverse" : "")}>
                        {!isOwn && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={msg.sender.image || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                              {getInitials(msg.sender.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex-1">
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1 ml-1">{msg.sender.name}</p>
                          )}

                          {/* Forwarded indicator */}
                          {msg.isForwarded && (
                            <p className="text-xs text-gray-500 mb-1 ml-1 flex items-center gap-1">
                              <Forward className="w-3 h-3" /> Forwarded
                            </p>
                          )}

                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div
                              className={cn(
                                "mb-1 border-l-2 pl-2 py-1 text-xs rounded-r-lg",
                                isOwn
                                  ? "border-blue-400 bg-blue-500/10"
                                  : "border-gray-400 bg-gray-500/10"
                              )}
                            >
                              <p className="font-medium text-gray-600 dark:text-gray-300">
                                {msg.replyTo.sender.name}
                              </p>
                              <p className="text-gray-500 truncate">
                                {msg.replyTo.type === "image"
                                  ? "📷 Photo"
                                  : msg.replyTo.type === "voice"
                                  ? "🎤 Voice message"
                                  : msg.replyTo.content.slice(0, 50)}
                              </p>
                            </div>
                          )}

                          {/* Message content */}
                          <div className="relative">
                            <div
                              className={cn(
                                "rounded-2xl overflow-hidden",
                                msg.type === "image" || msg.type === "voice" ? "" : "px-4 py-2",
                                isOwn
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                                  : "bg-white dark:bg-gray-800 rounded-tl-sm shadow-sm border"
                              )}
                            >
                              {/* Text message */}
                              {msg.type === "text" && (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              )}

                              {/* Image message */}
                              {msg.type === "image" && (
                                <div className="relative group/image">
                                  <img
                                    src={msg.content}
                                    alt="Shared image"
                                    className="max-w-[300px] max-h-[300px] rounded-lg object-cover cursor-pointer"
                                    onClick={() => openImageViewer(msg.content)}
                                  />
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => openImageViewer(msg.content)}
                                      className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition"
                                    >
                                      <ZoomIn className="w-4 h-4 text-white" />
                                    </button>
                                    <a
                                      href={msg.content}
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
                              {(msg.type === "voice" || msg.type === "audio") && (
                                <div className="p-3">
                                  <VoiceMessagePlayer
                                    src={msg.content}
                                    duration={msg.metadata?.duration}
                                    isOwn={isOwn}
                                  />
                                </div>
                              )}

                              {/* Time and read status */}
                              <div
                                className={cn(
                                  "flex items-center gap-1 mt-1",
                                  msg.type === "image"
                                    ? "absolute bottom-2 right-2 bg-black/50 px-1.5 py-0.5 rounded text-white"
                                    : "",
                                  isOwn && msg.type !== "image" ? "justify-end" : "text-gray-500"
                                )}
                              >
                                {msg.isEdited && <span className="text-xs opacity-70">edited</span>}
                                <span className={cn("text-xs", isOwn && msg.type !== "image" ? "text-blue-200" : "")}>{formatTime(msg.createdAt)}</span>
                                {isOwn && (
                                  msg.readBy && msg.readBy.length > 0 ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-gray-300" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <MessageReactions
                                reactions={msg.reactions}
                                onReact={(emoji) => handleReaction(msg.id, emoji)}
                                isOwn={isOwn}
                              />
                            )}

                            {/* Action buttons on hover */}
                            <div
                              className={cn(
                                "absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                                isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
                              )}
                            >
                              <button
                                onClick={() => setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition bg-white dark:bg-gray-800 shadow-sm"
                              >
                                <Smile className="w-4 h-4 text-gray-500" />
                              </button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition bg-white dark:bg-gray-800 shadow-sm">
                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isOwn ? "start" : "end"}>
                                  <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                                    <Reply className="w-4 h-4 mr-2" /> Reply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setForwardingMessage(msg)}>
                                    <Forward className="w-4 h-4 mr-2" /> Forward
                                  </DropdownMenuItem>
                                  {msg.type === "text" && (
                                    <DropdownMenuItem onClick={() => handleCopyMessage(msg.content)}>
                                      <Copy className="w-4 h-4 mr-2" /> Copy
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {isOwn && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Reaction picker */}
                            {activeReactionPicker === msg.id && (
                              <ReactionPicker
                                onSelect={(emoji) => handleReaction(msg.id, emoji)}
                                onClose={() => setActiveReactionPicker(null)}
                                position={isOwn ? "left" : "right"}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {group.isMember && (
          <div className="bg-white dark:bg-gray-800 border-t p-4">
            {/* Reply preview */}
            {replyingTo && (
              <div className="max-w-4xl mx-auto mb-3 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Reply className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Replying to {replyingTo.sender.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {replyingTo.type === "image"
                      ? "📷 Photo"
                      : replyingTo.type === "voice"
                      ? "🎤 Voice message"
                      : replyingTo.content.slice(0, 50)}
                  </p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Voice recorder */}
            {isRecordingVoice ? (
              <div className="max-w-4xl mx-auto">
                <VoiceRecorder
                  onRecordingComplete={handleSendVoiceMessage}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              </div>
            ) : (
              <>
                {/* Image Preview */}
                {imagePreview && (
                  <div className="max-w-4xl mx-auto mb-3 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border" />
                    <button
                      onClick={cancelPendingImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {uploadingFile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-1 sm:gap-2 max-w-4xl mx-auto relative items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg disabled:opacity-50 touch-manipulation shrink-0"
                  >
                    <ImageIcon className="w-5 h-5 text-gray-500" />
                  </button>

                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder={pendingImage ? "Add a caption..." : "Message..."}
                    value={message}
                    onChange={handleInputChange}
                    className="flex-1 h-11 text-base"
                    disabled={uploadingFile}
                  />

                  <div className="relative hidden sm:block">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg touch-manipulation"
                    >
                      <Smile className="w-5 h-5 text-gray-500" />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPicker
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>

                  {/* Show mic button if no text/image, otherwise send button */}
                  {!message.trim() && !pendingImage ? (
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg touch-manipulation shrink-0"
                    >
                      <Mic className="w-5 h-5 text-gray-500" />
                    </button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={(!message.trim() && !pendingImage) || sending || uploadingFile}
                      className="h-11 w-11 shrink-0 touch-manipulation"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                  )}
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* Members Sidebar - Full screen on mobile, sidebar on desktop */}
      {showMembers && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
            onClick={() => setShowMembers(false)} 
          />
          <div className="fixed inset-0 sm:inset-auto sm:relative w-full sm:w-80 bg-white dark:bg-gray-800 sm:border-l border-gray-200 dark:border-gray-700 flex flex-col z-50 sm:z-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-base">Members ({group._count.members})</h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 rounded-lg touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          <div className="flex-1 overflow-y-auto p-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 rounded-lg touch-manipulation"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 sm:w-10 sm:h-10">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-3 sm:h-3 rounded-full border-2 border-white",
                      member.user.status === "online" ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center">
                    {member.user.name}
                    {getRoleBadge(member.role)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.user.status === "online" ? "Online" : "Offline"}
                  </p>
                </div>

                {isAdmin && member.userId !== session.user?.id && member.role !== "creator" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isCreator && member.role !== "admin" && (
                        <DropdownMenuItem onClick={() => handlePromoteMember(member.userId, "admin")}>
                          <Shield className="w-4 h-4 mr-2" /> Make Admin
                        </DropdownMenuItem>
                      )}
                      {isCreator && member.role === "admin" && (
                        <DropdownMenuItem onClick={() => handlePromoteMember(member.userId, "member")}>
                          <UserMinus className="w-4 h-4 mr-2" /> Remove Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleRemoveMember(member.userId)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button className="w-full" variant="outline" onClick={openInviteModal}>
                <UserPlus className="w-4 h-4 mr-2" /> Invite Members
              </Button>
            </div>
          )}
        </div>
        </>
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Invite Members</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {allUsers
                .filter(u => {
                  // Filter out existing members
                  const isMember = group?.members.some(m => m.userId === u.id);
                  if (isMember) return false;
                  // Filter by search
                  if (!inviteSearch) return true;
                  return u.name?.toLowerCase().includes(inviteSearch.toLowerCase());
                })
                .map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {user.name?.slice(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(user.id)}
                      disabled={addingMember === user.id}
                    >
                      {addingMember === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" /> Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              
              {allUsers.filter(u => {
                const isMember = group?.members.some(m => m.userId === u.id);
                if (isMember) return false;
                if (!inviteSearch) return true;
                return u.name?.toLowerCase().includes(inviteSearch.toLowerCase());
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users to invite</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {showImageViewer && imageMessages.length > 0 && (
        <ImageViewer
          images={imageMessages}
          initialIndex={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* Forward Dialog */}
      {forwardingMessage && (
        <ForwardMessageDialog
          isOpen={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          message={{
            id: forwardingMessage.id,
            content: forwardingMessage.content,
            type: forwardingMessage.type,
          }}
          onForward={handleForwardMessage}
        />
      )}
    </div>
  );
}

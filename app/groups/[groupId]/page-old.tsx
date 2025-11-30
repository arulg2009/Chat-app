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
  Settings,
  UserPlus,
  LogOut,
  Crown,
  Shield,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Info,
  UserMinus,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  Download,
  Maximize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface GroupMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
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
  const [showSettings, setShowSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; filename: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && groupId) {
      fetchGroup();
    }
  }, [status, groupId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [group?.messages, scrollToBottom]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setNewGroupName(data.name);
      } else if (res.status === 404) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error fetching group:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !pendingImage) || !group || sending) return;

    setSending(true);
    const content = pendingImage ? pendingImage.url : message.trim();
    const type = pendingImage ? "image" : "text";
    setMessage("");
    setPendingImage(null);
    setImagePreview(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setGroup((prev) =>
          prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleJoinGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchGroup();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to join group");
      }
    } catch (err) {
      console.error("Error joining group:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
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

    // Show preview
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

  const isAdmin = group?.userRole === "creator" || group?.userRole === "admin";
  const isCreator = group?.userRole === "creator";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !group) return null;

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {group.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1">
              {editingName && isAdmin ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="h-8"
                  />
                  <button onClick={handleUpdateGroupName}>
                    <Check className="w-5 h-5 text-green-500" />
                  </button>
                  <button onClick={() => setEditingName(false)}>
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ) : (
                <h2
                  className="text-lg font-semibold cursor-pointer"
                  onClick={() => isAdmin && setEditingName(true)}
                >
                  {group.name}
                </h2>
              )}
              <p className="text-sm text-gray-500">
                {group._count.members} member{group._count.members !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-lg ${
                showMembers ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
                <DropdownMenuItem
                  onClick={handleLeaveGroup}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {!group.isMember ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {group.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                <p className="text-gray-500 mb-4">
                  {group.description || "No description"}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  {group._count.members} members
                </p>
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
                  <p className="text-gray-500">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                group.messages.map((msg) => {
                  const isOwn = msg.senderId === session.user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[70%] ${
                          isOwn ? "flex-row-reverse" : ""
                        }`}
                      >
                        {!isOwn && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={msg.sender.image || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                              {getInitials(msg.sender.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1 ml-1">
                              {msg.sender.name}
                            </p>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                                : "bg-white dark:bg-gray-800 rounded-tl-sm shadow-sm border"
                            }`}
                          >
                            {msg.type === "image" ? (
                              <div className="relative group">
                                <img
                                  src={msg.content}
                                  alt="Shared image"
                                  className="max-w-[300px] max-h-[300px] rounded-lg object-cover cursor-pointer"
                                  onClick={() => window.open(msg.content, "_blank")}
                                />
                                <button
                                  onClick={() => window.open(msg.content, "_blank")}
                                  className="absolute top-2 right-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? "text-blue-200" : "text-gray-500"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {group.isMember && (
          <div className="bg-white dark:bg-gray-800 border-t p-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="max-w-4xl mx-auto mb-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg border"
                />
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
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 max-w-4xl mx-auto"
            >
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-gray-500" />
              </button>
              <Input
                ref={inputRef}
                type="text"
                placeholder={pendingImage ? "Add a caption or send..." : "Type a message..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={uploadingFile}
              />
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Smile className="w-5 h-5 text-gray-500" />
              </button>
              <Button type="submit" size="icon" disabled={(!message.trim() && !pendingImage) || sending || uploadingFile}>
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold">Members ({group._count.members})</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      member.user.status === "online"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
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
                        <DropdownMenuItem
                          onClick={() => handlePromoteMember(member.userId, "admin")}
                        >
                          <Shield className="w-4 h-4 mr-2" /> Make Admin
                        </DropdownMenuItem>
                      )}
                      {isCreator && member.role === "admin" && (
                        <DropdownMenuItem
                          onClick={() => handlePromoteMember(member.userId, "member")}
                        >
                          <UserMinus className="w-4 h-4 mr-2" /> Remove Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-red-600"
                      >
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
              <Button className="w-full" variant="outline">
                <UserPlus className="w-4 h-4 mr-2" /> Invite Members
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

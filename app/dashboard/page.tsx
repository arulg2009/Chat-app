"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, Users, Search, Plus, Settings, LogOut, Bell,
  Circle, ChevronRight, Clock, UserPlus, Check, X, Loader2,
  Hash, Lock, Globe, MoreVertical, Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  updatedAt: string;
  users: {
    user: {
      id: string;
      name: string | null;
      image: string | null;
      status: string;
    };
  }[];
  messages: {
    content: string;
    type: string;
    createdAt: string;
    sender: { name: string | null };
  }[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isPrivate: boolean;
  _count: { members: number; messages: number };
  members: { role: string }[];
}

interface ChatRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface SentRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  receiverId: string;
  receiver: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string;
  lastSeen: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chats" | "groups" | "users" | "requests">("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sentRequestsList, setSentRequestsList] = useState<SentRequest[]>([]);
  const [requestsSubTab, setRequestsSubTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [convRes, groupsRes, requestsRes, usersRes, sentReqRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/groups"),
        fetch("/api/chat-requests?type=received"),
        fetch("/api/users"),
        fetch("/api/chat-requests?type=sent"),
      ]);

      if (convRes.ok) setConversations(await convRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        // API returns array directly, filter for pending requests
        const pendingRequests = Array.isArray(data) 
          ? data.filter((r: ChatRequest) => r.status === "pending")
          : [];
        setChatRequests(pendingRequests);
      }
      if (usersRes.ok) {
        const users = await usersRes.json();
        // Filter out current user
        setAllUsers(users.filter((u: User) => u.id !== session?.user?.id));
      }
      if (sentReqRes.ok) {
        const sentData = await sentReqRes.json();
        // Track users we've already sent requests to
        const sentUserIds = new Set<string>();
        const pendingSentRequests: SentRequest[] = [];
        if (Array.isArray(sentData)) {
          sentData.forEach((r: any) => {
            if (r.status === "pending") {
              sentUserIds.add(r.receiverId);
              pendingSentRequests.push(r);
            }
          });
        }
        setSentRequests(sentUserIds);
        setSentRequestsList(pendingSentRequests);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setChatRequests(prev => prev.filter(r => r.id !== requestId));
        if (action === "accept") fetchData();
      }
    } catch (e) {
      console.error("Error handling request:", e);
    }
  };

  const sendChatRequest = async (userId: string) => {
    setSendingRequest(userId);
    try {
      const res = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (res.ok) {
        setSentRequests(prev => new Set(prev).add(userId));
        fetchData(); // Refresh to get the new sent request
      }
    } catch (e) {
      console.error("Error sending request:", e);
    } finally {
      setSendingRequest(null);
    }
  };

  const cancelSentRequest = async (requestId: string, receiverId: string) => {
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSentRequestsList(prev => prev.filter(r => r.id !== requestId));
        setSentRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(receiverId);
          return newSet;
        });
      }
    } catch (e) {
      console.error("Error canceling request:", e);
    }
  };

  // Check if user already has a conversation with another user
  const hasConversationWith = (userId: string) => {
    return conversations.some(conv => 
      conv.users.some(u => u.user.id === userId)
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          isPrivate: newGroupPrivate,
        }),
      });
      if (res.ok) {
        const group = await res.json();
        setShowNewGroupModal(false);
        setNewGroupName("");
        setNewGroupDescription("");
        setNewGroupPrivate(false);
        router.push(`/groups/${group.id}`);
      }
    } catch (e) {
      console.error("Error creating group:", e);
    } finally {
      setCreatingGroup(false);
    }
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getOtherUser = (conv: Conversation) => {
    const other = conv.users.find(u => u.user.id !== session?.user?.id);
    return other?.user;
  };

  const filteredConversations = conversations.filter(conv => {
    const other = getOtherUser(conv);
    return other?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">ChatApp</span>
        </div>

        <div className="flex items-center gap-2">
          {chatRequests.length > 0 && (
            <button
              onClick={() => setActiveTab("requests")}
              className="relative p-2 hover:bg-muted rounded-lg"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {chatRequests.length}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 hover:bg-muted rounded-lg"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={session.user?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                  {getInitials(session.user?.name || null)}
                </AvatarFallback>
              </Avatar>
            </button>

            {showUserDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg z-50 py-1 animate-scaleIn">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium truncate">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-card px-4 overflow-x-auto">
        {[
          { id: "chats", label: "Chats", icon: MessageCircle, count: conversations.length },
          { id: "groups", label: "Groups", icon: Users, count: groups.length },
          { id: "users", label: "Find Users", icon: Search, count: 0 },
          { id: "requests", label: "Requests", icon: UserPlus, count: chatRequests.length + sentRequestsList.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Chats Tab */}
        {activeTab === "chats" && (
          <div className="divide-y">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a chat request to start messaging
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherUser(conv);
                const lastMessage = conv.messages[0];
                return (
                  <Link
                    key={conv.id}
                    href={`/conversations/${conv.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={other?.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {getInitials(other?.name || null)}
                        </AvatarFallback>
                      </Avatar>
                      {other?.status === "online" && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{other?.name || "Unknown"}</span>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage.type !== "text" ? `[${lastMessage.type}]` : lastMessage.content}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            <div className="p-4">
              <Button
                onClick={() => setShowNewGroupModal(true)}
                className="w-full gradient-primary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Group
              </Button>
            </div>
            <div className="divide-y">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No groups yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a group to start chatting with multiple people
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={group.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        {group.isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{group.name}</span>
                        {group.isPrivate ? (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {group._count.members} members • {group._count.messages} messages
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="divide-y">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No users found" : "Search for users to connect"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? "Try a different search term" : "Use the search bar above to find people"}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const alreadyConnected = hasConversationWith(user.id);
                const requestSent = sentRequests.has(user.id);
                const isSending = sendingRequest === user.id;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {user.status === "online" && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Circle className={`w-2 h-2 ${user.status === "online" ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`} />
                        {user.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div>
                      {alreadyConnected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const conv = conversations.find(c => c.users.some(u => u.user.id === user.id));
                            if (conv) router.push(`/conversations/${conv.id}`);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                      ) : requestSent ? (
                        <Button size="sm" variant="outline" className="h-8" disabled>
                          <Clock className="w-4 h-4 mr-1" />
                          Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 gradient-primary"
                          onClick={() => sendChatRequest(user.id)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div>
            {/* Sub-tabs for Received/Sent */}
            <div className="flex border-b bg-muted/30 px-4">
              <button
                onClick={() => setRequestsSubTab("received")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  requestsSubTab === "received"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Received
                {chatRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-green-500/20 text-green-600">
                    {chatRequests.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setRequestsSubTab("sent")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  requestsSubTab === "sent"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sent
                {sentRequestsList.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-600">
                    {sentRequestsList.length}
                  </Badge>
                )}
              </button>
            </div>

            {/* Received Requests */}
            {requestsSubTab === "received" && (
              <div className="divide-y">
                {chatRequests.length === 0 ? (
                  <div className="p-8 text-center">
                    <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No pending requests</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When someone sends you a chat request, it will appear here
                    </p>
                  </div>
                ) : (
                  chatRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={request.sender.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
                          {getInitials(request.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{request.sender.name}</p>
                        {request.message ? (
                          <p className="text-sm text-muted-foreground truncate">{request.message}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Wants to connect with you</p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(request.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRequestAction(request.id, "reject")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 gradient-primary"
                          onClick={() => handleRequestAction(request.id, "accept")}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sent Requests */}
            {requestsSubTab === "sent" && (
              <div className="divide-y">
                {sentRequestsList.length === 0 ? (
                  <div className="p-8 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No pending sent requests</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requests you send to others will appear here until they respond
                    </p>
                  </div>
                ) : (
                  sentRequestsList.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={request.receiver?.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {getInitials(request.receiver?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{request.receiver?.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">Waiting for response</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(request.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => cancelSentRequest(request.id, request.receiverId)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card rounded-xl p-5 max-w-sm w-full shadow-lg animate-scaleIn">
            <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Group Name *</label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="h-10"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  className="w-full px-3 py-2 text-sm bg-background border rounded-md resize-none h-20"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Private Group</p>
                    <p className="text-xs text-muted-foreground">Only invited members can join</p>
                  </div>
                </div>
                <button
                  onClick={() => setNewGroupPrivate(!newGroupPrivate)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    newGroupPrivate ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      newGroupPrivate ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowNewGroupModal(false);
                  setNewGroupName("");
                  setNewGroupDescription("");
                  setNewGroupPrivate(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-primary"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
              >
                {creatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

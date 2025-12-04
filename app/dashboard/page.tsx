"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle, Users, Search, Plus, Settings, LogOut, Bell,
  Circle, ChevronRight, Clock, UserPlus, Check, X, Loader2,
  Hash, Lock, Globe, MoreVertical, Trash2, Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatListSkeleton, GroupCardSkeleton, UserListSkeleton } from "@/components/ui/skeleton";
import { IncomingCallNotification, ActiveCallScreen } from "@/components/chat";
import { useIncomingCalls } from "@/lib/use-incoming-calls";
import { Call } from "@/lib/use-webrtc";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Incoming call handling
  const { incomingCall, rejectIncomingCall, dismissIncomingCall } = useIncomingCalls({
    enabled: status === "authenticated",
    pollInterval: 3000,
  });
  const [answeringCall, setAnsweringCall] = useState<Call | null>(null);

  const handleAnswerCall = (call: Call) => {
    dismissIncomingCall();
    setAnsweringCall(call);
  };

  const handleRejectCall = async () => {
    await rejectIncomingCall();
  };

  const handleCallEnded = () => {
    setAnsweringCall(null);
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
      checkAdmin();
      // Adaptive polling - 5s when active, skip when hidden, immediate on focus
      const interval = setInterval(() => {
        if (!document.hidden) fetchDataSilent();
      }, 5000);
      
      const handleVisibility = () => {
        if (!document.hidden) fetchDataSilent();
      };
      const handleFocus = () => fetchDataSilent();
      
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [status]);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/admin/users");
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  // Silent fetch without loading indicator
  const fetchDataSilent = async () => {
    try {
      const [convRes, groupsRes, requestsRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/groups"),
        fetch("/api/chat-requests?type=received"),
      ]);

      if (convRes.ok) setConversations(await convRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        const pendingRequests = Array.isArray(data) 
          ? data.filter((r: ChatRequest) => r.status === "pending")
          : [];
        setChatRequests(pendingRequests);
      }
    } catch (e) {
      // Ignore silent refresh errors
    }
  };

  const fetchData = async () => {
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
        const pendingRequests = Array.isArray(data) 
          ? data.filter((r: ChatRequest) => r.status === "pending")
          : [];
        setChatRequests(pendingRequests);
      }
      if (usersRes.ok) {
        const users = await usersRes.json();
        setAllUsers(users.filter((u: User) => u.id !== session?.user?.id));
      }
      if (sentReqRes.ok) {
        const sentData = await sentReqRes.json();
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
    // Optimistic update - remove immediately for instant feedback
    const requestToProcess = chatRequests.find(r => r.id === requestId);
    setChatRequests(prev => prev.filter(r => r.id !== requestId));
    
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok && action === "accept") {
        // Refresh conversations in background
        fetch("/api/conversations").then(async (convRes) => {
          if (convRes.ok) setConversations(await convRes.json());
        });
      } else if (!res.ok && requestToProcess) {
        // Rollback on error
        setChatRequests(prev => [...prev, requestToProcess]);
      }
    } catch (e) {
      // Rollback on error
      if (requestToProcess) setChatRequests(prev => [...prev, requestToProcess]);
      console.error("Error handling request:", e);
    }
  };

  const sendChatRequest = async (userId: string) => {
    // Optimistic update - instant feedback
    setSentRequests(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      return newSet;
    });
    setSendingRequest(userId);
    
    try {
      const res = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (!res.ok) {
        // Rollback on error
        setSentRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    } catch (e) {
      // Rollback on error
      setSentRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      console.error("Error sending request:", e);
    } finally {
      setSendingRequest(null);
    }
  };

  const cancelSentRequest = async (requestId: string, receiverId: string) => {
    // Optimistic update - instant removal
    const oldSentList = [...sentRequestsList];
    setSentRequestsList(prev => prev.filter(r => r.id !== requestId));
    setSentRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(receiverId);
      return newSet;
    });
    
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Rollback on error
        setSentRequestsList(oldSentList);
        setSentRequests(prev => new Set(prev).add(receiverId));
      }
    } catch (e) {
      // Rollback on error
      setSentRequestsList(oldSentList);
      setSentRequests(prev => new Set(prev).add(receiverId));
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

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password");
      return;
    }
    setDeletingAccount(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/auth/signin" });
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete account");
      }
    } catch (e) {
      console.error("Error deleting account:", e);
      setDeleteError("An error occurred. Please try again.");
    } finally {
      setDeletingAccount(false);
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
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 sm:h-16 px-3 sm:px-4 pt-2 sm:pt-0 flex items-center justify-between border-b bg-card shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-semibold text-base sm:text-lg">ChatApp</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        </header>
        {/* Search skeleton */}
        <div className="px-3 sm:px-4 py-3 border-b bg-card">
          <div className="h-11 sm:h-12 bg-muted/50 rounded-lg animate-pulse" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex border-b bg-card px-2 sm:px-4 gap-2 py-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-20 bg-muted rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
        {/* Chat list skeleton */}
        <div className="flex-1 overflow-hidden">
          <ChatListSkeleton count={8} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Incoming Call Notification */}
      {incomingCall && !answeringCall && (
        <IncomingCallNotification
          call={incomingCall}
          onAnswer={() => handleAnswerCall(incomingCall)}
          onReject={handleRejectCall}
        />
      )}

      {/* Active Call Screen */}
      {answeringCall && (
        <ActiveCallScreen
          call={answeringCall}
          isIncoming={true}
          onEnd={handleCallEnded}
        />
      )}

      {/* Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-4 pt-2 sm:pt-0 flex items-center justify-between border-b bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg gradient-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-semibold text-base sm:text-lg">ChatApp</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {chatRequests.length > 0 && (
            <button
              onClick={() => setActiveTab("requests")}
              className="relative p-2.5 sm:p-2 hover:bg-muted active:bg-muted/80 rounded-lg touch-manipulation"
            >
              <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {chatRequests.length}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 sm:p-2 hover:bg-muted active:bg-muted/80 rounded-lg touch-manipulation"
            >
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
                <AvatarImage src={session.user?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs sm:text-sm">
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
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-muted"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                  <div className="border-t mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 sm:px-4 py-3 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 h-11 sm:h-12 bg-muted/50 text-base"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-card px-2 sm:px-4 overflow-x-auto scrollbar-none">
        {[
          { id: "chats", label: "Chats", icon: MessageCircle, count: 0 },
          { id: "groups", label: "Groups", icon: Users, count: 0 },
          { id: "users", label: "Users", icon: Search, count: 0 },
          { id: "requests", label: "Requests", icon: UserPlus, count: chatRequests.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-0 touch-manipulation ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground active:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
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
                    prefetch={true}
                    className="flex items-center gap-3 px-3 sm:px-4 py-4 hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                        <AvatarImage src={other?.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                          {getInitials(other?.name || null)}
                        </AvatarFallback>
                      </Avatar>
                      {other?.status === "online" && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate text-base">{other?.name || "Unknown"}</span>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {lastMessage.type !== "text" ? `[${lastMessage.type}]` : lastMessage.content}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            <div className="p-3 sm:p-4">
              <Button
                onClick={() => setShowNewGroupModal(true)}
                className="w-full gradient-primary h-12"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Group
              </Button>
            </div>
            <div className="divide-y">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-base text-muted-foreground">No groups yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a group to start chatting with multiple people
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    prefetch={true}
                    className="flex items-center gap-3 px-3 sm:px-4 py-4 hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation"
                  >
                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                      <AvatarImage src={group.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-sm">
                        {group.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate text-base">{group.name}</span>
                        {group.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {group._count.members} members • {group._count.messages} messages
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
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
                <Search className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-base text-muted-foreground">
                  {searchQuery ? "No users found" : "Search for users to connect"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
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
                    className="flex items-center gap-3 px-3 sm:px-4 py-4 hover:bg-muted/50 active:bg-muted/70 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {user.status === "online" && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-base">{user.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Circle className={`w-2 h-2 ${user.status === "online" ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`} />
                        {user.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div>
                      {alreadyConnected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 px-4 touch-manipulation"
                          onClick={() => {
                            const conv = conversations.find(c => c.users.some(u => u.user.id === user.id));
                            if (conv) router.push(`/conversations/${conv.id}`);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          Chat
                        </Button>
                      ) : requestSent ? (
                        <Button size="sm" variant="outline" className="h-11 px-4" disabled>
                          <Clock className="w-4 h-4 mr-1.5" />
                          Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-11 px-4 gradient-primary touch-manipulation"
                          onClick={() => sendChatRequest(user.id)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1.5" />
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
            <div className="flex border-b bg-muted/30 px-3 sm:px-4">
              <button
                onClick={() => setRequestsSubTab("received")}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                  requestsSubTab === "received"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground active:text-foreground"
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
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                  requestsSubTab === "sent"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground active:text-foreground"
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
                    <UserPlus className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-base text-muted-foreground">No pending requests</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      When someone sends you a chat request, it will appear here
                    </p>
                  </div>
                ) : (
                  chatRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 px-3 sm:px-4 py-4"
                    >
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                        <AvatarImage src={request.sender.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white text-sm">
                          {getInitials(request.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-base">{request.sender.name}</p>
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
                          className="h-11 w-11 p-0 touch-manipulation"
                          onClick={() => handleRequestAction(request.id, "reject")}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-11 w-11 p-0 gradient-primary touch-manipulation"
                          onClick={() => handleRequestAction(request.id, "accept")}
                        >
                          <Check className="w-5 h-5" />
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
                    <Clock className="w-14 h-14 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-base text-muted-foreground">No pending sent requests</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Requests you send to others will appear here until they respond
                    </p>
                  </div>
                ) : (
                  sentRequestsList.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 px-3 sm:px-4 py-4"
                    >
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                        <AvatarImage src={request.receiver?.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                          {getInitials(request.receiver?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-base">{request.receiver?.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">Waiting for response</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(request.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 touch-manipulation"
                        onClick={() => cancelSentRequest(request.id, request.receiverId)}
                      >
                        <X className="w-4 h-4 mr-1.5" />
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

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword("");
              setDeleteError("");
            }}
          />
          <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md p-6 animate-scaleIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-600">Delete Account</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete your account? This will permanently delete:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>All your conversations and messages</li>
                <li>All your group memberships</li>
                <li>All your chat requests</li>
                <li>Your profile and account data</li>
              </ul>

              <div>
                <label className="text-sm font-medium">Enter your password to confirm</label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder="Your password"
                  className="mt-1"
                />
                {deleteError && (
                  <p className="text-sm text-red-500 mt-1">{deleteError}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={deletingAccount}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deletePassword.trim()}
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

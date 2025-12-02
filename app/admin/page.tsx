"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, MessageCircle, Trash2, Search, Shield, UserX,
  Image as ImageIcon, Loader2, AlertTriangle, RefreshCw, Hash,
  MoreVertical, X, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  lastSeen: string;
  createdAt: string;
  _count: {
    sentMessages: number;
    groupMessages: number;
    groupMemberships: number;
    createdGroups: number;
  };
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isPrivate: boolean;
  createdAt: string;
  creator: { id: string; name: string | null; email: string | null };
  _count: { members: number; messages: number };
}

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  totalGroups: number;
  totalMessages: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const [users, setUsers] = useState<UserData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      checkAdminAndFetch();
    }
  }, [status]);

  const checkAdminAndFetch = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats(data.stats);
        setIsAdmin(true);
        fetchGroups();
      } else if (res.status === 403) {
        setIsAdmin(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/admin/groups");
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await checkAdminAndFetch();
  };

  const deleteUser = async (userId: string, userName: string | null) => {
    setConfirmModal({
      show: true,
      title: "Delete User",
      message: `Are you sure you want to delete "${userName || 'this user'}"? This action cannot be undone and will delete all their messages and data.`,
      action: async () => {
        setActionLoading(userId);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
          if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            if (stats) setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
          } else {
            const err = await res.json();
            alert(err.error || "Failed to delete user");
          }
        } catch (e) {
          console.error(e);
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const deleteAllUsers = async () => {
    setConfirmModal({
      show: true,
      title: "Delete ALL Users",
      message: "⚠️ DANGER: This will permanently delete ALL users except admins. This action CANNOT be undone!",
      action: async () => {
        setActionLoading("all-users");
        try {
          const res = await fetch("/api/admin/users", { method: "DELETE" });
          if (res.ok) {
            await refreshData();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const removeUserPhoto = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removePhoto" }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, image: null } : u));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const clearUserMessages = async (userId: string, userName: string | null) => {
    setConfirmModal({
      show: true,
      title: "Clear Messages",
      message: `Delete all messages from "${userName || 'this user'}"?`,
      action: async () => {
        setActionLoading(userId);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "clearMessages" }),
          });
          if (res.ok) {
            const data = await res.json();
            alert(data.message);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const deleteGroup = async (groupId: string, groupName: string) => {
    setConfirmModal({
      show: true,
      title: "Delete Group",
      message: `Delete group "${groupName}" and all its messages?`,
      action: async () => {
        setActionLoading(groupId);
        try {
          const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
          if (res.ok) {
            setGroups(prev => prev.filter(g => g.id !== groupId));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const deleteAllGroups = async () => {
    setConfirmModal({
      show: true,
      title: "Delete ALL Groups",
      message: "⚠️ DANGER: This will permanently delete ALL groups and their messages!",
      action: async () => {
        setActionLoading("all-groups");
        try {
          const res = await fetch("/api/admin/groups", { method: "DELETE" });
          if (res.ok) {
            setGroups([]);
            await refreshData();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 px-4 flex items-center justify-between border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Total Users</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs">Online</span>
            </div>
            <p className="text-2xl font-bold">{stats.onlineUsers}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Hash className="w-4 h-4" />
              <span className="text-xs">Groups</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalGroups}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">Messages</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalMessages}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users or groups..."
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-card px-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === "groups"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Hash className="w-4 h-4" />
          Groups ({groups.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {/* Danger Zone */}
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Danger Zone</h3>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteAllUsers}
                disabled={actionLoading === "all-users"}
              >
                {actionLoading === "all-users" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete All Users
              </Button>
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-soft"
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name || "Unnamed"}</p>
                      {user.role === "admin" && (
                        <Badge className="bg-red-500 text-white text-[10px]">ADMIN</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user._count.sentMessages + user._count.groupMessages} msgs • 
                      {user._count.groupMemberships} groups • 
                      Joined {formatDate(user.createdAt)}
                    </p>
                  </div>

                  {user.role !== "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionLoading === user.id}>
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.image && (
                          <DropdownMenuItem onClick={() => removeUserPhoto(user.id)}>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Remove Photo
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => clearUserMessages(user.id, user.name)}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Clear Messages
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteUser(user.id, user.name)}
                          className="text-red-600"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            {/* Danger Zone */}
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Danger Zone</h3>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteAllGroups}
                disabled={actionLoading === "all-groups"}
              >
                {actionLoading === "all-groups" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete All Groups
              </Button>
            </div>

            {/* Groups List */}
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-soft"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={group.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                      <Hash className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{group.name}</p>
                      {group.isPrivate && (
                        <Badge variant="secondary" className="text-[10px]">Private</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      By {group.creator.name || group.creator.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group._count.members} members • {group._count.messages} msgs
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={actionLoading === group.id}>
                        {actionLoading === group.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => deleteGroup(group.id, group.name)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No groups found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full shadow-xl animate-scaleIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold">{confirmModal.title}</h2>
            </div>
            <p className="text-muted-foreground mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmModal.action}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

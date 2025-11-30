"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  LogOut,
  Send,
  Search,
  Menu,
  X,
  UserPlus,
  Clock,
  Users,
  Settings,
  Plus,
  Image as ImageIcon,
  Loader2,
  Hash,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string;
  lastSeen: Date;
}

interface ChatRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  message: string | null;
  createdAt: string;
  sender: UserType;
  receiver: UserType;
}

interface ConnectionStatus {
  status: 'connected' | 'pending' | 'not_connected';
  canChat: boolean;
  conversationId?: string;
  requestId?: string;
  isSender?: boolean;
  canSendRequest?: boolean;
  remainingRequests?: number;
}

interface ChatMessage {
  id: string;
  content: string;
  type?: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
}

type TabType = 'chats' | 'users' | 'groups';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; filename: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers();
      fetchChatRequests();
      fetchGroups();
    }
  }, [status]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [chatMessages, scrollToBottom]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: UserType) => u.email !== session?.user?.email));
      }
    } catch (e) { console.error(e); }
  };

  const fetchChatRequests = async () => {
    try {
      const res = await fetch("/api/chat-requests");
      if (res.ok) {
        const data = await res.json();
        setChatRequests(data);
        setPendingCount(data.filter((r: ChatRequest) => r.status === 'pending' && r.receiverId === session?.user?.id).length);
      }
    } catch (e) { console.error(e); }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) setGroups(await res.json());
    } catch (e) { console.error(e); }
  };

  const checkConnectionStatus = async (userId: string) => {
    setIsLoadingConnection(true);
    try {
      const res = await fetch(`/api/users/${userId}/connection`);
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data);
        if (data.status === 'connected' && data.conversationId) fetchMessages(data.conversationId);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingConnection(false); }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) setChatMessages((await res.json()).messages || []);
    } catch (e) { console.error(e); }
  };

  const handleSelectUser = async (user: UserType) => {
    setSelectedUser(user);
    setIsSidebarOpen(false);
    setChatMessages([]);
    setConnectionStatus(null);
    await checkConnectionStatus(user.id);
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, message: requestMessage.trim() || null }),
      });
      if (res.ok) {
        setShowRequestModal(false);
        setRequestMessage("");
        await checkConnectionStatus(selectedUser.id);
        await fetchChatRequests();
      }
    } catch (e) { console.error(e); }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchChatRequests();
        if (selectedUser) await checkConnectionStatus(selectedUser.id);
      }
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !pendingImage) return;
    if (selectedUser && connectionStatus?.canChat && connectionStatus.conversationId) {
      const msgContent = pendingImage ? pendingImage.url : message.trim();
      const msgType = pendingImage ? "image" : "text";
      setMessage("");
      setPendingImage(null);
      setImagePreview(null);
      try {
        const res = await fetch(`/api/conversations/${connectionStatus.conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: msgContent, type: msgType }),
        });
        if (res.ok) {
          const newMsg = await res.json();
          setChatMessages((prev) => [...prev, newMsg]);
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "message");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const result = await res.json();
        setPendingImage({ url: result.url, filename: result.filename });
      }
    } catch (e) { setImagePreview(null); }
    finally { setUploadingImage(false); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDescription.trim() }),
      });
      if (res.ok) {
        setShowCreateGroupDialog(false);
        setNewGroupName('');
        setNewGroupDescription('');
        await fetchGroups();
      }
    } catch (e) { console.error(e); }
  };

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  const pendingReceivedRequests = chatRequests.filter(r => r.status === 'pending' && r.receiverId === session.user?.id);
  const connectedUsers = chatRequests.filter(r => r.status === 'accepted').map(r => r.senderId === session.user?.id ? r.receiver : r.sender);
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-200`}>
        {/* Header */}
        <div className="h-12 px-3 flex items-center justify-between border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Messages</span>
          </div>
          <div className="flex items-center gap-1">
            {pendingCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500 text-white rounded-full">{pendingCount}</span>}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 py-1.5 flex gap-0.5 border-b">
          {([['chats', 'Chats', MessageCircle], ['users', 'Users', Users], ['groups', 'Groups', Hash]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-medium rounded transition-colors ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'chats' && (
            <div className="p-1.5">
              {pendingReceivedRequests.length > 0 && (
                <div className="mb-2">
                  <p className="px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Requests</p>
                  {pendingReceivedRequests.map(req => (
                    <div key={req.id} className="p-1.5 rounded hover:bg-muted/50 mb-0.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7"><AvatarImage src={req.sender.image || undefined} /><AvatarFallback className="text-[9px] bg-amber-500 text-white">{getInitials(req.sender.name)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{req.sender.name}</p></div>
                      </div>
                      <div className="flex gap-1 mt-1.5 ml-9">
                        <button onClick={() => handleRespondToRequest(req.id, 'accept')} className="flex-1 py-0.5 text-[9px] font-medium bg-green-500 hover:bg-green-600 text-white rounded">Accept</button>
                        <button onClick={() => handleRespondToRequest(req.id, 'reject')} className="flex-1 py-0.5 text-[9px] font-medium bg-muted hover:bg-muted/80 rounded">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {connectedUsers.length > 0 ? (
                <>
                  <p className="px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Conversations</p>
                  {connectedUsers.map(user => (
                    <button key={user.id} onClick={() => handleSelectUser(user)} className={`w-full flex items-center gap-2 p-1.5 rounded transition-colors ${selectedUser?.id === user.id ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                      <div className="relative">
                        <Avatar className="w-8 h-8"><AvatarImage src={user.image || undefined} /><AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white">{getInitials(user.name)}</AvatarFallback></Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card ${user.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left"><p className="text-xs font-medium truncate">{user.name}</p><p className="text-[9px] text-muted-foreground">Click to chat</p></div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="text-center py-6"><MessageCircle className="w-8 h-8 mx-auto mb-1.5 text-muted-foreground/20" /><p className="text-[10px] text-muted-foreground">No conversations</p></div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-1.5">
              <p className="px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">All Users ({filteredUsers.length})</p>
              {filteredUsers.map(user => (
                <button key={user.id} onClick={() => handleSelectUser(user)} className={`w-full flex items-center gap-2 p-1.5 rounded transition-colors ${selectedUser?.id === user.id ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                  <div className="relative">
                    <Avatar className="w-8 h-8"><AvatarImage src={user.image || undefined} /><AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">{getInitials(user.name)}</AvatarFallback></Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card ${user.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left"><p className="text-xs font-medium truncate">{user.name}</p><p className="text-[9px] text-muted-foreground">{user.status === "online" ? "Online" : "Offline"}</p></div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-1.5 py-0.5 mb-0.5">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Groups ({groups.length})</p>
                <button onClick={() => setShowCreateGroupDialog(true)} className="p-0.5 hover:bg-muted rounded"><Plus className="w-3 h-3" /></button>
              </div>
              {groups.length === 0 ? (
                <div className="text-center py-6"><Hash className="w-8 h-8 mx-auto mb-1.5 text-muted-foreground/20" /><p className="text-[10px] text-muted-foreground">No groups yet</p></div>
              ) : groups.map(g => (
                <button key={g.id} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium">{(g.name || 'G').slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0 text-left"><p className="text-xs font-medium truncate">{g.name}</p><p className="text-[9px] text-muted-foreground">{g._count?.members ?? 0} members</p></div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="p-2 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7"><AvatarImage src={session.user?.image || undefined} /><AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{getInitials(session.user?.name || null)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{session.user?.name}</p><p className="text-[9px] text-muted-foreground truncate">{session.user?.email}</p></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="p-1 hover:bg-muted rounded"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => router.push('/profile')} className="text-xs"><Settings className="w-3 h-3 mr-1.5" />Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-red-600"><LogOut className="w-3 h-3 mr-1.5" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 px-3 flex items-center gap-2 border-b bg-card shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 hover:bg-muted rounded"><Menu className="w-5 h-5" /></button>
          {selectedUser ? (
            <>
              <Avatar className="w-7 h-7"><AvatarImage src={selectedUser.image || undefined} /><AvatarFallback className="text-[9px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white">{getInitials(selectedUser.name)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{selectedUser.name}</p><p className="text-[9px] text-muted-foreground">{connectionStatus?.status === 'connected' ? 'Connected' : connectionStatus?.status === 'pending' ? 'Pending' : 'Not connected'}</p></div>
            </>
          ) : <p className="text-xs text-muted-foreground">Select a conversation</p>}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {selectedUser ? (
            <div className="max-w-xl mx-auto">
              {isLoadingConnection ? (
                <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : connectionStatus?.status === 'connected' ? (
                <div className="space-y-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8"><MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" /><p className="text-xs text-muted-foreground">Start the conversation</p></div>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === session.user?.id ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%]">
                        <div className={`px-3 py-1.5 rounded-2xl ${msg.senderId === session.user?.id ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                          {msg.type === "image" ? <img src={msg.content} alt="" className="max-w-[200px] rounded cursor-pointer" onClick={() => window.open(msg.content, "_blank")} /> : <p className="text-xs">{msg.content}</p>}
                        </div>
                        <p className={`text-[9px] text-muted-foreground mt-0.5 ${msg.senderId === session.user?.id ? "text-right" : ""}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : connectionStatus?.status === 'pending' ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium mb-1">Request Pending</p>
                  <p className="text-xs text-muted-foreground mb-3">{connectionStatus.isSender ? `Waiting for ${selectedUser.name}` : `${selectedUser.name} wants to connect`}</p>
                  {!connectionStatus.isSender && connectionStatus.requestId && (
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleRespondToRequest(connectionStatus.requestId!, 'accept')} className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded">Accept</button>
                      <button onClick={() => handleRespondToRequest(connectionStatus.requestId!, 'reject')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded">Decline</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium mb-1">Not Connected</p>
                  <p className="text-xs text-muted-foreground mb-3">Send a request to start chatting</p>
                  {connectionStatus?.canSendRequest && <button onClick={() => setShowRequestModal(true)} className="px-4 py-1.5 text-xs gradient-primary text-white rounded hover:opacity-90">Send Request</button>}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" /><p className="text-sm font-medium mb-0.5">Welcome</p><p className="text-xs text-muted-foreground">Select a conversation to start</p></div>
            </div>
          )}
        </div>

        {/* Input */}
        {selectedUser && connectionStatus?.canChat && (
          <div className="p-2 border-t bg-card">
            {imagePreview && (
              <div className="max-w-xl mx-auto mb-1.5 relative inline-block">
                <img src={imagePreview} alt="" className="h-16 rounded" />
                <button onClick={() => { setPendingImage(null); setImagePreview(null); }} className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="max-w-xl mx-auto flex gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="p-1.5 hover:bg-muted rounded disabled:opacity-50"><ImageIcon className="w-4 h-4 text-muted-foreground" /></button>
              <input ref={inputRef} type="text" placeholder={`Message ${selectedUser?.name}...`} value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 h-8 px-3 text-xs bg-muted/50 border-0 rounded-full focus:outline-none focus:ring-1 focus:ring-primary" disabled={uploadingImage} />
              <button type="submit" disabled={(!message.trim() && !pendingImage) || uploadingImage} className="w-8 h-8 gradient-primary text-white rounded-full flex items-center justify-center disabled:opacity-50">
                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modals */}
      {showRequestModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card rounded-lg p-4 max-w-xs w-full shadow-soft-lg animate-scaleIn">
            <h3 className="text-sm font-semibold mb-0.5">Send Request</h3>
            <p className="text-xs text-muted-foreground mb-3">Connect with {selectedUser.name}</p>
            <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Add a message (optional)" className="w-full p-2 text-xs bg-muted/50 border-0 rounded resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowRequestModal(false)} className="flex-1 py-1.5 text-xs border rounded hover:bg-muted">Cancel</button>
              <button onClick={handleSendRequest} className="flex-1 py-1.5 text-xs gradient-primary text-white rounded">Send</button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card rounded-lg p-4 max-w-xs w-full shadow-soft-lg animate-scaleIn">
            <h3 className="text-sm font-semibold mb-3">Create Group</h3>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" className="w-full p-2 text-xs bg-muted/50 border-0 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            <textarea value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Description (optional)" className="w-full p-2 text-xs bg-muted/50 border-0 rounded resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowCreateGroupDialog(false)} className="flex-1 py-1.5 text-xs border rounded hover:bg-muted">Cancel</button>
              <button onClick={handleCreateGroup} className="flex-1 py-1.5 text-xs gradient-primary text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
}

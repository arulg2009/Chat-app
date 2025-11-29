"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  LogOut,
  Send,
  Search,
  Menu,
  X,
  User,
  Bot,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Users,
} from "lucide-react";

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

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

type TabType = 'ai' | 'users' | 'requests';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [message, setMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [aiMessages, setAIMessages] = useState<Message[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers();
      fetchChatRequests();
      if (aiMessages.length === 0) {
        setAIMessages([
          {
            id: 'welcome',
            content: "Hello! 👋 I'm your AI assistant. I can help you with questions, provide information, write code, and much more. How can I assist you today?",
            role: 'ai',
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [status]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, chatMessages, scrollToBottom]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((u: UserType) => u.email !== session?.user?.email));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchChatRequests = async () => {
    try {
      const response = await fetch("/api/chat-requests");
      if (response.ok) {
        const data = await response.json();
        setChatRequests(data);
        const pending = data.filter(
          (r: ChatRequest) => r.status === 'pending' && r.receiverId === session?.user?.id
        );
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error("Error fetching chat requests:", error);
    }
  };

  const checkConnectionStatus = async (userId: string) => {
    setIsLoadingConnection(true);
    try {
      const response = await fetch(`/api/users/${userId}/connection`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
        
        // If connected, fetch messages
        if (data.status === 'connected' && data.conversationId) {
          fetchMessages(data.conversationId);
        }
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setIsLoadingConnection(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
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
      const response = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          message: requestMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowRequestModal(false);
        setRequestMessage("");
        await checkConnectionStatus(selectedUser.id);
        await fetchChatRequests();
        alert(`Request sent! You have ${data.remainingRequests} requests remaining for this user this year.`);
      } else {
        alert(data.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Failed to send request");
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await fetchChatRequests();
        if (selectedUser) {
          await checkConnectionStatus(selectedUser.id);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to respond to request");
      }
    } catch (error) {
      console.error("Error responding to request:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (activeTab === 'ai') {
      await handleAIMessage();
    } else if (selectedUser && connectionStatus?.canChat && connectionStatus.conversationId) {
      await handleChatMessage();
    }
  };

  const handleChatMessage = async () => {
    if (!connectionStatus?.conversationId || !message.trim()) return;

    const msgContent = message.trim();
    setMessage("");

    try {
      const response = await fetch(`/api/conversations/${connectionStatus.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setChatMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAIMessage = async () => {
    const userMessage = message.trim();
    if (!userMessage || isAILoading) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    const newUserMessage: Message = {
      id: userMsgId,
      content: userMessage,
      role: 'user',
      timestamp: new Date(),
    };

    const loadingAIMessage: Message = {
      id: aiMsgId,
      content: '',
      role: 'ai',
      timestamp: new Date(),
      isLoading: true,
    };

    setAIMessages((prev) => [...prev, newUserMessage, loadingAIMessage]);
    setMessage("");
    setIsAILoading(true);
    inputRef.current?.focus();

    try {
      const conversationHistory = aiMessages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setAIMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: data.response, isLoading: false }
            : msg
        )
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error.";
      setAIMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: errorMessage, isLoading: false }
            : msg
        )
      );
    } finally {
      setIsAILoading(false);
    }
  };

  const handleCopyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const clearAIChat = () => {
    setAIMessages([
      {
        id: 'welcome-new',
        content: "Chat cleared! How can I help you?",
        role: 'ai',
        timestamp: new Date(),
      },
    ]);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const pendingReceivedRequests = chatRequests.filter(
    (r) => r.status === 'pending' && r.receiverId === session.user?.id
  );

  const connectedUsers = chatRequests
    .filter((r) => r.status === 'accepted')
    .map((r) => r.senderId === session.user?.id ? r.receiver : r.sender);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Chat
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Current User */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <Avatar>
              <AvatarImage src={session.user?.image || undefined} />
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(session.user?.name || null)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('ai'); setSelectedUser(null); }}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'ai'
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Bot className="w-4 h-4" />
              AI
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'users'
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition relative ${
                activeTab === 'requests'
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Bell className="w-4 h-4" />
              Requests
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'ai' && (
            <div className="p-4">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Ask me anything!</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Answering questions</li>
                  <li>• Code assistance</li>
                  <li>• Creative ideas</li>
                </ul>
              </div>
              <button
                onClick={clearAIChat}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Clear conversation
              </button>
            </div>
          )}

          {activeTab === 'users' && (
            <>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input type="text" placeholder="Search users..." className="pl-10" />
                </div>
              </div>
              
              {/* Connected Users */}
              {connectedUsers.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">Connected ({connectedUsers.length})</p>
                  <div className="space-y-1">
                    {connectedUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${
                          selectedUser?.id === user.id ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="bg-green-500 text-white text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{user.name}</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Users */}
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">All Users ({users.length})</p>
              </div>
              <div className="space-y-1 px-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      selectedUser?.id === user.id ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.status === "online" ? "Online" : "Offline"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <div className="p-4 space-y-4">
              {/* Received Requests */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pending Requests</p>
                {pendingReceivedRequests.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-2">
                    {pendingReceivedRequests.map((req) => (
                      <div key={req.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={req.sender.image || undefined} />
                            <AvatarFallback className="bg-blue-500 text-white text-xs">
                              {getInitials(req.sender.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{req.sender.name}</p>
                            <p className="text-xs text-gray-500">wants to chat</p>
                          </div>
                        </div>
                        {req.message && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 italic">"{req.message}"</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondToRequest(req.id, 'accept')}
                            className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() => handleRespondToRequest(req.id, 'reject')}
                            className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500">
              <Menu className="w-6 h-6" />
            </button>
            {activeTab === 'ai' && !selectedUser ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    AI Assistant <Sparkles className="w-4 h-4 text-purple-500" />
                  </h2>
                  <p className="text-sm text-gray-500">Always ready to help</p>
                </div>
              </>
            ) : selectedUser ? (
              <>
                <Avatar>
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-500">
                    {connectionStatus?.status === 'connected' ? '✓ Connected' : 
                     connectionStatus?.status === 'pending' ? '⏳ Request pending' : 
                     'Not connected'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Select a chat</p>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {activeTab === 'ai' && !selectedUser ? (
            // AI Chat
            <div className="max-w-4xl mx-auto space-y-4">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "ai" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                        : "bg-white dark:bg-gray-800 rounded-tl-sm shadow-sm border"
                    }`}>
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${msg.role === "user" ? "text-blue-200" : "text-gray-500"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {msg.role === "ai" && (
                              <button onClick={() => handleCopyMessage(msg.content, msg.id)} className="text-gray-400 hover:text-gray-600">
                                {copiedId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : selectedUser ? (
            // User Chat
            <div className="max-w-4xl mx-auto">
              {isLoadingConnection ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : connectionStatus?.status === 'connected' ? (
                // Show messages
                <div className="space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No messages yet. Say hello!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === session.user?.id ? "justify-end" : "justify-start"}`}>
                        <div className={`rounded-2xl px-4 py-3 max-w-[70%] ${
                          msg.senderId === session.user?.id
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                            : "bg-white dark:bg-gray-800 rounded-tl-sm shadow-sm border"
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.senderId === session.user?.id ? "text-blue-200" : "text-gray-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : connectionStatus?.status === 'pending' ? (
                // Pending request
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-semibold mb-2">Request Pending</h3>
                  <p className="text-gray-500 mb-4">
                    {connectionStatus.isSender 
                      ? `Waiting for ${selectedUser.name} to accept your request.`
                      : `${selectedUser.name} wants to chat with you.`}
                  </p>
                  {!connectionStatus.isSender && connectionStatus.requestId && (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleRespondToRequest(connectionStatus.requestId!, 'accept')}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(connectionStatus.requestId!, 'reject')}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Not connected
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">Not Connected</h3>
                  <p className="text-gray-500 mb-4">
                    Send a chat request to start messaging with {selectedUser.name}.
                  </p>
                  {connectionStatus?.canSendRequest ? (
                    <>
                      <button
                        onClick={() => setShowRequestModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg flex items-center gap-2 mx-auto"
                      >
                        <UserPlus className="w-5 h-5" />
                        Send Chat Request
                      </button>
                      <p className="text-sm text-gray-400 mt-2">
                        {connectionStatus.remainingRequests} request(s) remaining this year
                      </p>
                    </>
                  ) : (
                    <p className="text-red-500">
                      You have reached the maximum of 3 requests per year for this user.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose AI or a user to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        {((activeTab === 'ai' && !selectedUser) || (selectedUser && connectionStatus?.canChat)) && (
          <div className="bg-white dark:bg-gray-800 border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
              <Input
                ref={inputRef}
                type="text"
                placeholder={activeTab === 'ai' ? "Ask AI anything..." : `Message ${selectedUser?.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={isAILoading}
              />
              <Button type="submit" size="icon" disabled={!message.trim() || isAILoading}>
                {isAILoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Send Chat Request</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Send a request to <strong>{selectedUser.name}</strong> to start chatting.
            </p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Add a message (optional)..."
              className="w-full p-3 border rounded-lg mb-4 resize-none h-24"
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}

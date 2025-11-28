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
} from "lucide-react";

interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string;
  lastSeen: Date;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIMode, setIsAIMode] = useState(true);
  const [aiMessages, setAIMessages] = useState<Message[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
  }, [status, aiMessages.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, scrollToBottom]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (isAIMode) {
      await handleAIMessage();
    } else if (selectedUser) {
      console.log("Sending message:", message, "to:", selectedUser.name);
      setMessage("");
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
        headers: {
          "Content-Type": "application/json",
        },
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
      console.error("AI chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.";
      setAIMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                content: errorMessage,
                isLoading: false,
              }
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

  if (!session) {
    return null;
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {session.user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Mode Toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setIsAIMode(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                isAIMode
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Chat
            </button>
            <button
              onClick={() => setIsAIMode(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                !isAIMode
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <User className="w-4 h-4" />
              Users
            </button>
          </div>
        </div>

        {/* Search (for users mode) */}
        {!isAIMode && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Content based on mode */}
        <div className="flex-1 overflow-y-auto">
          {isAIMode ? (
            <div className="p-4">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    AI Assistant
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ask me anything! I can help with:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Answering questions</li>
                  <li>• Writing & editing text</li>
                  <li>• Code assistance</li>
                  <li>• Creative ideas</li>
                  <li>• Problem solving</li>
                </ul>
              </div>
              <button
                onClick={clearAIChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                Clear conversation
              </button>
            </div>
          ) : (
            <>
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Users ({users.length})
                </p>
              </div>
              <div className="space-y-1 px-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      selectedUser?.id === user.id
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                          user.status === "online"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.status === "online" ? "Online" : "Offline"}
                      </p>
                    </div>
                  </button>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No users available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            {isAIMode ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    AI Assistant
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Always ready to help
                  </p>
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
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedUser.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.status === "online" ? "Online" : "Offline"}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Select a user to start chatting
              </p>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {isAIMode ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {msg.role === "ai" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-sm"
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm shadow-sm border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                          </div>
                          <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${msg.role === "user" ? "text-blue-200" : "text-gray-500"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {msg.role === "ai" && (
                              <button
                                onClick={() => handleCopyMessage(msg.content, msg.id)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                                title="Copy message"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
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
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedUser.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Start a conversation with {selectedUser.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a user or start chatting with AI
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        {(isAIMode || selectedUser) && (
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
              <Input
                ref={inputRef}
                type="text"
                placeholder={
                  isAIMode
                    ? "Ask AI anything..."
                    : `Message ${selectedUser?.name}...`
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={isAILoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || isAILoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isAILoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            {isAIMode && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                AI responses may not always be accurate. Please verify important information.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

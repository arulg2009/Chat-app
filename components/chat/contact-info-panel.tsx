"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Phone,
  Video,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  Heart,
  Circle,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  ChevronRight,
  Bell,
  BellOff,
  Ban,
  Flag,
  Trash2,
  Star,
  Lock,
  Download,
  Play,
  Mic,
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "audio" | "file";
  filename?: string;
  createdAt: string;
  sender: {
    name: string | null;
  };
}

interface ContactInfoPanelProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    status?: string;
    bio?: string | null;
    email?: string | null;
    location?: string | null;
    website?: string | null;
    occupation?: string | null;
    hobbies?: string | null;
    phone?: string | null;
    lastSeen?: string;
    createdAt?: string;
  } | null;
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onMute?: () => void;
  onBlock?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  isMuted?: boolean;
  isBlocked?: boolean;
}

export function ContactInfoPanel({
  user,
  conversationId,
  isOpen,
  onClose,
  onCall,
  onVideoCall,
  onMute,
  onBlock,
  onClearChat,
  onDeleteChat,
  isMuted = false,
  isBlocked = false,
}: ContactInfoPanelProps) {
  const [activeTab, setActiveTab] = useState("media");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchMedia();
    }
  }, [isOpen, conversationId]);

  const fetchMedia = async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/media`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data.media || []);
      }
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setLoadingMedia(false);
    }
  };

  if (!user || !isOpen) return null;

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const formatLastSeen = (lastSeen: string | undefined) => {
    if (!lastSeen) return "Unknown";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const images = media.filter(m => m.type === "image");
  const files = media.filter(m => m.type === "file");
  const links = media.filter(m => m.type === "file" && m.url.startsWith("http"));

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-0 sm:inset-auto sm:relative w-full sm:w-80 lg:w-96 bg-background border-l z-50 sm:z-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-semibold">Contact Info</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="p-6 flex flex-col items-center border-b">
            <div className="relative">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-2 right-2 w-5 h-5 ${getStatusColor(user.status || "offline")} rounded-full border-3 border-background`}
              />
            </div>

            <h3 className="mt-4 text-xl font-semibold">{user.name || "Unknown"}</h3>
            
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <Circle className={`w-2 h-2 ${getStatusColor(user.status || "offline")} rounded-full`} />
              <span className="capitalize">{user.status || "offline"}</span>
              {user.status !== "online" && user.lastSeen && (
                <span className="text-xs">• Last seen {formatLastSeen(user.lastSeen)}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-5">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={onCall}
              >
                <Phone className="w-5 h-5 text-green-600" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full"
                onClick={onVideoCall}
              >
                <Video className="w-5 h-5 text-blue-600" />
              </Button>
            </div>
          </div>

          {/* Bio Section */}
          {user.bio && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">About</h4>
              <p className="text-sm">{user.bio}</p>
            </div>
          )}

          {/* Contact Details */}
          <div className="p-4 border-b space-y-3">
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{user.phone}</p>
                  <p className="text-xs text-muted-foreground">Phone</p>
                </div>
              </div>
            )}
            {user.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Email</p>
                </div>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{user.location}</p>
                  <p className="text-xs text-muted-foreground">Location</p>
                </div>
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                  <p className="text-xs text-muted-foreground">Website</p>
                </div>
              </div>
            )}
            {user.occupation && (
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{user.occupation}</p>
                  <p className="text-xs text-muted-foreground">Work</p>
                </div>
              </div>
            )}
          </div>

          {/* Media, Docs & Links Tabs */}
          <div className="p-4 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="media" className="text-xs">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="docs" className="text-xs">
                  <FileText className="w-4 h-4 mr-1" />
                  Docs
                </TabsTrigger>
                <TabsTrigger value="links" className="text-xs">
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Links
                </TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="mt-3">
                {loadingMedia ? (
                  <div className="grid grid-cols-3 gap-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img.url)}
                        className="aspect-square relative overflow-hidden rounded hover:opacity-90 transition"
                      >
                        <img 
                          src={img.url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No media shared yet
                  </p>
                )}
              </TabsContent>

              <TabsContent value="docs" className="mt-3">
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        download
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition"
                      >
                        <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.filename || "Document"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No documents shared yet
                  </p>
                )}
              </TabsContent>

              <TabsContent value="links" className="mt-3">
                <p className="text-center text-sm text-muted-foreground py-8">
                  No links shared yet
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Hobbies */}
          {user.hobbies && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {user.hobbies.split(",").map((hobby, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {hobby.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 space-y-1">
            <button
              onClick={onMute}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition text-left"
            >
              {isMuted ? <Bell className="w-5 h-5 text-muted-foreground" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
              <span className="text-sm">{isMuted ? "Unmute notifications" : "Mute notifications"}</span>
            </button>
            
            <button
              onClick={onClearChat}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition text-left"
            >
              <Trash2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">Clear chat</span>
            </button>

            <button
              onClick={onBlock}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition text-left"
            >
              <Ban className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-500">{isBlocked ? "Unblock" : "Block"} {user.name}</span>
            </button>

            <button
              onClick={onDeleteChat}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition text-left"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-500">Delete chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          <img 
            src={selectedImage} 
            alt="" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

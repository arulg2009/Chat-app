"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  MessageSquare,
  Ban,
  Flag,
  Volume2,
  VolumeX,
} from "lucide-react";

interface UserProfileDialogProps {
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
    lastSeen?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onMute?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  isMuted?: boolean;
  isBlocked?: boolean;
}

export function UserProfileDialog({
  user,
  isOpen,
  onClose,
  onMessage,
  onCall,
  onVideoCall,
  onMute,
  onBlock,
  onReport,
  isMuted = false,
  isBlocked = false,
}: UserProfileDialogProps) {
  if (!user) return null;

  const getInitials = (name: string | null) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      default:
        return "bg-gray-400";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Profile info */}
        <div className="relative px-4 pb-4 -mt-12">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-1 right-1 w-5 h-5 ${getStatusColor(
                  user.status || "offline"
                )} rounded-full border-3 border-background`}
              />
            </div>

            <h2 className="mt-3 text-xl font-semibold">{user.name || "Unknown"}</h2>

            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <Circle
                className={`w-2.5 h-2.5 ${getStatusColor(user.status || "offline")} rounded-full`}
              />
              <span className="capitalize">{user.status || "offline"}</span>
              {user.status !== "online" && user.lastSeen && (
                <span className="text-xs">• {formatLastSeen(user.lastSeen)}</span>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-4">
              {onMessage && (
                <Button variant="outline" size="sm" onClick={onMessage} className="gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Button>
              )}
              {onCall && (
                <Button variant="outline" size="icon" onClick={onCall}>
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              {onVideoCall && (
                <Button variant="outline" size="icon" onClick={onVideoCall}>
                  <Video className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mt-5 p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-center text-muted-foreground">{user.bio}</p>
            </div>
          )}

          {/* Profile details */}
          <div className="mt-4 space-y-2.5">
            {user.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {user.occupation && (
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span>{user.occupation}</span>
              </div>
            )}
            {user.hobbies && (
              <div className="flex items-center gap-3 text-sm">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {user.hobbies.split(",").map((hobby, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {hobby.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 pt-4 border-t space-y-2">
            {onMute && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={onMute}
              >
                {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isMuted ? "Unmute notifications" : "Mute notifications"}
              </Button>
            )}
            {onBlock && (
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  isBlocked
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                }`}
                onClick={onBlock}
              >
                <Ban className="w-4 h-4" />
                {isBlocked ? "Unblock contact" : "Block contact"}
              </Button>
            )}
            {onReport && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={onReport}
              >
                <Flag className="w-4 h-4" />
                Report contact
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

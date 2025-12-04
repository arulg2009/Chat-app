"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MoreVertical,
  MessageSquare,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallScreenProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  callType: "voice" | "video";
  isIncoming?: boolean;
  onEnd: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CallScreen({
  user,
  callType,
  isIncoming = false,
  onEnd,
  onAccept,
  onDecline,
}: CallScreenProps) {
  const [callStatus, setCallStatus] = useState<"ringing" | "connecting" | "connected" | "ended">(
    isIncoming ? "ringing" : "connecting"
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simulate call connection after 2 seconds if outgoing
    if (!isIncoming && callStatus === "connecting") {
      const timeout = setTimeout(() => {
        setCallStatus("connected");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isIncoming, callStatus]);

  useEffect(() => {
    // Start timer when connected
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  const handleEndCall = () => {
    setCallStatus("ended");
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(onEnd, 500);
  };

  const handleAccept = () => {
    setCallStatus("connecting");
    setTimeout(() => setCallStatus("connected"), 1000);
    onAccept?.();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col",
        callType === "video"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
      )}
    >
      {/* Video Background (for video calls) */}
      {callType === "video" && isVideoOn && (
        <div className="absolute inset-0 bg-gray-800">
          {/* Remote video would go here */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar className="w-32 h-32">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* Local video preview */}
          <div className="absolute bottom-32 right-4 w-28 h-40 bg-gray-700 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEndCall}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          {callType === "video" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        {callType === "voice" && (
          <>
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-white/20 text-white text-4xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {callStatus === "connected" && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-white">{user.name}</h2>
          </>
        )}

        {callType === "video" && !isVideoOn && (
          <>
            <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-4xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-6 text-2xl font-semibold text-white">{user.name}</h2>
          </>
        )}

        {/* Call Status */}
        <p className="mt-2 text-white/80">
          {callStatus === "ringing" && (isIncoming ? "Incoming call..." : "Calling...")}
          {callStatus === "connecting" && "Connecting..."}
          {callStatus === "connected" && formatDuration(duration)}
          {callStatus === "ended" && "Call ended"}
        </p>

        {/* Ringing Animation */}
        {(callStatus === "ringing" || callStatus === "connecting") && (
          <div className="mt-8 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
              <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="relative w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Phone className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-safe z-10">
        {/* Incoming Call Controls */}
        {isIncoming && callStatus === "ringing" && (
          <div className="flex items-center justify-center gap-8">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
              onClick={() => {
                onDecline?.();
                handleEndCall();
              }}
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </Button>
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
              onClick={handleAccept}
            >
              {callType === "video" ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </Button>
          </div>
        )}

        {/* Active Call Controls */}
        {(callStatus === "connecting" || callStatus === "connected") && (
          <div className="space-y-6">
            {/* Secondary Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "w-14 h-14 rounded-full",
                  isMuted ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              
              {callType === "video" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={cn(
                    "w-14 h-14 rounded-full",
                    !isVideoOn ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  "w-14 h-14 rounded-full",
                  isSpeakerOn ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
            </div>

            {/* End Call Button */}
            <div className="flex justify-center">
              <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Encryption Notice */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10">
        <p className="text-xs text-white/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

// Incoming Call Notification Component
export function IncomingCallNotification({
  user,
  callType,
  onAccept,
  onDecline,
}: {
  user: { name: string | null; image: string | null };
  callType: "voice" | "video";
  onAccept: () => void;
  onDecline: () => void;
}) {
  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top duration-300">
      <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl border border-white/10">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{user.name}</p>
            <p className="text-sm text-gray-400">
              Incoming {callType} call...
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
              onClick={onDecline}
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </Button>
            <Button
              size="icon"
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {callType === "video" ? (
                <Video className="w-5 h-5 text-white" />
              ) : (
                <Phone className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

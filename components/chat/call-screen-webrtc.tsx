"use client";

import { useEffect, useRef } from "react";
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
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebRTC, CallStatus, Call } from "@/lib/use-webrtc";

interface CallUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface CallScreenProps {
  user: CallUser;
  callType: "audio" | "video";
  onEnd: () => void;
}

interface IncomingCallProps {
  call: Call;
  onAnswer: () => void;
  onReject: () => void;
}

export function CallScreen({ user, callType, onEnd }: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const {
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    error,
    initiateCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useWebRTC({
    onCallEnded: onEnd,
    onError: (err) => console.error("Call error:", err),
  });

  // Start the call when component mounts
  useEffect(() => {
    initiateCall(user.id, callType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video/audio element
  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  const getStatusText = (status: CallStatus) => {
    switch (status) {
      case "requesting-media":
        return "Requesting camera/microphone access...";
      case "initiating":
        return "Initiating call...";
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return formatDuration(callDuration);
      case "ended":
        return "Call ended";
      case "error":
        return error || "Call failed";
      default:
        return "";
    }
  };

  const handleEndCall = () => {
    endCall();
  };

  const isCallActive = callStatus !== "idle" && callStatus !== "ended" && callStatus !== "error";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col",
        callType === "video"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
      )}
    >
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Video Background (for video calls) */}
      {callType === "video" && (
        <div className="absolute inset-0 bg-gray-800">
          {/* Remote video */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local video preview */}
          <div className="absolute bottom-32 right-4 w-28 h-40 bg-gray-700 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-gray-400" />
              </div>
            )}
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
        <div className="px-3 py-1 rounded-full bg-black/30 text-white text-sm">
          {callType === "video" ? "Video Call" : "Voice Call"}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        {callType === "audio" && (
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

        {callType === "video" && !remoteStream && (
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
        <div className="mt-2 flex items-center gap-2 text-white/80">
          {(callStatus === "requesting-media" || callStatus === "initiating" || callStatus === "connecting") && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <p>{getStatusText(callStatus)}</p>
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-red-300 text-sm max-w-xs text-center">{error}</p>
        )}

        {/* Ringing Animation */}
        {callStatus === "ringing" && (
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
        {isCallActive && (
          <div className="space-y-6">
            {/* Secondary Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={cn(
                  "w-14 h-14 rounded-full transition-all",
                  isMuted ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              {callType === "video" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={cn(
                    "w-14 h-14 rounded-full transition-all",
                    isVideoOff ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSpeaker}
                className={cn(
                  "w-14 h-14 rounded-full transition-all",
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
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-transform active:scale-95"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </Button>
            </div>
          </div>
        )}

        {/* Call Ended / Error State */}
        {(callStatus === "ended" || callStatus === "error") && (
          <div className="flex justify-center">
            <Button
              className="px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white"
              onClick={onEnd}
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Encryption Notice */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <p className="text-xs text-white/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

// Incoming call notification component
export function IncomingCallNotification({ call, onAnswer, onReject }: IncomingCallProps) {
  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  return (
    <div className="fixed top-4 left-4 right-4 z-[101] animate-in slide-in-from-top duration-300">
      <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl border border-white/10 mx-auto max-w-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-14 h-14">
              <AvatarImage src={call.initiator.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {getInitials(call.initiator.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              {call.type === "video" ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <Phone className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{call.initiator.name}</h3>
            <p className="text-white/60 text-sm">
              Incoming {call.type} call...
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
            onClick={onReject}
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </Button>
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600"
            onClick={onAnswer}
          >
            {call.type === "video" ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <Phone className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that handles incoming calls
interface ActiveCallScreenProps {
  call: Call;
  isIncoming: boolean;
  onEnd: () => void;
}

export function ActiveCallScreen({ call, isIncoming, onEnd }: ActiveCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const {
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    error,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useWebRTC({
    onCallEnded: onEnd,
    onError: (err) => console.error("Call error:", err),
  });

  const otherUser = isIncoming ? call.initiator : call.receiver;
  const callType = call.type as "audio" | "video";

  // Answer call if this is incoming and user accepted
  const handleAnswer = () => {
    answerCall(call);
  };

  const handleReject = () => {
    rejectCall(call.id);
    onEnd();
  };

  // Attach local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video/audio element
  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  const getStatusText = () => {
    if (isIncoming && callStatus === "idle") return "Incoming call...";
    switch (callStatus) {
      case "requesting-media":
        return "Requesting camera/microphone access...";
      case "initiating":
        return "Initiating call...";
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return formatDuration(callDuration);
      case "ended":
        return "Call ended";
      case "error":
        return error || "Call failed";
      default:
        return "";
    }
  };

  const isCallActive = callStatus !== "idle" && callStatus !== "ended" && callStatus !== "error";
  const showIncomingUI = isIncoming && callStatus === "idle";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col",
        callType === "video"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
      )}
    >
      {/* Hidden audio element for voice calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Video Background (for video calls) */}
      {callType === "video" && (
        <div className="absolute inset-0 bg-gray-800">
          {/* Remote video */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={otherUser.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                  {getInitials(otherUser.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local video preview */}
          {localStream && (
            <div className="absolute bottom-32 right-4 w-28 h-40 bg-gray-700 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
              {!isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            endCall();
          }}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="px-3 py-1 rounded-full bg-black/30 text-white text-sm">
          {callType === "video" ? "Video Call" : "Voice Call"}
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        {(callType === "audio" || !remoteStream) && (
          <>
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={otherUser.image || undefined} />
                <AvatarFallback className="bg-white/20 text-white text-4xl">
                  {getInitials(otherUser.name)}
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
            <h2 className="mt-6 text-2xl font-semibold text-white">{otherUser.name}</h2>
          </>
        )}

        {/* Call Status */}
        <div className="mt-2 flex items-center gap-2 text-white/80">
          {(callStatus === "requesting-media" || callStatus === "initiating" || callStatus === "connecting") && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <p>{getStatusText()}</p>
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-red-300 text-sm max-w-xs text-center">{error}</p>
        )}

        {/* Ringing Animation */}
        {(showIncomingUI || callStatus === "ringing") && (
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
        {showIncomingUI && (
          <div className="flex items-center justify-center gap-8">
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
              onClick={handleReject}
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </Button>
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
              onClick={handleAnswer}
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
        {isCallActive && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={cn(
                  "w-14 h-14 rounded-full transition-all",
                  isMuted ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              {callType === "video" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={cn(
                    "w-14 h-14 rounded-full transition-all",
                    isVideoOff ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSpeaker}
                className={cn(
                  "w-14 h-14 rounded-full transition-all",
                  isSpeakerOn ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
            </div>

            <div className="flex justify-center">
              <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
                onClick={() => endCall()}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </Button>
            </div>
          </div>
        )}

        {/* Call Ended / Error State */}
        {(callStatus === "ended" || callStatus === "error") && (
          <div className="flex justify-center">
            <Button
              className="px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white"
              onClick={onEnd}
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Encryption Notice */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <p className="text-xs text-white/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

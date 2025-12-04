"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface CallUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Call {
  id: string;
  initiatorId: string;
  receiverId: string;
  type: "audio" | "video";
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  metadata: {
    offer: RTCSessionDescriptionInit | null;
    answer: RTCSessionDescriptionInit | null;
    iceCandidates: {
      initiator: RTCIceCandidateInit[];
      receiver: RTCIceCandidateInit[];
    };
  };
  initiator: CallUser;
  receiver: CallUser;
}

interface UseWebRTCOptions {
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

// Free TURN/STUN servers - for production, use your own servers
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // OpenRelay TURN servers (free tier)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type CallStatus =
  | "idle"
  | "requesting-media"
  | "initiating"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const { onCallEnded, onError } = options;

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);
  const processedCandidatesRef = useRef<Set<string>>(new Set());

  // Clean up function
  const cleanup = useCallback(() => {
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    setCallDuration(0);
    setError(null);
    pendingIceCandidatesRef.current = [];
    processedCandidatesRef.current.clear();
  }, [localStream]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentCall) {
        try {
          await fetch(`/api/calls/${currentCall.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ice-candidate",
              iceCandidate: event.candidate.toJSON(),
            }),
          });
        } catch (err) {
          console.error("Error sending ICE candidate:", err);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected") {
        setCallStatus("connected");
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        setError("Connection lost");
        setCallStatus("error");
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentCall]);

  // Get user media
  const getUserMedia = useCallback(async (callType: "audio" | "video") => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error getting user media:", err);
      throw new Error("Could not access camera/microphone. Please grant permission.");
    }
  }, []);

  // Poll for call updates
  const pollCallStatus = useCallback(async (callId: string) => {
    try {
      const res = await fetch(`/api/calls/${callId}`);
      if (!res.ok) return;

      const data = await res.json();
      const call = data.call as Call;

      if (!call) return;

      setCurrentCall(call);

      // Handle call status changes
      if (call.status === "ended" || call.status === "rejected" || call.status === "cancelled") {
        setCallStatus("ended");
        cleanup();
        onCallEnded?.();
        return;
      }

      // Handle signaling data
      const pc = peerConnectionRef.current;
      if (!pc) return;

      const metadata = call.metadata;

      // If we're the initiator and got an answer
      if (isInitiatorRef.current && metadata?.answer && pc.remoteDescription === null) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(metadata.answer));
          console.log("Set remote description (answer)");
          
          // Process any pending ICE candidates
          for (const candidate of pendingIceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingIceCandidatesRef.current = [];
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }

      // If we're the receiver and got an offer
      if (!isInitiatorRef.current && metadata?.offer && pc.remoteDescription === null) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(metadata.offer));
          console.log("Set remote description (offer)");

          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await fetch(`/api/calls/${callId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "answer",
              answer: answer,
            }),
          });

          console.log("Sent answer");
          setCallStatus("connecting");
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      }

      // Process ICE candidates from the other party
      const otherCandidates = isInitiatorRef.current
        ? metadata?.iceCandidates?.receiver || []
        : metadata?.iceCandidates?.initiator || [];

      for (const candidate of otherCandidates) {
        const candidateKey = JSON.stringify(candidate);
        if (processedCandidatesRef.current.has(candidateKey)) continue;
        processedCandidatesRef.current.add(candidateKey);

        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added ICE candidate");
          } else {
            pendingIceCandidatesRef.current.push(candidate);
          }
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    } catch (err) {
      console.error("Error polling call status:", err);
    }
  }, [cleanup, onCallEnded]);

  // Initiate a call
  const initiateCall = useCallback(
    async (receiverId: string, callType: "audio" | "video") => {
      try {
        setCallStatus("requesting-media");
        setError(null);
        isInitiatorRef.current = true;

        // Get user media first
        const stream = await getUserMedia(callType);

        setCallStatus("initiating");

        // Create the call on the server
        const res = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiverId, type: callType }),
        });

        if (!res.ok) {
          throw new Error("Failed to initiate call");
        }

        const data = await res.json();
        const call = data.call as Call;
        setCurrentCall(call);

        // Create peer connection
        const pc = createPeerConnection();

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await fetch(`/api/calls/${call.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "offer",
            offer: offer,
          }),
        });

        console.log("Sent offer");
        setCallStatus("ringing");

        // Start polling for call updates
        pollingIntervalRef.current = setInterval(() => {
          pollCallStatus(call.id);
        }, 1000);
      } catch (err: any) {
        console.error("Error initiating call:", err);
        setError(err.message || "Failed to initiate call");
        setCallStatus("error");
        cleanup();
        onError?.(err.message);
      }
    },
    [getUserMedia, createPeerConnection, pollCallStatus, cleanup, onError]
  );

  // Answer an incoming call
  const answerCall = useCallback(
    async (call: Call) => {
      try {
        setCallStatus("requesting-media");
        setError(null);
        isInitiatorRef.current = false;
        setCurrentCall(call);

        // Get user media
        const stream = await getUserMedia(call.type as "audio" | "video");

        setCallStatus("connecting");

        // Accept the call on the server
        await fetch(`/api/calls/${call.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });

        // Create peer connection
        const pc = createPeerConnection();

        // Add local tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Start polling for signaling data
        pollingIntervalRef.current = setInterval(() => {
          pollCallStatus(call.id);
        }, 1000);

        // Trigger immediate poll to get the offer
        pollCallStatus(call.id);
      } catch (err: any) {
        console.error("Error answering call:", err);
        setError(err.message || "Failed to answer call");
        setCallStatus("error");
        cleanup();
        onError?.(err.message);
      }
    },
    [getUserMedia, createPeerConnection, pollCallStatus, cleanup, onError]
  );

  // Reject an incoming call
  const rejectCall = useCallback(async (callId: string) => {
    try {
      await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      cleanup();
    } catch (err) {
      console.error("Error rejecting call:", err);
    }
  }, [cleanup]);

  // End the current call
  const endCall = useCallback(async () => {
    try {
      if (currentCall) {
        await fetch(`/api/calls/${currentCall.id}`, {
          method: "DELETE",
        });
      }
      setCallStatus("ended");
      cleanup();
      onCallEnded?.();
    } catch (err) {
      console.error("Error ending call:", err);
      cleanup();
    }
  }, [currentCall, cleanup, onCallEnded]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle speaker (only affects UI, actual implementation depends on platform)
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // Start duration timer when connected
  useEffect(() => {
    if (callStatus === "connected") {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // State
    callStatus,
    currentCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    error,
    isInitiator: isInitiatorRef.current,

    // Actions
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    cleanup,
  };
}

export type { Call, CallUser };

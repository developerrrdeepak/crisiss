"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface UseVideoRelayOptions {
  sendVideo: boolean;
  sendAudio?: boolean;
  autoStart?: boolean;
}

interface RemoteVideoStream {
  id: string;
  stream: MediaStream;
}

export function useVideoRelay(
  socket: Socket | null,
  channelId: string,
  options: UseVideoRelayOptions
) {
  const { sendVideo, sendAudio = false, autoStart = false } = options;
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteVideoStream[]>([]);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const shouldKeepStreamRef = useRef(autoStart);

  const stopBroadcast = useCallback(() => {
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setIsBroadcasting(false);
    shouldKeepStreamRef.current = false;
  }, [localStream]);

  const startBroadcast = useCallback(async () => {
    if (localStream) {
      setIsBroadcasting(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: sendVideo,
        audio: sendAudio,
      });

      setLocalStream(stream);
      setIsBroadcasting(true);
      shouldKeepStreamRef.current = true;

      Object.values(peerConnectionsRef.current).forEach((pc) => {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });
    } catch (error) {
      console.error("Camera access denied", error);
      shouldKeepStreamRef.current = false;
    }
  }, [localStream, sendAudio, sendVideo]);

  const createPeerConnection = useCallback(
    (userId: string) => {
      const config = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };
      const pc = new RTCPeerConnection(config);
      peerConnectionsRef.current[userId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("webrtc-ice-candidate", { target: userId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        setRemoteStreams((current) => {
          const next = current.filter((entry) => entry.id !== userId);
          next.push({ id: userId, stream });
          return next;
        });
      };

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      return pc;
    },
    [localStream, socket]
  );

  useEffect(() => {
    if (!socket || !channelId) return;

    socket.emit("join-radio-channel", channelId);

    const handleUserJoined = async (userId: string) => {
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { target: userId, sdp: pc.localDescription });
    };

    const handleOffer = async ({
      sdp,
      callerId,
    }: {
      sdp: RTCSessionDescriptionInit;
      callerId: string;
    }) => {
      const pc = createPeerConnection(callerId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { target: callerId, sdp: pc.localDescription });
    };

    const handleAnswer = async ({
      sdp,
      answererId,
    }: {
      sdp: RTCSessionDescriptionInit;
      answererId: string;
    }) => {
      const pc = peerConnectionsRef.current[answererId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    };

    const handleCandidate = async ({
      candidate,
      senderId,
    }: {
      candidate: RTCIceCandidateInit;
      senderId: string;
    }) => {
      const pc = peerConnectionsRef.current[senderId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on("user-joined-radio", handleUserJoined);
    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleCandidate);

    return () => {
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      setRemoteStreams([]);
      socket.off("user-joined-radio", handleUserJoined);
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleCandidate);
    };
  }, [channelId, createPeerConnection, socket]);

  useEffect(() => {
    if (autoStart) {
      void startBroadcast();
    }

    return () => {
      if (!shouldKeepStreamRef.current) return;
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [autoStart, localStream, startBroadcast]);

  return {
    isBroadcasting,
    localStream,
    remoteStreams,
    startBroadcast,
    stopBroadcast,
  };
}

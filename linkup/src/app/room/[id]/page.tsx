"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, 
  FiCopy, FiShare2, FiUsers, FiClock, FiSettings,
  FiMessageSquare, FiSend, FiX
} from "react-icons/fi";
import PreJoinScreen from "@/components/PreJoinScreen";

interface RoomDetails {
  id: string;
  name: string;
  maxParticipants: number;
  participantCount: number;
  settings: {
    allowChat: boolean;
    allowScreenShare: boolean;
    waitingRoom: boolean;
  };
  hasPassword?: boolean;
}

interface Peer {
  socketId: string;
  name: string;
  stream?: MediaStream;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

interface ChatMessage {
  id: string;
  senderName: string;
  message: string;
  timestamp: number;
  isSystem: boolean;
}

interface RemoteVideoProps {
  stream: MediaStream;
  muted?: boolean;
}

function RemoteVideo({ stream, muted = false }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-cover"
    />
  );
}

export default function RoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const roomId = params.id;

  // App & Room state
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // User media states
  const [userName, setUserName] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Connection states
  const [peers, setPeers] = useState<Peer[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pcsRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch Room Info on Mount
  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to load room details.");
        } else {
          setRoom(data.room);
        }
      } catch {
        setError("Network error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomId]);

  // Set local video stream once joined and stream is available
  useEffect(() => {
    if (joined && localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [joined, localStream]);

  // Cleanup media stream and WebRTC connections on leave/unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      
      // Close all peer connections cleanly
      Object.values(pcsRef.current).forEach((pc) => {
        pc.close();
      });
      pcsRef.current = {};

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [localStream]);

  const handleJoin = async (name: string, audio: boolean, video: boolean) => {
    setUserName(name);
    setAudioEnabled(audio);
    setVideoEnabled(video);

    let stream: MediaStream | null = null;
    try {
      // Access real devices
      stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: audio,
      });
      setLocalStream(stream);
      setJoined(true);
    } catch (err) {
      console.error("Accessing media devices failed on join:", err);
      // Fallback: join without stream
      setJoined(true);
    }

    try {
      // Initialize Socket connection
      await fetch("/api/socket");

      const socket = io({
        path: "/api/socket",
        autoConnect: true,
      });

      socketRef.current = socket;

      // Helper function to create/configure an RTCPeerConnection for a remote peer
      const createPeerConnection = (peerSocketId: string, peerName: string, isInitiator: boolean) => {
        if (pcsRef.current[peerSocketId]) {
          pcsRef.current[peerSocketId].close();
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
          ]
        });

        pcsRef.current[peerSocketId] = pc;

        // Add local stream tracks to this peer connection
        if (stream) {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream!);
          });
        }

        // On ICE Candidate gathering
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("signal", {
              targetSocketId: peerSocketId,
              signal: {
                type: "candidate",
                candidate: event.candidate
              }
            });
          }
        };

        // On receiving remote media track
        pc.ontrack = (event) => {
          console.log(`Received remote track from peer ${peerName} (${peerSocketId}):`, event.streams[0]);
          const remoteStream = event.streams[0];
          setPeers((prev) => 
            prev.map((p) => {
              if (p.socketId === peerSocketId) {
                return { ...p, stream: remoteStream };
              }
              return p;
            })
          );
        };

        // If this client is the initiator, create the SDP offer
        if (isInitiator) {
          pc.onnegotiationneeded = async () => {
            try {
              console.log(`Creating WebRTC SDP offer for ${peerName}`);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("signal", {
                targetSocketId: peerSocketId,
                signal: {
                  type: "offer",
                  sdp: offer.sdp,
                  senderName: name,
                  audioEnabled: audio,
                  videoEnabled: video
                }
              });
            } catch (err) {
              console.error("Error creating WebRTC offer:", err);
            }
          };
        }

        return pc;
      };

      socket.on("connect", () => {
        console.log("Connected to signaling server with ID:", socket.id);
        socket.emit("room:join", { roomId, userId: socket.id, name });
      });

      // Existing client receives room:joined for the newly connected client
      socket.on("room:joined", (peerInfo: { userId: string; name: string; socketId: string }) => {
        console.log("New peer joined room:", peerInfo);
        
        // Add peer to React UI state
        setPeers((prev) => {
          if (prev.some((p) => p.socketId === peerInfo.socketId)) return prev;
          return [...prev, { 
            socketId: peerInfo.socketId, 
            name: peerInfo.name,
            audioEnabled: true,
            videoEnabled: true
          }];
        });

        // System notification in chat
        setMessages((prev) => [...prev, {
          id: `sys-join-${Date.now()}`,
          senderName: peerInfo.name,
          message: `${peerInfo.name} joined the room`,
          timestamp: Date.now(),
          isSystem: true
        }]);

        // Initialize connection. We are the initiator.
        createPeerConnection(peerInfo.socketId, peerInfo.name, true);
      });

      // Relay WebRTC signaling handshake signals (Offer, Answer, ICE)
      socket.on("signal", async ({ senderSocketId, signal }) => {
        let pc = pcsRef.current[senderSocketId];

        if (signal.type === "offer") {
          console.log(`Received WebRTC offer from peer: ${signal.senderName}`);

          // Register peer in React UI state
          setPeers((prev) => {
            if (prev.some((p) => p.socketId === senderSocketId)) {
              return prev.map((p) => {
                if (p.socketId === senderSocketId) {
                  return {
                    ...p,
                    name: signal.senderName || p.name,
                    audioEnabled: signal.audioEnabled !== undefined ? signal.audioEnabled : p.audioEnabled,
                    videoEnabled: signal.videoEnabled !== undefined ? signal.videoEnabled : p.videoEnabled
                  };
                }
                return p;
              });
            }
            return [...prev, {
              socketId: senderSocketId,
              name: signal.senderName || "Companion",
              audioEnabled: signal.audioEnabled !== undefined ? signal.audioEnabled : true,
              videoEnabled: signal.videoEnabled !== undefined ? signal.videoEnabled : true
            }];
          });

          // Create RTCPeerConnection as receiver (initiator = false)
          pc = createPeerConnection(senderSocketId, signal.senderName || "Companion", false);
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            socket.emit("signal", {
              targetSocketId: senderSocketId,
              signal: {
                type: "answer",
                sdp: answer.sdp,
                senderName: name,
                audioEnabled: audio,
                videoEnabled: video
              }
            });
          } catch (err) {
            console.error("Failed to process offer and create answer:", err);
          }
        } 
        else if (signal.type === "answer") {
          console.log(`Received WebRTC answer from peer: ${signal.senderName}`);
          if (pc) {
            try {
              setPeers((prev) =>
                prev.map((p) => {
                  if (p.socketId === senderSocketId) {
                    return {
                      ...p,
                      name: signal.senderName || p.name,
                      audioEnabled: signal.audioEnabled !== undefined ? signal.audioEnabled : p.audioEnabled,
                      videoEnabled: signal.videoEnabled !== undefined ? signal.videoEnabled : p.videoEnabled
                    };
                  }
                  return p;
                })
              );
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
            } catch (err) {
              console.error("Failed to set remote description from WebRTC answer:", err);
            }
          }
        } 
        else if (signal.type === "candidate") {
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.error("Failed to add WebRTC ICE candidate:", err);
            }
          }
        }
        else if (signal.type === "status") {
          console.log(`Received state status update from peer (${senderSocketId}):`, signal);
          setPeers((prev) =>
            prev.map((p) => {
              if (p.socketId === senderSocketId) {
                return {
                  ...p,
                  audioEnabled: signal.audioEnabled !== undefined ? signal.audioEnabled : p.audioEnabled,
                  videoEnabled: signal.videoEnabled !== undefined ? signal.videoEnabled : p.videoEnabled
                };
              }
              return p;
            })
          );
        }
      });

      socket.on("room:left", (peerInfo: { userId?: string; socketId: string }) => {
        console.log("Peer left room:", peerInfo);
        
        // Close and cleanup RTCPeerConnection instance
        if (pcsRef.current[peerInfo.socketId]) {
          pcsRef.current[peerInfo.socketId].close();
          delete pcsRef.current[peerInfo.socketId];
        }

        // Find peer name for system notification before removing
        setPeers((prev) => {
          const leavingPeer = prev.find((p) => p.socketId === peerInfo.socketId);
          if (leavingPeer) {
            setMessages((msgs) => [...msgs, {
              id: `sys-leave-${Date.now()}`,
              senderName: leavingPeer.name,
              message: `${leavingPeer.name} left the room`,
              timestamp: Date.now(),
              isSystem: true
            }]);
          }
          return prev.filter((p) => p.socketId !== peerInfo.socketId);
        });
      });

      // Listen for incoming chat messages
      socket.on("chat:message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
        setShowChat((isOpen) => {
          if (!isOpen) setUnreadCount((c) => c + 1);
          return isOpen;
        });
      });

    } catch (err) {
      console.error("Accessing media devices failed on join:", err);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextState = audioTrack.enabled;
        setAudioEnabled(nextState);

        // Broadcast mic status change to all active peer connections
        Object.keys(pcsRef.current).forEach((peerSocketId) => {
          socketRef.current?.emit("signal", {
            targetSocketId: peerSocketId,
            signal: {
              type: "status",
              audioEnabled: nextState,
              videoEnabled: videoEnabled
            }
          });
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const nextState = videoTrack.enabled;
        setVideoEnabled(nextState);

        // Broadcast video status change to all active peer connections
        Object.keys(pcsRef.current).forEach((peerSocketId) => {
          socketRef.current?.emit("signal", {
            targetSocketId: peerSocketId,
            signal: {
              type: "status",
              audioEnabled: audioEnabled,
              videoEnabled: nextState
            }
          });
        });
      }
    }
  };

  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    // Close all connections cleanly
    Object.values(pcsRef.current).forEach((pc) => {
      pc.close();
    });
    pcsRef.current = {};

    if (socketRef.current) {
      socketRef.current.emit("room:leave", { roomId, userId: socketRef.current.id });
      socketRef.current.disconnect();
    }
    router.push("/");
  };

  const copyRoomUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    const msg: ChatMessage = {
      id: `${socketRef.current.id}-${Date.now()}`,
      senderName: userName,
      message: newMessage.trim(),
      timestamp: Date.now(),
      isSystem: false
    };

    socketRef.current.emit("chat:message", {
      roomId,
      message: msg.message,
      senderName: msg.senderName,
      timestamp: msg.timestamp
    });

    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const toggleChat = () => {
    setShowChat((prev) => !prev);
    setUnreadCount(0);
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-muted-foreground font-medium animate-pulse">Entering secure channel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        <div className="relative z-10 max-w-md w-full glass rounded-3xl p-8 border border-border/50 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <FiPhoneOff size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Failed to join</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Return to Landing
          </button>
        </div>
      </div>
    );
  }

  if (!joined && room) {
    return <PreJoinScreen roomName={room.name} onJoin={handleJoin} />;
  }

  // Auto-resize grid layouts based on participant count
  const totalCount = peers.length + 1;
  const gridCols = totalCount === 1 
    ? "grid-cols-1" 
    : totalCount === 2 
    ? "grid-cols-1 md:grid-cols-2" 
    : totalCount === 3 
    ? "grid-cols-2 md:grid-cols-3" 
    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="min-h-screen flex bg-black text-white overflow-hidden p-4">
    <div className={`flex-1 flex flex-col justify-between transition-all duration-300 ${showChat ? 'md:mr-[380px]' : ''}`}>
      {/* Top Meeting Info Bar */}
      <div className="flex items-center justify-between z-10 glass border border-white/10 px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="font-semibold tracking-tight">{room?.name}</span>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full flex items-center space-x-1 font-mono">
            <FiUsers size={12} className="mr-1" />
            {totalCount}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={copyRoomUrl}
            className="p-2 hover:bg-white/10 rounded-lg transition duration-200 flex items-center space-x-1 text-sm font-medium border border-white/5"
            aria-label="Copy Room URL"
          >
            <FiCopy size={16} />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className="p-2 hover:bg-white/10 rounded-lg transition duration-200 flex items-center space-x-1 text-sm font-medium border border-white/5"
            aria-label="Share QR Code"
          >
            <FiShare2 size={16} />
            <span>QR</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Grid View */}
      <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
        <div className={`w-full h-full max-w-6xl grid ${gridCols} gap-4 auto-rows-fr`}>
          {/* Local Stream view */}
          <div className="relative bg-zinc-900/60 rounded-3xl overflow-hidden border border-white/10 group shadow-lg">
            {videoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-3">
                  <FiVideoOff size={32} />
                </div>
                <span className="font-semibold text-lg">{userName} (You)</span>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5">
              <span className="text-xs font-semibold">{userName} (You)</span>
              {!audioEnabled && (
                <FiMicOff size={12} className="text-destructive animate-pulse" />
              )}
              {!videoEnabled && (
                <FiVideoOff size={12} className="text-destructive animate-pulse" />
              )}
            </div>
          </div>

          {/* Connected WebRTC Mesh peers view */}
          {peers.length > 0 ? (
            peers.map((peer) => (
              <div key={peer.socketId} className="relative bg-zinc-900/60 rounded-3xl overflow-hidden border border-white/10 group shadow-lg">
                {peer.videoEnabled !== false && peer.stream ? (
                  <RemoteVideo stream={peer.stream} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                      <FiVideoOff size={32} />
                    </div>
                    <span className="font-semibold text-lg">{peer.name}</span>
                    {peer.audioEnabled === false && (
                      <span className="text-xs text-red-500 font-semibold mt-1 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center">
                        <FiMicOff size={10} className="mr-1" /> Muted
                      </span>
                    )}
                  </div>
                )}
                {/* Peer Audio and Video off overlay status icons */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5">
                  <span className="text-xs font-semibold">{peer.name}</span>
                  {peer.audioEnabled === false && (
                    <FiMicOff size={12} className="text-destructive animate-pulse" />
                  )}
                  {peer.videoEnabled === false && (
                    <FiVideoOff size={12} className="text-destructive animate-pulse" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="relative bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 flex flex-col items-center justify-center text-center p-6 min-h-[300px]">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <FiUsers size={28} className="text-zinc-600" />
              </div>
              <h3 className="font-bold text-xl mb-1 text-zinc-300">Waiting for companions...</h3>
              <p className="text-zinc-500 text-sm max-w-sm">
                Share this room link with your friends to start your encrypted call!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Media & Action Control Bar */}
      <div className="flex items-center justify-between z-10 glass border border-white/10 px-8 py-4 rounded-2xl bg-black/40 backdrop-blur-xl">
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <FiClock size={14} />
          <span>Room lifetime is limited</span>
        </div>

        <div className="flex items-center space-x-4 mx-auto md:mx-0">
          <button
            onClick={toggleMic}
            className={`p-4 rounded-2xl transition duration-300 ${
              audioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
            }`}
            aria-label="Toggle Microphone"
          >
            {audioEnabled ? <FiMic size={20} /> : <FiMicOff size={20} />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-4 rounded-2xl transition duration-300 ${
              videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
            }`}
            aria-label="Toggle Camera"
          >
            {videoEnabled ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
          </button>

          <button
            onClick={toggleChat}
            className={`p-4 rounded-2xl transition duration-300 relative ${
              showChat ? "bg-primary text-primary-foreground" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            aria-label="Toggle Chat"
          >
            <FiMessageSquare size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLeave}
            className="p-4 bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-2xl transition duration-300 flex items-center justify-center"
            aria-label="Leave Room"
          >
            <FiPhoneOff size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => {}}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition duration-200"
            aria-label="Room Settings"
          >
            <FiSettings size={18} />
          </button>
        </div>
      </div>

      {/* QR Code Overlay Popup */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-8 rounded-3xl border border-white/10 text-center shadow-2xl relative space-y-6">
            <h3 className="text-xl font-bold">Join via Mobile</h3>
            <p className="text-xs text-zinc-400">Scan this QR code to join the meeting directly from your phone camera.</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ""} size={200} />
            </div>

            <button
              onClick={() => setShowQR(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Chat Sidebar Panel */}
    {showChat && (
      <div className="fixed top-0 right-0 h-full w-full md:w-[380px] z-40 flex flex-col bg-black/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <FiMessageSquare size={18} className="text-primary" />
            <h3 className="font-bold text-lg tracking-tight">Room Chat</h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">{messages.filter(m => !m.isSystem).length}</span>
          </div>
          <button
            onClick={toggleChat}
            className="p-2 hover:bg-white/10 rounded-lg transition duration-200"
            aria-label="Close Chat"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
              <FiMessageSquare size={32} className="opacity-30" />
              <p className="text-sm text-center">No messages yet.<br/>Start the conversation!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={msg.isSystem ? "flex justify-center" : "flex flex-col"}>
              {msg.isSystem ? (
                <span className="text-[11px] text-zinc-500 bg-white/5 px-3 py-1 rounded-full font-medium">
                  {msg.message}
                </span>
              ) : (
                <div className="max-w-[85%]">
                  <div className="flex items-baseline space-x-2 mb-0.5">
                    <span className="text-xs font-bold text-primary">{msg.senderName}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-primary/50 transition-all duration-300">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent outline-none text-sm placeholder-zinc-500"
              aria-label="Chat message input"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 text-primary hover:bg-primary/10 rounded-xl transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send Message"
            >
              <FiSend size={16} />
            </button>
          </div>
        </form>
      </div>
    )}
    </div>
  );
}

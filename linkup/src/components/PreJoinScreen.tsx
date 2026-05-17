"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiArrowRight } from "react-icons/fi";

interface PreJoinScreenProps {
  roomName: string;
  hasPassword?: boolean;
  onVerifyPassword?: (password: string) => Promise<boolean>;
  onJoin: (name: string, audioEnabled: boolean, videoEnabled: boolean) => void;
  waitingStatus?: "none" | "waiting" | "approved" | "denied";
}

export default function PreJoinScreen({ roomName, hasPassword = false, onVerifyPassword, onJoin, waitingStatus = "none" }: PreJoinScreenProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startPreview() {
      try {
        if (videoEnabled) {
          const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: audioEnabled,
          });
          activeStream = localStream;
          streamRef.current = localStream;
          setStream(localStream);
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
        } else {
          stopPreview();
        }
      } catch (err) {
        console.error("Error accessing media devices for preview:", err);
      }
    }

    startPreview();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled, stopPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (hasPassword && onVerifyPassword) {
      setIsVerifying(true);
      setPasswordError("");
      try {
        const isValid = await onVerifyPassword(password);
        if (!isValid) {
          setPasswordError("Incorrect room password. Please try again.");
          setIsVerifying(false);
          return;
        }
      } catch {
        setPasswordError("Verification error occurred. Try again.");
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    stopPreview();
    onJoin(name, audioEnabled, videoEnabled);
  };

  if (waitingStatus === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: "2s" }}></div>

        <div className="relative z-10 w-full max-w-md glass rounded-3xl p-8 border border-white/10 text-center shadow-2xl space-y-6">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Pulsing orbital rings */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-4 border-accent/30 animate-pulse"></div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/30 animate-pulse">
              🔒
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Approval Pending</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Please wait. The meeting host has been notified and will admit you shortly.
            </p>
          </div>
          <div className="bg-white/5 border border-white/5 py-3 px-4 rounded-xl text-xs font-mono text-zinc-400 select-none animate-pulse">
            Connecting securely as guest: &quot;{name}&quot;
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: "2s" }}></div>

      <div className="relative z-10 w-full max-w-3xl glass rounded-3xl p-8 shadow-2xl border border-border/50 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Camera Preview */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-full aspect-video bg-black/40 rounded-2xl overflow-hidden border border-border/60 shadow-inner flex items-center justify-center">
            {videoEnabled && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center space-y-2">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <FiVideoOff size={28} />
                </div>
                <span className="text-sm">Camera is off</span>
              </div>
            )}

            {/* Media controls absolute at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-3 rounded-full transition-all duration-300 ${
                  audioEnabled ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                }`}
              >
                {audioEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-3 rounded-full transition-all duration-300 ${
                  videoEnabled ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                }`}
              >
                {videoEnabled ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Details Form */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">Joining Meeting</span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-1">{roomName}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Prepare your name and check your device settings before entering the room.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="display-name" className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                Your Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter display name..."
                required
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 font-medium"
              />
            </div>

            {hasPassword && (
              <div>
                <label htmlFor="room-password" className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Security Room Password
                </label>
                <input
                  id="room-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter room password..."
                  required
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 font-medium"
                />
                {passwordError && (
                  <span className="text-xs text-destructive font-semibold mt-1 block">
                    {passwordError}
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || isVerifying}
              className="w-full group py-4 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <span>{isVerifying ? "Verifying..." : "Join Room"}</span>
              {!isVerifying && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

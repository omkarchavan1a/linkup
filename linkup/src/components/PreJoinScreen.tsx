"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiArrowRight } from "react-icons/fi";

interface PreJoinScreenProps {
  roomName: string;
  onJoin: (name: string, audioEnabled: boolean, videoEnabled: boolean) => void;
}

export default function PreJoinScreen({ roomName, onJoin }: PreJoinScreenProps) {
  const [name, setName] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stopPreview = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    async function startPreview() {
      try {
        if (videoEnabled) {
          const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: audioEnabled,
          });
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
      stopPreview();
    };
  }, [videoEnabled, audioEnabled, stopPreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    stopPreview();
    onJoin(name, audioEnabled, videoEnabled);
  };

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

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full group py-4 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <span>Join Room</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

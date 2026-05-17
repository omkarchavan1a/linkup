"use client";

import { FiArrowRight, FiShield, FiZap, FiLink } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Advanced Configurations State
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [allowChat, setAllowChat] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [roomExpiry, setRoomExpiry] = useState("0");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err === "expired") {
        setErrorMessage("This meeting session has expired.");
      } else if (err === "denied") {
        setErrorMessage("The host has declined your request to join this meeting room.");
      }
    }
  }, []);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      let expiresAtVal = null;
      if (roomExpiry !== "0") {
        expiresAtVal = new Date(Date.now() + Number(roomExpiry) * 1000).toISOString();
      }

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim() || undefined,
          password: password.trim() || undefined,
          maxParticipants: Number(maxParticipants) || 10,
          expiresAt: expiresAtVal || undefined,
          settings: {
            allowChat,
            allowScreenShare,
            waitingRoom,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.roomId) {
        localStorage.setItem(`host_token_${data.roomId}`, data.hostToken);
        router.push(`/room/${data.roomId}`);
      } else {
        console.error(data.error || "Failed to create meeting.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 px-4">
      {/* Background animated blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: "2s" }}></div>
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-secondary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: "4s" }}></div>

      <div className="relative z-10 max-w-4xl mx-auto text-center animate-slide-up">
        {errorMessage && (
          <div className="max-w-md mx-auto mb-6 bg-destructive/20 border border-destructive/40 text-red-200 px-6 py-4 rounded-2xl flex items-center justify-between font-semibold text-sm shadow-lg drop-shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse relative">
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage("")}
              className="text-zinc-400 hover:text-white transition-colors text-xs font-bold pl-4"
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          </div>
        )}

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Connect Instantly. <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zero Friction.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
          The privacy-first video calling platform for informal friend groups and modern teams. No accounts. No downloads. Just a link.
        </p>

        {/* Advanced Options Drawer */}
        <div className="max-w-md mx-auto mb-8 glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-6 py-4 flex items-center justify-between font-semibold hover:bg-white/5 transition-all text-sm tracking-wide text-zinc-300"
          >
            <span>Advanced Configuration Options</span>
            <span className={`transform transition-transform duration-300 text-xs ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showAdvanced && (
            <div className="p-6 border-t border-white/10 space-y-4 text-left bg-black/20">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 tracking-wider">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Team Sync"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 tracking-wider">Security Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Lock room with password..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 tracking-wider">Room Lifetime Limit</label>
                <select
                  value={roomExpiry}
                  onChange={(e) => setRoomExpiry(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm transition-all duration-200 text-zinc-200 cursor-pointer"
                >
                  <option value="0">No Lifetime Limit (Stays open)</option>
                  <option value="300">5 Minutes (Test Session)</option>
                  <option value="1800">30 Minutes</option>
                  <option value="3600">1 Hour</option>
                  <option value="86400">24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 tracking-wider">Max Guests ({maxParticipants})</label>
                <input
                  type="range"
                  min="2"
                  max="25"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:text-white text-zinc-400 transition select-none">
                  <input
                    type="checkbox"
                    checked={allowChat}
                    onChange={(e) => setAllowChat(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/30"
                  />
                  <span>Enable Real-time Text Chat</span>
                </label>

                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:text-white text-zinc-400 transition select-none">
                  <input
                    type="checkbox"
                    checked={allowScreenShare}
                    onChange={(e) => setAllowScreenShare(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/30"
                  />
                  <span>Allow Guest Screen Sharing</span>
                </label>

                <label className="flex items-center space-x-3 text-sm cursor-pointer hover:text-white text-zinc-400 transition select-none">
                  <input
                    type="checkbox"
                    checked={waitingRoom}
                    onChange={(e) => setWaitingRoom(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/30 animate-pulse"
                  />
                  <span>Enable Waiting Room (Host approval)</span>
                </label>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-primary rounded-full overflow-hidden shadow-xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              Start a Meeting
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass p-6 rounded-2xl animate-fade-in hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <FiZap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Instant Rooms</h3>
            <p className="text-muted-foreground">Tap a link, land in a room, start talking. It&apos;s really that simple.</p>
          </div>
          
          <div className="glass p-6 rounded-2xl animate-fade-in hover:-translate-y-2 transition-transform duration-300" style={{ animationDelay: "100ms" }}>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <FiShield size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Privacy First</h3>
            <p className="text-muted-foreground">End-to-end encrypted video & audio. No login required ever.</p>
          </div>
          
          <div className="glass p-6 rounded-2xl animate-fade-in hover:-translate-y-2 transition-transform duration-300" style={{ animationDelay: "200ms" }}>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <FiLink size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Shareable Links</h3>
            <p className="text-muted-foreground">Generate unique room links that you can reuse or set to expire.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

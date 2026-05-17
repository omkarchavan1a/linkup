"use client";

import { FiArrowRight, FiShield, FiZap, FiLink } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxParticipants: 10,
          settings: {
            allowChat: true,
            allowScreenShare: true,
            waitingRoom: false,
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
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Connect Instantly. <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Zero Friction.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          The privacy-first video calling platform for informal friend groups and modern teams. No accounts. No downloads. Just a link.
        </p>
        
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

"use client";

import ThemeToggle from "./ThemeToggle";
import { FiVideo, FiHelpCircle } from "react-icons/fi";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  // Hide the global navigation header inside active call rooms to avoid visual collision/overlapping UI
  if (pathname?.startsWith("/room")) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass px-6 py-3 rounded-2xl">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition duration-200">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            <FiVideo size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            LinkUp
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link
            href="/help"
            className="flex items-center space-x-1.5 text-zinc-400 hover:text-white transition duration-200 text-sm font-semibold py-1.5 px-3 rounded-xl hover:bg-white/5"
          >
            <FiHelpCircle size={16} />
            <span className="hidden sm:inline">FAQ & Diagnostics</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}



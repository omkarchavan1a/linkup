"use client";

import { useEffect, useState } from "react";
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("system");
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    if (newTheme === "system") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    }
    setTheme(newTheme);
  };

  if (!mounted) {
    return <div className="w-[104px] h-[34px]" />;
  }

  return (
    <div className="flex items-center space-x-1 glass rounded-full p-1 border border-border/50">
      <button
        onClick={() => applyTheme("light")}
        className={`p-2 rounded-full transition-all duration-300 ${
          theme === "light" ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/20"
        }`}
        aria-label="Light theme"
      >
        <FiSun size={16} />
      </button>
      <button
        onClick={() => applyTheme("system")}
        className={`p-2 rounded-full transition-all duration-300 ${
          theme === "system" ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/20"
        }`}
        aria-label="System theme"
      >
        <FiMonitor size={16} />
      </button>
      <button
        onClick={() => applyTheme("dark")}
        className={`p-2 rounded-full transition-all duration-300 ${
          theme === "dark" ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/20"
        }`}
        aria-label="Dark theme"
      >
        <FiMoon size={16} />
      </button>
    </div>
  );
}

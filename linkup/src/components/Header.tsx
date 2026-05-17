import ThemeToggle from "./ThemeToggle";
import { FiVideo } from "react-icons/fi";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass px-6 py-3 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            <FiVideo size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            LinkUp
          </span>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

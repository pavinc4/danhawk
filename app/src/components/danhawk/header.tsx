import { Link, useLocation } from "react-router-dom";
import { Home, List, Settings, Info } from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: List },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

async function getWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

async function minimize(e: React.MouseEvent) {
  e.stopPropagation();
  try { (await getWindow()).minimize(); } catch { }
}

async function maximize(e: React.MouseEvent) {
  e.stopPropagation();
  try { (await getWindow()).toggleMaximize(); } catch { }
}

// Close hides to tray — actual quit is via tray menu "Quit"
async function hideToTray(e: React.MouseEvent) {
  e.stopPropagation();
  try { (await getWindow()).hide(); } catch { }
}

export function Header() {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col flex-shrink-0 select-none">
      {/* Title bar */}
      <div
        data-tauri-drag-region
        className="relative flex items-center justify-between bg-[#080808]"
        style={{ height: 32 }}
      >
        <div className="flex items-center pl-3 pointer-events-none">
          <EagleLogo className="w-3.5 h-3.5 text-[#444444]" />
        </div>

        <span className="absolute left-1/2 -translate-x-1/2 text-[11px] text-[#444444] pointer-events-none select-none">
          Danhawk
        </span>

        <div className="flex items-center h-full">
          {/* Minimize */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={minimize}
            className="flex items-center justify-center h-full hover:bg-[#1c1c1c] transition-colors duration-100 cursor-default"
            style={{ width: 46 }}
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="#888888" />
            </svg>
          </button>

          {/* Maximize */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={maximize}
            className="flex items-center justify-center h-full hover:bg-[#1c1c1c] transition-colors duration-100 cursor-default"
            style={{ width: 46 }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="#888888" strokeWidth="1" />
            </svg>
          </button>

          {/* Close → hides to tray */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={hideToTray}
            className="flex items-center justify-center h-full hover:bg-[#c42b1c] transition-colors duration-100 cursor-default group"
            style={{ width: 46 }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1" y1="1" x2="9" y2="9" stroke="#888888" strokeWidth="1.2" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="#888888" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav bar */}
      <header className="flex items-center justify-between px-8 py-4 bg-[#0d0d0d] border-b border-[#1a1a1a]">
        <Link to="/" className="flex items-center gap-3 group">
          <EagleLogo className="w-10 h-10 text-[#e8e8e8] group-hover:text-white transition-colors duration-200" />
          <span className="text-[22px] font-bold text-[#e8e8e8] group-hover:text-white transition-colors duration-200">
            Danhawk
          </span>
        </Link>
        <nav className="flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-150",
                  isActive
                    ? "border-[#3b8bdb] text-[#3b8bdb] bg-[#3b8bdb]/5"
                    : "border-[#2a2a2a] text-[#aaaaaa] hover:border-[#3a3a3a] hover:text-white hover:bg-[#1a1a1a]"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[13px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
    </div>
  );
}

function EagleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M52 12 C52 12 48 8 42 10 L36 16 C32 14 26 14 22 18 C16 24 12 32 12 40 C12 46 16 52 24 54 L32 56 C40 56 48 50 52 42 C56 34 56 24 52 16 L52 12 Z" />
      <path d="M46 18 C46 18 42 16 38 18 L34 22 C32 20 28 20 26 22 C22 26 20 32 22 38 C24 44 30 48 38 48 C44 48 50 44 52 38 C54 32 52 24 48 20 L46 18 Z" fill="#0d0d0d" opacity="0.4" />
      <circle cx="38" cy="26" r="3" fill="#0d0d0d" />
      <circle cx="39" cy="25" r="1.2" fill="#fff" />
      <path d="M18 36 L8 40 L12 44 L20 40 Z" fill="#e5a623" />
    </svg>
  );
}
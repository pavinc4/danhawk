import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Sidebar } from "./components/danhawk/header";
import { ToolStoreProvider } from "./store/tool-store";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Changelog from "./pages/Changelog";
import Feedback from "./pages/Feedback";
import CreateTool from "./pages/Create";
import ToolDetail from "./pages/ToolDetail";
import Launcher from "./pages/launcher";
import LauncherPage from "./pages/launcher"; // Just to be sure we have the component
import { Bell } from "lucide-react";
import { ToolModalContext } from "./context/ToolModalContext";

// ── Tool Detail Modal Context

// ── Floating Window Pattern (Generic)
function FloatingWindow({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  const [anim, setAnim] = useState<"in" | "out">("out");
  const close = () => { setAnim("out"); setTimeout(onClose, 200); };

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setAnim("in"));
      const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      window.addEventListener("keydown", h);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", h);
      };
    } else {
      setAnim("out");
    }
  }, [isOpen]);

  if (!isOpen && anim === "out") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div onClick={close} 
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${anim === "in" ? "opacity-100" : "opacity-0"}`} 
      />
      <div onClick={e => e.stopPropagation()} 
        className={`relative z-10 w-[min(800px,calc(100vw-48px))] h-[min(680px,calc(100vh-48px))] bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${anim === "in" ? "opacity-100 scale-100" : "opacity-0 scale-[0.97] translate-y-2"}`}>
        
        {/* macOS-style close button (Red circle) */}
        <button 
          onClick={close}
          className="absolute top-4 right-4 z-[210] w-6 h-6 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 flex items-center justify-center transition-colors shadow-lg group"
          title="Close"
        >
          <svg width="8" height="8" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {children}
      </div>
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  const [windowLabel, setWindowLabel] = useState<string>("");

  useEffect(() => {
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      setWindowLabel(getCurrentWindow().label);
    });
  }, []);

  const isCompiler = pathname.includes("create") || windowLabel === "compiler";
  const isLauncher = pathname.includes("launcher") || windowLabel === "launcher" || window.location.href.includes("launcher");
  
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const showSearch = pathname === "/" || pathname === "/explore";

  useEffect(() => {
    setSearch("");
  }, [pathname]);

  if (isLauncher) {
    return (
      <div style={{ height: "100vh", overflow: "hidden", background: "transparent" }}>
        <Routes>
          <Route path="/launcher" element={<Launcher />} />
          <Route path="*" element={<Launcher />} />
        </Routes>
      </div>
    );
  }

  if (isCompiler) {
    return (
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <Routes><Route path="/create" element={<CreateTool />} /></Routes>
      </div>
    );
  }

  return (
    <ToolModalContext.Provider value={{ 
      openTool: slug => setActiveSlug(slug), 
      closeTool: () => setActiveSlug(null), 
      activeSlug 
    }}>
      <div className="flex h-screen overflow-hidden bg-[#131313]">
        <Sidebar 
          onOpenSettings={() => setShowSettings(true)}
          onOpenAbout={() => setShowAbout(true)}
          onOpenFeedback={() => setShowFeedback(true)}
        />

        <div className="flex-1 flex flex-col h-full obsidian-gradient relative overflow-hidden">
          <TitleBar />
          
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {showSearch && (
              <SearchHeader 
                search={search} setSearch={setSearch} 
                searchFocused={searchFocused} setSearchFocused={setSearchFocused} 
              />
            )}
            
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Routes>
                <Route path="/" element={<Home search={search} />} />
                <Route path="/explore" element={<Explore search={search} />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/feedback" element={<Feedback />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>

      <FloatingWindow isOpen={!!activeSlug} onClose={() => setActiveSlug(null)}>
        {activeSlug && <ToolDetail slug={activeSlug} onClose={() => setActiveSlug(null)} />}
      </FloatingWindow>

      <FloatingWindow isOpen={showSettings} onClose={() => setShowSettings(false)}>
        <Settings />
      </FloatingWindow>

      <FloatingWindow isOpen={showAbout} onClose={() => setShowAbout(false)}>
        <About />
      </FloatingWindow>

      <FloatingWindow isOpen={showFeedback} onClose={() => setShowFeedback(false)}>
        <Feedback />
      </FloatingWindow>
    </ToolModalContext.Provider>
  );
}

function SearchHeader({ search, setSearch, searchFocused, setSearchFocused }: {
  search: string;
  setSearch: (v: string) => void;
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  return (
    <header className="flex justify-between items-center w-full px-8 py-6 z-40 flex-shrink-0">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <svg
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#c1c6d799",
              transition: "color 0.15s",
            }}
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search tools or files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-[#0e0e0e] border border-[#414755]/10 rounded-xl py-2 pl-10 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-[#adc6ff]/30 transition-all placeholder:text-[#c1c6d7]/40"
          />

          {!search && (
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none transition-opacity duration-150 ${searchFocused ? 'opacity-0' : 'opacity-100'}`}>
              <kbd className="text-[10px] font-mono bg-[#201f1f] px-1.5 py-0.5 rounded text-[#c1c6d7]/60 border border-[#414755]/20">⌘</kbd>
              <kbd className="text-[10px] font-mono bg-[#201f1f] px-1.5 py-0.5 rounded text-[#c1c6d7]/60 border border-[#414755]/20">K</kbd>
            </div>
          )}

          {search && (
            <button
              onMouseDown={e => { e.preventDefault(); setSearch(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c1c6d7]/60 hover:text-[#e5e2e1] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function TitleBar() {

  async function getWin() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  }

  return (
    <div
      data-tauri-drag-region
      style={{
        flexShrink: 0,
        height: 32,
        display: "flex",
        alignItems: "center",
        background: "transparent",
        position: "relative",
        zIndex: 100,
      }}
    >
      <div
        style={{ marginLeft: "auto", display: "flex", alignItems: "center", height: "100%", flexShrink: 0 }}
        onMouseDown={e => e.stopPropagation()}
      >
        {[
          {
            key: "min",
            onClick: async () => { try { (await getWin()).minimize(); } catch { } },
            icon: <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#e5e2e1" /></svg>,
            hoverBg: "rgba(255,255,255,0.1)",
          },
          {
            key: "max",
            onClick: async () => { try { (await getWin()).toggleMaximize(); } catch { } },
            icon: <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="#e5e2e1" strokeWidth="1" /></svg>,
            hoverBg: "rgba(255,255,255,0.1)",
          },
          {
            key: "close",
            onClick: async () => { try { (await getWin()).hide(); } catch { } },
            icon: (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="1" y1="1" x2="9" y2="9" stroke="#e5e2e1" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="9" y1="1" x2="1" y2="9" stroke="#e5e2e1" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ),
            hoverBg: "#c42b1c",
          },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={btn.onClick}
            style={{
              width: 48, height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none", cursor: "default",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = btn.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToolStoreProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ToolStoreProvider>
  );
}

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/danhawk/header";
import { ToolStoreProvider } from "./store/tool-store";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import ToolDetail from "./pages/ToolDetail";
import CreateTool from "./pages/Create";
import Settings from "./pages/Settings";
import About from "./pages/About";

function AppShell() {
  const { pathname } = useLocation();
  const isCompiler = pathname === "/create";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  // Show search bar only on Home and Explore
  const showSearch = pathname === "/" || pathname === "/explore";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setSearch("");
  }, [pathname]);

  if (isCompiler) {
    return (
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <Routes>
          <Route path="/create" element={<CreateTool />} />
        </Routes>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Title bar */}
      <TitleBar />

      {/* Floating search bar — only on Home and Explore */}
      {showSearch && (
        <div
          className="flex-shrink-0 flex items-center"
          style={{
            padding: "8px 20px",
            backgroundColor: "#0d0d0d",
            borderBottom: "1px solid #1e1e1e",
          }}
        >
          {/* Search input — clean, minimal, not generic */}
          <div className="relative w-full" style={{ maxWidth: 480 }}>
            {/* Search icon */}
            <svg
              className="absolute pointer-events-none"
              style={{ left: 14, top: "50%", transform: "translateY(-50%)" }}
              width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="#3c3c3c" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                paddingLeft: 36,
                paddingRight: search ? 32 : 14,
                backgroundColor: "#111111",
                border: "1px solid #1e1e1e",
                borderRadius: 6,
                color: "#e8e8e8",
                fontSize: 13,
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "#3b8bdb")}
              onBlur={e => (e.target.style.borderColor = "#1e1e1e")}
            />

            {/* Clear button — only when there's text */}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute flex items-center justify-center"
                style={{ right: 10, top: "50%", transform: "translateY(-50%)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#3c3c3c" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}
        >
          <Routes>
            <Route path="/" element={<Home search={search} />} />
            <Route path="/explore" element={<Explore search={search} />} />
            <Route path="/tool/:slug" element={<ToolDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </div>
    </div>
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
      className="flex-shrink-0 flex items-center justify-between select-none"
      style={{ height: 32, backgroundColor: "#111111", borderBottom: "1px solid #1e1e1e" }}
    >
      <span
        className="pl-4 text-[12px] font-medium pointer-events-none"
        style={{ color: "#4d4d4d" }}
      >
        Danhawk
      </span>
      <div className="flex items-center h-full">
        {[
          {
            label: "minimize",
            onClick: async (e: React.MouseEvent) => { e.stopPropagation(); try { (await getWin()).minimize(); } catch { } },
            icon: <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#4d4d4d" /></svg>,
            hoverBg: "#1e1e1e",
          },
          {
            label: "maximize",
            onClick: async (e: React.MouseEvent) => { e.stopPropagation(); try { (await getWin()).toggleMaximize(); } catch { } },
            icon: <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="#4d4d4d" strokeWidth="1" /></svg>,
            hoverBg: "#1e1e1e",
          },
          {
            label: "close",
            onClick: async (e: React.MouseEvent) => { e.stopPropagation(); try { (await getWin()).hide(); } catch { } },
            icon: <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#4d4d4d" strokeWidth="1.2" /><line x1="9" y1="1" x2="1" y2="9" stroke="#4d4d4d" strokeWidth="1.2" /></svg>,
            hoverBg: "#c42b1c",
          },
        ].map(btn => (
          <button
            key={btn.label}
            onMouseDown={e => e.stopPropagation()}
            onClick={btn.onClick}
            className="flex items-center justify-center h-full cursor-default transition-colors duration-100"
            style={{ width: 46 }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = btn.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
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
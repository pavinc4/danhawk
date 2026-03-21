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
import Changelog from "./pages/Changelog";

function AppShell() {
  const { pathname } = useLocation();
  const isCompiler = pathname === "/create";
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const showSearch = pathname === "/" || pathname === "/explore";

  useEffect(() => {
    setSearch("");
  }, [pathname]);

  if (isCompiler) {
    return (
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <Routes><Route path="/create" element={<CreateTool />} /></Routes>
      </div>
    );
  }

  return (
    // Root: fixed height, nothing overflows
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      {/* Title bar — always fixed at top, never scrolls */}
      <TitleBar
        search={search} setSearch={setSearch}
        searchFocused={searchFocused} setSearchFocused={setSearchFocused}
        showSearch={showSearch}
      />

      {/* Body — sidebar + page, overflow hidden so pages manage their own scroll */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden", // CRITICAL — prevents body from scrolling
        minHeight: 0,       // CRITICAL — allows flex children to shrink below content height
      }}>
        <Sidebar />

        {/* Page container — overflow hidden, each page handles its own scroll internally */}
        <div
          className="bg-obsidian"
          style={{
            flex: 1,
            overflow: "hidden", // pages own their scroll
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Routes>
            <Route path="/" element={<Home search={search} />} />
            <Route path="/explore" element={<Explore search={search} />} />
            <Route path="/tool/:slug" element={<ToolDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="/changelog" element={<Changelog />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function TitleBar({ search, setSearch, searchFocused, setSearchFocused, showSearch }: {
  search: string;
  setSearch: (v: string) => void;
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
  showSearch: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function getWin() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  }

  return (
    <div
      data-tauri-drag-region
      style={{
        flexShrink: 0,
        height: showSearch ? 52 : 32,
        display: "flex",
        alignItems: "center",
        background: "rgba(8,8,8,0.95)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "relative",
        transition: "height 0.2s ease",
        zIndex: 100,
      }}
    >
      <span style={{
        paddingLeft: 16,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-muted)",
        pointerEvents: "none",
        letterSpacing: "0.02em",
        flexShrink: 0,
        width: 80,
      }}>
        Danhawk
      </span>

      {showSearch && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 360,
            pointerEvents: "auto",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ position: "relative" }}>
            <svg
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: searchFocused ? "var(--accent)" : "var(--text-muted)",
                transition: "color 0.15s",
              }}
              width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: "100%",
                height: 30,
                paddingLeft: 32,
                paddingRight: search ? 30 : 12,
                background: searchFocused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${searchFocused ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: 999,
                color: "var(--text-primary)",
                fontSize: 12.5,
                fontWeight: 400,
                outline: "none",
                transition: "all 0.15s ease",
                boxShadow: searchFocused
                  ? "0 0 0 3px var(--accent-glow), 0 4px 20px rgba(0,0,0,0.4)"
                  : "none",
              }}
            />

            {search && (
              <button
                onMouseDown={e => { e.preventDefault(); setSearch(""); inputRef.current?.focus(); }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  padding: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{ marginLeft: "auto", display: "flex", alignItems: "center", height: "100%", flexShrink: 0 }}
        onMouseDown={e => e.stopPropagation()}
      >
        {[
          {
            key: "min",
            onClick: async () => { try { (await getWin()).minimize(); } catch { } },
            icon: <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="var(--text-muted)" /></svg>,
            hoverBg: "var(--bg-overlay)",
          },
          {
            key: "max",
            onClick: async () => { try { (await getWin()).toggleMaximize(); } catch { } },
            icon: <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="var(--text-muted)" strokeWidth="1" /></svg>,
            hoverBg: "var(--bg-overlay)",
          },
          {
            key: "close",
            onClick: async () => { try { (await getWin()).hide(); } catch { } },
            icon: (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="1" y1="1" x2="9" y2="9" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="9" y1="1" x2="1" y2="9" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ),
            hoverBg: "#c42b1c",
          },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={btn.onClick}
            style={{
              width: 46, height: "100%",
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
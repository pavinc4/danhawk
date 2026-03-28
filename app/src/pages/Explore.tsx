import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { ToolCard } from "../components/danhawk/tool-card";
import { useToolStore } from "../store/tool-store";

type SortOrder = "az" | "za" | "installed";

export default function ExplorePage({ search = "" }: { search?: string }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const { tools, loading, isInstalled, refreshFromGitHub } = useToolStore();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (tools.length === 0) {
      (async () => {
        try { const { invoke } = await import("@tauri-apps/api/core"); await invoke("get_tools"); } catch { }
      })();
    }
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshFromGitHub();
      const now = new Date();
      setLastRefreshed(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    } finally { setRefreshing(false); }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(tools.map(t => t.category).filter(Boolean))).sort();
    return ["All", ...cats];
  }, [tools]);

  const resolvedCategory = categories.includes(activeCategory) ? activeCategory : "All";

  const filteredTools = useMemo(() => {
    const q = search.toLowerCase();
    let result = tools.filter(tool => {
      const m = !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q) || tool.category.toLowerCase().includes(q);
      return m && (resolvedCategory === "All" || tool.category === resolvedCategory);
    });
    if (sortOrder === "az") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === "za") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    else result = [...result].sort((a, b) => {
      const ai = isInstalled(a.id) ? 0 : 1, bi = isInstalled(b.id) ? 0 : 1;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
    });
    return result;
  }, [tools, search, resolvedCategory, sortOrder, isInstalled]);

  const sortLabels: Record<SortOrder, string> = { az: "A → Z", za: "Z → A", installed: "Installed first" };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-entrance relative"
      onClick={() => setShowSortMenu(false)}>
      
      {/* Absolute click blocker during refresh */}
      {(refreshing || loading) && (
        <div className="absolute inset-0 z-[100] cursor-wait pointer-events-auto" />
      )}

      <div className={`flex-1 flex flex-col min-h-0 ${refreshing ? "opacity-60 animate-pulse transition-opacity duration-300" : ""}`}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
          Explore
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastRefreshed && (
            <span style={{ fontSize: 11, color: "var(--text-ghost)" }}>Updated {lastRefreshed}</span>
          )}
          <button
            onClick={handleRefresh} disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              background: "var(--bg-hover)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              color: refreshing ? "var(--text-muted)" : "var(--text-secondary)",
              fontSize: 12, cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!refreshing) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)"; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter bar — no hard borders */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 24px 14px",
        flexShrink: 0,
      }} onClick={e => e.stopPropagation()}>
        {/* Category pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pill-skeuo ${resolvedCategory === cat ? "pill-skeuo-active" : ""}`}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                color: resolvedCategory === cat ? "white" : "var(--text-muted)",
                fontSize: 11.5,
                fontWeight: resolvedCategory === cat ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setShowSortMenu(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              border: `1px solid ${showSortMenu ? "var(--accent)" : "var(--border-subtle)"}`,
              background: showSortMenu ? "var(--accent-dim)" : "none",
              color: showSortMenu ? "var(--accent)" : "var(--text-muted)",
              fontSize: 11.5, cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            <ArrowUpDown size={11} />
            {sortLabels[sortOrder]}
          </button>
          {showSortMenu && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 4px)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid var(--border-medium)",
              borderRadius: 10,
              overflow: "hidden",
              zIndex: 50,
              width: 150,
              boxShadow: "var(--shadow-lg)",
              backdropFilter: "blur(20px)",
            }}>
              {(["az", "za", "installed"] as SortOrder[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setSortOrder(opt); setShowSortMenu(false); }}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "8px 12px",
                    background: sortOrder === opt ? "var(--accent-dim)" : "none",
                    color: sortOrder === opt ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 12, border: "none", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (sortOrder !== opt) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (sortOrder !== opt) (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  {sortLabels[opt]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tools grid - Force scrollable area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-8 outline-none relative z-10 overscroll-contain"
        tabIndex={-1}
      >
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, paddingTop: 48 }}>Loading...</p>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-[13px] text-[#555555]">No tools found</p>
          </div>
        ) : filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            style={{
              opacity: refreshing ? 0.4 : 1,
              pointerEvents: refreshing ? "none" : "auto",
              transition: "opacity 0.2s",
            }}>
            {filteredTools.map((tool) => (
              <div key={tool.id}>
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, paddingTop: 48 }}>
            {search || resolvedCategory !== "All" ? "No tools match." : "No tools available."}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
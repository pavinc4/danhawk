import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { ToolCard } from "../components/danhawk/tool-card";
import { useToolStore } from "../store/tool-store";

type SortOrder = "az" | "za" | "installed";

interface ExploreProps {
  search?: string;
}

export default function ExplorePage({ search = "" }: ExploreProps) {
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
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("get_tools");
        } catch { }
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
    } finally {
      setRefreshing(false);
    }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(tools.map(t => t.category).filter(Boolean))).sort();
    return ["All", ...cats];
  }, [tools]);

  const resolvedCategory = categories.includes(activeCategory) ? activeCategory : "All";

  const filteredTools = useMemo(() => {
    const q = search.toLowerCase();
    let result = tools.filter(tool => {
      const matchSearch = !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.author.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q);
      const matchCat = resolvedCategory === "All" || tool.category === resolvedCategory;
      return matchSearch && matchCat;
    });
    if (sortOrder === "az") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === "za") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === "installed") {
      result = [...result].sort((a, b) => {
        const ai = isInstalled(a.id) ? 0 : 1;
        const bi = isInstalled(b.id) ? 0 : 1;
        return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
      });
    }
    return result;
  }, [tools, search, resolvedCategory, sortOrder, isInstalled]);

  const sortLabels: Record<SortOrder, string> = { az: "A → Z", za: "Z → A", installed: "Installed first" };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]" style={{ minHeight: "100%" }} onClick={() => setShowSortMenu(false)}>

      {/* Page header — title + refresh */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6"
        style={{ height: 56, borderBottom: "1px solid #1e1e1e" }}
      >
        <h1 className="text-[20px] font-semibold text-[#e8e8e8]">Explore</h1>

        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-[11px]" style={{ color: "#3c3c3c" }}>Updated {lastRefreshed}</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#111111",
              border: "1px solid #1e1e1e",
              color: "#4d4d4d",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#3c3c3c";
              (e.currentTarget as HTMLElement).style.color = "#e8e8e8";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e";
              (e.currentTarget as HTMLElement).style.color = "#4d4d4d";
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filters row — inside the page, not floating */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: "1px solid #1e1e1e" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-150"
                style={{
                  backgroundColor: resolvedCategory === cat ? "#3b8bdb" : "transparent",
                  border: `1px solid ${resolvedCategory === cat ? "#3b8bdb" : "#1e1e1e"}`,
                  color: resolvedCategory === cat ? "white" : "#4d4d4d",
                }}
                onMouseEnter={e => {
                  if (resolvedCategory !== cat) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#3c3c3c";
                    (e.currentTarget as HTMLElement).style.color = "#888888";
                  }
                }}
                onMouseLeave={e => {
                  if (resolvedCategory !== cat) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e";
                    (e.currentTarget as HTMLElement).style.color = "#4d4d4d";
                  }
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Sort dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowSortMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-all duration-150"
            style={{
              backgroundColor: showSortMenu ? "#1e1e1e" : "transparent",
              border: `1px solid ${showSortMenu ? "#3b8bdb" : "#1e1e1e"}`,
              color: showSortMenu ? "#3b8bdb" : "#4d4d4d",
            }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortLabels[sortOrder]}</span>
          </button>
          {showSortMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden"
              style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e", width: 160 }}
            >
              {(["az", "za", "installed"] as SortOrder[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setSortOrder(opt); setShowSortMenu(false); }}
                  className="w-full text-left px-3 py-2 text-[12px] transition-colors duration-100"
                  style={{
                    color: sortOrder === opt ? "#3b8bdb" : "#4d4d4d",
                    backgroundColor: sortOrder === opt ? "rgba(59,139,219,0.1)" : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (sortOrder !== opt) (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e";
                  }}
                  onMouseLeave={e => {
                    if (sortOrder !== opt) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {sortLabels[opt]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tools grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px]" style={{ color: "#3c3c3c" }}>Loading...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
              <RefreshCw className="w-5 h-5" style={{ color: "#3c3c3c" }} />
            </div>
            <p className="text-[13px]" style={{ color: "#3c3c3c" }}>No tools loaded yet</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-[#3b8bdb] text-white rounded-lg text-[12px] font-medium hover:bg-[#4a9beb] transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Loading..." : "Load tools from GitHub"}
            </button>
          </div>
        ) : filteredTools.length > 0 ? (
          <div className={`grid grid-cols-3 gap-3 items-start transition-opacity duration-300 ${refreshing ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {filteredTools.map((tool, index) => (
              <div
                key={tool.id}
                className="animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
              >
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[13px]" style={{ color: "#3c3c3c" }}>
              {search || resolvedCategory !== "All" ? "No tools match." : "No tools available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
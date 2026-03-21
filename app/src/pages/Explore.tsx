import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ArrowUpDown, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ToolCard } from "../components/danhawk/tool-card";
import { useToolStore } from "../store/tool-store";

type SortOrder = "az" | "za" | "installed";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const { tools, loading, isInstalled, refreshFromGitHub } = useToolStore();
  const navigate = useNavigate();
  const mountedRef = useRef(false);

  // On mount — load from cache only, no GitHub call
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const loadCache = async () => {
      // Only call refreshFromGitHub if tools list is empty (nothing cached yet)
      // This handles first-ever launch where there's no cache at all
      if (tools.length === 0) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          // Just load what's already cached — no GitHub hit
          // get_tools returns cached data from state, so this is safe
          await invoke("get_tools");
        } catch { /* tauri not available in browser */ }
      }
    };

    loadCache();
  }, []);

  // Manual refresh — the ONLY place GitHub gets called from Explore
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
    const q = searchQuery.toLowerCase();

    let result = tools.filter(tool => {
      const matchSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.author.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q);
      const matchCat = resolvedCategory === "All" || tool.category === resolvedCategory;
      return matchSearch && matchCat;
    });

    if (sortOrder === "az") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "za") {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOrder === "installed") {
      result = [...result].sort((a, b) => {
        const ai = isInstalled(a.id) ? 0 : 1;
        const bi = isInstalled(b.id) ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [tools, searchQuery, resolvedCategory, sortOrder, isInstalled]);

  const sortLabels: Record<SortOrder, string> = {
    az: "A → Z",
    za: "Z → A",
    installed: "Installed first",
  };

  return (
    <div className="bg-[#0d0d0d] min-h-full" onClick={() => setShowSortMenu(false)}>
      <main className="px-8 pb-24 relative">

        {/* Top bar — back + refresh */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1c1c1c] rounded-md transition-colors duration-150">
            <ArrowLeft className="w-4 h-4 text-[#666666]" />
          </button>

          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-[11px] text-[#444444]">Updated {lastRefreshed}</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh tool list from GitHub"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] border border-[#222222] rounded-md text-[12px] text-[#666666] hover:border-[#333333] hover:text-[#e8e8e8] hover:bg-[#181818] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] group-focus-within:text-[#777777] transition-colors duration-150" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#222222] rounded-md text-[#e8e8e8] placeholder:text-[#555555] text-[13px] focus:outline-none focus:border-[#3b8bdb] focus:bg-[#181818] transition-all duration-150"
            />
          </div>

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowSortMenu(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-md text-[12px] transition-all duration-150 active:scale-[0.98] ${showSortMenu
                ? "bg-[#1e1e1e] border-[#3b8bdb] text-[#3b8bdb]"
                : "bg-[#141414] border-[#222222] text-[#666666] hover:border-[#333333] hover:bg-[#181818]"
                }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-[11px]">{sortLabels[sortOrder]}</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden w-[160px]">
                {(["az", "za", "installed"] as SortOrder[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setSortOrder(opt); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-[12px] transition-colors duration-100 ${sortOrder === opt
                      ? "bg-[#3b8bdb]/15 text-[#3b8bdb]"
                      : "text-[#888888] hover:bg-[#1e1e1e] hover:text-[#e8e8e8]"
                      }`}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all duration-150 ${resolvedCategory === cat
                  ? "bg-[#3b8bdb] border-[#3b8bdb] text-white"
                  : "bg-transparent border-[#222222] text-[#888888] hover:border-[#333333] hover:text-[#e8e8e8]"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#555555] text-[13px]">Loading...</p>
          </div>
        ) : tools.length === 0 ? (
          // No cache at all — prompt user to refresh
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#444444]" />
            </div>
            <p className="text-[#555555] text-[13px]">No tools loaded yet</p>
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
            <p className="text-[#555555] text-[13px]">
              {searchQuery || resolvedCategory !== "All"
                ? "No tools match your search."
                : "No tools available."}
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
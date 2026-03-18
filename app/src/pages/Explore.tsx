import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ArrowUpDown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModCard } from "../components/danhawk/mod-card";
import { useModStore } from "../store/mod-store";

type SortOrder = "az" | "za" | "installed";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { mods, loading, isInstalled, refreshFromGitHub } = useModStore();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const run = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const online = await invoke<boolean>("check_online");
        if (!online) {
          setIsOffline(true);
          // Still try to load -- fetch_from_github returns cache when offline
          setRefreshing(true);
          await refreshFromGitHub();
          setRefreshing(false);
          return;
        }
      } catch { /* tauri not available */ }

      setIsOffline(false);
      setRefreshing(true);
      await refreshFromGitHub();
      setRefreshing(false);
    };

    run();
  }, []);

  // Build category list dynamically from actual extension data
  const categories = useMemo(() => {
    const cats = Array.from(new Set(mods.map(m => m.category).filter(Boolean))).sort();
    return ["All", ...cats];
  }, [mods]);

  // If active category no longer exists in data, reset to All
  const resolvedCategory = categories.includes(activeCategory) ? activeCategory : "All";

  const filteredMods = useMemo(() => {
    const q = searchQuery.toLowerCase();

    let result = mods.filter(mod => {
      const matchSearch =
        !q ||
        mod.name.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.author.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q);
      const matchCat = resolvedCategory === "All" || mod.category === resolvedCategory;
      return matchSearch && matchCat;
    });

    // Sort
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
  }, [mods, searchQuery, resolvedCategory, sortOrder, isInstalled]);

  const sortLabels: Record<SortOrder, string> = {
    az: "A → Z",
    za: "Z → A",
    installed: "Installed first",
  };

  return (
    <div className="bg-[#0d0d0d] min-h-full" onClick={() => setShowSortMenu(false)}>
      <main className="px-8 pb-24 relative">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1c1c1c] rounded-md transition-colors duration-150 mt-4 mb-2 flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-[#666666]" />
        </button>

        {/* Search + sort */}
        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] group-focus-within:text-[#777777] transition-colors duration-150" />
            <input
              type="text"
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#222222] rounded-md text-[#e8e8e8] placeholder:text-[#555555] text-[13px] focus:outline-none focus:border-[#3b8bdb] focus:bg-[#181818] transition-all duration-150"
            />
          </div>

          {/* Sort dropdown */}
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

        {/* Category pills — built from real extension data */}
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

        {/* Loading overlay — shown while refreshing from GitHub */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0d0d0d]/50">
            <svg className="animate-spin w-5 h-5 text-[#3b8bdb]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            <p className="text-[#555555] text-[12px]">Loading extensions...</p>
          </div>
        )}

        {loading && !refreshing ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#555555] text-[13px]">Loading extensions...</p>
          </div>
        ) : filteredMods.length > 0 ? (
          <div className={`grid grid-cols-3 gap-3 items-start transition-opacity duration-300 ${refreshing ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            {filteredMods.map((mod, index) => (
              <div
                key={mod.id}
                className="animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
              >
                <ModCard mod={mod} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[#555555] text-[13px]">
              {isOffline && mods.length === 0
                ? "No internet. Connect once to load extensions, then they work offline too."
                : searchQuery || resolvedCategory !== "All"
                  ? "No extensions match your search."
                  : refreshing ? "Fetching extensions..." : "No extensions available."}
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
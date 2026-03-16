import { useState } from "react";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { ModCard } from "../components/danhawk/mod-card";
import { useModStore } from "../store/mod-store";

const CATEGORIES = ["All", "Shortcuts", "File System", "System", "Text Tools", "Productivity", "UI Tweaks", "Launcher"];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { mods, loading } = useModStore();

  // Temporary debug — remove after fixing path
  const [debugInfo, setDebugInfo] = useState<string>("");
  const runDebug = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const info = await invoke("get_debug_info");
      setDebugInfo(JSON.stringify(info, null, 2));
    } catch (e) {
      setDebugInfo(String(e));
    }
  };

  const filteredMods = mods.filter((mod) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      mod.name.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.author.toLowerCase().includes(q);
    const matchCat = activeCategory === "All" || mod.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="bg-[#0d0d0d] min-h-full">
      <main className="px-8 pb-24">
        {/* DEBUG — remove after fixing */}
        <div className="mb-3">
          <button onClick={runDebug} className="px-3 py-1 bg-[#222] border border-[#333] rounded text-[11px] text-[#888] hover:text-white transition-colors">Debug: check extension path</button>
          {debugInfo && <pre className="mt-2 p-3 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-[#4ade80] overflow-auto max-h-40">{debugInfo}</pre>}
        </div>

        <div className="flex items-center gap-2 mb-4 mt-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] group-focus-within:text-[#777777] transition-colors duration-150" />
            <input
              type="text"
              placeholder="Search for mods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141414] border border-[#222222] rounded-md text-[#e8e8e8] placeholder:text-[#555555] text-[13px] focus:outline-none focus:border-[#3b8bdb] focus:bg-[#181818] transition-all duration-150"
            />
          </div>
          <button className="p-2.5 bg-[#141414] border border-[#222222] rounded-md hover:border-[#333333] hover:bg-[#181818] active:scale-[0.98] transition-all duration-150">
            <Filter className="w-4 h-4 text-[#666666]" />
          </button>
          <button className="p-2.5 bg-[#141414] border border-[#222222] rounded-md hover:border-[#333333] hover:bg-[#181818] active:scale-[0.98] transition-all duration-150">
            <ArrowUpDown className="w-4 h-4 text-[#666666]" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all duration-150 ${activeCategory === cat
                  ? "bg-[#3b8bdb] border-[#3b8bdb] text-white"
                  : "bg-transparent border-[#222222] text-[#888888] hover:border-[#333333] hover:text-[#e8e8e8]"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#555555] text-[13px]">Loading mods...</p>
          </div>
        ) : filteredMods.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 items-start">
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
            <p className="text-[#555555] text-[13px]">No mods found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
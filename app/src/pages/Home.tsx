import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useToolStore } from "../store/tool-store";
import { cn } from "../lib/utils";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface HomeProps {
  search?: string;
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function ToolToggle({ enabled, toggling, onToggle }: {
  enabled: boolean;
  toggling: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        width: 36, height: 20,
        backgroundColor: enabled ? "#3dba6e" : "#2a2a2a",
        border: enabled ? "none" : "1px solid #3a3a3a",
      }}
    >
      <span style={{
        position: "absolute", top: "50%",
        transform: `translateY(-50%) translateX(${enabled ? "18px" : "2px"})`,
        width: 14, height: 14,
        backgroundColor: "white", borderRadius: "50%",
        transition: "transform 0.18s", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

// ── Quick Access card ─────────────────────────────────────────────────────────

function QuickCard({ tool }: { tool: ReturnType<typeof useToolStore>["tools"][0] }) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  const iconEl = tool.iconFile ? (
    <img src={tool.iconFile} alt={tool.name} className="w-8 h-8 object-contain" />
  ) : (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: tool.iconBg }}
    >
      <IconComponent className="w-5 h-5" style={{ color: tool.iconColor }} />
    </div>
  );

  return (
    <Link
      to={`/tool/${tool.slug}`}
      className="flex flex-col items-center gap-2 px-2 pt-3 pb-2.5 rounded-xl transition-all duration-150 group hover:bg-[#1e1e1e]"
    >
      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
        {iconEl}
      </div>
      <span className="text-[11.5px] text-[#cccccc] group-hover:text-[#e8e8e8] text-center leading-[1.3] transition-colors line-clamp-2 w-full px-1">
        {tool.name}
      </span>
    </Link>
  );
}

// ── Tool row ──────────────────────────────────────────────────────────────────

function ToolRow({ tool }: { tool: ReturnType<typeof useToolStore>["tools"][0] }) {
  const { isEnabled, isToggling, toggle } = useToolStore();
  const enabled = isEnabled(tool.id);
  const toggling = isToggling(tool.id);
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <Link
      to={`/tool/${tool.slug}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#161616] transition-colors duration-100 group"
      onClick={e => {
        if ((e.target as HTMLElement).closest("[data-toggle]")) e.preventDefault();
      }}
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: tool.iconFile ? "#1a1a1a" : tool.iconBg }}
      >
        {tool.iconFile
          ? <img src={tool.iconFile} alt={tool.name} className="w-4 h-4 object-contain" />
          : <IconComponent className="w-3.5 h-3.5" style={{ color: tool.iconColor }} />}
      </div>
      <span className="flex-1 text-[13px] text-[#cccccc] group-hover:text-[#e8e8e8] transition-colors truncate">
        {tool.name}
      </span>
      <div data-toggle="true" onClick={e => e.preventDefault()}>
        <ToolToggle
          enabled={enabled}
          toggling={toggling}
          onToggle={e => { e.preventDefault(); e.stopPropagation(); toggle(tool.id); }}
        />
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePage({ search = "" }: HomeProps) {
  const { tools, getInstalledTools, isEnabled } = useToolStore();
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");

  const activeTools = tools.filter(t => isEnabled(t.id));
  const installedTools = getInstalledTools();

  const filteredInstalled = useMemo(() => {
    let list = installedTools;
    if (filter === "on") list = list.filter(t => isEnabled(t.id));
    if (filter === "off") list = list.filter(t => !isEnabled(t.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [installedTools, filter, search, isEnabled]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]" style={{ minHeight: "100%" }}>

      {/* Page header — title + status pills */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6"
        style={{ height: 56, borderBottom: "1px solid #1e1e1e" }}
      >
        <h1 className="text-[20px] font-semibold text-[#e8e8e8]">Home</h1>

        {/* Status pills — transparent default, bg on hover */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-default hover:bg-[#1a1a1a]">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#0f2a1a" }}>
              <Icons.CheckCircle className="w-3.5 h-3.5 text-[#3dba6e]" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#e8e8e8] leading-none mb-0.5">Up to date</p>
              <p className="text-[11px] leading-none" style={{ color: "#3c3c3c" }}>v1.0.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-default hover:bg-[#1a1a1a]">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#0f1a2a" }}>
              <Icons.ShieldCheck className="w-3.5 h-3.5 text-[#3b8bdb]" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#e8e8e8] leading-none mb-0.5">No conflicts</p>
              <p className="text-[11px] leading-none" style={{ color: "#3c3c3c" }}>All clear</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Centre — Quick Access */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-6 py-6" style={{ borderRight: "1px solid #1e1e1e" }}>
          <h2 className="text-[14px] font-semibold text-[#e8e8e8] mb-5">Quick access</h2>

          {activeTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Icons.Zap className="w-8 h-8 text-[#2a2a2a]" />
              <p className="text-[13px]" style={{ color: "#3c3c3c" }}>No active tools</p>
              <Link to="/explore" className="text-[12px] text-[#3b8bdb] hover:text-[#4a9beb] transition-colors">
                Browse tools →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111" }}>
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
                {activeTools.map(tool => <QuickCard key={tool.id} tool={tool} />)}
              </div>
            </div>
          )}
        </div>

        {/* Right — Tools panel */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: 310 }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
            <h2 className="text-[14px] font-semibold text-[#e8e8e8]">Tools</h2>
            <div className="flex items-center gap-0.5">
              {(["all", "on", "off"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium transition-all duration-100"
                  style={{
                    color: filter === f ? "#3b8bdb" : "#3c3c3c",
                    backgroundColor: filter === f ? "rgba(59,139,219,0.12)" : "transparent",
                  }}
                >
                  {f === "all" ? "All" : f === "on" ? "On" : "Off"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {installedTools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 px-4">
                <Icons.Package className="w-8 h-8" style={{ color: "#1e1e1e" }} />
                <p className="text-[12px] text-center" style={{ color: "#3c3c3c" }}>No tools installed yet</p>
                <Link to="/explore" className="px-3 py-1.5 bg-[#3b8bdb] text-white rounded-lg text-[11px] font-medium hover:bg-[#4a9beb] transition-all">
                  Browse Tools
                </Link>
              </div>
            ) : filteredInstalled.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[12px]" style={{ color: "#3c3c3c" }}>No tools match</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredInstalled.map(tool => <ToolRow key={tool.id} tool={tool} />)}
              </div>
            )}
          </div>

          <div className="px-4 py-3" style={{ borderTop: "1px solid #1e1e1e" }}>
            <Link to="/explore" className="flex items-center gap-2 text-[12px] hover:text-[#3b8bdb] transition-colors duration-150" style={{ color: "#3c3c3c" }}>
              <Icons.Compass className="w-3.5 h-3.5" />
              Browse more tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
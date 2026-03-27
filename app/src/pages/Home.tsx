import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowUpDown } from "lucide-react";
import { useToolStore } from "../store/tool-store";
import { ToolIcon as SharedIcon } from "../components/QuickAccess";
import { useToolModal } from "../context/ToolModalContext";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

// ── Toggle ────────────────────────────────────────────────────────────────────

function ToolToggle({ enabled, toggling, onToggle }: {
  enabled: boolean; toggling: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className={`toggle-skeuo ${enabled ? "toggle-skeuo-on" : ""}`}
      style={{
        position: "relative",
        width: 34, height: 18,
        borderRadius: 999,
        border: "none",
        cursor: toggling ? "not-allowed" : "pointer",
        opacity: toggling ? 0.4 : 1,
        flexShrink: 0,
        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        background: enabled ? "linear-gradient(135deg, #3dba6e, #2da05a)" : "rgba(255,255,255,0.08)",
        boxShadow: enabled 
          ? "0 0 10px rgba(61,186,110,0.4), inset 0 1px 1px rgba(255,255,255,0.2)" 
          : "inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.05)",
      }}
    >
      <span style={{
        position: "absolute", top: "50%",
        transform: `translateY(-50%) translateX(${enabled ? "17px" : "2px"})`,
        width: 14, height: 14,
        background: "white", borderRadius: "50%",
        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        display: "block",
        boxShadow: "1px 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.8)",
      }} />
    </button>
  );
}

// ── Quick access card ─────────────────────────────────────────────────────────

// ── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  toolId: string;
  toolSlug: string;
}

function QuickContextMenu({ menu, isPinned, onPin, onViewDetails, onClose }: {
  menu: ContextMenuState;
  isPinned: boolean;
  onPin: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Invisible overlay to catch outside clicks */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 998 }}
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose(); }}
      />
      {/* Menu */}
      <div
        style={{
          position: "fixed",
          left: menu.x,
          top: menu.y,
          zIndex: 999,
          minWidth: 160,
          background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
          border: "1px solid var(--border-medium)",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "4px",
        }}
        onClick={e => e.stopPropagation()}
      >
        {[
          {
            icon: isPinned ? <Icons.PinOff size={13} /> : <Icons.Pin size={13} />,
            label: isPinned ? "Unpin" : "Pin to top",
            onClick: () => { onPin(); onClose(); },
          },
          {
            icon: <Icons.ExternalLink size={13} />,
            label: "View Details",
            onClick: () => { onViewDetails(); onClose(); },
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 9,
              padding: "7px 10px", background: "none", border: "none",
              cursor: "pointer", borderRadius: 7,
              color: "var(--text-secondary)", fontSize: 12.5,
              transition: "background 0.1s",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
          >
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ── Quick access card ─────────────────────────────────────────────────────────

function QuickCard({ tool, isPinned, onContextMenu }: {
  tool: any;
  isPinned: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  return (
    <Link
      to={`/tool/${tool.slug}`}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, padding: "14px 8px 10px",
        borderRadius: 12, textDecoration: "none",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e); }}
    >
      {/* Pin indicator */}
      {isPinned && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          color: "var(--text-muted)",
          display: "flex", alignItems: "center",
        }}>
          <Icons.Pin size={9} />
        </span>
      )}

      {/* Icon */}
      <SharedIcon tool={tool} size={44} />
      <span style={{
        fontSize: 11, fontWeight: 400, color: "var(--text-secondary)",
        textAlign: "center", lineHeight: 1.3,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%",
      }}>
        {tool.name}
      </span>
    </Link>
  );
}

// ── Tool row ──────────────────────────────────────────────────────────────────

function ToolRow({ tool }: { tool: any }) {
  const { isEnabled, isToggling, toggle } = useToolStore();
  const { openTool } = useToolModal();
  const enabled = isEnabled(tool.id);
  const toggling = isToggling(tool.id);
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <div
      onClick={e => { 
        if ((e.target as HTMLElement).closest("[data-toggle]")) return;
        openTool(tool.slug);
      }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px", cursor: "pointer",
        transition: "background 0.1s ease",
        borderRadius: 8, margin: "1px 8px",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 7,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        background: tool.iconFile ? "transparent" : tool.iconBg,
      }}>
        {tool.iconFile
          ? <SharedIcon tool={tool} size={24} />
          : <IconComponent style={{ width: 13, height: 13, color: tool.iconColor }} />}
      </div>
      <span style={{
        flex: 1, fontSize: 13, color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {tool.name}
      </span>
      <div data-toggle="true" onClick={e => e.preventDefault()}>
        <ToolToggle enabled={enabled} toggling={toggling}
          onToggle={e => { e.preventDefault(); e.stopPropagation(); toggle(tool.id); }} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePage({ search = "" }: { search?: string }) {
  const { tools, getInstalledTools, isEnabled, toggle, isToggling } = useToolStore();
  const { openTool } = useToolModal();
  const installedTools = getInstalledTools();

  // Active tools for the right sidebar
  const activeTools = tools.filter(t => isEnabled(t.id));

  return (
    <div className="flex-1 flex items-stretch h-full overflow-hidden px-8 pb-8 gap-6 relative animate-entrance">
      {/* Left Column: Active Tools (Quick Access) */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-2 pb-6 scrollbar-hide">
        <div className="mb-3">
          <h2 className="text-lg font-bold tracking-tight text-[#e5e2e1]">Quick Access</h2>
        </div>

        {/* Compact Tool Container - Focused on Active Tools */}
        <div className="card-skeuo rounded-2xl p-4 noise">
          {activeTools.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-[#c1c6d7]/40 italic">No tools currently active</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {activeTools.map(tool => (
                <div 
                  key={tool.id}
                  onClick={() => openTool(tool.slug)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/5 transition-all duration-200 group cursor-pointer"
                >
                  <div className="mb-1.5 transition-transform duration-200 group-hover:scale-110">
                    <SharedIcon tool={tool} size={36} />
                  </div>
                  <span className="text-[10px] font-medium text-[#c1c6d7] text-center line-clamp-1 group-hover:text-[#e5e2e1] transition-colors">{tool.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: ALL Installed Tools */}
      <aside className="w-72 flex flex-col h-full container-skeuo rounded-2xl flex-shrink-0 overflow-hidden noise">
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="font-bold text-sm text-[#e5e2e1] tracking-tight">Installed Tools</h3>
          <button className="p-1.5 rounded-lg hover:bg-white/10 text-[#c1c6d7] btn-skeuo">
            <Icons.Filter className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {installedTools.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-[#c1c6d7]/40">No tools installed</p>
            </div>
          ) : installedTools.map(tool => (
            <div key={tool.id} className="px-4 py-2.5 hover:bg-white/5 flex items-center justify-between border-b border-white/5 group cursor-pointer transition-colors" onClick={() => openTool(tool.slug)}>
              <div 
                className="flex items-center gap-2.5 overflow-hidden" 
              >
                <SharedIcon tool={tool} size={28} />
                <p className="text-[13px] font-medium text-[#e5e2e1] truncate pointer-events-none">{tool.name}</p>
              </div>
              
              <button
                disabled={isToggling(tool.id)}
                onClick={(e) => { e.stopPropagation(); toggle(tool.id); }}
                className={`w-9 h-5 rounded-full relative flex items-center px-1 transition-all duration-300 flex-shrink-0 ${isEnabled(tool.id) ? 'bg-[#3dba6e] status-glow-green toggle-skeuo-on' : 'bg-[#353534] toggle-skeuo'}`}
                style={{
                  boxShadow: isEnabled(tool.id) 
                    ? "0 0 8px rgba(61,186,110,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                    : "inset 0 1px 2px rgba(0,0,0,0.4)"
                }}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-300 ${isEnabled(tool.id) ? 'ml-auto' : 'ml-0'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* CTA Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5">
          <Link to="/explore" className="w-full py-2.5 px-4 rounded-xl border border-white/10 btn-skeuo flex items-center justify-center gap-2 transition-all group no-underline text-[#c1c6d7] hover:text-[#e5e2e1]">
            <span className="text-xs font-semibold">Browse more tools</span>
            <Icons.ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </aside>

    </div>
  );
}
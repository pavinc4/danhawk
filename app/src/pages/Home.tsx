import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowUpDown } from "lucide-react";
import { useToolStore } from "../store/tool-store";
import { QuickGrid, ToolIcon as SharedIcon } from "../components/QuickAccess";
import { useToolModal } from "../App";

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
      style={{
        position: "relative",
        width: 32, height: 18,
        borderRadius: 999,
        border: "none",
        cursor: toggling ? "not-allowed" : "pointer",
        opacity: toggling ? 0.4 : 1,
        flexShrink: 0,
        transition: "all 0.2s ease",
        ...(enabled
          ? { background: "linear-gradient(135deg, #3dba6e, #2da05a)", boxShadow: "0 0 8px rgba(61,186,110,0.3)" }
          : { background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px var(--border-medium)" }),
      }}
    >
      <span style={{
        position: "absolute", top: "50%",
        transform: `translateY(-50%) translateX(${enabled ? "15px" : "2px"})`,
        width: 13, height: 13,
        background: "white", borderRadius: "50%",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        display: "block",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
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
      {tool.iconFile ? (
        <img src={tool.iconFile} alt={tool.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: tool.iconBg, flexShrink: 0,
        }}>
          <IconComponent style={{ width: 20, height: 20, color: tool.iconColor }} />
        </div>
      )}
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
  const { tools, getInstalledTools, isEnabled } = useToolStore();
  const navigate = useNavigate();
  const { openTool } = useToolModal();
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "active" | "inactive">("az");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortLabels = { az: "A → Z", za: "Z → A", active: "Active first", inactive: "Inactive first" };
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("danhawk:pinned");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try { localStorage.setItem("danhawk:pinned", JSON.stringify(next)); } catch { }
      return next;
    });
  };

  // Active tools — pinned ones always first, then rest
  const activeTools = useMemo(() => {
    const active = tools.filter(t => isEnabled(t.id));
    const pinned = active.filter(t => pinnedIds.includes(t.id));
    const rest = active.filter(t => !pinnedIds.includes(t.id));
    return [...pinned, ...rest];
  }, [tools, isEnabled, pinnedIds]);
  const installedTools = getInstalledTools();

  const filteredInstalled = useMemo(() => {
    let list = installedTools;
    if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    if (sortOrder === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === "za") list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === "active") list = [...list].sort((a, b) => {
      const ai = isEnabled(a.id) ? 0 : 1;
      const bi = isEnabled(b.id) ? 0 : 1;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
    });
    else if (sortOrder === "inactive") list = [...list].sort((a, b) => {
      const ai = isEnabled(a.id) ? 1 : 0;
      const bi = isEnabled(b.id) ? 1 : 0;
      return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
    });
    return list;
  }, [installedTools, sortOrder, search, isEnabled]);

  return (
    // Page root: fills the container exactly, nothing overflows out
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      minHeight: 0,
    }} onClick={() => setShowSortMenu(false)}>

      {/* Page header — fixed, never scrolls */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px 14px",
        flexShrink: 0,
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
          Home
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Up to date — clickable, opens changelog */}
          <Link
            to="/changelog"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8, cursor: "pointer",
              transition: "background 0.15s", textDecoration: "none",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
          >
            <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--green-glow)", color: "var(--green)" }}>
              <Icons.CheckCircle size={13} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>Up to date</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1, marginTop: 3 }}>v1.0.0</div>
            </div>
          </Link>

          {/* No conflicts — not clickable */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8, cursor: "default",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
          >
            <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-glow)", color: "var(--accent)" }}>
              <Icons.ShieldCheck size={13} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>No conflicts</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1, marginTop: 3 }}>All clear</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel content row — each panel scrolls independently */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden", // critical — panels handle their own scroll
        minHeight: 0,
      }}>

        {/* ── Left: Quick Access — scrolls independently ──────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border-subtle)",
          overflow: "hidden",
        }}>
          {/* Section label — fixed */}
          <p style={{
            fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            margin: "14px 24px 10px", flexShrink: 0,
          }}>
            Quick access
          </p>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px", minHeight: 0 }}>
            {activeTools.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
                <Icons.Zap size={28} style={{ color: "var(--text-ghost)" }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No active tools</p>
                <Link to="/explore" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Browse tools →</Link>
              </div>
            ) : (
                <QuickGrid
                    tools={activeTools}
                    pinnedIds={pinnedIds}
                    variant="button"
                    onToolClick={(tool) => openTool(tool.slug)}
                    onToolContextMenu={(e, tool) => {
                        const menuW = 165, menuH = 80;
                        const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
                        const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
                        setContextMenu({ x, y, toolId: tool.id, toolSlug: tool.slug });
                    }}
                />
            )}
          </div>
        </div>

        {/* ── Right: Tools panel — scrolls independently ──────────────── */}
        <div style={{
          flexShrink: 0, width: 300,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header — fixed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              Tools
            </p>

            {/* Sort dropdown — same style as Explore */}
            <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowSortMenu(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${showSortMenu ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: showSortMenu ? "var(--accent-dim)" : "none",
                  color: showSortMenu ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 11.5, transition: "all 0.12s",
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
                  borderRadius: 10, overflow: "hidden",
                  zIndex: 50, width: 150,
                  boxShadow: "var(--shadow-lg)",
                  backdropFilter: "blur(20px)",
                }}>
                  {(["az", "za", "active", "inactive"] as const).map(opt => (
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

          {/* Scrollable tool rows */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 8 }}>
            {installedTools.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", gap: 10 }}>
                <Icons.Package size={28} style={{ color: "var(--text-ghost)" }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>No tools installed</p>
                <Link to="/explore" style={{ padding: "6px 14px", background: "var(--accent)", color: "white", borderRadius: 8, fontSize: 11, fontWeight: 500, textDecoration: "none" }}>
                  Browse Tools
                </Link>
              </div>
            ) : filteredInstalled.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "32px 0" }}>No tools match</p>
            ) : (
              filteredInstalled.map((tool) => <ToolRow key={tool.id} tool={tool} />)
            )}
          </div>

          {/* Footer — fixed */}
          <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--border-subtle)", flexShrink: 0 }}>
            <Link to="/explore" style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
            >
              <Icons.Compass size={13} />
              Browse more tools
            </Link>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <QuickContextMenu
          menu={contextMenu}
          isPinned={pinnedIds.includes(contextMenu.toolId)}
          onPin={() => togglePin(contextMenu.toolId)}
          onViewDetails={() => openTool(contextMenu.toolSlug)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
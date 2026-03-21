import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useToolStore } from "../store/tool-store";

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

function QuickCard({ tool, index }: { tool: any; index: number }) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  return (
    <Link
      to={`/tool/${tool.slug}`}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, padding: "14px 8px 10px",
        borderRadius: 12, textDecoration: "none",
        transition: "all 0.15s ease",
        animation: `fadeUp 0.2s ease ${index * 40}ms both`,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
    >
      {/* Icon — custom images render bare, lucide icons get coloured bg box */}
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
  const enabled = isEnabled(tool.id);
  const toggling = isToggling(tool.id);
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <Link
      to={`/tool/${tool.slug}`}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px", textDecoration: "none",
        transition: "background 0.1s ease",
        borderRadius: 8, margin: "1px 8px",
      }}
      onClick={e => { if ((e.target as HTMLElement).closest("[data-toggle]")) e.preventDefault(); }}
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
          ? <img src={tool.iconFile} alt={tool.name} style={{ width: 20, height: 20, objectFit: "contain" }} />
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
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePage({ search = "" }: { search?: string }) {
  const { tools, getInstalledTools, isEnabled } = useToolStore();
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");

  const activeTools = tools.filter(t => isEnabled(t.id));
  const installedTools = getInstalledTools();

  const filteredInstalled = useMemo(() => {
    let list = installedTools;
    if (filter === "on") list = list.filter(t => isEnabled(t.id));
    if (filter === "off") list = list.filter(t => !isEnabled(t.id));
    if (search.trim()) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [installedTools, filter, search, isEnabled]);

  return (
    // Page root: fills the container exactly, nothing overflows out
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",      // fill parent exactly
      overflow: "hidden",  // page itself never scrolls
      minHeight: 0,
    }}>

      {/* Page header — fixed, never scrolls */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px 14px",
        flexShrink: 0,  // never shrinks
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
            margin: "0 24px 10px", flexShrink: 0,
          }}>
            Quick access
          </p>

          {/* Scrollable area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px", minHeight: 0 }}>
            {activeTools.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
                <Icons.Zap size={28} style={{ color: "var(--text-ghost)" }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No active tools</p>
                <Link to="/explore" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Browse tools →</Link>
              </div>
            ) : (
              <div style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid var(--border-subtle)",
                padding: "8px",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 2 }}>
                  {activeTools.map((tool, i) => <QuickCard key={tool.id} tool={tool} index={i} />)}
                </div>
              </div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              Tools
            </p>
            <div style={{ display: "flex", gap: 2 }}>
              {(["all", "on", "off"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: filter === f ? 500 : 400,
                    background: filter === f ? "var(--accent-dim)" : "none",
                    color: filter === f ? "var(--accent)" : "var(--text-muted)",
                    transition: "all 0.1s",
                  }}
                >
                  {f === "all" ? "All" : f === "on" ? "On" : "Off"}
                </button>
              ))}
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
    </div>
  );
}
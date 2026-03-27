import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import type { Tool } from "../lib/types";

// ── Shared Tool Icon ────────────────────────────────────────────────────────
import { ToolIcon } from "./danhawk/ToolIcon";
export { ToolIcon };

// ── Shared Quick Card ───────────────────────────────────────────────────────
export function ToolCard({ 
  tool, 
  isPinned, 
  isSelected, 
  isOpening,
  onClick, 
  onContextMenu,
  onMouseEnter,
  variant = "link" 
}: {
  tool: Tool;
  isPinned?: boolean;
  isSelected?: boolean;
  isOpening?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  variant?: "link" | "button";
}) {
  const content = (
    <>
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

      {/* Icon Area */}
      <div style={{ position: "relative" }}>
        <ToolIcon tool={tool} />
        
        {/* Status dot — if enabled */}
        {tool.enabled && (
          <span style={{
            position: "absolute", bottom: -2, right: -2,
            width: 8, height: 8, borderRadius: "50%",
            background: "#3dba6e", border: "2px solid #0c0c0e",
            boxShadow: "0 0 6px rgba(61,186,110,0.4)",
          }} />
        )}

        {/* Loading spinner — if opening */}
        {isOpening && (
          <div style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: "2px solid #5ba3e8", borderTopColor: "transparent",
            animation: "spin 0.6s linear infinite",
          }} />
        )}
      </div>

      {/* Tool Name */}
      <span style={{
        fontSize: 11, fontWeight: isSelected ? 500 : 400,
        color: isSelected ? "white" : "var(--text-secondary)",
        textAlign: "center", lineHeight: 1.3,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%",
        transition: "color 0.15s",
      }}>
        {tool.name}
      </span>
    </>
  );

  const style: React.CSSProperties = {
    position: "relative",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 8, padding: "14px 8px 10px",
    borderRadius: 12, textDecoration: "none",
    transition: "all 0.15s ease",
    background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
    cursor: "pointer",
    border: "none",
    width: "100%",
    userSelect: "none",
    color: "inherit",
  };

  if (variant === "link") {
    return (
      <Link 
        to={`/tool/${tool.slug}`} 
        style={style}
        onMouseEnter={onMouseEnter}
        onContextMenu={onContextMenu}
      >
        {content}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onContextMenu={onContextMenu}
      style={style}
      className={isSelected ? "selected" : ""}
    >
      {content}
    </button>
  );
}

// ── Shared Quick Grid Container ───────────────────────────────────────────
export function QuickGrid({ tools = [], pinnedIds = [], selectedIndex = -1, openingId = null, onToolClick, onToolHover, onToolContextMenu, variant = "link" }: {
  tools: Tool[];
  pinnedIds?: string[];
  selectedIndex?: number;
  openingId?: string | null;
  onToolClick?: (tool: Tool) => void;
  onToolHover?: (index: number) => void;
  onToolContextMenu?: (e: React.MouseEvent, tool: Tool) => void;
  variant?: "link" | "button";
}) {
  return (
    <div style={{
      borderRadius: 16,
      background: "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid var(--border-subtle)",
      padding: "8px",
      minHeight: tools.length === 0 ? 140 : "auto",
    }}>
      {tools.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
          <Icons.Zap size={28} style={{ color: "var(--text-ghost)" }} />
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No active tools</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 2 }}>
          {tools.map((tool, i) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isPinned={pinnedIds.includes(tool.id)}
              isSelected={i === selectedIndex}
              isOpening={openingId === tool.id}
              variant={variant}
              onClick={() => onToolClick?.(tool)}
              onMouseEnter={() => onToolHover?.(i)}
              onContextMenu={(e) => onToolContextMenu?.(e, tool)}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .selected { background: rgba(255,255,255,0.06) !important; color: white !important; }
      `}</style>
    </div>
  );
}

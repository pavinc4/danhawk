import * as Icons from "lucide-react";
import type { Tool } from "../../lib/types";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

export function ToolIcon({ tool, size = 44 }: { tool: Tool; size?: number }) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  const px = `${size}px`;
  
  // Custom macOS Squircle styling using CSS
  return (
    <div 
      style={{ 
        width: px, height: px, 
        borderRadius: size <= 32 ? "8px" : "22%",
        background: `linear-gradient(145deg, ${tool.iconBg || "#3b82f6"}, ${tool.iconBg || "#3b82f6"}ee)`,
        display: "flex", alignItems: "center", justifyContent: "center", 
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Inner sheen for glass effect */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)" }} />
      
      {tool.iconFile ? (
        <img src={tool.iconFile} alt={tool.name} style={{ width: "55%", height: "55%", objectFit: "contain", position: "relative" }} />
      ) : (
        <IconComponent style={{ width: "50%", height: "50%", color: "white", position: "relative" }} />
      )}
    </div>
  );
}

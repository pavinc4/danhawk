import * as Icons from "lucide-react";
import type { Tool } from "../../lib/types";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

export function ToolIcon({ tool, size = 44 }: { tool: Tool; size?: number }) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  const px = `${size}px`;
  
  // Custom macOS Squircle styling using CSS
  return (
    <div 
      className="icon-skeuo"
      style={{ 
        width: px, height: px, 
        borderRadius: size <= 32 ? "10px" : "28%",
        background: tool.iconBg || "#3b82f6",
        display: "flex", alignItems: "center", justifyContent: "center", 
        flexShrink: 0,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {tool.iconFile ? (
        <img src={tool.iconFile} alt={tool.name} style={{ width: "60%", height: "60%", objectFit: "contain", position: "relative" }} />
      ) : (
        <IconComponent style={{ width: "55%", height: "55%", color: "white", position: "relative" }} />
      )}
    </div>
  );
}

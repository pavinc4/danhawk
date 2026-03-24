import { useState, useEffect, useRef, useCallback } from "react";
import * as Icons from "lucide-react";
import type { Tool } from "../lib/types";

// ── Tauri helpers ─────────────────────────────────────────────────────────────
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(command, args);
}

async function hideLauncher() {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
}

// ── Icon helper — IDENTICAL TO HOME.TSX ──────────────────────
function ToolIcon({ tool }: { tool: Tool }) {
    if (tool.iconFile) {
        // Match Home.tsx: width 36 height 36 for image
        // Check if iconFile already has data: prefix
        const src = tool.iconFile.startsWith("data:") ? tool.iconFile : `data:image/png;base64,${tool.iconFile}`;
        return (
            <img
                src={src}
                alt={tool.name}
                style={{ width: 36, height: 36, objectFit: "contain" }}
            />
        );
    }

    const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; style?: any }>>)[tool.icon || "Puzzle"];
    return (
        <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: tool.iconBg || "rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
        }}>
            {LucideIcon && <LucideIcon size={20} color={tool.iconColor || "#888"} />}
        </div>
    );
}

// ── Quick Access Card — Mirror of Home.tsx style ──────────────────────────────
function LauncherCard({ tool, isSelected, isOpening, onSelect, onClick }: {
    tool: Tool;
    isSelected: boolean;
    isOpening: boolean;
    onSelect: () => void;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            onMouseEnter={onSelect}
            className={`launcher-card ${isSelected ? "selected" : ""}`}
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "14px 8px 10px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
            }}
        >
            <div style={{ position: "relative" }}>
               <ToolIcon tool={tool} />
               
               {/* Enabled indicator — Home.tsx style dot */}
               {tool.enabled && (
                   <span style={{
                       position: "absolute",
                       bottom: -2,
                       right: -2,
                       width: 8,
                       height: 8,
                       borderRadius: "50%",
                       background: "#3dba6e",
                       border: "2px solid #0c0c0e",
                       boxShadow: "0 0 6px rgba(61,186,110,0.4)",
                   }} />
               )}

               {isOpening && (
                   <div style={{
                       position: "absolute",
                       inset: -4,
                       borderRadius: "50%",
                       border: "2px solid #5ba3e8",
                       borderTopColor: "transparent",
                       animation: "spin 0.6s linear infinite",
                   }} />
               )}
            </div>

            <span style={{
                fontSize: 11,
                fontWeight: 400,
                color: "inherit", // Managed by CSS
                textAlign: "center",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                width: "100%",
                transition: "color 0.15s",
            }}>
                {tool.name}
            </span>
        </div>
    );
}

// ── Main Launcher ─────────────────────────────────────────────────────────────
export default function Launcher() {
    const [query, setQuery] = useState("");
    const [tools, setTools] = useState<Tool[]>([]);
    const [selected, setSelected] = useState(-1); // -1 means no keyboard selection
    const [opening, setOpening] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const refreshTools = useCallback(async () => {
        try {
            const all = await invoke<Tool[]>("get_tools");
            const installed = all.filter(t => t.installed);
            setTools(installed);
        } catch (e) {
            console.error("Failed to refresh launcher tools:", e);
        }
    }, []);

    // Initial load + Real-time Sync
    useEffect(() => {
        refreshTools();

        // Listen for changes from other windows/backend
        let unlisten: any;
        import("@tauri-apps/api/event").then(({ listen }) => {
            listen("tools-changed", () => refreshTools()).then(u => unlisten = u);
        });

        // Also refresh whenever this window gains focus (just in case)
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
            const win = getCurrentWindow();
            win.onFocusChanged(({ focused }) => {
                if (focused) refreshTools();
            });
        });

        return () => { if (unlisten) unlisten(); };
    }, [refreshTools]);

    // Focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const filtered = query.trim()
        ? tools.filter(t =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.description?.toLowerCase().includes(query.toLowerCase())
        )
        : tools;

    // Selection resets on query change
    useEffect(() => { 
        if (filtered.length > 0) setSelected(0);
        else setSelected(-1);
    }, [query, filtered.length]);

    const openTool = useCallback(async (tool: Tool) => {
        setOpening(tool.id);
        try {
            await invoke("open_tool", { toolId: tool.id });
            await hideLauncher();
            setQuery("");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("non-zero") || msg.includes("open")) {
                await hideLauncher();
                setQuery("");
            }
        } finally {
            setOpening(null);
        }
    }, []);

    // Keyboard navigation — adjusted for 4-column grid
    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Escape") { hideLauncher(); return; }
        const cols = 4;
        
        if (e.key === "ArrowDown") { 
            e.preventDefault(); 
            setSelected(s => s === -1 ? 0 : Math.min(s + cols, filtered.length - 1)); 
        }
        if (e.key === "ArrowUp") { 
            e.preventDefault(); 
            setSelected(s => s === -1 ? 0 : Math.max(s - cols, 0)); 
        }
        if (e.key === "ArrowRight") { 
            e.preventDefault(); 
            setSelected(s => s === -1 ? 0 : Math.min(s + 1, filtered.length - 1)); 
        }
        if (e.key === "ArrowLeft") { 
            e.preventDefault(); 
            setSelected(s => s === -1 ? 0 : Math.max(s - 1, 0)); 
        }
        if (e.key === "Enter" && filtered[selected]) { 
            openTool(filtered[selected]); 
        }
    }, [filtered, selected, openTool]);

    return (
        <div style={{ width: "100vw", height: "100vh", background: "transparent", display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "hidden" }} onKeyDown={onKeyDown}>
            <div style={{
                width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", 
                background: "rgba(12, 12, 14, 0.98)", border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 32px 64px rgba(0,0,0,0.8)", backdropFilter: "blur(40px)", display: "flex", flexDirection: "column",
            }}>
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                    <Icons.Search size={18} strokeWidth={2.5} color="rgba(255,255,255,0.4)" />
                    <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools..." 
                        style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 17, fontWeight: 400, caretColor: "#5ba3e8" }} 
                    />
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "3px 7px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>ESC</span>
                    </div>
                </div>

                {/* Content area matching Home.tsx structure */}
                <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "16px 4px 10px" }}>
                        {query ? "Search Results" : "Quick Access"}
                    </p>

                    {/* The Gradient Container from Home.tsx */}
                    <div style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        padding: "8px",
                        minHeight: 140,
                    }}>
                        {filtered.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: "rgba(255,255,255,0.15)" }}>
                                <Icons.Zap size={28} />
                                <p style={{ fontSize: 12, margin: 0 }}>No tools found</p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
                                {filtered.map((tool, i) => (
                                    <LauncherCard 
                                        key={tool.id} 
                                        tool={tool} 
                                        isSelected={i === selected} 
                                        isOpening={opening === tool.id}
                                        onSelect={() => setSelected(i)}
                                        onClick={() => openTool(tool)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", gap: 16, flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>
                        <span style={{ padding: "1px 4px", background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>↑↓←→</span>
                        <span>Navigate</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>
                        <span style={{ padding: "1px 4px", background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>ENTER</span>
                        <span>Open Tool</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                * { box-sizing: border-box; }
                body, html, #root { margin: 0; padding: 0; background: transparent !important; }
                input::placeholder { color: rgba(255,255,255,0.2) !important; }
                ::-webkit-scrollbar { width: 0px; }
                
                .launcher-card {
                    color: rgba(255,255,255,0.45);
                    background: transparent;
                }
                .launcher-card:hover, .launcher-card.selected {
                    background: rgba(255,255,255,0.06) !important;
                    color: rgba(255,255,255,0.9) !important;
                }
            `}</style>
        </div>
    );
}
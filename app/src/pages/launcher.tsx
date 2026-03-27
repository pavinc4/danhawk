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
        const src = tool.iconFile.startsWith("data:") ? tool.iconFile : `data:image/png;base64,${tool.iconFile}`;
        return (
            <img
                src={src}
                alt={tool.name}
                style={{ width: 32, height: 32, objectFit: "contain" }}
            />
        );
    }

    const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; style?: any }>>)[tool.icon || "Puzzle"];
    return (
        <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: tool.iconBg || "rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
        }}>
            {LucideIcon && <LucideIcon size={18} color={tool.iconColor || "#888"} />}
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
                gap: 6,
                padding: "10px 6px 8px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.15s ease",
            }}
        >
            <div style={{ position: "relative" }}>
               <ToolIcon tool={tool} />
               
               {tool.enabled && (
                   <span style={{
                       position: "absolute",
                       bottom: -1,
                       right: -1,
                       width: 7,
                       height: 7,
                       borderRadius: "50%",
                       background: "#3dba6e",
                       border: "1.5px solid #0c0c0e",
                       boxShadow: "0 0 4px rgba(61,186,110,0.4)",
                   }} />
               )}

               {isOpening && (
                   <div style={{
                       position: "absolute",
                       inset: -3,
                       borderRadius: "50%",
                       border: "2px solid #5ba3e8",
                       borderTopColor: "transparent",
                       animation: "spin 0.6s linear infinite",
                   }} />
               )}
            </div>

            <span style={{
                fontSize: 10,
                fontWeight: 400,
                color: "inherit",
                textAlign: "center",
                lineHeight: 1.2,
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
    const [selected, setSelected] = useState(-1);
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

    useEffect(() => {
        refreshTools();
        let unlisten: any;
        import("@tauri-apps/api/event").then(({ listen }) => {
            listen("tools-changed", () => refreshTools()).then(u => unlisten = u);
        });
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
            getCurrentWindow().onFocusChanged(({ focused }) => {
                if (focused) refreshTools();
            });
        });
        return () => { if (unlisten) unlisten(); };
    }, [refreshTools]);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const filtered = query.trim()
        ? tools.filter(t =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.description?.toLowerCase().includes(query.toLowerCase())
        )
        : tools;

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
            await hideLauncher();
            setQuery("");
        } finally {
            setOpening(null);
        }
    }, []);

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
            <div className="container-skeuo noise" style={{
                width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", 
                display: "flex", flexDirection: "column",
            }}>
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                    <Icons.Search size={16} strokeWidth={2.5} color="rgba(255,255,255,0.4)" />
                    <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools..." 
                        className="input-skeuo"
                        style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 15, fontWeight: 400, caretColor: "#5ba3e8", padding: "6px 10px", borderRadius: 8 }} 
                    />
                    <div className="btn-skeuo" style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                        ESC
                    </div>
                </div>

                {/* Content area */}
                <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 18px", display: "flex", flexDirection: "column" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "14px 4px 8px" }}>
                        {query ? "Search Results" : "Quick Access"}
                    </p>

                    <div className="card-skeuo noise" style={{
                        borderRadius: 14,
                        padding: "6px",
                        minHeight: 120,
                    }}>
                        {filtered.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: 8, color: "rgba(255,255,255,0.15)" }}>
                                <Icons.Zap size={24} />
                                <p style={{ fontSize: 11, margin: 0 }}>No tools found</p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
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

                {/* Footer labels */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", gap: 12, flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
                    <div className="btn-skeuo" style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 7 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.5 }}>↑↓←→</span>
                        <span style={{ fontSize: 9, fontWeight: 600 }}>Navigate</span>
                    </div>
                    <div className="btn-skeuo" style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 7 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.5 }}>ENTER</span>
                        <span style={{ fontSize: 9, fontWeight: 600 }}>Open Tool</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                * { box-sizing: border-box; }
                body, html, #root { margin: 0; padding: 0; background: transparent !important; }
                input::placeholder { color: rgba(255,255,255,0.2) !important; }
                ::-webkit-scrollbar { width: 0px; }
                .launcher-card { color: rgba(255,255,255,0.45); background: transparent; }
                .launcher-card:hover, .launcher-card.selected { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.9) !important; }
            `}</style>
        </div>
    );
}
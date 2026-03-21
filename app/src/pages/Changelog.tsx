import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChangeSection {
    title: string;   // "Improvements" | "Fixes" | "Patches" | etc.
    items: string[];
}

interface ChangeVersion {
    version: string;   // "1.0.0"
    date: string;      // "Mar 21, 2026"
    summary: string;   // text after >
    sections: ChangeSection[];
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Parses the CHANGELOG.md format:
// ## 1.0.0 — Mar 21, 2026
// > summary text
// ### Section Title
// - item

function parseChangelog(md: string): ChangeVersion[] {
    const versions: ChangeVersion[] = [];
    const lines = md.split("\n");
    let current: ChangeVersion | null = null;
    let currentSection: ChangeSection | null = null;

    for (const raw of lines) {
        const line = raw.trim();

        // Version header: ## 1.0.0 — Mar 21, 2026
        const vMatch = line.match(/^##\s+(.+?)\s+[—–-]+\s+(.+)$/);
        if (vMatch) {
            if (currentSection && current) current.sections.push(currentSection);
            if (current) versions.push(current);
            currentSection = null;
            current = { version: vMatch[1].trim(), date: vMatch[2].trim(), summary: "", sections: [] };
            continue;
        }

        if (!current) continue;

        // Summary: > text
        if (line.startsWith("> ")) {
            current.summary = line.slice(2).trim();
            continue;
        }

        // Section: ### Title
        if (line.startsWith("### ")) {
            if (currentSection) current.sections.push(currentSection);
            currentSection = { title: line.slice(4).trim(), items: [] };
            continue;
        }

        // Item: - text
        if (line.startsWith("- ") && currentSection) {
            currentSection.items.push(line.slice(2).trim());
        }
    }

    // Flush last section and version
    if (currentSection && current) current.sections.push(currentSection);
    if (current) versions.push(current);

    return versions;
}

// ── Section colours ───────────────────────────────────────────────────────────

function sectionColor(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("improvement") || t.includes("feature")) return "#3b8bdb";
    if (t.includes("fix")) return "#3dba6e";
    if (t.includes("patch") || t.includes("break")) return "#e09535";
    return "#888888";
}

// ── Section accordion ─────────────────────────────────────────────────────────

function SectionAccordion({ section }: { section: ChangeSection }) {
    const [open, setOpen] = useState(false);
    const color = sectionColor(section.title);

    return (
        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 8 }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                    transition: "opacity 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.8"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
            >
                <span style={{ fontSize: 12.5, fontWeight: 500, color }}>
                    {section.title} ({section.items.length})
                </span>
                {open
                    ? <ChevronUp size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                }
            </button>

            {open && (
                <ul style={{ margin: "0 0 10px", padding: 0, listStyle: "none" }}>
                    {section.items.map((item, i) => (
                        <li key={i} style={{ display: "flex", gap: 8, padding: "4px 0", alignItems: "flex-start" }}>
                            <span style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0, fontSize: 12 }}>•</span>
                            <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Version row ───────────────────────────────────────────────────────────────

function VersionRow({ entry, index }: { entry: ChangeVersion; index: number }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 24,
            paddingBottom: 24,
            borderBottom: "1px solid var(--border-subtle)",
            animation: `fadeUp 0.2s ease ${index * 60}ms both`,
        }}>
            {/* Left — version + date */}
            <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    {entry.version}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{entry.date}</p>
            </div>

            {/* Right — summary + accordions */}
            <div style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: "16px 20px",
            }}>
                {entry.summary && (
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 4px" }}>
                        {entry.summary}
                    </p>
                )}

                {entry.sections.map((sec, i) => (
                    <SectionAccordion key={i} section={sec} />
                ))}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// Replace with your platform repo details
const CHANGELOG_URL =
    "https://raw.githubusercontent.com/pavinc4/danhawk/main/CHANGELOG.md";

export default function ChangelogPage() {
    const [versions, setVersions] = useState<ChangeVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastFetched, setLastFetched] = useState<string | null>(null);

    const fetchChangelog = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(CHANGELOG_URL);
            if (!res.ok) throw new Error("fetch failed");
            const text = await res.text();
            const parsed = parseChangelog(text);
            setVersions(parsed);
            setLastFetched(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChangelog(); }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minHeight: 0 }}>

            {/* Page header */}
            <div style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 24px 14px",
                borderBottom: "1px solid var(--border-subtle)",
            }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
                        Changelog
                    </h1>
                    {lastFetched && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>
                            Fetched at {lastFetched}
                        </p>
                    )}
                </div>

                <button
                    onClick={fetchChangelog}
                    disabled={loading}
                    style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)",
                        background: "none", color: "var(--text-muted)", fontSize: 12,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.5 : 1, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-medium)"; }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"}
                >
                    <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", minHeight: 0 }}>
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                        <RefreshCw size={16} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading changelog...</span>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Couldn't load changelog</p>
                        <button
                            onClick={fetchChangelog}
                            style={{ padding: "6px 16px", background: "var(--accent)", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                        >
                            Try again
                        </button>
                    </div>
                ) : versions.length === 0 ? (
                    <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", paddingTop: 48 }}>
                        No changelog entries found.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
                        {/* Column headers */}
                        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 24 }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Version</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</span>
                        </div>
                        {versions.map((v, i) => <VersionRow key={v.version} entry={v} index={i} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
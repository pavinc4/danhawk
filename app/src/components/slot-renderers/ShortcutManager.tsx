// ShortcutManager.tsx
// Self-contained shortcut manager UI for the multikey-shortcuts extension.
// Ported from qkey with danhawk blue dark theme.
// Renders as a full-screen overlay inside the danhawk app window.

import { useState, useEffect, useCallback, useRef } from "react";

async function invoke(command: string, args?: Record<string, unknown>) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke(command, args);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Shortcut {
    id: string;
    name: string;
    path: string;
    type: "app" | "link" | "folder";
    chord: string[]; // e.g. ["Ctrl","Shift","W","I"]
}

interface ShortcutManagerProps {
    extId: string;  // passed from slot renderer — no hardcoding
    onClose: () => void;
}

// ── Key capture state ─────────────────────────────────────────────────────────

const PHASE = { IDLE: 0, FIRST: 1, WAITING: 2, DONE: 3 } as const;
type Phase = typeof PHASE[keyof typeof PHASE];

const MOD_KEYS = new Set(["Control", "Alt", "Shift", "Meta", "OS", "AltGraph", "Super", "Win"]);
const MOD_CHIPS = new Set(["Control", "Ctrl", "Super", "Meta", "Win", "Alt", "Shift"]);
const DISPLAY_MAP: Record<string, string> = {
    Control: "Ctrl", Ctrl: "Ctrl", Super: "Win", Meta: "Win", Win: "Win", Alt: "Alt", Shift: "Shift",
};
const CODE_TO_LABEL: Record<string, string> = {
    KeyA: "A", KeyB: "B", KeyC: "C", KeyD: "D", KeyE: "E", KeyF: "F", KeyG: "G", KeyH: "H", KeyI: "I",
    KeyJ: "J", KeyK: "K", KeyL: "L", KeyM: "M", KeyN: "N", KeyO: "O", KeyP: "P", KeyQ: "Q", KeyR: "R",
    KeyS: "S", KeyT: "T", KeyU: "U", KeyV: "V", KeyW: "W", KeyX: "X", KeyY: "Y", KeyZ: "Z",
    Digit0: "0", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4",
    Digit5: "5", Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9",
    F1: "F1", F2: "F2", F3: "F3", F4: "F4", F5: "F5", F6: "F6",
    F7: "F7", F8: "F8", F9: "F9", F10: "F10", F11: "F11", F12: "F12",
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Enter: "Enter", Escape: "Escape", Tab: "Tab", Backspace: "Backspace", Space: "Space",
    Delete: "Delete", Insert: "Insert", Home: "Home", End: "End", PageUp: "PgUp", PageDown: "PgDn",
    Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\",
    Semicolon: ";", Quote: "'", Backquote: "`", Comma: ",", Period: ".", Slash: "/",
};

// ── AHK generator ─────────────────────────────────────────────────────────────
// Generates shortcuts.ahk using the same ArmChord pattern as the original file.
// shortcuts.json is the source of truth — AHK is always fully regenerated from it.

function isMod(k: string) {
    return ["Ctrl", "Control", "Alt", "Shift", "Win", "Meta", "Super"].includes(k);
}

function keyToAhk(k: string): string {
    const m: Record<string, string> = {
        Enter: "Enter", Escape: "Escape", Tab: "Tab", Backspace: "Backspace",
        Delete: "Delete", Insert: "Insert", Home: "Home", End: "End",
        PgUp: "PgUp", PgDn: "PgDn", Up: "Up", Down: "Down", Left: "Left", Right: "Right",
        Space: "Space", F1: "F1", F2: "F2", F3: "F3", F4: "F4", F5: "F5", F6: "F6",
        F7: "F7", F8: "F8", F9: "F9", F10: "F10", F11: "F11", F12: "F12",
    };
    return m[k] ?? k.toLowerCase();
}

function groupToAhk(keys: string[]): string {
    const hasCtrl = keys.some(k => k === "Ctrl" || k === "Control");
    const hasAlt = keys.some(k => k === "Alt");
    const ctrl = (hasCtrl && hasAlt) ? "<^" : "^";
    const alt = (hasCtrl && hasAlt) ? "<!" : "!";
    let r = "";
    for (const k of keys) {
        if (k === "Ctrl" || k === "Control") r += ctrl;
        else if (k === "Alt") r += alt;
        else if (k === "Shift") r += "+";
        else if (k === "Win" || k === "Meta" || k === "Super") r += "#";
        else r += keyToAhk(k);
    }
    return r;
}

function generateAhk(shortcuts: Shortcut[]): string {
    const NL = "\n";
    const header = [
        "; shortcuts.ahk — DanHawk: Multikey Shortcuts (auto-generated, do not edit manually)",
        "; Edit shortcuts via the Manage Shortcuts button in the Danhawk app.",
        "#Requires AutoHotkey v2.0",
        "#SingleInstance Force",
        "",
        "; Write PID file so DanHawk can kill this process on toggle-off",
        'pidDir := A_AppData "\\..\\Local\\Danhawk\\pids"',
        "if !DirExist(pidDir)",
        "    DirCreate(pidDir)",
        'FileOpen(pidDir "\\multikey-shortcuts.pid", "w").Write(ProcessExist())',
        "",
        "; State — which chord is currently armed",
        'global activeChord := ""',
        "",
        "ArmChord(chord, hint) {",
        "    global activeChord",
        "    activeChord := chord",
        "    ToolTip(hint, , , 1)",
        "    SetTimer(Disarm, -2000)",
        "}",
        "",
        "Disarm() {",
        "    global activeChord",
        '    activeChord := ""',
        '    ToolTip("", , , 1)',
        "}",
        "",
    ].join(NL);

    if (!shortcuts.length) {
        return header + "Persistent" + NL;
    }

    const groups = new Map<string, Shortcut[]>();
    const singles: Shortcut[] = [];

    for (const s of shortcuts) {
        const nonModIdx = s.chord.map((k, i) => (isMod(k) ? -1 : i)).filter(i => i >= 0);
        if (nonModIdx.length >= 2) {
            const triggerKeys = s.chord.slice(0, nonModIdx[0] + 1);
            const key = triggerKeys.join("+");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(s);
        } else {
            singles.push(s);
        }
    }

    let out = header;
    out += "; ── Chord triggers ────────────────────────────────────────────────────────────" + NL + NL;

    for (const [triggerKey, entries] of groups) {
        const triggerKeys = triggerKey.split("+");
        const hint = entries.map(e => {
            const lastKey = e.chord[e.chord.length - 1];
            const disp = DISPLAY_MAP[lastKey] || lastKey;
            return `${disp}: ${e.name}`;
        }).join("   ");
        const chordId = triggerKey.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        out += groupToAhk(triggerKeys) + "::" + NL;
        out += "{" + NL;
        out += `    ArmChord("${chordId}", "${triggerKey}  -  ${hint}")` + NL;
        out += "}" + NL + NL;
    }

    if (singles.length) {
        out += "; ── Single key shortcuts ─────────────────────────────────────────────────────" + NL + NL;
        for (const s of singles) {
            const launch = s.type === "link"
                ? `Run "${s.path}"`
                : s.type === "folder"
                    ? `Run "explorer.exe \\"${s.path}\\""`
                    : `Run "${s.path}"`;
            out += `; ${s.name}` + NL;
            out += groupToAhk(s.chord) + "::" + NL;
            out += "{" + NL;
            out += `    ${launch}` + NL;
            out += "}" + NL + NL;
        }
    }

    if (groups.size) {
        out += "; ── Second key handlers ───────────────────────────────────────────────────────" + NL + NL;
        const secondKeyMap = new Map<string, Shortcut[]>();
        for (const entries of groups.values()) {
            for (const s of entries) {
                const lastKey = keyToAhk(s.chord[s.chord.length - 1]);
                if (!secondKeyMap.has(lastKey)) secondKeyMap.set(lastKey, []);
                secondKeyMap.get(lastKey)!.push(s);
            }
        }
        for (const [ahkKey, entries] of secondKeyMap) {
            out += `~${ahkKey}::` + NL + "{" + NL + "    global activeChord" + NL;
            for (const s of entries) {
                const firstNonMod = s.chord.map((k, i) => (isMod(k) ? -1 : i)).filter(i => i >= 0)[0];
                const triggerKeys = s.chord.slice(0, firstNonMod + 1);
                const chordId = triggerKeys.join("+").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                const launch = s.type === "link"
                    ? `Run "${s.path}"`
                    : s.type === "folder"
                        ? `Run "explorer.exe \\"${s.path}\\""`
                        : `Run "${s.path}"`;
                out += `    if (activeChord = "${chordId}") {` + NL;
                out += "        Disarm()" + NL;
                out += `        ${launch}` + NL;
                out += "        return" + NL;
                out += "    }" + NL;
            }
            out += "}" + NL + NL;
        }
        out += "; ── Cancel sequence on these keys ─────────────────────────────────────────────" + NL + NL;
        out += "~Escape::" + NL + "{" + NL + "    Disarm()" + NL + "}" + NL + NL;
        out += "~Space::" + NL + "{" + NL + "    Disarm()" + NL + "}" + NL + NL;
        out += "~Enter::" + NL + "{" + NL + "    Disarm()" + NL + "}" + NL + NL;
    }

    out += "Persistent" + NL;
    return out;
}

// ── Key badge renderer ────────────────────────────────────────────────────────

function KeyBadge({ keys }: { keys: string[] }) {
    if (!keys.length) return null;
    return (
        <span className="flex items-center gap-0.5 flex-wrap">
            {keys.map((k, i) => {
                const label = DISPLAY_MAP[k] || k;
                const isLast = i === keys.length - 1;
                const curMod = MOD_CHIPS.has(k);
                const nextMod = i < keys.length - 1 ? MOD_CHIPS.has(keys[i + 1]) : false;
                return (
                    <span key={i} className="flex items-center gap-0.5">
                        <span className="inline-flex items-center justify-center bg-[#1e1e1e] border border-[#333] rounded px-1.5 py-0.5 text-[10.5px] font-mono text-[#e8e8e8] min-w-[20px] shadow-[0_1px_0_rgba(255,255,255,0.05)]">
                            {label}
                        </span>
                        {!isLast && (
                            (curMod || nextMod)
                                ? <span className="text-[#555] text-[10px] mx-0.5">+</span>
                                : <span className="text-[#3b8bdb] font-bold text-[12px] mx-1">→</span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

// ── Capture zone component ────────────────────────────────────────────────────

interface CaptureZoneProps {
    phase: Phase;
    keys: string[];
    conflict: boolean;
    conflictName?: string;
    onClick: () => void;
}

function CaptureZone({ phase, keys, conflict, conflictName, onClick }: CaptureZoneProps) {
    const base = "min-h-[90px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 cursor-pointer transition-all duration-150 px-4 py-3";

    if (phase === PHASE.IDLE) return (
        <div className={`${base} border-dashed border-[#2a2a2a] hover:border-[#3b8bdb]/40`} onClick={onClick}>
            <svg className="opacity-30 mb-1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="3" />
            </svg>
            <div className="text-[13px] text-[#555] font-medium">Click here to start listening</div>
            <div className="text-[11px] text-[#444]">e.g. Ctrl+Alt+V, or Ctrl+Y then T</div>
        </div>
    );

    if (phase === PHASE.FIRST) return (
        <div className={`${base} border-[#3b8bdb] bg-[#3b8bdb]/8 border-dashed`} style={{ animation: "pulse 1s ease infinite" }}>
            <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(59,139,219,0.25)} 50%{box-shadow:0 0 0 8px transparent} }`}</style>
            <div className="text-[15px] font-semibold text-[#3b8bdb]">🎧 Press your shortcut now</div>
            <div className="text-[11px] text-[#555] mt-1">Hold modifiers + press a key (e.g. Ctrl+Alt+Y)</div>
        </div>
    );

    if (phase === PHASE.WAITING) return (
        <div className={`${base} border-[#3b8bdb] bg-[#3b8bdb]/8 border-dashed`}>
            <div className="mb-2"><KeyBadge keys={keys} /></div>
            <div className="text-[12px] text-[#3b8bdb]">⏳ Press a second key within 1.5s — or wait to use this as-is</div>
        </div>
    );

    // DONE
    return (
        <div
            className={`${base} ${conflict ? "border-[#ef5350] bg-[#ef5350]/6" : "border-[#22c55e] bg-[#22c55e]/6"}`}
            style={{ borderStyle: "solid" }}
            onClick={onClick}
        >
            <div className="mb-1.5"><KeyBadge keys={keys} /></div>
            <div className={`text-[11px] font-medium ${conflict ? "text-[#ef5350]" : "text-[#22c55e]"}`}>
                {conflict
                    ? `⚠ Conflict with "${conflictName}" — click to change`
                    : "✓ Shortcut captured — click to change"}
            </div>
        </div>
    );
}

// ── useCapture hook ───────────────────────────────────────────────────────────

function useCapture(active: boolean, existingShortcuts: Shortcut[], editId?: string) {
    const [phase, setPhase] = useState<Phase>(PHASE.IDLE);
    const [keys, setKeys] = useState<string[]>([]);
    const [conflict, setConflict] = useState(false);
    const [conflictName, setConflictName] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heldMods = useRef({ ctrl: false, alt: false, shift: false, meta: false });

    const checkConflict = useCallback((k: string[]) => {
        const chord = k.join("+");
        const found = existingShortcuts.find(s => s.id !== editId && s.chord.join("+") === chord);
        setConflict(!!found);
        setConflictName(found?.name ?? "");
    }, [existingShortcuts, editId]);

    const reset = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase(PHASE.IDLE); setKeys([]); setConflict(false); setConflictName("");
    }, []);

    const handleClick = useCallback(() => {
        if (phase === PHASE.FIRST || phase === PHASE.WAITING) return;
        reset();
        setPhase(PHASE.FIRST);
    }, [phase, reset]);

    useEffect(() => {
        if (!active) return;

        const buildGroup = (label: string): string[] => {
            const g: string[] = [];
            if (heldMods.current.ctrl) g.push("Ctrl");
            if (heldMods.current.alt) g.push("Alt");
            if (heldMods.current.shift) g.push("Shift");
            if (heldMods.current.meta) g.push("Win");
            g.push(label);
            return g;
        };

        const onDown = (e: KeyboardEvent) => {
            if (e.code === "ControlLeft" || e.code === "ControlRight") heldMods.current.ctrl = true;
            if (e.code === "AltLeft" || e.code === "AltRight") heldMods.current.alt = true;
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") heldMods.current.shift = true;
            if (e.code === "MetaLeft" || e.code === "MetaRight") heldMods.current.meta = true;

            if (phase !== PHASE.FIRST && phase !== PHASE.WAITING) return;
            if (MOD_KEYS.has(e.key) || e.key === "AltGraph") return;
            e.preventDefault(); e.stopPropagation();

            const label = CODE_TO_LABEL[e.code] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);

            if (phase === PHASE.FIRST) {
                const newKeys = buildGroup(label);
                setKeys(newKeys);
                setPhase(PHASE.WAITING);
                timerRef.current = setTimeout(() => {
                    setPhase(PHASE.DONE);
                    checkConflict(newKeys);
                }, 1500);
            } else if (phase === PHASE.WAITING) {
                if (timerRef.current) clearTimeout(timerRef.current);
                setKeys(prev => {
                    const updated = [...prev, label];
                    checkConflict(updated);
                    return updated;
                });
                setPhase(PHASE.DONE);
            }
        };

        const onUp = (e: KeyboardEvent) => {
            if (e.code === "ControlLeft" || e.code === "ControlRight") heldMods.current.ctrl = false;
            if (e.code === "AltLeft" || e.code === "AltRight") heldMods.current.alt = false;
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") heldMods.current.shift = false;
            if (e.code === "MetaLeft" || e.code === "MetaRight") heldMods.current.meta = false;
        };

        const onBlur = () => {
            heldMods.current = { ctrl: false, alt: false, shift: false, meta: false };
        };

        window.addEventListener("keydown", onDown, true);
        window.addEventListener("keyup", onUp, true);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("keydown", onDown, true);
            window.removeEventListener("keyup", onUp, true);
            window.removeEventListener("blur", onBlur);
        };
    }, [phase, active, checkConflict]);

    return { phase, keys, conflict, conflictName, handleClick, reset };
}

// ── Add/Edit modal ────────────────────────────────────────────────────────────

type ModalType = "app" | "link" | "folder";

interface AddModalProps {
    type: ModalType;
    editItem?: Shortcut;
    shortcuts: Shortcut[];
    onSave: (s: Shortcut) => void;
    onClose: () => void;
}

function AddModal({ type, editItem, shortcuts, onSave, onClose }: AddModalProps) {
    const [name, setName] = useState(editItem?.name ?? "");
    const [path, setPath] = useState(editItem?.path ?? "");
    const capture = useCapture(true, shortcuts, editItem?.id);

    // Pre-fill existing shortcut
    useEffect(() => {
        if (editItem?.chord.length) {
            // Can't set phase to DONE from outside easily — just show existing
        }
    }, [editItem]);

    const icons: Record<ModalType, string> = { app: "🖥️", link: "🔗", folder: "📁" };
    const titles: Record<ModalType, string> = {
        app: editItem ? "Edit App Shortcut" : "Add App Shortcut",
        link: editItem ? "Edit Link Shortcut" : "Add Link Shortcut",
        folder: editItem ? "Edit Folder Shortcut" : "Add Folder Shortcut",
    };

    const handleSave = () => {
        if (capture.phase !== PHASE.DONE || !capture.keys.length) return;
        if (capture.conflict) return;
        if (!name.trim() || !path.trim()) return;

        let finalPath = path.trim();
        if (type === "link" && !finalPath.startsWith("http")) finalPath = "https://" + finalPath;

        onSave({
            id: editItem?.id ?? `${type}_${Date.now()}`,
            name: name.trim(),
            path: finalPath,
            type,
            chord: capture.keys,
        });
    };

    const handlePickFolder = () => {
        // No native dialog available — user types path directly in the input below
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[3px]" />
            <div
                className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl w-[460px] overflow-hidden"
                style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
                onClick={e => e.stopPropagation()}
            >
                <style>{`@keyframes modalIn { from{transform:scale(0.94) translateY(8px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }`}</style>

                {/* Header */}
                <div className="flex items-start gap-3 p-5 border-b border-[#1e1e1e]">
                    <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {icons[type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#e8e8e8]">{titles[type]}</p>
                        <p className="text-[12px] text-[#555]">Assign a multikey chord to this {type}</p>
                    </div>
                    <button onClick={onClose} className="text-[#555] hover:text-[#e8e8e8] transition-colors p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <CaptureZone
                        phase={capture.phase}
                        keys={capture.keys}
                        conflict={capture.conflict}
                        conflictName={capture.conflictName}
                        onClick={capture.handleClick}
                    />

                    {capture.conflict && (
                        <div className="flex items-center gap-2 bg-[#ef5350]/10 border border-[#ef5350]/25 rounded-lg px-3 py-2 text-[12px] text-[#ef5350]">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Already used by <strong className="ml-1">{capture.conflictName}</strong> — pick a different chord
                        </div>
                    )}

                    {type === "link" && (
                        <>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">Link Name</label>
                                <input
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors"
                                    placeholder="e.g. YouTube"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">URL</label>
                                <input
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors"
                                    placeholder="https://youtube.com"
                                    value={path}
                                    onChange={e => setPath(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {type === "folder" && (
                        <>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">Folder Path</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors cursor-pointer"
                                        placeholder="C:\Users\..."
                                        value={path}
                                        onChange={e => setPath(e.target.value)}
                                    />
                                    <button
                                        onClick={handlePickFolder}
                                        className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-[#aaa] hover:text-[#e8e8e8] hover:border-[#3a3a3a] transition-all whitespace-nowrap"
                                    >
                                        Browse...
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                                    Label <span className="text-[#444] font-normal normal-case">(optional)</span>
                                </label>
                                <input
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors"
                                    placeholder="e.g. My Projects"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {type === "app" && (
                        <div>
                            <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">App Path</label>
                            <input
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors"
                                placeholder="C:\Program Files\..."
                                value={path}
                                onChange={e => {
                                    setPath(e.target.value);
                                    if (!name) setName(e.target.value.split(/[/\\]/).filter(Boolean).pop()?.replace(/\.[^.]+$/, "") ?? "");
                                }}
                            />
                            <div className="mt-2">
                                <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">App Name</label>
                                <input
                                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors"
                                    placeholder="e.g. Notepad"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-1">
                    <button onClick={capture.reset} className="px-4 py-2 text-[12px] font-medium text-[#777] hover:text-[#e8e8e8] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-all">
                        Clear
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-[#777] hover:text-[#e8e8e8] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={capture.phase !== PHASE.DONE || !capture.keys.length || capture.conflict || !name.trim() || !path.trim()}
                        className="px-4 py-2 text-[12px] font-medium text-white bg-[#3b8bdb] rounded-lg hover:bg-[#4a9beb] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {editItem ? "Update" : "Save Shortcut"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function ConfirmModal({ item, onConfirm, onClose }: { item: Shortcut; onConfirm: () => void; onClose: () => void }) {
    const typeIcon: Record<string, string> = { app: "🖥️", link: "🔗", folder: "📁" };
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[3px]" />
            <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl w-[380px] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 p-5 border-b border-[#1e1e1e]">
                    <div className="w-10 h-10 bg-[#2a0a0a] border border-[#c0392b]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {typeIcon[item.type] ?? "🗑️"}
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-semibold text-[#e8e8e8]">Remove Shortcut</p>
                        <p className="text-[12px] text-[#555]">This cannot be undone</p>
                    </div>
                    <button onClick={onClose} className="text-[#555] hover:text-[#e8e8e8] transition-colors p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="p-5">
                    <p className="text-[13px] text-[#787878] leading-relaxed">
                        Remove the shortcut for <strong className="text-[#e8e8e8]">{item.name}</strong>?
                        <br /><span className="text-[12px] opacity-60">The {item.type} won't be affected — only the key binding is removed.</span>
                    </p>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 pb-5">
                    <button onClick={onClose} className="px-4 py-2 text-[12px] font-medium text-[#777] hover:text-[#e8e8e8] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-all">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 text-[12px] font-medium text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
    const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
    const show = useCallback((msg: string) => {
        const id = Date.now();
        setToasts(p => [...p, { id, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
    }, []);
    return { toasts, show };
}

function ToastArea({ toasts }: { toasts: { id: number; msg: string }[] }) {
    if (!toasts.length) return null;
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="bg-[#252525] border border-[#333] rounded-lg px-4 py-2 text-[12.5px] text-[#e8e8e8] shadow-2xl whitespace-nowrap"
                    style={{ animation: "toastIn 0.2s ease" }}>
                    <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1}}`}</style>
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

// ── Main ShortcutManager component ────────────────────────────────────────────

// extId is passed as a prop — no hardcoding
const DATA_FILE = "shortcuts.json";
const AHK_FILE = "shortcuts.ahk";

type NavItem = "add" | "apps" | "links" | "folders";

export function ShortcutManager({ extId, onClose }: ShortcutManagerProps) {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [nav, setNav] = useState<NavItem>("add");
    const [search, setSearch] = useState("");
    const [addModal, setAddModal] = useState<{ type: ModalType; edit?: Shortcut } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Shortcut | null>(null);
    const { toasts, show: showToast } = useToast();

    // Load shortcuts from shortcuts.json
    // If shortcuts.json doesn't exist yet, the list starts empty — user adds via UI.
    // The existing shortcuts.ahk continues to run unchanged until user makes edits.
    useEffect(() => {
        invoke("ext_read_file", { extId: extId, filename: DATA_FILE })
            .then((raw: unknown) => {
                if (typeof raw === "string" && raw.trim()) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) setShortcuts(parsed);
                    } catch { /* ignore parse errors */ }
                }
                // If empty/missing: shortcuts.ahk runs as-is, manager shows empty
                // and user builds their list fresh via the UI
            })
            .catch(() => { });
    }, [extId]);

    // Persist shortcuts + regenerate AHK whenever shortcuts change
    const persist = useCallback(async (updated: Shortcut[]) => {
        setShortcuts(updated);
        // Write shortcuts.json
        await invoke("ext_write_file", {
            extId: extId, filename: DATA_FILE, content: JSON.stringify(updated, null, 2),
        }).catch(() => { });
        // Write shortcuts.ahk
        await invoke("ext_write_file", {
            extId: extId, filename: AHK_FILE, content: generateAhk(updated),
        }).catch(() => { });
        // Restart the AHK engine so it picks up the new script immediately.
        // toggle_mod off then on — danhawk kills the old process and spawns a fresh one.
        await invoke("toggle_mod", { modId: extId, enabled: false }).catch(() => { });
        await invoke("toggle_mod", { modId: extId, enabled: true }).catch(() => { });
    }, [extId]);

    const saveShortcut = async (s: Shortcut) => {
        const updated = shortcuts.filter(x => x.id !== s.id);
        updated.push(s);
        await persist(updated);
        setAddModal(null);
        showToast(`✅ Saved shortcut for ${s.name}`);
    };

    const deleteShortcut = async (id: string) => {
        const item = shortcuts.find(x => x.id === id);
        const updated = shortcuts.filter(x => x.id !== id);
        await persist(updated);
        setConfirmDelete(null);
        showToast(`🗑️ Removed shortcut for ${item?.name ?? "item"}`);
    };

    const counts = {
        apps: shortcuts.filter(s => s.type === "app").length,
        links: shortcuts.filter(s => s.type === "link").length,
        folders: shortcuts.filter(s => s.type === "folder").length,
    };

    const visibleShortcuts = shortcuts.filter(s => {
        if (nav === "apps" && s.type !== "app") return false;
        if (nav === "links" && s.type !== "link") return false;
        if (nav === "folders" && s.type !== "folder") return false;
        if (nav === "add") return false;
        if (search) return s.name.toLowerCase().includes(search.toLowerCase()) || s.path.toLowerCase().includes(search.toLowerCase());
        return true;
    });

    const typeIcon: Record<string, string> = { app: "🖥️", link: "🔗", folder: "📁" };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0d0d0d]" style={{ animation: "fadeIn 0.15s ease" }}>
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

            {/* Titlebar */}
            <div className="h-10 bg-[#111] border-b border-[#1e1e1e] flex items-center px-4 gap-3 flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b8bdb" strokeWidth="2" className="flex-shrink-0">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M8 11h2M12 11h2M16 11h2M8 15h4" />
                </svg>
                <span className="text-[12.5px] font-medium text-[#666] flex-1">Multikey Shortcut Manager</span>
                <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#e81123] transition-all"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
                        <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <nav className="w-[210px] bg-[#111] border-r border-[#1e1e1e] flex flex-col py-3 flex-shrink-0">
                    {/* Add Shortcut */}
                    <button
                        onClick={() => setNav("add")}
                        className={`mx-2.5 mb-1.5 flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${nav === "add" ? "bg-[#3b8bdb]/18 border border-[#3b8bdb] text-[#3b8bdb]" : "bg-[#3b8bdb]/10 border border-[#3b8bdb]/25 text-[#3b8bdb] hover:bg-[#3b8bdb]/18"}`}
                    >
                        <span className="w-5 h-5 bg-[#3b8bdb] rounded-md flex items-center justify-center flex-shrink-0">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </span>
                        Add Shortcut
                    </button>

                    <div className="h-px bg-[#1e1e1e] mx-3 my-2" />

                    <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#333] mb-1">My Shortcuts</div>

                    {(["apps", "links", "folders"] as const).map(item => {
                        const labels = { apps: "Apps", links: "Links", folders: "Folders" };
                        const icons = { apps: "🖥️", links: "🔗", folders: "📁" };
                        const count = counts[item];
                        return (
                            <button
                                key={item}
                                onClick={() => setNav(item)}
                                className={`relative flex items-center gap-2.5 px-4 py-2 mx-0 text-[13.5px] transition-all ${nav === item ? "bg-[#1a1a1a] text-[#e8e8e8] font-medium" : "text-[#666] hover:bg-[#161616] hover:text-[#e8e8e8]"}`}
                            >
                                {nav === item && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#3b8bdb] rounded-r" />}
                                <span className="text-[14px]">{icons[item]}</span>
                                <span className="flex-1 text-left">{labels[item]}</span>
                                {count > 0 && (
                                    <span className="bg-[#3b8bdb] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    <div className="flex-1" />

                    <div className="px-4 py-3 border-t border-[#1e1e1e] mt-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                            <span className="text-[11px] text-[#444]">AHK active</span>
                        </div>
                        <div className="text-[10px] text-[#333] mt-1 font-mono">
                            {shortcuts.length} shortcut{shortcuts.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                </nav>

                {/* Main */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Add view */}
                    {nav === "add" && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2.5 text-center px-8">
                                <h2 className="text-[21px] font-bold text-[#e8e8e8] tracking-tight">Add a Shortcut</h2>
                                <p className="text-[13px] text-[#555] mb-6 max-w-[340px] leading-relaxed">
                                    Choose what you want to launch instantly with a multikey chord
                                </p>
                                <div className="flex gap-3.5">
                                    {(["app", "link", "folder"] as const).map(t => {
                                        const icons = { app: "🖥️", link: "🔗", folder: "📁" };
                                        const labels = { app: "App", link: "Link", folder: "Folder" };
                                        const subs = { app: "Open any installed app", link: "Open a website or URL", folder: "Open a folder path" };
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => setAddModal({ type: t })}
                                                className="flex flex-col items-center gap-2.5 w-[140px] py-7 px-4 bg-[#141414] border border-[#222] rounded-2xl cursor-pointer hover:border-[#3b8bdb] hover:bg-[#181818] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(59,139,219,0.15)] transition-all duration-150"
                                            >
                                                <span className="text-[36px] leading-none">{icons[t]}</span>
                                                <span className="text-[14px] font-semibold text-[#e8e8e8]">{labels[t]}</span>
                                                <span className="text-[11.5px] text-[#555] text-center leading-snug">{subs[t]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* List view */}
                    {nav !== "add" && (
                        <>
                            {/* Toolbar */}
                            <div className="flex items-center gap-2.5 px-5 pt-4 pb-0 flex-shrink-0">
                                <h2 className="text-[18px] font-bold text-[#e8e8e8] tracking-tight flex-1">
                                    {{ apps: "App Shortcuts", links: "Link Shortcuts", folders: "Folder Shortcuts" }[nav]}
                                </h2>
                                <div className="relative">
                                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-1.5 text-[13px] text-[#e8e8e8] outline-none focus:border-[#3b8bdb] transition-colors w-[200px]"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setAddModal({ type: nav === "apps" ? "app" : nav === "links" ? "link" : "folder" })}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b8bdb] text-white rounded-lg text-[13px] font-medium hover:bg-[#4a9beb] transition-all"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add
                                </button>
                            </div>

                            {/* Filter bar */}
                            <div className="px-5 pt-3 pb-2.5 border-b border-[#1a1a1a] flex-shrink-0">
                                <div className="grid grid-cols-3 text-[11px] font-semibold uppercase tracking-wider text-[#333] px-3">
                                    <div>Name</div>
                                    <div className="text-center">Shortcut</div>
                                    <div />
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
                                {visibleShortcuts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-[#444]">
                                        <div className="text-[36px] mb-3 opacity-40">{typeIcon[nav === "apps" ? "app" : nav === "links" ? "link" : "folder"]}</div>
                                        <div className="text-[14px] font-medium text-[#555] mb-1">
                                            No {nav} shortcuts yet
                                        </div>
                                        <div className="text-[12px]">Click Add to create one</div>
                                    </div>
                                ) : (
                                    visibleShortcuts.map(s => (
                                        <div key={s.id}
                                            className="group grid grid-cols-3 items-center px-3 py-2.5 rounded-lg border border-transparent hover:bg-[#141414] hover:border-[#1e1e1e] transition-all cursor-default"
                                            onClick={() => setAddModal({ type: s.type, edit: s })}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 bg-[#1a1a1a] border border-[#222] rounded-lg flex items-center justify-center text-[14px] flex-shrink-0">
                                                    {typeIcon[s.type]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[13.5px] font-medium text-[#e8e8e8] truncate">{s.name}</div>
                                                    <div className="text-[11px] text-[#444] font-mono truncate">{s.path}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <KeyBadge keys={s.chord} />
                                            </div>
                                            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setConfirmDelete(s); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-md border border-[#ef5350]/30 bg-[#ef5350]/8 text-[#ef5350] hover:bg-[#ef5350]/22 hover:border-[#ef5350]/55 transition-all"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* Status bar */}
                    <div className="h-6 bg-[#111] border-t border-[#1a1a1a] flex items-center px-4 gap-4 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                            <span className="text-[11px] text-[#444]">Ready</span>
                        </div>
                        <span className="text-[11px] text-[#333]">
                            {shortcuts.length} shortcut{shortcuts.length !== 1 ? "s" : ""} total
                        </span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {addModal && (
                <AddModal
                    type={addModal.type}
                    editItem={addModal.edit}
                    shortcuts={shortcuts}
                    onSave={saveShortcut}
                    onClose={() => setAddModal(null)}
                />
            )}
            {confirmDelete && (
                <ConfirmModal
                    item={confirmDelete}
                    onConfirm={() => deleteShortcut(confirmDelete.id)}
                    onClose={() => setConfirmDelete(null)}
                />
            )}
            <ToastArea toasts={toasts} />
        </div>
    );
}
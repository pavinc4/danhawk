// ToolSlots.tsx
// Generic renderer for all injectable UI zones declared in manifest.json.
// Platform renders these — it only knows the slot type string and the label.
//
// To add a new slot type:
//   1. Add the component to the relevant renderer map below
//   2. Tool declares the type in manifest.json ui block
//   3. Done — zero other platform code changes needed

import { lazy, Suspense } from "react";
import type {
    Tool,
    DetailActionSlot,
    DetailTabSlot,
    SidePanelSlot,
    StatusBarSlot,
} from "../lib/types";

interface DetailActionSlotProps { slot: DetailActionSlot; tool: Tool; }
interface DetailTabContentProps { slot: DetailTabSlot; tool: Tool; }
interface SidePanelSlotProps { slot: SidePanelSlot; tool: Tool; }
interface StatusBarSlotProps { slot: StatusBarSlot; tool: Tool; }

// ── Lazy-loaded slot components ───────────────────────────────────────────────

const ShortcutManagerButton = lazy(() =>
    import("./slot-renderers/ShortcutManagerSlot").then(m => ({ default: m.ShortcutManagerSlot }))
);

// ── ZONE 1 — Detail action renderers ─────────────────────────────────────────

const DETAIL_ACTION_RENDERERS: Record<string, React.ComponentType<DetailActionSlotProps>> = {
    "shortcut-manager": ({ slot, tool }) => (
        <Suspense fallback={null}>
            <ShortcutManagerButton slot={slot} tool={tool} />
        </Suspense>
    ),
    "action-button": ({ slot }) => (
        <button className="ml-2 px-3 py-1.5 border border-[#2a2a2a] text-[#e8e8e8] rounded-md text-[12px] hover:border-[#3a3a3a] hover:bg-[#1c1c1c] transition-all duration-150 flex items-center gap-1.5">
            {slot.label}
        </button>
    ),
};

// ── ZONE 2 — Detail tab content renderers ────────────────────────────────────

const DETAIL_TAB_RENDERERS: Record<string, React.ComponentType<DetailTabContentProps>> = {
    "full-panel": ({ slot, tool }) => (
        <div className="text-[13px] text-[#555]">
            {slot.label} panel for {tool.name} — replace with real content.
        </div>
    ),
};

// ── ZONE 3 — Side panel renderers ─────────────────────────────────────────────

const SIDE_PANEL_RENDERERS: Record<string, React.ComponentType<SidePanelSlotProps>> = {
    "info-panel": ({ tool }) => (
        <div className="flex flex-col gap-3 text-[12px]">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Version</p>
                <p className="text-[#888]">{tool.version}</p>
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Author</p>
                <p className="text-[#888]">{tool.author}</p>
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Category</p>
                <p className="text-[#888]">{tool.category}</p>
            </div>
        </div>
    ),
};

// ── ZONE 5 — Status bar renderers ─────────────────────────────────────────────

const STATUS_BAR_RENDERERS: Record<string, React.ComponentType<StatusBarSlotProps>> = {
    "status-text": ({ slot }) => (
        <span className="text-[11px] text-[#444]">{slot.label}</span>
    ),
};

// ── Public: Zone 1 ────────────────────────────────────────────────────────────

export function DetailActionSlots({ tool }: { tool: Tool }) {
    const slots = tool.ui?.detail_actions;
    if (!slots?.length) return null;
    return (
        <>
            {slots.map((slot, i) => {
                const Renderer = DETAIL_ACTION_RENDERERS[slot.type];
                if (!Renderer) return null;
                return <Renderer key={i} slot={slot} tool={tool} />;
            })}
        </>
    );
}

// ── Public: Zone 2 ────────────────────────────────────────────────────────────

export function getDetailTabSlots(tool: Tool): DetailTabSlot[] {
    return tool.ui?.detail_tabs ?? [];
}

export function DetailTabSlotContent({ slot, tool }: { slot: DetailTabSlot; tool: Tool }) {
    const Renderer = DETAIL_TAB_RENDERERS[slot.type];
    if (!Renderer) return <p className="text-[#555] text-[13px]">No renderer for tab type: {slot.type}</p>;
    return <Renderer slot={slot} tool={tool} />;
}

// ── Public: Zone 3 ────────────────────────────────────────────────────────────

export function DetailSidePanel({ tool }: { tool: Tool }) {
    const panel = tool.ui?.side_panel;
    if (!panel) return null;
    const Renderer = SIDE_PANEL_RENDERERS[panel.type];
    if (!Renderer) return null;
    return (
        <div className="w-[160px] flex-shrink-0 border-r border-[#1e1e1e] pr-4 mr-6">
            <Renderer slot={panel} tool={tool} />
        </div>
    );
}

// ── Public: Zone 5 ────────────────────────────────────────────────────────────

export function DetailStatusBar({ tool }: { tool: Tool }) {
    const bar = tool.ui?.status_bar;
    if (!bar) return null;
    const Renderer = STATUS_BAR_RENDERERS[bar.type];
    if (!Renderer) return null;
    return (
        <div className="flex items-center gap-3 mt-6 pt-3 border-t border-[#1a1a1a]">
            <Renderer slot={bar} tool={tool} />
        </div>
    );
}

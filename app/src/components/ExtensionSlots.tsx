// ExtensionSlots.tsx
// Generic renderer for all injectable UI zones declared in manifest.json.
// The platform renders these — it only knows the slot type string and the label.
// It never knows which specific extension it's dealing with.
//
// RULE: Every component receives slot.label and must use it directly.
//       No fallback strings. No hardcoded names. Label always comes from manifest.
//
// To add a new slot type:
//   1. Add the component to the relevant renderer map below
//   2. Extension declares the type in manifest.json ui block
//   3. Done — zero other platform code changes needed

import { lazy, Suspense } from "react";
import type {
    Mod,
    DetailActionSlot,
    DetailTabSlot,
    SidePanelSlot,
    StatusBarSlot,
} from "../lib/types";

// ── Slot prop interfaces ───────────────────────────────────────────────────────

interface DetailActionSlotProps {
    slot: DetailActionSlot;
    mod: Mod;
}

interface DetailTabContentProps {
    slot: DetailTabSlot;
    mod: Mod;
}

interface SidePanelSlotProps {
    slot: SidePanelSlot;
    mod: Mod;
}

interface StatusBarSlotProps {
    slot: StatusBarSlot;
    mod: Mod;
}

// ── Lazy-loaded slot components ───────────────────────────────────────────────

const ShortcutManagerButton = lazy(() =>
    import("./slot-renderers/ShortcutManagerSlot").then(m => ({ default: m.ShortcutManagerSlot }))
);

// ── ZONE 1 — Detail action renderers (buttons beside Uninstall) ───────────────
// Each entry: "type-string" → component that receives { slot, mod }
// slot.label is the button text — read from manifest, never overridden here

const DETAIL_ACTION_RENDERERS: Record<string, React.ComponentType<DetailActionSlotProps>> = {

    // Opens the full-screen shortcut manager panel.
    // Label from manifest e.g. "Manage Shortcuts" or "Open Editor" or anything.
    "shortcut-manager": ({ slot, mod }) => (
        <Suspense fallback={null}>
            <ShortcutManagerButton slot={slot} mod={mod} />
        </Suspense>
    ),

    // Generic action button — opens nothing by default, just a styled button.
    // Use for future extensions that need a simple button with custom label.
    "action-button": ({ slot }) => (
        <button className="ml-2 px-3 py-1.5 border border-[#2a2a2a] text-[#e8e8e8] rounded-md text-[12px] hover:border-[#3a3a3a] hover:bg-[#1c1c1c] transition-all duration-150 flex items-center gap-1.5">
            {slot.label}
        </button>
    ),
};

// ── ZONE 2 — Detail tab content renderers (tab content area) ──────────────────
// Tab label is always read from manifest slot.label — never set here.

const DETAIL_TAB_RENDERERS: Record<string, React.ComponentType<DetailTabContentProps>> = {

    // Full-page panel — fills the entire tab content area.
    // Placeholder: shows slot label. Replace with real content per extension.
    "full-panel": ({ slot, mod }) => (
        <div className="text-[13px] text-[#555]">
            {slot.label} panel for {mod.name} — replace with real content.
        </div>
    ),
};

// ── ZONE 3 — Side panel renderers (left of tab content) ───────────────────────
// Width is controlled by ModDetail.tsx (160px). Component fills that space.

const SIDE_PANEL_RENDERERS: Record<string, React.ComponentType<SidePanelSlotProps>> = {

    // Generic info panel — shows extension metadata.
    "info-panel": ({ mod }) => (
        <div className="flex flex-col gap-3 text-[12px]">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Version</p>
                <p className="text-[#888]">{mod.version}</p>
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Author</p>
                <p className="text-[#888]">{mod.author}</p>
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#444] mb-1">Engine</p>
                <p className="text-[#888]">{mod.category}</p>
            </div>
        </div>
    ),
};

// ── ZONE 5 — Status bar renderers (bottom strip of detail page) ───────────────

const STATUS_BAR_RENDERERS: Record<string, React.ComponentType<StatusBarSlotProps>> = {

    // Simple text strip — shows label from manifest.
    "status-text": ({ slot }) => (
        <span className="text-[11px] text-[#444]">{slot.label}</span>
    ),
};

// ── Public: Zone 1 — detail action buttons ────────────────────────────────────

export function DetailActionSlots({ mod }: { mod: Mod }) {
    const slots = mod.ui?.detail_actions;
    if (!slots?.length) return null;
    return (
        <>
            {slots.map((slot, i) => {
                const Renderer = DETAIL_ACTION_RENDERERS[slot.type];
                if (!Renderer) return null;
                // slot is passed through as-is — label comes from manifest
                return <Renderer key={i} slot={slot} mod={mod} />;
            })}
        </>
    );
}

// ── Public: Zone 2 — tab slot helpers ─────────────────────────────────────────

export function getDetailTabSlots(mod: Mod): DetailTabSlot[] {
    return mod.ui?.detail_tabs ?? [];
}

export function DetailTabSlotContent({ slot, mod }: { slot: DetailTabSlot; mod: Mod }) {
    const Renderer = DETAIL_TAB_RENDERERS[slot.type];
    if (!Renderer) return <p className="text-[#555] text-[13px]">No renderer for tab type: {slot.type}</p>;
    return <Renderer slot={slot} mod={mod} />;
}

// ── Public: Zone 3 — side panel ───────────────────────────────────────────────

export function DetailSidePanel({ mod }: { mod: Mod }) {
    const panel = mod.ui?.side_panel;
    if (!panel) return null;
    const Renderer = SIDE_PANEL_RENDERERS[panel.type];
    if (!Renderer) return null;
    return (
        <div className="w-[160px] flex-shrink-0 border-r border-[#1e1e1e] pr-4 mr-6">
            <Renderer slot={panel} mod={mod} />
        </div>
    );
}

// ── Public: Zone 5 — status bar ───────────────────────────────────────────────

export function DetailStatusBar({ mod }: { mod: Mod }) {
    const bar = mod.ui?.status_bar;
    if (!bar) return null;
    const Renderer = STATUS_BAR_RENDERERS[bar.type];
    if (!Renderer) return null;
    return (
        <div className="flex items-center gap-3 mt-6 pt-3 border-t border-[#1a1a1a]">
            <Renderer slot={bar} mod={mod} />
        </div>
    );
}
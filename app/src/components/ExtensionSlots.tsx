// ExtensionSlots.tsx
// Generic renderer for extension UI slots declared in manifest.json.
// The platform renders these — it never knows which extension it's dealing with,
// only the slot type string.
//
// To support a new slot type in future:
//   1. Add the component here under DETAIL_ACTION_RENDERERS or DETAIL_TAB_RENDERERS
//   2. Extension author adds the type to their manifest.json ui block
//   3. Done — no other platform code changes needed

import { useState } from "react";
import type { Mod, DetailActionSlot, DetailTabSlot } from "../lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DetailActionSlotProps {
    slot: DetailActionSlot;
    mod: Mod;
}

interface DetailTabContentProps {
    slot: DetailTabSlot;
    mod: Mod;
}

// ── Lazy imports for slot components ─────────────────────────────────────────
// Each slot type maps to a built-in platform component.
// Import them lazily so they don't load unless an extension actually uses them.

import { lazy, Suspense } from "react";

const ShortcutManagerButton = lazy(() =>
    import("./slot-renderers/ShortcutManagerSlot").then(m => ({ default: m.ShortcutManagerSlot }))
);

// ── Registry maps ─────────────────────────────────────────────────────────────

const DETAIL_ACTION_RENDERERS: Record<string, React.ComponentType<DetailActionSlotProps>> = {
    "shortcut-manager": ({ mod }) => (
        <Suspense fallback={null}>
            <ShortcutManagerButton slot={{ type: "shortcut-manager", label: "" }} mod={mod} />
        </Suspense>
    ),
};

// Add future tab slot renderers here
const DETAIL_TAB_RENDERERS: Record<string, React.ComponentType<DetailTabContentProps>> = {};

// ── Public components ─────────────────────────────────────────────────────────

// Renders all detail_actions slots declared in mod.ui
export function DetailActionSlots({ mod }: { mod: Mod }) {
    const slots = mod.ui?.detail_actions;
    if (!slots?.length) return null;
    return (
        <>
            {slots.map((slot, i) => {
                const Renderer = DETAIL_ACTION_RENDERERS[slot.type];
                if (!Renderer) return null;
                return <Renderer key={i} slot={slot} mod={mod} />;
            })}
        </>
    );
}

// Returns extra tabs to add to the tab bar from mod.ui
export function getDetailTabSlots(mod: Mod): DetailTabSlot[] {
    return mod.ui?.detail_tabs ?? [];
}

// Renders the content of a specific tab slot
export function DetailTabSlotContent({ slot, mod }: { slot: DetailTabSlot; mod: Mod }) {
    const Renderer = DETAIL_TAB_RENDERERS[slot.type];
    if (!Renderer) return <p className="text-[#555] text-[13px]">No renderer for tab type: {slot.type}</p>;
    return <Renderer slot={slot} mod={mod} />;
}
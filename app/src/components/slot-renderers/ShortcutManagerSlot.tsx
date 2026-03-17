// ShortcutManagerSlot.tsx
// Renders the "shortcut-manager" action button.
// Button label comes entirely from slot.label (set in manifest.json).
// No fallback string — if label is empty in manifest, button shows nothing.
// This component is reusable: any extension can declare type "shortcut-manager"
// with whatever label they want and it opens the shortcut manager panel.

import { useState } from "react";
import { ShortcutManager } from "./ShortcutManager";
import type { Mod, DetailActionSlot } from "../../lib/types";

interface Props {
    slot: DetailActionSlot;
    mod: Mod;
}

export function ShortcutManagerSlot({ slot, mod }: Props) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="ml-2 px-3 py-1.5 border border-[#3b8bdb]/40 text-[#3b8bdb] rounded-md text-[12px] hover:border-[#3b8bdb]/70 hover:bg-[#3b8bdb]/10 transition-all duration-150 flex items-center gap-1.5"
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M8 11h2M12 11h2M16 11h2M8 15h4" />
                </svg>
                {slot.label}
            </button>
            {open && <ShortcutManager extId={mod.id} onClose={() => setOpen(false)} />}
        </>
    );
}
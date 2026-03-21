// ShortcutManagerSlot.tsx
// Renders the "shortcut-manager" action button.
// Label comes entirely from slot.label (manifest.json).

import { useState } from "react";
import { ShortcutManager } from "./ShortcutManager";
import type { Tool, DetailActionSlot } from "../../lib/types";

interface Props {
    slot: DetailActionSlot;
    tool: Tool;
}

export function ShortcutManagerSlot({ slot, tool }: Props) {
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
            {open && <ShortcutManager toolId={tool.id} onClose={() => setOpen(false)} />}
        </>
    );
}

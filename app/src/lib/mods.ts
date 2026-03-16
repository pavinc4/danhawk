import type { Mod } from "./types";

// Shape returned by Rust (snake_case) — mapped to camelCase below
interface RawMod {
  id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  targets: string[];
  description: string;
  category: string;
  icon: string;
  icon_color: string;
  icon_bg: string;
  mod_type: string;
  removable: boolean;
  editable: boolean;
  installed: boolean;
  enabled: boolean;
  source_code: string;
  details: string;
  changelog: { version: string; date: string; changes: string[] }[];
}

function mapMod(raw: RawMod): Mod {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    version: raw.version,
    author: raw.author,
    targets: raw.targets,
    description: raw.description,
    category: raw.category,
    icon: raw.icon,
    iconColor: raw.icon_color,
    iconBg: raw.icon_bg,
    modType: raw.mod_type as "official" | "custom",
    removable: raw.removable,
    editable: raw.editable,
    installed: raw.installed,
    enabled: raw.enabled,
    sourceCode: raw.source_code,
    details: raw.details,
    changelog: raw.changelog,
  };
}

export async function loadMods(): Promise<Mod[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<RawMod[]>("get_mods");
    return raw.map(mapMod);
  } catch (e) {
    console.warn("Tauri not available:", e);
    return [];
  }
}

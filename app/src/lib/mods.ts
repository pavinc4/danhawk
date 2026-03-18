import type { Extension } from "./types";

interface RawExtension {
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
  icon_file: string;
  mod_type: string;
  removable: boolean;
  editable: boolean;
  installed: boolean;
  enabled: boolean;
  details_md: string;
  changelog_md: string;
  entry_source: string;
  source_visible: boolean;
  ui?: {
    detail_actions?: { type: string; label: string }[];
    detail_tabs?: { type: string; label: string; id: string }[];
  };
}

function mapExtension(raw: RawExtension): Extension {
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
    iconFile: raw.icon_file || undefined,
    modType: raw.mod_type as "official" | "custom",
    removable: raw.removable,
    editable: raw.editable,
    installed: raw.installed,
    enabled: raw.enabled,
    detailsMd: raw.details_md,
    changelogMd: raw.changelog_md,
    entrySource: raw.entry_source,
    sourceVisible: raw.source_visible,
    ui: raw.ui,
  };
}

export async function loadMods(): Promise<Extension[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<RawExtension[]>("get_mods");
    return raw.map(mapExtension);
  } catch (e) {
    console.warn("Tauri not available:", e);
    return [];
  }
}
export async function refreshMods(): Promise<Extension[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<RawExtension[]>("refresh_mods");
    return raw.map(mapExtension);
  } catch (e) {
    console.warn("refresh_mods failed:", e);
    return [];
  }
}
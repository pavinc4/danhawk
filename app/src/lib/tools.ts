import type { Tool, InfoTab } from "./types";

interface RawTool {
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
  tool_type: string;
  removable: boolean;
  editable: boolean;
  installed: boolean;
  enabled: boolean;
  info_tabs: InfoTab[];
  ui?: {
    detail_actions?: { type: string; label: string }[];
    detail_tabs?: { type: string; label: string; id: string }[];
    side_panel?: { type: string };
    status_bar?: { type: string; label?: string };
  };
}

function mapTool(raw: RawTool): Tool {
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
    toolType: raw.tool_type as "official" | "custom",
    removable: raw.removable,
    editable: raw.editable,
    installed: raw.installed,
    enabled: raw.enabled,
    infoTabs: raw.info_tabs ?? [],
    ui: raw.ui,
  };
}

export async function loadTools(): Promise<Tool[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<RawTool[]>("get_tools");
    return raw.map(mapTool);
  } catch (e) {
    console.warn("Tauri not available:", e);
    return [];
  }
}

export async function refreshTools(): Promise<Tool[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<RawTool[]>("refresh_tools");
    return raw.map(mapTool);
  } catch (e) {
    console.warn("refresh_tools failed:", e);
    return [];
  }
}

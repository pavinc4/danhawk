export interface Mod {
  id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  targets: string[];
  description: string;
  category: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  modType: "official" | "custom";
  removable: boolean;
  editable: boolean;
  installed: boolean;
  enabled: boolean;
  iconFile?: string;
  details?: string;
  sourceCode?: string;
  changelog?: ChangelogEntry[];
  // UI slots declared in manifest — app renders these generically
  ui?: ModUI;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

// ── UI slot declarations ───────────────────────────────────────────────────
// Extensions declare these in manifest.json under "ui".
// The app reads them and renders built-in slot components generically.
// No hardcoding of extension IDs anywhere in the platform.

export interface ModUI {
  // Buttons shown in the detail page action bar when installed
  detail_actions?: DetailActionSlot[];
  // Extra tabs added to the detail page tab bar when installed
  detail_tabs?: DetailTabSlot[];
}

export interface DetailActionSlot {
  // type maps to a built-in renderer in the platform
  // e.g. "shortcut-manager" → renders the ShortcutManager button+overlay
  type: string;
  label: string;
}

export interface DetailTabSlot {
  type: string;
  label: string;
  // tab id used for active tab tracking
  id: string;
}

export interface AppSettings {
  checkUpdates: boolean;
  developerMode: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  language: string;
  modsPath: string;
}
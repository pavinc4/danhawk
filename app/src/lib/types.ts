export interface Extension {
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
  detailsMd: string;
  changelogMd: string;
  entrySource: string;
  sourceVisible: boolean;
  ui?: ExtensionUI;
}

// Alias — existing imports keep working
export type Mod = Extension;

export interface ExtensionUI {
  // Zone 1 — buttons injected beside Uninstall in the action bar
  detail_actions?: DetailActionSlot[];
  // Zone 2 — extra tabs added to the tab bar
  detail_tabs?: DetailTabSlot[];
  // Zone 3 — side panel shown left of tab content (only when declared)
  side_panel?: SidePanelSlot;
  // Zone 5 — status strip at the bottom of the detail page (only when declared)
  status_bar?: StatusBarSlot;
}

export type ModUI = ExtensionUI;

export interface DetailActionSlot {
  type: string;   // maps to DETAIL_ACTION_RENDERERS key
  label: string;  // button text — ALWAYS from manifest, never hardcoded in component
}

export interface DetailTabSlot {
  type: string;   // maps to DETAIL_TAB_RENDERERS key
  label: string;  // tab name — ALWAYS from manifest, never hardcoded in component
  id: string;     // unique id for activeTab state
}

export interface SidePanelSlot {
  type: string;   // maps to SIDE_PANEL_RENDERERS key
}

export interface StatusBarSlot {
  type: string;   // maps to STATUS_BAR_RENDERERS key
  label?: string; // optional text — from manifest
}

export interface AppSettings {
  checkUpdates: boolean;
  developerMode: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  language: string;
  modsPath: string;
}
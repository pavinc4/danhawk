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
  // Content loaded from files by the platform — empty string means file absent
  detailsMd: string;       // from details.md — platform renders as markdown
  changelogMd: string;     // from changelog.md — platform renders as markdown
  entrySource: string;     // from entry file — platform shows in Source tab
  sourceVisible: boolean;  // false = show "private" message in Source tab
  // UI slots declared in manifest — platform renders these generically
  ui?: ExtensionUI;
}

// Keep Mod as alias so existing imports don't break during transition
export type Mod = Extension;

export interface ExtensionUI {
  detail_actions?: DetailActionSlot[];
  detail_tabs?: DetailTabSlot[];
}

// Keep ModUI as alias
export type ModUI = ExtensionUI;

export interface DetailActionSlot {
  type: string;
  label: string;
}

export interface DetailTabSlot {
  type: string;
  label: string;
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
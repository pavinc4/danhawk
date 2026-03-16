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
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface AppSettings {
  checkUpdates: boolean;
  developerMode: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  language: string;
  modsPath: string;
}
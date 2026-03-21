export interface Tool {
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
  toolType: "official" | "custom";
  removable: boolean;
  editable: boolean;
  installed: boolean;
  enabled: boolean;
  iconFile?: string;
  infoTabs: InfoTab[];
  ui?: ToolUI;
}

export interface InfoTab {
  label: string;   // filename without .md, capitalized e.g. "Details", "Changelog"
  content: string; // markdown content
}

export interface ToolUI {
  detail_actions?: DetailActionSlot[];
  detail_tabs?: DetailTabSlot[];
  side_panel?: SidePanelSlot;
  status_bar?: StatusBarSlot;
}

export interface DetailActionSlot {
  type: string;
  label: string;
}

export interface DetailTabSlot {
  type: string;
  label: string;
  id: string;
}

export interface SidePanelSlot {
  type: string;
}

export interface StatusBarSlot {
  type: string;
  label?: string;
}

export interface AppSettings {
  checkUpdates: boolean;
  developerMode: boolean;
  startWithWindows: boolean;
  startMinimized: boolean;
  language: string;
  toolsPath: string;
}

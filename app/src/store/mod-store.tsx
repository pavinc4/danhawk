import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadMods } from "../lib/mods";
import type { Mod } from "../lib/types";

async function invoke(command: string, args?: Record<string, unknown>) {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(command, args);
  } catch (e) {
    console.warn(`[tauri] ${command} failed:`, e);
    throw e;
  }
}

interface ModState {
  installed: boolean;
  enabled: boolean;
}

interface ModStoreContextType {
  mods: Mod[];
  loading: boolean;
  modStates: Record<string, ModState>;
  isInstalled: (id: string) => boolean;
  isEnabled: (id: string) => boolean;
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  getInstalledMods: () => Mod[];
}

const ModStoreContext = createContext<ModStoreContextType | null>(null);

export function ModStoreProvider({ children }: { children: ReactNode }) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modStates, setModStates] = useState<Record<string, ModState>>({});

  useEffect(() => {
    loadMods().then((loaded) => {
      setMods(loaded);
      const init: Record<string, ModState> = {};
      loaded.forEach((m) => {
        init[m.id] = { installed: m.installed, enabled: m.enabled };
      });
      setModStates(init);
      setLoading(false);
    });
  }, []);

  const isInstalled = (id: string) => modStates[id]?.installed ?? false;
  const isEnabled = (id: string) => modStates[id]?.enabled ?? false;

  // ── Install — tell Rust, then update UI ──────────────────────────────────
  const install = async (id: string) => {
    try {
      await invoke("install_mod", { modId: id });
      setModStates((prev) => ({
        ...prev,
        [id]: { installed: true, enabled: false },
      }));
    } catch {
      console.error(`install_mod failed for ${id}`);
    }
  };

  // ── Uninstall — stop process, tell Rust, update UI ───────────────────────
  const uninstall = async (id: string) => {
    try {
      await invoke("remove_mod", { modId: id });
      setModStates((prev) => ({
        ...prev,
        [id]: { installed: false, enabled: false },
      }));
    } catch {
      console.error(`remove_mod failed for ${id}`);
    }
  };

  // ── Toggle — tell Rust to start/stop engine, update UI ──────────────────
  const toggle = async (id: string) => {
    const next = !modStates[id]?.enabled;
    try {
      await invoke("toggle_mod", { modId: id, enabled: next });
      setModStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], enabled: next },
      }));
    } catch {
      console.error(`toggle_mod failed for ${id}`);
    }
  };

  const getInstalledMods = () => mods.filter((m) => modStates[m.id]?.installed);

  return (
    <ModStoreContext.Provider
      value={{
        mods, loading, modStates,
        isInstalled, isEnabled,
        install, uninstall, toggle,
        getInstalledMods,
      }}
    >
      {children}
    </ModStoreContext.Provider>
  );
}

export function useModStore() {
  const ctx = useContext(ModStoreContext);
  if (!ctx) throw new Error("useModStore must be used inside ModStoreProvider");
  return ctx;
}
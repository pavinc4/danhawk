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

// Ensures animation shows for at least `ms` milliseconds
// If the real operation takes longer, waits for that instead
const minDelay = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface ModState {
  installed: boolean;
  enabled: boolean;
}

interface ModStoreContextType {
  mods: Mod[];
  loading: boolean;
  modStates: Record<string, ModState>;
  installingIds: Set<string>;
  isInstalled: (id: string) => boolean;
  isEnabled: (id: string) => boolean;
  isInstalling: (id: string) => boolean;
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
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMods().then((loaded) => {
      setMods(loaded);
      const init: Record<string, ModState> = {};
      loaded.forEach((m) => { init[m.id] = { installed: m.installed, enabled: m.enabled }; });
      setModStates(init);
      setLoading(false);
    });
  }, []);

  const isInstalled = (id: string) => modStates[id]?.installed ?? false;
  const isEnabled = (id: string) => modStates[id]?.enabled ?? false;
  const isInstalling = (id: string) => installingIds.has(id);

  const install = async (id: string) => {
    setInstallingIds((prev) => new Set(prev).add(id));
    try {
      // Run real operation AND minimum 1s delay in parallel — waits for whichever is longer
      await Promise.all([
        invoke("install_mod", { modId: id }),
        minDelay(1000),
      ]);
      setModStates((prev) => ({ ...prev, [id]: { installed: true, enabled: false } }));
    } catch {
      console.error(`install_mod failed for ${id}`);
    } finally {
      setInstallingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const uninstall = async (id: string) => {
    setInstallingIds((prev) => new Set(prev).add(id));
    try {
      await Promise.all([
        invoke("remove_mod", { modId: id }),
        minDelay(1000),
      ]);
      setModStates((prev) => ({ ...prev, [id]: { installed: false, enabled: false } }));
    } catch {
      console.error(`remove_mod failed for ${id}`);
    } finally {
      setInstallingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  // Toggle — completely unchanged
  const toggle = async (id: string) => {
    const next = !modStates[id]?.enabled;
    try {
      await invoke("toggle_mod", { modId: id, enabled: next });
      setModStates((prev) => ({ ...prev, [id]: { ...prev[id], enabled: next } }));
    } catch {
      console.error(`toggle_mod failed for ${id}`);
    }
  };

  const getInstalledMods = () => mods.filter((m) => modStates[m.id]?.installed);

  return (
    <ModStoreContext.Provider value={{
      mods, loading, modStates, installingIds,
      isInstalled, isEnabled, isInstalling,
      install, uninstall, toggle,
      getInstalledMods,
    }}>
      {children}
    </ModStoreContext.Provider>
  );
}

export function useModStore() {
  const ctx = useContext(ModStoreContext);
  if (!ctx) throw new Error("useModStore must be used inside ModStoreProvider");
  return ctx;
}
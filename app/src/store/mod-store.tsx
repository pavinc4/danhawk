import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { loadMods, refreshMods } from "../lib/mods";
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

const minDelay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: "activate";  // extend with more types in future if needed
}

interface ModState {
  installed: boolean;
  enabled: boolean;
}

interface ModStoreContextType {
  mods: Mod[];
  loading: boolean;
  modStates: Record<string, ModState>;
  installingIds: Set<string>;
  toasts: Toast[];
  isInstalled: (id: string) => boolean;
  isEnabled: (id: string) => boolean;
  isInstalling: (id: string) => boolean;
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  getInstalledMods: () => Mod[];
  refreshFromGitHub: () => Promise<void>;
}

const ModStoreContext = createContext<ModStoreContextType | null>(null);

export function ModStoreProvider({ children }: { children: ReactNode }) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);
  const [modStates, setModStates] = useState<Record<string, ModState>>({});
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // No startup fetch -- extensions load lazily when user opens Explore

  const showToast = useCallback((message: string, type: Toast["type"] = "activate") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-dismiss after 3.5s
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const isInstalled = (id: string) => modStates[id]?.installed ?? false;
  const isEnabled = (id: string) => modStates[id]?.enabled ?? false;
  const isInstalling = (id: string) => installingIds.has(id);

  const install = async (id: string) => {
    setInstallingIds((prev) => new Set(prev).add(id));
    try {
      await Promise.all([
        invoke("install_mod", { modId: id }),
        minDelay(1000),
      ]);
      setModStates((prev) => ({ ...prev, [id]: { installed: true, enabled: false } }));
      // Find extension name for the toast
      const name = mods.find(m => m.id === id)?.name ?? "Extension";
      showToast(`${name} installed - toggle it on to activate`);
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

  const toggle = async (id: string) => {
    const next = !modStates[id]?.enabled;
    try {
      await invoke("toggle_mod", { modId: id, enabled: next });
      setModStates((prev) => ({ ...prev, [id]: { ...prev[id], enabled: next } }));
    } catch {
      console.error(`toggle_mod failed for ${id}`);
    }
  };

  const refreshFromGitHub = useCallback(async () => {
    const fresh = await refreshMods();
    if (fresh.length > 0) {
      setMods(fresh);
      setModStates(prev => {
        const next = { ...prev };
        fresh.forEach(m => {
          if (!next[m.id]) next[m.id] = { installed: m.installed, enabled: m.enabled };
        });
        return next;
      });
    }
  }, []);

  const getInstalledMods = () => mods.filter((m) => modStates[m.id]?.installed);

  return (
    <ModStoreContext.Provider value={{
      mods, loading, modStates, installingIds, toasts,
      isInstalled, isEnabled, isInstalling,
      install, uninstall, toggle,
      getInstalledMods,
      refreshFromGitHub,
    }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ModStoreContext.Provider>
  );
}

// ── Toast renderer ────────────────────────────────────────────────────────────
// Renders inside the provider so it's always present regardless of which page
// the user is on when install completes.

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[12.5px] text-[#e8e8e8] shadow-2xl whitespace-nowrap"
      style={{ animation: "toastIn 0.25s ease forwards" }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
      {/* Toggle icon hint */}
      <span className="w-4 h-4 rounded-full bg-[#3dba6e]/20 border border-[#3dba6e]/40 flex items-center justify-center flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#3dba6e]" />
      </span>
      {toast.message}
    </div>
  );
}

export function useModStore() {
  const ctx = useContext(ModStoreContext);
  if (!ctx) throw new Error("useModStore must be used inside ModStoreProvider");
  return ctx;
}
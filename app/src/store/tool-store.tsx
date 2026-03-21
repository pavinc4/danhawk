import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { loadTools, refreshTools } from "../lib/tools";
import type { Tool } from "../lib/types";

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
  type: "activate";
}

interface ToolState {
  installed: boolean;
  enabled: boolean;
}

interface ToolStoreContextType {
  tools: Tool[];
  loading: boolean;
  toolStates: Record<string, ToolState>;
  installingIds: Set<string>;
  toasts: Toast[];
  isInstalled: (id: string) => boolean;
  isEnabled: (id: string) => boolean;
  isInstalling: (id: string) => boolean;
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  getInstalledTools: () => Tool[];
  refreshFromGitHub: () => Promise<void>;
}

const ToolStoreContext = createContext<ToolStoreContextType | null>(null);

export function ToolStoreProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "activate") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const isInstalled = (id: string) => toolStates[id]?.installed ?? false;
  const isEnabled   = (id: string) => toolStates[id]?.enabled ?? false;
  const isInstalling = (id: string) => installingIds.has(id);

  const install = async (id: string) => {
    setInstallingIds((prev) => new Set(prev).add(id));
    try {
      await Promise.all([
        invoke("install_tool", { toolId: id }),
        minDelay(1000),
      ]);
      setToolStates((prev) => ({ ...prev, [id]: { installed: true, enabled: false } }));
      const name = tools.find(t => t.id === id)?.name ?? "Tool";
      showToast(`${name} installed — toggle it on to activate`);
    } catch {
      console.error(`install_tool failed for ${id}`);
    } finally {
      setInstallingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const uninstall = async (id: string) => {
    setInstallingIds((prev) => new Set(prev).add(id));
    try {
      await Promise.all([
        invoke("remove_tool", { toolId: id }),
        minDelay(1000),
      ]);
      setToolStates((prev) => ({ ...prev, [id]: { installed: false, enabled: false } }));
    } catch {
      console.error(`remove_tool failed for ${id}`);
    } finally {
      setInstallingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const toggle = async (id: string) => {
    const next = !toolStates[id]?.enabled;
    try {
      await invoke("toggle_tool", { toolId: id, enabled: next });
      setToolStates((prev) => ({ ...prev, [id]: { ...prev[id], enabled: next } }));
    } catch {
      console.error(`toggle_tool failed for ${id}`);
    }
  };

  const refreshFromGitHub = useCallback(async () => {
    const fresh = await refreshTools();
    if (fresh.length > 0) {
      setTools(fresh);
      setToolStates(prev => {
        const next = { ...prev };
        fresh.forEach(t => {
          if (!next[t.id]) next[t.id] = { installed: t.installed, enabled: t.enabled };
        });
        return next;
      });
    }
  }, []);

  const getInstalledTools = () => tools.filter((t) => toolStates[t.id]?.installed);

  return (
    <ToolStoreContext.Provider value={{
      tools, loading, toolStates, installingIds, toasts,
      isInstalled, isEnabled, isInstalling,
      install, uninstall, toggle,
      getInstalledTools,
      refreshFromGitHub,
    }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToolStoreContext.Provider>
  );
}

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
      <span className="w-4 h-4 rounded-full bg-[#3dba6e]/20 border border-[#3dba6e]/40 flex items-center justify-center flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#3dba6e]" />
      </span>
      {toast.message}
    </div>
  );
}

export function useToolStore() {
  const ctx = useContext(ToolStoreContext);
  if (!ctx) throw new Error("useToolStore must be used inside ToolStoreProvider");
  return ctx;
}

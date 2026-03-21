import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import type { Tool } from "../../lib/types";
import { StatusDot } from "../ui/status-dot";
import { useToolStore } from "../../store/tool-store";

interface ToolCardProps { tool: Tool; }
type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

function InstallModal({ tool, onConfirm, onViewDetails, onClose, installing }: {
  tool: Tool; onConfirm: () => void; onViewDetails: () => void; onClose: () => void; installing: boolean;
}) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#2a2a2a] flex-shrink-0"
            style={{ backgroundColor: tool.iconFile ? "#1a1a1a" : tool.iconBg }}>
            {tool.iconFile
              ? <img src={tool.iconFile} alt={tool.name} className="w-5 h-5 object-contain rounded" />
              : <IconComponent className="w-4 h-4" style={{ color: tool.iconColor }} />}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#e8e8e8] truncate">{tool.name}</p>
            <p className="text-[11px] text-[#555555]">by {tool.author}</p>
          </div>
        </div>

        {installing ? (
          <div className="py-2 space-y-3">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#3b8bdb] rounded-full"
                style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <style>{`@keyframes installBar { 0% { transform:translateX(-150%) } 100% { transform:translateX(400%) } }`}</style>
            <p className="text-[12px] text-[#555555] text-center">Installing...</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">
              You're about to install this tool. Want to review its details first, or install now?
            </p>
            <div className="flex gap-2">
              <button onClick={onViewDetails}
                className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">
                View Details
              </button>
              <button onClick={onConfirm}
                className="flex-1 py-2 text-[12px] font-medium text-white bg-[#3b8bdb] rounded-lg hover:bg-[#4a9beb] transition-all duration-150 active:scale-[0.98]">
                Install Anyway
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UninstallModal({ tool, onConfirm, onClose, installing }: {
  tool: Tool; onConfirm: () => void; onClose: () => void; installing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2a0a0a] border border-[#c0392b]/20 flex-shrink-0">
            <Icons.Trash2 className="w-4 h-4 text-[#c0392b]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#e8e8e8]">
              {installing ? "Uninstalling..." : "Uninstall tool?"}
            </p>
            <p className="text-[11px] text-[#555555] truncate">{tool.name}</p>
          </div>
        </div>

        {installing ? (
          <div className="py-2 space-y-3">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#c0392b] rounded-full"
                style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <p className="text-[12px] text-[#555555] text-center">Removing...</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">
              This will remove the tool and stop all its processes. You can reinstall it anytime from Explore.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">
                Cancel
              </button>
              <button onClick={onConfirm}
                className="flex-1 py-2 text-[12px] font-medium text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all duration-150 active:scale-[0.98]">
                Uninstall
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ToolCard({ tool }: ToolCardProps) {
  const { isInstalled, isEnabled, isInstalling, install, uninstall } = useToolStore();
  const navigate = useNavigate();
  const installed = isInstalled(tool.id);
  const enabled = isEnabled(tool.id);
  const installing = isInstalling(tool.id);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <>
      <div
        className="group relative flex flex-col bg-[#141414] border border-[#222222] rounded-xl overflow-hidden transition-all duration-200 ease-out hover:bg-[#181818] hover:border-[#2e2e2e]"
        style={{ height: 170 }}
      >
        {installed && (
          <div className="absolute top-2.5 right-3 z-10 pointer-events-none">
            <StatusDot active={enabled} />
          </div>
        )}

        <Link to={`/tool/${tool.slug}`} className="flex gap-3 p-4 pb-2 flex-1 min-h-0 overflow-hidden">
          <div className="flex-shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#2a2a2a] transition-colors duration-200 group-hover:border-[#333333]"
              style={{ backgroundColor: tool.iconFile ? "#1a1a1a" : tool.iconBg }}
            >
              {tool.iconFile
                ? <img src={tool.iconFile} alt={tool.name} className="w-6 h-6 object-contain rounded" />
                : <IconComponent className="w-5 h-5" style={{ color: tool.iconColor }} />}
            </div>
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden ${installed ? "pr-16" : ""}`}>
            <h3 className="text-[#e8e8e8] font-semibold text-[13px] leading-tight truncate mb-1.5 group-hover:text-white transition-colors duration-200">
              {tool.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#555555] mb-2 overflow-hidden whitespace-nowrap">
              <Icons.User className="w-3 h-3 flex-shrink-0" />
              <span className="flex-shrink-0">{tool.author}</span>
            </div>
            <p className="text-[12px] text-[#787878] leading-[1.5] overflow-hidden"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {tool.description}
            </p>
          </div>
        </Link>

        <div className="flex items-center justify-between px-4 pb-3 pt-1 flex-shrink-0">
          <Link to={`/tool/${tool.slug}`} onClick={(e) => e.stopPropagation()}
            className="px-3 py-1 text-[12px] text-[#e8e8e8] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:bg-[#1e1e1e] transition-all duration-150 active:scale-[0.97]">
            Details
          </Link>

          {installed ? (
            <button
              disabled={installing}
              onClick={(e) => { e.preventDefault(); if (!installing) setShowUninstallModal(true); }}
              className="px-3 py-1 text-[12px] border border-[#c0392b]/40 text-[#c0392b] rounded-lg hover:border-[#c0392b]/70 hover:bg-[#c0392b]/10 transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {installing ? <><Spinner />Removing</> : "Uninstall"}
            </button>
          ) : (
            <button
              disabled={installing}
              onClick={(e) => { e.preventDefault(); if (!installing) setShowInstallModal(true); }}
              className="px-3 py-1 text-[12px] border border-[#3b8bdb]/50 text-[#3b8bdb] rounded-lg hover:border-[#3b8bdb] hover:bg-[#3b8bdb]/10 transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {installing ? <><Spinner />Installing</> : "Install"}
            </button>
          )}
        </div>
      </div>

      {showInstallModal && (
        <InstallModal tool={tool} installing={installing}
          onConfirm={async () => { await install(tool.id); setShowInstallModal(false); }}
          onViewDetails={() => { setShowInstallModal(false); navigate(`/tool/${tool.slug}`); }}
          onClose={() => { if (!installing) setShowInstallModal(false); }}
        />
      )}
      {showUninstallModal && (
        <UninstallModal tool={tool} installing={installing}
          onConfirm={async () => { await uninstall(tool.id); setShowUninstallModal(false); }}
          onClose={() => { if (!installing) setShowUninstallModal(false); }}
        />
      )}
    </>
  );
}

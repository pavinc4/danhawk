import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import type { Tool } from "../../lib/types";
import { useToolStore } from "../../store/tool-store";
import { useToolModal } from "../../context/ToolModalContext";

import { ToolIcon } from "./ToolIcon";

interface ToolCardProps { tool: Tool; }
type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function InstallModal({ tool, onConfirm, onViewDetails, onClose, installing }: {
  tool: Tool; onConfirm: () => void; onViewDetails: () => void; onClose: () => void; installing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {!installing && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 flex items-center justify-center transition-colors shadow-lg"
            title="Close"
          >
            <svg width="6" height="6" viewBox="0 0 10 10">
              <line x1="1" y1="1" x2="9" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-3 mb-3">
          <ToolIcon tool={tool} size={9} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#e8e8e8] truncate">{tool.name}</p>
            <p className="text-[11px] text-[#555555]">by {tool.author}</p>
          </div>
        </div>

        {installing ? (
          <div className="py-2 space-y-3">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#3b8bdb] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
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
              <button onClick={onViewDetails} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">
                View Details
              </button>
              <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-[#007AFF] bg-[#091b2f] border border-[#007AFF]/20 rounded-lg hover:border-[#007AFF]/40 transition-all duration-150 active:scale-[0.98]">
                Install
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
      <div
        className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {!installing && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 flex items-center justify-center transition-colors shadow-lg"
            title="Close"
          >
            <svg width="6" height="6" viewBox="0 0 10 10">
              <line x1="1" y1="1" x2="9" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="9" y1="1" x2="1" y2="9" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
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
              <div className="h-full bg-[#c0392b] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <p className="text-[12px] text-[#555555] text-center">Removing...</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">
              This will remove the tool and stop all its processes. You can reinstall it anytime from Explore.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">
                Cancel
              </button>
              <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all duration-150 active:scale-[0.98]">
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
  const { openTool } = useToolModal();
  const installed = isInstalled(tool.id);
  const enabled = isEnabled(tool.id);
  const installing = isInstalling(tool.id);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  // Determine the icon component
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <>
      <Link
        to={`/tool/${tool.slug}`}
        onClick={e => { e.preventDefault(); openTool(tool.slug); }}
        className="group relative flex flex-col rounded-[20px] overflow-hidden card-skeuo card-skeuo-dark card-skeuo-hover no-underline pointer-events-auto touch-auto z-10 noise"
        style={{
          height: 220,
          display: "flex",
          flexDirection: "column",
          padding: "16px"
        }}
      >
        {/* Top Icon */}
        <div className="flex items-start justify-between mb-3 flex-shrink-0">
          <div
            className="icon-skeuo"
            style={{
              width: "40px", height: "40px",
              borderRadius: "10px",
              backgroundColor: tool.iconBg || "#007AFF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {tool.iconFile ? (
              <img src={tool.iconFile} alt={tool.name} style={{ width: "20px", height: "20px", objectFit: "contain" }} />
            ) : (
              <IconComponent
                style={{ color: "white", width: "20px", height: "20px" }}
              />
            )}
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-h-0 flex flex-col mb-3">
          <h3 className="text-[15px] font-bold text-[#f0f0f0] tracking-tight leading-tight mb-1 truncate">
            {tool.name}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-[#707070] mb-2">
            <Icons.User className="w-3 h-3" />
            <span className="truncate">{tool.author || "DanHawk"}</span>
          </div>
          <p className="text-[11px] text-[#909090] leading-[1.4] line-clamp-2">
            {tool.description}
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-1 flex-shrink-0">
          {!installed ? (
            <button
              disabled={installing}
              onClick={e => { e.preventDefault(); e.stopPropagation(); if (!installing) setShowInstallModal(true); }}
              className="w-full py-2.5 rounded-[12px] text-[12px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 btn-skeuo-primary"
            >
              {installing ? "INSTALLING..." : "Install"}
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-tighter flex items-center gap-1" style={{ color: enabled ? "#3dba6e" : "#ff5f57" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 5px currentColor" }} />
                  {enabled ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); openTool(tool.slug); }}
                className="px-5 py-1.5 rounded-[10px] text-[12px] font-bold text-[#e0e0e0] btn-skeuo"
              >
                Open
              </button>
            </div>
          )}
        </div>
      </Link>

      {showInstallModal && (
        <InstallModal
          tool={tool}
          installing={installing}
          onConfirm={async () => { await install(tool.id); setShowInstallModal(false); }}
          onViewDetails={() => { setShowInstallModal(false); openTool(tool.slug); }}
          onClose={() => { if (!installing) setShowInstallModal(false); }}
        />
      )}
      {showUninstallModal && (
        <UninstallModal
          tool={tool}
          installing={installing}
          onConfirm={async () => { await uninstall(tool.id); setShowUninstallModal(false); }}
          onClose={() => { if (!installing) setShowUninstallModal(false); }}
        />
      )}
    </>
  );
}
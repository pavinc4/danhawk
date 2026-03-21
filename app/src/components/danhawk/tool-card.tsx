import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import type { Tool } from "../../lib/types";
import { useToolStore } from "../../store/tool-store";

interface ToolCardProps { tool: Tool; }
type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function ToolIcon({ tool, size = 10 }: { tool: Tool; size?: number }) {
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;
  const px = `${size * 4}px`;
  const imgPx = `${size * 3}px`; // custom icons render smaller so they match the visual weight of the coloured box
  if (tool.iconFile) {
    return <img src={tool.iconFile} alt={tool.name} style={{ width: imgPx, height: imgPx, objectFit: "contain" }} />;
  }
  return (
    <div style={{ width: px, height: px, borderRadius: 10, backgroundColor: tool.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <IconComponent style={{ width: `${size * 2}px`, height: `${size * 2}px`, color: tool.iconColor }} />
    </div>
  );
}

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
              <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#3b8bdb] rounded-lg hover:bg-[#4a9beb] transition-all duration-150 active:scale-[0.98]">
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
  const installed = isInstalled(tool.id);
  const enabled = isEnabled(tool.id);
  const installing = isInstalling(tool.id);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  return (
    <>
      <div
        className="group relative flex flex-col rounded-xl overflow-hidden transition-all duration-200 ease-out"
        style={{
          height: 168,
          background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        {/* Top: icon + name + author + description */}
        <Link to={`/tool/${tool.slug}`} className="flex gap-3 p-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex-shrink-0">
            <ToolIcon tool={tool} size={10} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="text-[#e8e8e8] font-semibold text-[13px] leading-tight truncate mb-1 group-hover:text-white transition-colors duration-200">
              {tool.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#555555] mb-1.5 overflow-hidden whitespace-nowrap">
              <Icons.User className="w-3 h-3 flex-shrink-0" />
              <span className="flex-shrink-0">{tool.author}</span>
            </div>
            <p
              className="text-[12px] text-[#787878] leading-[1.5]"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {tool.description}
            </p>
          </div>
        </Link>

        {/* Bottom: Install button OR Active/Inactive — same position */}
        <div className="flex items-center justify-end px-4 pb-3 pt-0 flex-shrink-0">
          {installed ? (
            <div className="flex items-center gap-1.5">
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: enabled ? "#3dba6e" : "#e04535",
                display: "inline-block",
                boxShadow: enabled ? "0 0 6px rgba(61,186,110,0.5)" : "0 0 6px rgba(224,69,53,0.4)",
              }} />
              <span className="text-[11px] font-medium" style={{ color: enabled ? "#3dba6e" : "#e04535" }}>
                {enabled ? "Active" : "Inactive"}
              </span>
            </div>
          ) : (
            <button
              disabled={installing}
              onClick={e => { e.preventDefault(); if (!installing) setShowInstallModal(true); }}
              className="px-3 py-1 text-[11px] font-medium text-white bg-[#3b8bdb] rounded-md hover:bg-[#4a9beb] transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {installing ? "Installing..." : "Install"}
            </button>
          )}
        </div>
      </div>

      {showInstallModal && (
        <InstallModal
          tool={tool}
          installing={installing}
          onConfirm={async () => { await install(tool.id); setShowInstallModal(false); }}
          onViewDetails={() => { setShowInstallModal(false); navigate(`/tool/${tool.slug}`); }}
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
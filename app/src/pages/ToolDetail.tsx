import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "../lib/utils";
import { StatusDot } from "../components/ui/status-dot";
import { useToolStore } from "../store/tool-store";
import { DetailActionSlots, getDetailTabSlots, DetailTabSlotContent } from "../components/ToolSlots";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MarkdownContent({ source }: { source: string }) {
  if (!source.trim()) return null;
  return (
    <div className="max-w-2xl">
      {source.split("\n").map((line, i) => {
        if (line.startsWith("# "))
          return <h1 key={i} className="text-[20px] font-bold mt-4 mb-3 text-[#e8e8e8]">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="text-[15px] font-semibold mt-4 mb-2 text-[#e8e8e8]">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-[13px] font-semibold mt-3 mb-1 text-[#e8e8e8]">{line.slice(4)}</h3>;
        if (line.startsWith("- ")) {
          const text = line.slice(2);
          const isCheck = text.startsWith("✅");
          const isCross = text.startsWith("❌");
          return (
            <li key={i} className={`ml-4 text-[13px] mb-1 list-none flex items-start gap-1.5 ${isCheck ? "text-[#4caf50]" : isCross ? "text-[#ef5350]" : "text-[#787878]"}`}>
              <span className="mt-0.5 flex-shrink-0">{isCheck || isCross ? "" : "•"}</span>
              <span>{renderInline(text)}</span>
            </li>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-[#787878] mb-1.5 text-[13px] leading-[1.6]">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  if (!text.includes("**")) return text;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, j) =>
        j % 2 === 1
          ? <strong key={j} className="text-[#e8e8e8] font-semibold">{part}</strong>
          : part
      )}
    </>
  );
}

// ── Internal components ───────────────────────────────────────────────────────

function ToolToggle({ enabled, toggling, onToggle }: { enabled: boolean; toggling: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 40, height: 22,
        backgroundColor: enabled ? "#3dba6e" : "#2a2a2a",
        border: enabled ? "none" : "1px solid #3a3a3a",
      }}
    >
      <span style={{
        position: "absolute", top: "50%",
        transform: `translateY(-50%) translateX(${enabled ? "20px" : "3px"})`,
        width: 16, height: 16,
        backgroundColor: "white", borderRadius: "50%",
        transition: "transform 0.2s", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

function InstallModal({ toolName, onConfirm, onClose, installing }: {
  toolName: string; onConfirm: () => void; onClose: () => void; installing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0d2a4a] border border-[#1a4a7a]/30 flex-shrink-0">
            {installing
              ? <svg className="animate-spin w-4 h-4 text-[#3b8bdb]" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
              : <Icons.Download className="w-4 h-4 text-[#3b8bdb]" />}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e8e8e8]">{installing ? "Installing..." : "Install tool?"}</p>
            <p className="text-[11px] text-[#555555] truncate">{toolName}</p>
          </div>
        </div>
        {installing ? (
          <div className="py-2 space-y-3">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#3b8bdb] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <style>{`@keyframes installBar { 0% { transform:translateX(-150%) } 100% { transform:translateX(400%) } }`}</style>
            <p className="text-[12px] text-[#555555] text-center">Setting up tool...</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">Ready to install this tool?</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#3b8bdb] rounded-lg hover:bg-[#4a9beb] transition-all duration-150 active:scale-[0.98]">Install</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UninstallModal({ toolName, onConfirm, onClose, installing }: {
  toolName: string; onConfirm: () => void; onClose: () => void; installing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2a0a0a] border border-[#c0392b]/20 flex-shrink-0">
            {installing
              ? <svg className="animate-spin w-4 h-4 text-[#c0392b]" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
              : <Trash2 className="w-4 h-4 text-[#c0392b]" />}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e8e8e8]">{installing ? "Uninstalling..." : "Uninstall tool?"}</p>
            <p className="text-[11px] text-[#555555] truncate">{toolName}</p>
          </div>
        </div>
        {installing ? (
          <div className="py-2 space-y-3">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#c0392b] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <p className="text-[12px] text-[#555555] text-center">Removing tool...</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">This will remove the tool and stop all its processes. You can reinstall anytime from Explore.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all duration-150 active:scale-[0.98]">Uninstall</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ToolDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("");
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  const { tools, isInstalled, isEnabled, isInstalling, isToggling, install, uninstall, toggle } = useToolStore();
  const tool = tools.find((t) => t.slug === params.slug);

  if (!tool) return (
    <div className="bg-[#0d0d0d] min-h-full flex items-center justify-center h-64">
      <p className="text-[#555555]">Tool not found</p>
    </div>
  );

  const installed = isInstalled(tool.id);
  const enabled = isEnabled(tool.id);
  const installing = isInstalling(tool.id);
  const toggling = isToggling(tool.id);

  // ── Dynamic tab list ─────────────────────────────────────────────────────────
  // info/ folder .md files become tabs automatically.
  // Manifest ui.detail_tabs are appended when tool is installed.
  const infoTabItems = tool.infoTabs.map(t => ({ id: `info_${t.label.toLowerCase()}`, label: t.label, source: "info" as const }));
  const extTabItems = installed ? getDetailTabSlots(tool).map(t => ({ id: t.id, label: t.label, source: "ext" as const, slot: t })) : [];
  const allTabs = [...infoTabItems, ...extTabItems];

  // Default to first tab
  const currentTab = activeTab || allTabs[0]?.id || "";

  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <div className="bg-[#0d0d0d] min-h-full">
      <main className="px-8 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 mt-4">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1c1c1c] rounded-md transition-colors duration-150 flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-[#666666]" />
            </button>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-[#2a2a2a]"
              style={{ backgroundColor: tool.iconFile ? "#1a1a1a" : tool.iconBg }}>
              {tool.iconFile
                ? <img src={tool.iconFile} alt={tool.name} className="w-6 h-6 object-contain rounded" />
                : <IconComponent className="w-5 h-5" style={{ color: tool.iconColor }} />}
            </div>
            <h1 className="text-[17px] font-semibold text-[#e8e8e8] truncate">{tool.name}</h1>
            <span className="flex-shrink-0 px-2 py-0.5 bg-[#1c1c1c] text-[11px] text-[#555555] rounded font-mono border border-[#222222]">
              {tool.slug}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#555555] mb-2 ml-[72px]">
            <User className="w-3 h-3" />
            <span>{tool.author}</span>
            {installed && <><span className="text-[#333]">|</span><StatusDot active={enabled} /></>}
          </div>

          <p className="text-[12px] text-[#787878] ml-[72px] mb-4 max-w-2xl">{tool.description}</p>

          <div className="flex items-center gap-3 ml-[72px]">
            {!installed ? (
              <button
                disabled={installing}
                onClick={() => setShowInstallModal(true)}
                className="px-4 py-1.5 bg-[#3b8bdb] text-white rounded-md text-[12px] font-medium hover:bg-[#4a9beb] active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {installing ? <><Spinner />Installing...</> : "Install"}
              </button>
            ) : (
              <>
                <ToolToggle enabled={enabled} toggling={toggling} onToggle={() => toggle(tool.id)} />
                <span className="text-[12px] text-[#555555]">{enabled ? "Enabled" : "Disabled"}</span>
                <button
                  disabled={installing}
                  onClick={() => setShowUninstallModal(true)}
                  className="ml-1 px-3 py-1.5 border border-[#c0392b]/40 text-[#c0392b] rounded-md text-[12px] hover:border-[#c0392b]/70 hover:bg-[#c0392b]/10 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {installing ? <><Spinner />Removing...</> : "Uninstall"}
                </button>
                <DetailActionSlots tool={tool} />
              </>
            )}
          </div>
        </div>

        {/* Tab bar — dynamic from info/ folder */}
        {allTabs.length > 0 && (
          <div className="flex items-center gap-6 border-b border-[#1e1e1e] mb-6 ml-[72px] pr-8">
            {allTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("pb-3 text-[13px] font-medium transition-colors duration-150 relative",
                  currentTab === tab.id ? "text-[#3b8bdb]" : "text-[#888888] hover:text-[#e8e8e8]")}>
                {tab.label}
                {currentTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b8bdb] rounded-full" />}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="ml-[72px] pr-8">

          {/* Info tabs — from info/ folder markdown */}
          {infoTabItems.map(tab => (
            currentTab === tab.id && (
              <div key={tab.id}>
                {(() => {
                  const infoTab = tool.infoTabs.find(t => `info_${t.label.toLowerCase()}` === tab.id);
                  return infoTab?.content?.trim()
                    ? <MarkdownContent source={infoTab.content} />
                    : <p className="text-[#555555] text-[13px]">No content available.</p>;
                })()}
              </div>
            )
          ))}

          {/* Extension-injected tab content */}
          {extTabItems.map(tab => (
            currentTab === tab.id && tab.slot && (
              <DetailTabSlotContent key={tab.id} slot={tab.slot} tool={tool} />
            )
          ))}

          {/* Empty state when no tabs */}
          {allTabs.length === 0 && (
            <p className="text-[#555555] text-[13px]">No details available.</p>
          )}
        </div>
      </main>

      {showInstallModal && (
        <InstallModal toolName={tool.name} installing={installing}
          onConfirm={async () => { await install(tool.id); setShowInstallModal(false); }}
          onClose={() => { if (!installing) setShowInstallModal(false); }}
        />
      )}
      {showUninstallModal && (
        <UninstallModal toolName={tool.name} installing={installing}
          onConfirm={async () => { await uninstall(tool.id); setShowUninstallModal(false); }}
          onClose={() => { if (!installing) setShowUninstallModal(false); }}
        />
      )}
    </div>
  );
}
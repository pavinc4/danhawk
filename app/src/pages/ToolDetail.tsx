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
          return <h1 key={i} className="text-[18px] font-bold mt-3 mb-2 text-[#e8e8e8]">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="text-[14px] font-semibold mt-3 mb-2 text-[#e8e8e8]">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-[12px] font-semibold mt-2 mb-1 text-[#e8e8e8]">{line.slice(4)}</h3>;
        if (line.startsWith("- ")) {
          const text = line.slice(2);
          const isCheck = text.startsWith("✅");
          const isCross = text.startsWith("❌");
          return (
            <li key={i} className={`ml-4 text-[12px] mb-1 list-none flex items-start gap-1.5 ${isCheck ? "text-[#4caf50]" : isCross ? "text-[#ef5350]" : "text-[#787878]"}`}>
              <span className="mt-0.5 flex-shrink-0">{isCheck || isCross ? "" : "•"}</span>
              <span>{renderInline(text)}</span>
            </li>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-[#787878] mb-1.5 text-[12px] leading-[1.5]">{renderInline(line)}</p>;
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
      className={`relative flex-shrink-0 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed toggle-skeuo ${enabled ? "toggle-skeuo-on" : ""}`}
      style={{
        width: 32, height: 18,
        backgroundColor: enabled ? "#3dba6e" : "#2a2a2a",
      }}
    >
      <span style={{
        position: "absolute", top: "50%",
        transform: `translateY(-50%) translateX(${enabled ? "16px" : "2px"})`,
        width: 12, height: 12,
        backgroundColor: "white", borderRadius: "50%",
        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", display: "block",
        boxShadow: "1px 1px 2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.8)",
      }} />
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

function InstallModal({ toolName, onConfirm, onClose, installing }: {
  toolName: string; onConfirm: () => void; onClose: () => void; installing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-[16px] shadow-2xl w-[320px] p-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#091b2f] border border-[#007AFF]/20 flex-shrink-0">
            {installing
              ? <Icons.LoaderCircle className="animate-spin w-4 h-4 text-[#007AFF]" />
              : <Icons.Download className="w-4 h-4 text-[#007AFF]" />}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#e8e8e8]">{installing ? "Installing..." : "Install tool?"}</p>
            <p className="text-[10px] text-[#555555] truncate">{toolName}</p>
          </div>
        </div>
        {installing ? (
          <div className="py-1 space-y-2">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#091b2f] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <p className="text-[11px] text-[#555555] text-center">In progress...</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-[#787878] mb-4 leading-relaxed">Add this tool to your workspace?</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-1.5 text-[11px] font-bold text-[#888] border border-[#2a2a2a] rounded-lg hover:text-[#e8e8e8] hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-1.5 text-[11px] font-bold text-white bg-[#007AFF] rounded-lg hover:bg-[#0069d9] transition-all">Install</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans" onClick={installing ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-[16px] shadow-2xl w-[320px] p-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2a0a0a] border border-[#c0392b]/20 flex-shrink-0">
            {installing
              ? <Icons.LoaderCircle className="animate-spin w-4 h-4 text-[#c0392b]" />
              : <Trash2 className="w-4 h-4 text-[#c0392b]" />}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#e8e8e8]">{installing ? "Removing..." : "Uninstall tool?"}</p>
            <p className="text-[10px] text-[#555555] truncate">{toolName}</p>
          </div>
        </div>
        {installing ? (
          <div className="py-1 space-y-2">
            <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div className="h-full bg-[#c0392b] rounded-full" style={{ width: "40%", animation: "installBar 1.2s ease-in-out infinite" }} />
            </div>
            <p className="text-[11px] text-[#555555] text-center">Removing...</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-[#787878] mb-4 leading-relaxed">Remove this tool from your workspace?</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-1.5 text-[11px] font-bold text-[#888] border border-[#2a2a2a] rounded-lg hover:text-[#e8e8e8] hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-1.5 text-[11px] font-bold text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all">Uninstall</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ToolDetailPage({ slug: propSlug, onClose }: { slug?: string, onClose?: () => void }) {
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("");
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  const { tools, isInstalled, isEnabled, isInstalling, isToggling, install, uninstall, toggle } = useToolStore();
  const slug = propSlug || params.slug;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) return (
    <div className="bg-[#0d0d0d] h-full flex items-center justify-center p-12">
      <p className="text-[#555555] text-[13px]">Tool not found</p>
    </div>
  );

  const installed = isInstalled(tool.id);
  const enabled = isEnabled(tool.id);
  const installing = isInstalling(tool.id);
  const toggling = isToggling(tool.id);

  const infoTabItems = tool.infoTabs.map(t => ({ id: `info_${t.label.toLowerCase()}`, label: t.label, source: "info" as const }));
  const extTabItems = installed ? getDetailTabSlots(tool).map(t => ({ id: t.id, label: t.label, source: "ext" as const, slot: t })) : [];
  const allTabs = [...infoTabItems, ...extTabItems];

  const currentTab = activeTab || allTabs[0]?.id || "";
  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[tool.icon] ?? Icons.Box;

  return (
    <div className="bg-[#0d0d0d] h-full flex flex-col overflow-hidden font-sans">
      

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide noise">
        <main className="max-w-3xl px-8 py-6 animate-entrance">
          <div className="mb-6 card-skeuo p-6 rounded-[20px] noise">
            <div className="flex items-center gap-5 mb-5">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center icon-skeuo rounded-xl bg-white/5 p-1">
                {tool.iconFile
                  ? <img src={tool.iconFile} alt={tool.name} className="w-9 h-9 object-contain" />
                  : <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: tool.iconBg }}>
                    <IconComponent className="w-5 h-5" style={{ color: tool.iconColor }} />
                  </div>
                }
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-[17px] font-bold text-[#e8e8e8] truncate">{tool.name}</h1>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#787878]">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="font-semibold">{tool.author}</span>
                  </div>
                  {installed && (
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                      <StatusDot active={enabled} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[12px] text-[#909090] mb-6 leading-relaxed line-clamp-3">{tool.description}</p>

            <div className="flex items-center gap-3">
              {!installed ? (
                <button
                  disabled={installing}
                  onClick={() => install(tool.id)}
                  className="px-5 py-1.5 rounded-xl text-[12px] font-bold btn-skeuo-primary"
                >
                  {installing ? <><Spinner />Installing...</> : "Install Tool"}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 p-1.5 px-3 bg-white/5 rounded-xl border border-white/5">
                    <ToolToggle enabled={enabled} toggling={toggling} onToggle={() => toggle(tool.id)} />
                    <span className="text-[11px] font-bold text-[#888]">{enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <button
                    disabled={installing}
                    onClick={() => setShowUninstallModal(true)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#c0392b] btn-skeuo"
                  >
                    Uninstall
                  </button>
                  <DetailActionSlots tool={tool} />
                </>
              )}
            </div>
          </div>

          {/* Tab bar */}
          {allTabs.length > 0 && (
            <div className="flex items-center gap-6 border-b border-white/5 mb-6 px-1">
              {allTabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("pb-3 text-[12px] font-bold transition-all duration-200 relative",
                    currentTab === tab.id ? "text-[#007AFF] transform translateY-px" : "text-[#555] hover:text-[#888]")}>
                  {tab.label}
                  {currentTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] rounded-full shadow-[0_0_8px_rgba(0,122,255,0.4)]" />}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div className="px-1">
            {infoTabItems.map(tab => (
              currentTab === tab.id && (
                <div key={tab.id} className="animate-in fade-in duration-300">
                  {(() => {
                    const infoTab = tool.infoTabs.find(t => `info_${t.label.toLowerCase()}` === tab.id);
                    return infoTab?.content?.trim()
                      ? <MarkdownContent source={infoTab.content} />
                      : <p className="text-[#555555] text-[12px]">No content available.</p>;
                  })()}
                </div>
              )
            ))}

            {extTabItems.map(tab => (
              currentTab === tab.id && tab.slot && (
                <div key={tab.id} className="animate-in fade-in duration-300">
                  <DetailTabSlotContent key={tab.id} slot={tab.slot} tool={tool} />
                </div>
              )
            ))}

            {allTabs.length === 0 && (
              <p className="text-[#555555] text-[12px]">No details available.</p>
            )}
          </div>
        </main>
      </div>

      {showUninstallModal && (
        <UninstallModal toolName={tool.name} installing={installing}
          onConfirm={async () => { await uninstall(tool.id); setShowUninstallModal(false); }}
          onClose={() => { if (!installing) setShowUninstallModal(false); }}
        />
      )}
    </div>
  );
}
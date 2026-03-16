import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Copy, Check, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "../lib/utils";
import { StatusDot } from "../components/ui/status-dot";
import { useModStore } from "../store/mod-store";

type TabType = "details" | "source" | "changelog";
type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function ModToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200"
      style={{
        width: 40, height: 22,
        backgroundColor: enabled ? "#3dba6e" : "#2a2a2a",
        border: enabled ? "none" : "1px solid #3a3a3a",
      }}
    >
      <span
        style={{
          position: "absolute", top: "50%",
          transform: `translateY(-50%) translateX(${enabled ? "20px" : "3px"})`,
          width: 16, height: 16,
          backgroundColor: "white", borderRadius: "50%",
          transition: "transform 0.2s", display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-[11px] text-[#aaaaaa] hover:text-[#e8e8e8] hover:border-[#3a3a3a] hover:bg-[#252525] transition-all duration-150"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#4caf50]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function InstallModal({ modName, onConfirm, onClose }: { modName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0d2a4a] border border-[#1a4a7a]/30 flex-shrink-0">
            <Icons.Download className="w-4 h-4 text-[#3b8bdb]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e8e8e8]">Install mod?</p>
            <p className="text-[11px] text-[#555555] truncate">{modName}</p>
          </div>
        </div>
        <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">
          You're already viewing the details. Ready to install this mod?
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#3b8bdb] rounded-lg hover:bg-[#4a9beb] transition-all duration-150 active:scale-[0.98]">Install</button>
        </div>
      </div>
    </div>
  );
}

function UninstallModal({ modName, onConfirm, onClose }: { modName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#2a0a0a] border border-[#c0392b]/20 flex-shrink-0">
            <Trash2 className="w-4 h-4 text-[#c0392b]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e8e8e8]">Uninstall mod?</p>
            <p className="text-[11px] text-[#555555] truncate">{modName}</p>
          </div>
        </div>
        <p className="text-[12px] text-[#787878] mb-4 leading-relaxed">
          This will remove the mod and stop all its processes. You can reinstall anytime from Explore.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-[12px] font-medium text-[#aaaaaa] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-[#e8e8e8] hover:bg-[#1c1c1c] transition-all duration-150">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-[12px] font-medium text-white bg-[#c0392b] rounded-lg hover:bg-[#e04535] transition-all duration-150 active:scale-[0.98]">Uninstall</button>
        </div>
      </div>
    </div>
  );
}

export default function ModDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [collapseReadme, setCollapseReadme] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  const { mods, isInstalled, isEnabled, install, uninstall, toggle } = useModStore();
  const mod = mods.find((m) => m.slug === params.slug);

  if (!mod) return (
    <div className="bg-[#0d0d0d] min-h-full flex items-center justify-center h-64">
      <p className="text-[#555555]">Mod not found</p>
    </div>
  );

  const installed = isInstalled(mod.id);
  const enabled = isEnabled(mod.id);

  const tabs: { id: TabType; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "source", label: "Source Code" },
    { id: "changelog", label: "Changelog" },
  ];

  const IconComponent = ((Icons as unknown) as Record<string, LucideIcon>)[mod.icon] ?? Icons.Box;

  return (
    <div className="bg-[#0d0d0d] min-h-full">
      <main className="px-8 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3 mt-4">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1c1c1c] rounded-md transition-colors duration-150 flex-shrink-0">
              <ArrowLeft className="w-4 h-4 text-[#666666]" />
            </button>
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border border-[#2a2a2a]"
              style={{ backgroundColor: mod.iconBg }}
            >
              <IconComponent className="w-5 h-5" style={{ color: mod.iconColor }} />
            </div>
            <h1 className="text-[17px] font-semibold text-[#e8e8e8] truncate">{mod.name}</h1>
            <span className="flex-shrink-0 px-2 py-0.5 bg-[#1c1c1c] text-[11px] text-[#555555] rounded font-mono border border-[#222222]">
              {mod.slug}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#555555] mb-2 ml-[72px]">
            <User className="w-3 h-3" />
            <span>{mod.author}</span>
            {installed && (<><span className="text-[#333]">|</span><StatusDot active={enabled} /></>)}
          </div>

          <p className="text-[12px] text-[#787878] ml-[72px] mb-4 max-w-2xl">{mod.description}</p>

          <div className="flex items-center gap-3 ml-[72px]">
            {!installed ? (
              <>
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="px-4 py-1.5 bg-[#3b8bdb] text-white rounded-md text-[12px] font-medium hover:bg-[#4a9beb] active:scale-[0.98] transition-all duration-150"
                >
                  Install
                </button>
                <button className="px-4 py-1.5 border border-[#2a2a2a] text-[#e8e8e8] rounded-md text-[12px] font-medium hover:border-[#3a3a3a] hover:bg-[#1c1c1c] active:scale-[0.98] transition-all duration-150">
                  Fork
                </button>
              </>
            ) : (
              <>
                <ModToggle enabled={enabled} onToggle={() => { toggle(mod.id); }} />
                <span className="text-[12px] text-[#555555]">{enabled ? "Enabled" : "Disabled"}</span>
                <button
                  onClick={() => setShowUninstallModal(true)}
                  className="ml-1 px-3 py-1.5 border border-[#c0392b]/40 text-[#c0392b] rounded-md text-[12px] hover:border-[#c0392b]/70 hover:bg-[#c0392b]/10 transition-all duration-150"
                >
                  Uninstall
                </button>

              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-[#1e1e1e] mb-6 ml-[72px] pr-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-[13px] font-medium transition-colors duration-150 relative",
                activeTab === tab.id ? "text-[#3b8bdb]" : "text-[#888888] hover:text-[#e8e8e8]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b8bdb] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-[72px] pr-8">
          {activeTab === "details" && (
            <div className="max-w-2xl">
              {mod.details?.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-[20px] font-bold mt-4 mb-3 text-[#e8e8e8]">{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-[15px] font-semibold mt-4 mb-2 text-[#e8e8e8]">{line.slice(3)}</h2>;
                if (line.startsWith("- ")) {
                  const text = line.slice(2);
                  const isCheck = text.startsWith("✅");
                  const isCross = text.startsWith("❌");
                  return (
                    <li key={i} className={`ml-4 text-[13px] mb-1 list-none flex items-start gap-1.5 ${isCheck ? "text-[#4caf50]" : isCross ? "text-[#ef5350]" : "text-[#787878]"}`}>
                      <span className="mt-0.5 flex-shrink-0">{isCheck || isCross ? "" : "•"}</span>
                      <span>{text}</span>
                    </li>
                  );
                }
                if (line.includes("**")) {
                  const parts = line.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={i} className="text-[#787878] mb-2 text-[13px]">
                      {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-[#e8e8e8] font-semibold">{part}</strong> : part)}
                    </p>
                  );
                }
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-[#787878] mb-1.5 text-[13px] leading-[1.6]">{line}</p>;
              })}
            </div>
          )}

          {activeTab === "source" && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[13px] text-[#e8e8e8]">Collapse Readme and Settings</span>
                <ModToggle enabled={collapseReadme} onToggle={() => setCollapseReadme(!collapseReadme)} />
              </div>
              <div className="relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="absolute top-3 right-3 z-10">
                  <CopyButton text={mod.sourceCode ?? ""} />
                </div>
                <pre className="p-4 pt-12 overflow-x-auto">
                  <code className="text-[12px] font-mono">
                    {mod.sourceCode?.split("\n").map((line, i) => {
                      let color = "#888888";
                      if (line.startsWith("//")) color = "#4a7a4a";
                      if (line.startsWith("// @") || line.startsWith("// ==")) color = "#5a9ad6";
                      if (line.includes("pub fn") || line.includes("use ")) color = "#5a9ad6";
                      if (line.includes("let ") || line.includes("fn ")) color = "#c084fc";
                      if (/^\s*(if|else|match|for|while|return|vec!)/.test(line)) color = "#c084fc";
                      return (
                        <div key={i} className="leading-6">
                          <span style={{ color }}>{line || " "}</span>
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === "changelog" && (
            <div className="max-w-2xl space-y-8">
              {mod.changelog && mod.changelog.length > 0 ? (
                mod.changelog.map((entry, i) => (
                  <div key={i}>
                    <h3 className="text-[16px] font-bold text-[#e8e8e8] mb-3">
                      {entry.version}{" "}
                      <span className="text-[#3b8bdb] font-normal text-[14px]">
                        (<span className="hover:underline cursor-pointer">{entry.date}</span>)
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {entry.changes.map((change, j) => (
                        <li key={j} className="flex items-start gap-2 text-[#787878] text-[13px]">
                          <span className="text-[#444444] mt-0.5 flex-shrink-0">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-[#555555] text-[13px]">No changelog available.</p>
              )}
            </div>
          )}
        </div>
      </main>

      {showInstallModal && (
        <InstallModal
          modName={mod.name}
          onConfirm={async () => { await install(mod.id); setShowInstallModal(false); }}
          onClose={() => setShowInstallModal(false)}
        />
      )}
      {showUninstallModal && (
        <UninstallModal
          modName={mod.name}
          onConfirm={async () => { await uninstall(mod.id); setShowUninstallModal(false); }}
          onClose={() => setShowUninstallModal(false)}
        />
      )}
    </div>
  );
}
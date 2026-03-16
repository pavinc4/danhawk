import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X, Terminal, Eye, LogOut, FileCode2, ChevronRight, Loader2 } from "lucide-react";

const TEMPLATE = `// ==DanhawkMod==
// @id              my-new-mod
// @name            My New Mod
// @description     Describe what your mod does
// @version         1.0.0
// @author          YourName
// ==/DanhawkMod==

// ==DanhawkModReadme==
/*
# My New Mod

Describe your mod here. This section supports Markdown.

## How it works
- Hook into keypresses
- Trigger custom actions

## Requirements
- Windows 10 / 11
*/
// ==/DanhawkModReadme==

use crate::core::{hooks, actions};

pub fn init() {
    // Register your hooks here
    // hooks::on_keypress(vec!["Ctrl", "Alt", "D"], || {
    //     actions::notify("My Mod", "Hotkey triggered!");
    // });
}

pub fn uninit() {
    hooks::unregister_all();
}

pub fn settings_changed(_settings: serde_json::Value) {
    // Handle settings updates
}
`;

export default function CreateModPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(TEMPLATE);
  const [modName, setModName] = useState("my-new-mod");
  const [enabled, setEnabled] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "success" | "error" | "warn" }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split("\n").length;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (text: string, type: "info" | "success" | "error" | "warn" = "info") => {
    setLogs((p) => [...p, { text, type }]);
  };

  const handleCompile = () => {
    setCompiling(true);
    setShowLog(true);
    setLogs([]);
    addLog(`[${new Date().toLocaleTimeString()}] Starting compilation of ${modName}.rs...`);
    setTimeout(() => addLog(`[info] Parsing mod header...`), 300);
    setTimeout(() => addLog(`[info] Resolving hooks and actions...`), 700);
    setTimeout(() => addLog(`[info] Compiling with rustc...`), 1100);
    setTimeout(() => addLog(`[info] Linking core libraries...`, "info"), 1400);
    setTimeout(() => {
      addLog(``, "info");
      addLog(`✓  Compilation successful`, "success");
      addLog(`✓  Mod installed: ${modName}`, "success");
      setCompiling(false);
      setEnabled(true);
    }, 1900);
  };

  const handlePreview = () => {
    setPreviewing(true);
    setShowLog(true);
    setLogs([]);
    addLog(`[${new Date().toLocaleTimeString()}] Launching preview mode...`);
    setTimeout(() => addLog(`[info] Injecting mod into sandbox...`), 400);
    setTimeout(() => {
      addLog(`[info] Preview active — watching for triggers`, "info");
      setPreviewing(false);
    }, 1000);
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
    }
  };

  return (
    <div className="bg-[#0d0d0d] flex h-full" style={{ minHeight: "calc(100vh - 96px)" }}>
      {/* Sidebar */}
      <div className="flex flex-col w-[220px] flex-shrink-0 bg-[#0a0a0a] border-r border-[#1a1a1a]">
        <div className="px-4 pt-4 pb-3 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#141414] border border-[#222222] rounded-lg">
            <FileCode2 className="w-3.5 h-3.5 text-[#3b8bdb] flex-shrink-0" />
            <input
              value={modName}
              onChange={(e) => setModName(e.target.value)}
              className="bg-transparent text-[12px] text-[#e8e8e8] font-mono w-full focus:outline-none"
              placeholder="mod-name"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#aaaaaa]">Enable mod</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className="relative flex-shrink-0 rounded-full transition-colors duration-200"
              style={{ width: 36, height: 20, backgroundColor: enabled ? "#3dba6e" : "#252525", border: enabled ? "none" : "1px solid #353535" }}
            >
              <span style={{
                position: "absolute", top: "50%",
                transform: `translateY(-50%) translateX(${enabled ? "17px" : "3px"})`,
                width: 14, height: 14, backgroundColor: "white", borderRadius: "50%",
                transition: "transform 0.2s", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4 py-4 flex-1">
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="flex items-center justify-center gap-2 w-full py-2 bg-[#3b8bdb] hover:bg-[#4a9beb] text-white text-[12px] font-medium rounded-md transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {compiling
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Compiling...</>
              : <><Play className="w-3.5 h-3.5" /> Compile Mod</>}
          </button>
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center justify-center gap-2 w-full py-2 bg-[#141414] border border-[#222222] hover:border-[#333333] hover:bg-[#1c1c1c] text-[#e8e8e8] text-[12px] font-medium rounded-md transition-all duration-150 active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-[#888888]" />
            Preview Mod
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            className={`flex items-center justify-center gap-2 w-full py-2 border text-[12px] font-medium rounded-md transition-all duration-150 active:scale-[0.98] ${showLog ? "bg-[#1e2a1e] border-[#2a4a2a] text-[#3dba6e]" : "bg-[#141414] border-[#222222] hover:border-[#333333] hover:bg-[#1c1c1c] text-[#e8e8e8]"}`}
          >
            <Terminal className="w-3.5 h-3.5" />
            {showLog ? "Hide Log" : "Show Log"}
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-2 bg-[#1a0a0a] border border-[#c0392b]/30 text-[#c0392b] text-[12px] font-medium rounded-md hover:border-[#c0392b]/60 hover:bg-[#c0392b]/10 transition-all duration-150 active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Editing
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center px-4 py-0 bg-[#0c0c0c] border-b border-[#1a1a1a] h-9">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#141414] border border-[#1e1e1e] border-b-[#141414] rounded-t text-[11px] text-[#aaaaaa] font-mono">
            <FileCode2 className="w-3 h-3 text-[#3b8bdb]" />
            {modName}.rs
            <ChevronRight className="w-3 h-3 text-[#333]" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="py-4 px-3 text-right select-none bg-[#0a0a0a] border-r border-[#141414]" style={{ minWidth: "3.5rem" }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="text-[11px] text-[#2e2e2e] leading-6 font-mono">{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleTabKey}
            className="flex-1 p-4 bg-[#0a0a0a] text-[12px] font-mono text-[#cccccc] resize-none focus:outline-none leading-6 overflow-auto"
            spellCheck={false}
            style={{ caretColor: "#e8e8e8" }}
          />
        </div>

        {showLog && (
          <div className="h-36 flex-shrink-0 border-t border-[#1a1a1a] bg-[#080808] flex flex-col">
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#141414]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-[#3dba6e]" />
                <span className="text-[10px] text-[#555555] font-mono uppercase tracking-wider">Output</span>
              </div>
              <button onClick={() => setLogs([])} className="p-1 hover:bg-[#1a1a1a] rounded transition-colors">
                <X className="w-3 h-3 text-[#444444]" />
              </button>
            </div>
            <div ref={logRef} className="flex-1 overflow-auto px-4 py-2 font-mono text-[11px] space-y-0.5">
              {logs.length === 0
                ? <span className="text-[#333333]">Waiting for output...</span>
                : logs.map((line, i) => (
                  <div key={i} className={
                    line.type === "success" ? "text-[#3dba6e]" :
                    line.type === "error" ? "text-[#ef5350]" :
                    line.type === "warn" ? "text-[#e5a623]" :
                    "text-[#555555]"
                  }>
                    {line.text || "\u00A0"}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

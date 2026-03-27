import { useState } from "react";
import { ChevronRight } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-all duration-300 toggle-skeuo ${checked ? "toggle-skeuo-on" : ""}`}
      style={{
        background: checked ? "linear-gradient(135deg, #3b8bdb 0%, #2a6dbd 100%)" : "rgba(255,255,255,0.08)",
      }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? "translate-x-4" : "translate-x-0"}`}
        style={{
          boxShadow: "1px 1px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.8)"
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [language, setLanguage] = useState("English");
  const [checkUpdates, setCheckUpdates] = useState(true);
  const [developerMode, setDeveloperMode] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [logging, setLogging] = useState(true);

  const languages = ["English", "Español", "Français", "Deutsch", "日本語", "中文", "한국어", "Português", "Italiano", "Русский"];

  return (
    <div className="flex flex-col bg-[#0d0d0d]" style={{ height: "100%", overflow: "hidden", minHeight: 0 }}>

      {/* Page header */}
      <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "18px 24px 14px",
          borderBottom: "1px solid var(--border-subtle)",
      }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
              Settings
          </h1>
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-4 max-w-3xl">
        <section className="mb-6 card-skeuo p-5 rounded-2xl noise">
          <h3 className="text-[#3b8bdb] font-semibold text-[13px] mb-1">Language</h3>
          <p className="text-[11px] text-[#787878] mb-1">Select your preferred display language for Danhawk.</p>
          <a href="#" className="text-[11px] text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 mb-3 inline-block no-underline">
            Contribute a new translation.
          </a>
          <div className="block mt-1">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-44 px-3 py-1.5 bg-[#141414] border border-white/10 rounded-xl text-[#e8e8e8] text-[12px] focus:outline-none focus:border-[#3b8bdb] transition-all duration-150 cursor-pointer appearance-none input-skeuo"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.6rem center", backgroundSize: "0.9rem" }}
            >
              {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </section>

        <section className="mb-6 card-skeuo p-5 rounded-2xl noise flex items-center justify-between">
          <div>
            <h3 className="text-[#3b8bdb] font-semibold text-[13px] mb-1">Check for updates</h3>
            <p className="text-[11px] text-[#787878] mb-0 font-medium">Automatically notify about new versions.</p>
          </div>
          <Toggle checked={checkUpdates} onChange={setCheckUpdates} />
        </section>

        <section className="mb-6 card-skeuo p-5 rounded-2xl noise flex items-center justify-between">
          <div>
            <h3 className="text-[#3b8bdb] font-semibold text-[13px] mb-1">Developer mode</h3>
            <p className="text-[11px] text-[#787878] mb-0 font-medium">Show icons for creating tools.</p>
          </div>
          <Toggle checked={developerMode} onChange={setDeveloperMode} />
        </section>

        <section className="container-skeuo rounded-2xl overflow-hidden noise">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-white/5"
            style={{ backgroundColor: "transparent" }}
          >
            <span className={`transition-transform duration-200 ${advancedOpen ? "rotate-90" : ""}`}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "#4d4d4d" }} />
            </span>
            <span className="font-semibold text-[#e8e8e8] text-[13px]">Advanced settings</span>
          </button>

          <div className={`grid transition-all duration-300 ${advancedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="px-5 pb-5 space-y-5 pt-1 mx-2">
                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-[12px] font-medium text-[#e8e8e8] mb-0.5">Safe mode</h4>
                    <p className="text-[10px] text-[#787878]">Disable all tools on startup.</p>
                  </div>
                  <Toggle checked={safeMode} onChange={setSafeMode} />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-[12px] font-medium text-[#e8e8e8] mb-0.5">Enable logging</h4>
                    <p className="text-[10px] text-[#787878]">Log debug information.</p>
                  </div>
                  <Toggle checked={logging} onChange={setLogging} />
                </div>
                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="text-[12px] font-medium text-[#e8e8e8] mb-0.5">Tool installation path</h4>
                  <p className="text-[10px] text-[#787878] mb-2.5">Directory where tools are stored.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue="C:\\ProgramData\\Danhawk\\Tools"
                      className="flex-1 px-3 py-1.5 rounded-xl text-[11px] text-[#e8e8e8] focus:outline-none focus:border-[#3b8bdb] transition-all duration-150 input-skeuo"
                      readOnly
                    />
                    <button
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#e8e8e8] transition-all duration-150 btn-skeuo"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
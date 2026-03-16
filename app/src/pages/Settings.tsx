import { useState } from "react";
import { ChevronRight } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-all duration-200 ${checked ? "bg-[#3b8bdb]" : "bg-[#333333]"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
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
    <div className="bg-[#0d0d0d] min-h-full">
      <main className="px-8 pb-24 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section className="mb-8">
          <h3 className="text-[#3b8bdb] font-semibold text-[14px] mb-1">Language</h3>
          <p className="text-[12px] text-[#787878] mb-1">Select your preferred display language for Danhawk.</p>
          <a href="#" className="text-[12px] text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 mb-3 inline-block">
            Contribute a new translation.
          </a>
          <div className="block">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-44 px-3 py-2 bg-[#141414] border border-[#222222] rounded-md text-[#e8e8e8] text-[13px] focus:outline-none focus:border-[#3b8bdb] transition-all duration-150 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1rem" }}
            >
              {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="text-[#3b8bdb] font-semibold text-[14px] mb-1">Check for updates</h3>
          <p className="text-[12px] text-[#787878] mb-3">Automatically check for and notify about new versions of Danhawk and installed mods.</p>
          <Toggle checked={checkUpdates} onChange={setCheckUpdates} />
        </section>

        <section className="mb-8">
          <h3 className="text-[#3b8bdb] font-semibold text-[14px] mb-1">Developer mode</h3>
          <p className="text-[12px] text-[#787878] mb-3">Show actions for developers, such as creating and modifying mods.</p>
          <Toggle checked={developerMode} onChange={setDeveloperMode} />
        </section>

        <section className="border border-[#222222] rounded-lg bg-[#141414] overflow-hidden">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#181818] transition-colors duration-150"
          >
            <span className={`transition-transform duration-200 ${advancedOpen ? "rotate-90" : ""}`}>
              <ChevronRight className="w-4 h-4 text-[#666666]" />
            </span>
            <span className="font-medium text-[#e8e8e8] text-[14px]">Advanced settings</span>
          </button>

          <div className={`grid transition-all duration-200 ${advancedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4 space-y-5 border-t border-[#222222] pt-4 mx-4">
                <div>
                  <h4 className="text-[13px] font-medium text-[#e8e8e8] mb-1">Safe mode</h4>
                  <p className="text-[11px] text-[#787878] mb-2">Disable all mods on startup. Useful for troubleshooting.</p>
                  <Toggle checked={safeMode} onChange={setSafeMode} />
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-[#e8e8e8] mb-1">Enable logging</h4>
                  <p className="text-[11px] text-[#787878] mb-2">Log debug information for troubleshooting purposes.</p>
                  <Toggle checked={logging} onChange={setLogging} />
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-[#e8e8e8] mb-1">Mod installation path</h4>
                  <p className="text-[11px] text-[#787878] mb-2">Directory where mods are stored.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue="C:\\ProgramData\\Danhawk\\Mods"
                      className="flex-1 px-3 py-2 bg-[#0d0d0d] border border-[#222222] rounded-md text-[12px] text-[#e8e8e8] focus:outline-none focus:border-[#3b8bdb] transition-all duration-150"
                      readOnly
                    />
                    <button className="px-3 py-2 bg-[#1c1c1c] border border-[#222222] rounded-md text-[12px] font-medium text-[#e8e8e8] hover:border-[#333333] hover:bg-[#222222] active:scale-[0.98] transition-all duration-150">
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

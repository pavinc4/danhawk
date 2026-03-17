import { Package, FolderOpen, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { ModCard } from "../components/danhawk/mod-card";
import { useModStore } from "../store/mod-store";

export default function HomePage() {
  const { mods, getInstalledMods, isEnabled } = useModStore();
  const installedMods = getInstalledMods().filter(m => !isEnabled(m.id));
  const activeMods = mods.filter(m => isEnabled(m.id));

  return (
    <div className="bg-[#0d0d0d] min-h-full px-8 pb-24">

      {/* ── Active extensions ─────────────────────────────────────────── */}
      <section className="mt-6 mb-8">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8e8e8] mb-5">
          <Zap className="w-4 h-4 text-[#3dba6e]" />
          Active
        </h2>
        {activeMods.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
            <div className="w-2 h-2 rounded-full bg-[#2a2a2a] flex-shrink-0" />
            <p className="text-[#444] text-[12px]">No extensions active — toggle one on to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {activeMods.map((mod, i) => (
              <div
                key={mod.id}
                className="animate-in fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <ModCard mod={mod} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Installed extensions ──────────────────────────────────────── */}
      <section>
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8e8e8] mb-5">
          <Package className="w-4 h-4 text-[#666666]" />
          Installed
        </h2>
        {getInstalledMods().length === 0 ? (
          // Nothing installed at all — big empty state with browse button
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-xl bg-[#141414] border border-[#222222]">
              <FolderOpen className="w-8 h-8 text-[#333333]" />
            </div>
            <p className="text-[#555555] text-[13px] mb-5">No extensions installed yet</p>
            <Link
              to="/explore"
              className="px-4 py-2 bg-[#3b8bdb] text-white rounded-lg text-[12px] font-medium hover:bg-[#4a9beb] transition-all duration-150"
            >
              Browse Extensions
            </Link>
          </div>
        ) : (
          // Some installed — show inactive ones + always show Explore card last
          // When installedMods is empty (all active), Explore card is the only item
          // — use justify-center so it sits in the middle column, not left-aligned
          <div className={"grid grid-cols-3 gap-3" + (installedMods.length === 0 ? " [&>*:only-child]:col-start-2" : "")}>
            {installedMods.map((mod, i) => (
              <div
                key={mod.id}
                className="animate-in fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <ModCard mod={mod} />
              </div>
            ))}
            <Link
              to="/explore"
              className="group flex items-center justify-center bg-[#141414] border border-[#222222] rounded-xl hover:border-[#2e2e2e] hover:bg-[#181818] transition-all duration-200"
              style={{ height: 170 }}
            >
              <span className="text-[#555555] text-[13px] font-medium group-hover:text-[#888888] transition-colors flex items-center gap-2">
                Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        )}
      </section>

    </div>
  );
}
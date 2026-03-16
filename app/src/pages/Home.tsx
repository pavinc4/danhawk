import { Package, FolderOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ModCard } from "../components/danhawk/mod-card";
import { useModStore } from "../store/mod-store";

export default function HomePage() {
  const { getInstalledMods } = useModStore();
  const installedMods = getInstalledMods();

  return (
    <div className="bg-[#0d0d0d] min-h-full px-8 pb-24">
      <section>
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8e8e8] mb-5 mt-6">
          <Package className="w-4 h-4 text-[#666666]" />
          Installed Mods
        </h2>
        {installedMods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-xl bg-[#141414] border border-[#222222]">
              <FolderOpen className="w-8 h-8 text-[#333333]" />
            </div>
            <p className="text-[#555555] text-[13px] mb-5">No mods installed yet</p>
            <Link
              to="/explore"
              className="px-4 py-2 bg-[#3b8bdb] text-white rounded-lg text-[12px] font-medium hover:bg-[#4a9beb] transition-all duration-150"
            >
              Browse Mods
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
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
                Explore Mods <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

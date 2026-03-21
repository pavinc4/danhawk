import { Package, FolderOpen, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { ToolCard } from "../components/danhawk/tool-card";
import { useToolStore } from "../store/tool-store";

export default function HomePage() {
  const { tools, getInstalledTools, isEnabled } = useToolStore();
  const installedTools = getInstalledTools().filter(t => !isEnabled(t.id));
  const activeTools = tools.filter(t => isEnabled(t.id));

  return (
    <div className="bg-[#0d0d0d] min-h-full px-8 pb-24">

      {/* ── Active tools ──────────────────────────────────────────────── */}
      <section className="mt-6 mb-8">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8e8e8] mb-5">
          <Zap className="w-4 h-4 text-[#3dba6e]" />
          Active
        </h2>
        {activeTools.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
            <div className="w-2 h-2 rounded-full bg-[#2a2a2a] flex-shrink-0" />
            <p className="text-[#444] text-[12px]">No tools active — toggle one on to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {activeTools.map((tool, i) => (
              <div
                key={tool.id}
                className="animate-in fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Installed tools ───────────────────────────────────────────── */}
      <section>
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#e8e8e8] mb-5">
          <Package className="w-4 h-4 text-[#666666]" />
          Installed
        </h2>
        {getInstalledTools().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-xl bg-[#141414] border border-[#222222]">
              <FolderOpen className="w-8 h-8 text-[#333333]" />
            </div>
            <p className="text-[#555555] text-[13px] mb-5">No tools installed yet</p>
            <Link
              to="/explore"
              className="px-4 py-2 bg-[#3b8bdb] text-white rounded-lg text-[12px] font-medium hover:bg-[#4a9beb] transition-all duration-150"
            >
              Browse Tools
            </Link>
          </div>
        ) : (
          <div className={"grid grid-cols-3 gap-3" + (installedTools.length === 0 ? " [&>*:only-child]:col-start-2" : "")}>
            {installedTools.map((tool, i) => (
              <div
                key={tool.id}
                className="animate-in fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <ToolCard tool={tool} />
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

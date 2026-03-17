import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-[#0d0d0d] min-h-full">
      <main className="px-8 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1c1c1c] rounded-md transition-colors duration-150 mt-4 mb-6 flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-[#666666]" />
        </button>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <h1 className="text-[26px] font-bold text-[#e8e8e8] mb-2">Danhawk v1.0.0</h1>
          <p className="text-[14px] text-[#787878] mb-1">The Windows power tools launcher</p>
          <p className="text-[14px] text-[#787878] mb-12">
            By{" "}
            <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Dan</a>
          </p>

          <section className="mb-10">
            <h2 className="text-[17px] font-semibold text-[#e8e8e8] mb-4">Links</h2>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[14px]">Homepage</a>
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[14px]">Documentation</a>
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[14px]">GitHub</a>
            </div>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-[#e8e8e8] mb-4">Built with</h2>
            <div className="flex flex-col gap-2.5 text-[#787878] text-[14px]">
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Tauri 2.0</a>{" — Lightweight native app shell"}</p>
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Rust</a>{" — Backend engine, mod system, process management"}</p>
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">React + Tailwind CSS</a>{" — UI layer"}</p>
              <p className="text-[#444444]">Other tools and libraries, and a bit of code</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
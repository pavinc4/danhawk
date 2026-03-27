export default function AboutPage() {
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
              About
          </h1>
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col items-center justify-center text-center py-10">
          <h2 className="text-[22px] font-semibold text-[#e8e8e8] mb-1">Danhawk</h2>
          <p className="text-[13px] mb-0.5" style={{ color: "#4d4d4d" }}>v1.0.0</p>
          <p className="text-[13px] text-[#787878] mb-10">
            Windows power tools launcher · By{" "}
            <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Dan</a>
          </p>

          <section className="mb-10">
            <h3 className="text-[15px] font-semibold text-[#e8e8e8] mb-4">Links</h3>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[13px]">Homepage</a>
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[13px]">Documentation</a>
              <a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150 text-[13px]">GitHub</a>
            </div>
          </section>

          <section>
            <h3 className="text-[15px] font-semibold text-[#e8e8e8] mb-4">Built with</h3>
            <div className="flex flex-col gap-2 text-[#787878] text-[13px]">
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Tauri 2.0</a> — Lightweight native app shell</p>
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">Rust</a> — Backend engine, tool system, process management</p>
              <p><a href="#" className="text-[#3b8bdb] hover:text-[#4a9beb] transition-colors duration-150">React + Tailwind CSS</a> — UI layer</p>
              <p style={{ color: "#3c3c3c" }}>Other tools and libraries, and a bit of code</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
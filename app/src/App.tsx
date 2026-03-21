import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Header } from "./components/danhawk/header";
import { CreateToolButton } from "./components/danhawk/create-tool-button";
import { ToolStoreProvider } from "./store/tool-store";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import ToolDetail from "./pages/ToolDetail";
import CreateTool from "./pages/Create";
import Settings from "./pages/Settings";
import About from "./pages/About";

function AppShell() {
  const { pathname } = useLocation();
  const isCompiler = pathname === "/create";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {!isCompiler && <Header />}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/tool/:slug" element={<ToolDetail />} />
          <Route path="/create" element={<CreateTool />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
      {!isCompiler && <CreateToolButton />}
    </div>
  );
}

export default function App() {
  return (
    <ToolStoreProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ToolStoreProvider>
  );
}

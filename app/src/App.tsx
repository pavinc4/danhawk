import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Header } from "./components/danhawk/header";
import { CreateModButton } from "./components/danhawk/create-mod-button";
import { ModStoreProvider } from "./store/mod-store";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import ModDetail from "./pages/ModDetail";
import CreateMod from "./pages/Create";
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
          <Route path="/mod/:slug" element={<ModDetail />} />
          <Route path="/create" element={<CreateMod />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
      {!isCompiler && <CreateModButton />}
    </div>
  );
}

export default function App() {
  return (
    <ModStoreProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ModStoreProvider>
  );
}

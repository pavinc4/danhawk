import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Settings, Info, MessageSquare } from "lucide-react";

const topItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/settings", label: "Settings", icon: Settings },
];

const bottomItems = [
  { to: "/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/about", label: "About", icon: Info },
];

function NavLink({ 
  to, 
  label, 
  icon: Icon, 
  onClick 
}: { 
  to: string; 
  label: string; 
  icon: React.ComponentType<any>;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));

  const content = (
    <>
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isActive ? "text-white" : "text-[#787878] group-hover:text-[#e5e2e1]"}`}>
            <Icon size={16} strokeWidth={isActive ? 2.5 : 1.75} />
        </div>
        <span className={`text-[12px] font-bold tracking-tight transition-colors duration-200 ${isActive ? "text-[#e5e2e1]" : "text-[#787878] group-hover:text-[#e5e2e1]"}`}>{label}</span>
      </>
  );

  const baseClass = `
    group w-full px-6 py-2 flex items-center gap-3 no-underline rounded-none outline-none border-none
    ${isActive 
      ? "pill-skeuo-active shadow-none border-l-4 border-[#133a67] bg-[#133a67]/20" 
      : "hover:bg-white/5"}
  `;

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={baseClass}>
      {content}
    </Link>
  );
}

export function Sidebar({ onOpenSettings, onOpenAbout, onOpenFeedback }: { 
  onOpenSettings: () => void; 
  onOpenAbout: () => void;
  onOpenFeedback: () => void;
}) {
  return (
    <aside className="flex flex-col h-full w-40 container-skeuo z-50 flex-shrink-0 noise">
      {/* Brand Header */}
      <div className="px-5 pt-8 pb-6 flex flex-col items-center">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center mb-3 border border-white/10">
          <h1 className="text-lg font-bold text-[#007AFF] tracking-tighter drop-shadow-[0_2px_4px_rgba(0,122,255,0.4)]">DH</h1>
        </div>
        <h1 className="text-[15px] font-black text-[#e5e1e1] tracking-tighter uppercase mb-0.5">DanHawk</h1>
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#007AFF]/60">Utility Suite</p>
      </div>

      <div className="w-full h-[1px] bg-white/[0.03] mb-6 shadow-[0_1px_0_rgba(255,255,255,0.02)]" />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {topItems.map(item => (
          <NavLink 
            key={item.to} 
            {...item} 
            onClick={item.to === "/settings" ? onOpenSettings : undefined} 
          />
        ))}
      </nav>

      <div className="w-full h-[1px] bg-white/[0.03] mt-3 mb-3 shadow-[0_1px_0_rgba(255,255,255,0.02)]" />

      {/* Footer Navigation */}
      <div className="pb-8 space-y-1">
        {bottomItems.map(item => (
          <NavLink 
            key={item.to} 
            {...item} 
            onClick={item.to === "/about" ? onOpenAbout : item.to === "/feedback" ? onOpenFeedback : undefined}
          />
        ))}
      </div>
    </aside>
  );
}

export function Header(props: any) { return <Sidebar {...props} />; }
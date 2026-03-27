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
      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`
          w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-150 text-sm font-medium
          text-[#e5e2e1]/70 hover:bg-[#ffffff]/5 hover:text-[#e5e2e1]
        `}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className={`
        mx-2 px-3 py-2 rounded-lg flex items-center gap-3 transition-all duration-150 text-sm font-medium
        ${isActive 
          ? "bg-[#007AFF]/15 text-[#adc6ff]" 
          : "text-[#e5e2e1]/70 hover:bg-[#ffffff]/5 hover:text-[#e5e2e1]"}
      `}
      style={{ textDecoration: "none" }}
    >
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
    <aside className="flex flex-col h-full w-40 bg-[#0b0b0b] border-r border-[#ffffff]/5 font-['Inter'] z-50 flex-shrink-0">
      {/* Brand Header */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-lg font-bold text-[#e5e2e1] tracking-tighter">DanHawk</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#c1c6d7]/50 mt-1">Utility Suite</p>
      </div>

      <div className="mx-4 h-[1px] bg-white/[0.05] mb-6" />

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
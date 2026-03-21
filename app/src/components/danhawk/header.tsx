import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Settings, Info } from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    // #111111 — same layer as title bar, unified left column
    <aside
      className="flex-shrink-0 flex flex-col select-none"
      style={{ width: 72, backgroundColor: "#111111", borderRight: "1px solid #1e1e1e" }}
    >
      <nav className="flex flex-col pt-1">
        {navItems.map(item => {
          const isActive =
            pathname === item.to ||
            (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center gap-1 py-3.5 transition-all duration-150 group"
            >
              {/* Active left accent */}
              {isActive && (
                <span
                  className="absolute left-0 top-3 bottom-3 rounded-r-full"
                  style={{ width: 3, backgroundColor: "#3b8bdb" }}
                />
              )}

              {/* Icon */}
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150",
                isActive
                  ? "text-[#3b8bdb]"
                  : "text-[#4d4d4d] group-hover:text-[#888888]"
              )}
                style={{
                  backgroundColor: isActive ? "rgba(59,139,219,0.12)" : undefined,
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#1e1e1e";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? "text-[#3b8bdb]" : "text-[#3c3c3c] group-hover:text-[#4d4d4d]"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function Header() {
  return <Sidebar />;
}
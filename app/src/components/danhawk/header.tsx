import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Settings, Info } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside style={{
      flexShrink: 0,
      width: 68,
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%), #090909",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      paddingTop: 6,
      paddingBottom: 8,
      userSelect: "none",
    }}>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 6px" }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background 0.15s ease",
                background: isActive
                  ? "linear-gradient(135deg, rgba(59,139,219,0.22) 0%, rgba(59,139,219,0.12) 100%)"
                  : "none",
                boxShadow: isActive
                  ? "inset 0 0 0 1px rgba(59,139,219,0.25)"
                  : "none",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "none";
              }}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2.2 : 1.75}
                style={{
                  color: isActive ? "#5ba3e8" : "var(--text-muted)",
                  transition: "color 0.15s",
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.01em",
                color: isActive ? "#5ba3e8" : "var(--text-ghost)",
                transition: "color 0.15s",
                lineHeight: 1,
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function Header() { return <Sidebar />; }
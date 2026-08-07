import { NavLink, Outlet } from "react-router-dom";
import { Building2, CircleDollarSign, LayoutDashboard, SquareKanban, Users } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Organizations", icon: Building2, end: false },
  { to: "/contacts", label: "Contacts", icon: Users, end: false },
  { to: "/deals", label: "Deals", icon: CircleDollarSign, end: false },
  { to: "/pipeline", label: "Pipeline", icon: SquareKanban, end: false }
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <span className="brand-name">Personal CRM</span>
            <span className="brand-sub">Local sales workspace</span>
          </div>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <Icon size={17} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Your data stays on this machine</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

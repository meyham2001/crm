import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { BarChart3, Building2, Handshake, Kanban, Users } from "lucide-react";
import { ToastProvider } from "./components/Toast";
import { DashboardPage } from "./pages/Dashboard";
import { OrganizationsPage } from "./pages/Organizations";
import { OrganizationDetailPage } from "./pages/OrganizationDetail";
import { ContactsPage } from "./pages/Contacts";
import { ContactDetailPage } from "./pages/ContactDetail";
import { DealsPage } from "./pages/Deals";
import { DealDetailPage } from "./pages/DealDetail";
import { PipelinePage } from "./pages/Pipeline";

const NAV = [
  { to: "/", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
];

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <BarChart3 size={19} />
              </div>
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">Personal CRM</span>
                <span className="sidebar-brand-sub">Your private workspace</span>
              </div>
            </div>
            <nav className="sidebar-nav">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <Icon size={17} />
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="sidebar-footer">
              <div><span className="dot" />Running locally on SQLite</div>
              <div>Single user · no accounts</div>
            </div>
          </aside>
          <main className="content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/deals/:id" element={<DealDetailPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
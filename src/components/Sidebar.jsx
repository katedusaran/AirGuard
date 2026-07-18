import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Bell, Wind, Menu, X } from 'lucide-react';
import '../styles/Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <Wind size={18} strokeWidth={2} color="var(--primary-blue)" />
          <span>AirGuard</span>
        </div>
        <button
          className="hamburger-btn"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <Wind size={19} strokeWidth={2} color="var(--primary-blue)" />
          <span>AirGuard</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-indicator" />
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-org">Manolo Fortich NHS</span>
          <span className="sidebar-footer-note">Environmental Monitoring Unit</span>
        </div>
      </aside>
    </>
  );
}
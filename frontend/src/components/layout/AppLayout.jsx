import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Scan, FolderOpen, Settings, LogOut,
  Menu, X, Moon, Sun, Activity, ChevronDown, Bell, User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/analysis',  icon: Scan,            label: 'New Analysis' },
  { path: '/records',   icon: FolderOpen,       label: 'Patient Records' },
  { path: '/settings',  icon: Settings,         label: 'Settings' },
];

function Logo({ collapsed }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-1 py-2 select-none">
      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center rounded-lg"
        style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
        <Activity size={16} style={{ color: 'var(--accent)' }} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2"
          style={{ borderColor: 'var(--bg-surface)' }} />
      </div>
      {!collapsed && (
        <div>
          <p className="font-display font-700 text-sm leading-none" style={{ color: 'var(--text-primary)' }}>
            MammoAI
          </p>
          <p className="text-[10px] font-mono leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Clinical
          </p>
        </div>
      )}
    </Link>
  );
}

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user, signOut } = useClerk();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 transition-theme"
      style={{
        width: collapsed ? '64px' : '224px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        padding: '16px 10px',
      }}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between mb-6">
        <Logo collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="btn-ghost p-1.5 rounded-lg shrink-0"
          style={{ minWidth: 0 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path ||
            (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={`sidebar-link ${active ? 'active' : ''}`}
              title={collapsed ? label : undefined}
              style={collapsed ? { justifyContent: 'center', padding: '9px' } : {}}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section at bottom */}
      <div>
        <div className="divider mb-3" />
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full"
          title={collapsed ? 'Sign out' : undefined}
          style={collapsed ? { justifyContent: 'center', padding: '9px' } : {}}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {!collapsed && user && (
          <div className="mt-3 p-2.5 rounded-lg flex items-center gap-2.5"
            style={{ background: 'var(--bg-raised)' }}>
            <img
              src={user.imageUrl}
              alt={user.firstName}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display font-600 leading-none truncate"
                style={{ color: 'var(--text-primary)' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] font-mono truncate mt-0.5"
                style={{ color: 'var(--text-muted)' }}>
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Topbar() {
  const { toggle, isDark } = useTheme();
  const { user } = useUser();
  const location = useLocation();

  const pageTitle = NAV.find(n =>
    location.pathname === n.path ||
    (n.path !== '/dashboard' && location.pathname.startsWith(n.path))
  )?.label || 'MammoAI Clinical';

  return (
    <header className="h-14 flex items-center justify-between px-5 shrink-0 transition-theme"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
      <div>
        <h1 className="font-display font-600 text-base" style={{ color: 'var(--text-primary)' }}>
          {pageTitle}
        </h1>
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="btn-ghost p-2 rounded-lg"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun  size={16} style={{ color: 'var(--warning)' }} />
            : <Moon size={16} style={{ color: 'var(--accent)' }} />
          }
        </button>

        {/* Notification bell (UI only) */}
        <button className="btn-ghost p-2 rounded-lg relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--danger)' }} />
        </button>

        {/* User avatar */}
        {user && (
          <img
            src={user.imageUrl}
            alt={user.firstName}
            className="w-8 h-8 rounded-full object-cover border-2"
            style={{ borderColor: 'var(--accent)' }}
          />
        )}
      </div>
    </header>
  );
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden transition-theme" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar collapsed={false} setCollapsed={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMobileMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.4,0,0.2,1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

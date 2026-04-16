import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Scan, FolderOpen, Settings, LogOut,
  Menu, X, Moon, Sun, Activity, ChevronDown, Bell, User as UserIcon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocalAuth } from '../../context/LocalAuthContext';
import { getNotifications, markNotificationsRead } from '../../utils/api';
import { useEffect } from 'react';

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
  const { localUser, logoutLocal } = useLocalAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (user) await signOut();
    if (localUser) logoutLocal();
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

        {!collapsed && (user || localUser) && (
          <div className="mt-3 p-2.5 rounded-lg flex items-center gap-2.5"
            style={{ background: 'var(--bg-raised)' }}>
            {(user?.imageUrl || localUser?.imageUrl) ? (
              <img
                src={user?.imageUrl || localUser?.imageUrl}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-display font-700 text-xs text-white" style={{ background: 'var(--accent)' }}>
                {(user?.firstName || localUser?.firstName || 'A')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display font-600 leading-none truncate"
                style={{ color: 'var(--text-primary)' }}>
                {user ? `${user.firstName || ''} ${user.lastName || ''}` : `${localUser.firstName || ''} ${localUser.lastName || ''}`}
              </p>
              <p className="text-[10px] font-mono truncate mt-0.5"
                style={{ color: 'var(--text-muted)' }}>
                {user ? user.primaryEmailAddress?.emailAddress : localUser.email}
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
  const { localUser } = useLocalAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Only fetch if a user is logged in
    if (!user && !localUser) return;
    
    function fetchNotifs() {
      getNotifications().then(res => setNotifications(res.notifications || [])).catch(() => {});
    }

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [user, localUser]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => n.unread).map(n => n.id);
    if (!unreadIds.length) return;
    setNotifications(ns => ns.map(n => ({ ...n, unread: false })));
    await markNotificationsRead([]); // empty array marks all read on backend
  };

  const handleMarkSingleRead = async (id, unread) => {
    if (!unread) return;
    setNotifications(ns => ns.map(x => x.id === id ? { ...x, unread: false } : x));
    await markNotificationsRead([id]);
  };

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

        {/* Notification bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(s => !s)}
            className={`btn-ghost p-2 rounded-lg relative ${showNotifications ? 'bg-[var(--bg-overlay)]' : ''}`}
          >
            <Bell size={16} />
            {notifications.some(n => n.unread) && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--danger)' }} />
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg border p-1"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', zIndex: 100 }}
              >
                <div className="flex justify-between items-center px-3 py-2 mb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="font-display font-600 text-sm">Notifications</h3>
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-xs text-accent hover:underline font-500"
                  >
                    Mark all read
                  </button>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkSingleRead(n.id, n.unread)}
                      className="p-3 mb-1 rounded-lg hover:bg-[var(--bg-overlay)] cursor-pointer flex gap-3 transition-colors"
                      style={{ background: n.unread ? 'var(--accent-dim)' : 'transparent' }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-accent' : 'bg-transparent'}`} />
                      <div>
                        <p className="text-sm font-600 font-display text-primary leading-tight">{n.title}</p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted font-mono mt-1 opacity-70">
                          {new Date(n.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-sm text-center py-6 text-muted">You're all caught up!</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        {(user || localUser) && (
          <div className="ml-2 w-8 h-8 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0"
            style={{ borderColor: 'var(--accent)', background: 'var(--bg-raised)' }}>
            {(user?.imageUrl || localUser?.imageUrl) ? (
               <img src={user?.imageUrl || localUser?.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
               <span className="font-display font-700 text-xs" style={{ color: 'var(--text-primary)' }}>
                 {(user?.firstName || localUser?.firstName || 'A')[0].toUpperCase()}
               </span>
            )}
          </div>
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

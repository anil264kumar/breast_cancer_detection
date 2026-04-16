import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { UserProfile } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sun, Moon, Monitor, Activity, Server, CheckCircle,
  XCircle, Loader2, Database, Bell, Shield, Info
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocalAuth } from '../context/LocalAuthContext';
import { getHealth, clearAllScans, deleteLocalAccount } from '../utils/api';
import { useNavigate } from 'react-router-dom';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background:'var(--accent-dim)' }}>
          <Icon size={15} style={{ color:'var(--accent)' }} />
        </div>
        <h3 className="font-display font-600 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-raised)', border:'1px solid var(--border)' }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type:'spring', stiffness:500, damping:30 }}
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, toggle, isDark } = useTheme();
  const { user } = useUser();
  const { localUser, logoutLocal } = useLocalAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  // Preferences stored in localStorage
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mammoai_prefs') || '{}'); }
    catch { return {}; }
  });

  const savePref = (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    localStorage.setItem('mammoai_prefs', JSON.stringify(updated));
    toast.success('Preference saved');
  };

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null)).finally(() => setHealthLoading(false));
  }, []);

  const themeOptions = [
    { value:'dark',  icon: Moon, label:'Dark',   desc:'Radiology workstation style' },
    { value:'light', icon: Sun,  label:'Light',  desc:'Clinical report style' },
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="mb-6">
        <h1 className="font-display font-700 text-2xl mb-1">Settings</h1>
        <p className="text-sm" style={{ color:'var(--text-secondary)' }}>
          Configure your MammoAI Clinical workspace.
        </p>
      </div>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={Monitor}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-display font-600 uppercase tracking-wide mb-3" style={{ color:'var(--text-muted)' }}>
              Theme
            </p>
            <div className="grid grid-cols-2 gap-3">
              {themeOptions.map(({ value, icon: Icon, label, desc }) => (
                <button key={value}
                  onClick={() => { if (theme !== value) toggle(); }}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    border: `2px solid ${theme === value ? 'var(--accent)' : 'var(--border)'}`,
                    background: theme === value ? 'var(--accent-dim)' : 'var(--bg-raised)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} style={{ color: theme === value ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span className="font-display font-600 text-sm" style={{ color: theme === value ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {label}
                    </span>
                    {theme === value && (
                      <span className="badge badge-accent text-[9px] ml-auto">Active</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Notification preferences ── */}
      <Section title="Clinical Preferences" icon={Bell}>
        <div className="space-y-4">
          {[
            { key:'high_risk_alert',   label:'High Risk Alerts',      desc:'Show toast notification when cancer is detected' },
            { key:'demo_mode_warning', label:'Demo Mode Warning',      desc:'Show warning badge when ML model is not connected' },
            { key:'auto_save',         label:'Auto-save Records',      desc:'Automatically save every analysis to local records' },
            { key:'show_metrics',      label:'Show Model Metrics',     desc:'Display AUC, Recall, Precision in result panel' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-sm font-display font-500">{label}</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{desc}</p>
              </div>
              <ToggleSwitch
                checked={prefs[key] !== false}
                onChange={val => savePref(key, val)}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── ML Server Status ── */}
      <Section title="ML Service Status" icon={Server}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl flex items-center gap-4"
            style={{ background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
            {healthLoading ? (
              <Loader2 size={18} className="animate-spin" style={{ color:'var(--text-muted)' }} />
            ) : health?.ml_service?.online ? (
              <CheckCircle size={18} style={{ color:'var(--safe)' }} />
            ) : (
              <XCircle size={18} style={{ color:'var(--danger)' }} />
            )}
            <div className="flex-1">
              <p className="font-display font-600 text-sm">
                Python ML Service{' '}
                <span style={{ color: health?.ml_service?.online ? 'var(--safe)' : 'var(--danger)' }}>
                  {healthLoading ? '...' : health?.ml_service?.online ? 'Online' : 'Offline'}
                </span>
              </p>
              <p className="text-xs font-mono mt-0.5" style={{ color:'var(--text-muted)' }}>
                {health?.ml_service?.url || 'http://localhost:8000'}
              </p>
            </div>
            <span className={`badge ${health?.ml_service?.online ? 'badge-safe' : 'badge-warning'}`}>
              {healthLoading ? '—' : health?.ml_service?.mode || 'demo'}
            </span>
          </div>

          {!health?.ml_service?.online && !healthLoading && (
            <div className="p-4 rounded-xl text-sm" style={{ background:'var(--accent-dim)', border:'1px solid var(--accent)30' }}>
              <p className="font-display font-600 mb-2" style={{ color:'var(--accent)' }}>
                Connect your Python model
              </p>
              <p className="text-xs leading-relaxed mb-2" style={{ color:'var(--text-secondary)' }}>
                Run your trained model server on port 8000. The Node.js backend will automatically detect it
                and switch from Demo Mode to live predictions.
              </p>
              <code className="block text-xs font-mono p-2 rounded-lg"
                style={{ background:'var(--bg-raised)', color:'var(--accent)' }}>
                python ml_server.py --port 8000
              </code>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg" style={{ background:'var(--bg-raised)' }}>
              <p style={{ color:'var(--text-muted)' }}>Backend Status</p>
              <p className="font-display font-600 mt-1" style={{ color: health ? 'var(--safe)' : 'var(--danger)' }}>
                {health ? '● Running' : '● Offline'}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background:'var(--bg-raised)' }}>
              <p style={{ color:'var(--text-muted)' }}>Server Uptime</p>
              <p className="font-mono font-600 mt-1">{health?.uptime_sec ? `${Math.floor(health.uptime_sec/60)}m ${health.uptime_sec%60}s` : '—'}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Dataset info ── */}
      <Section title="Dataset Information" icon={Database}>
        <div className="space-y-3 text-sm">
          {[
            ['Dataset',     'Mammogram Mastery'],
            ['DOI',         '10.17632/fvjhtskg93.1'],
            ['Source',      'Mendeley Data, Aqdar et al. (2024)'],
            ['Original',    '745 images (125 cancer + 620 non-cancer)'],
            ['Augmented',   '9,685 images (1,625 cancer + 8,060 non-cancer)'],
            ['Classes',     'cancer | non-cancer'],
            ['Format',      'JPG, 1920×1080 px'],
            ['License',     'CC BY 4.0'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <span className="w-28 shrink-0 text-xs font-display font-600 uppercase tracking-wide" style={{ color:'var(--text-muted)' }}>{k}</span>
              <span className="font-mono text-xs" style={{ color:'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Account & Security (Clerk OR Local User) ── */}
      <Section title="Account & Security" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background:'var(--bg-raised)' }}>
            {(user?.imageUrl || localUser?.imageUrl) ? (
              <img src={user?.imageUrl || localUser?.imageUrl} alt="" className="w-12 h-12 rounded-full border-2" style={{ borderColor:'var(--accent)' }} />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-display font-700 text-xl" style={{ borderColor:'var(--accent)', background:'var(--bg-surface)' }}>
                {(user?.firstName || localUser?.firstName || 'D')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-display font-600 text-sm">
                {user ? `${user.firstName || ''} ${user.lastName || ''}` : `${localUser?.firstName || ''} ${localUser?.lastName || ''}`}
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
                {user ? user.primaryEmailAddress?.emailAddress : localUser?.email}
              </p>
            </div>
            
            {user && (
              <button
                onClick={() => setShowProfile(s => !s)}
                className="btn-secondary ml-auto text-sm"
              >
                {showProfile ? 'Hide' : 'Manage Account'}
              </button>
            )}
          </div>

          {/* Clerk Profile */}
          {showProfile && user && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
              <UserProfile
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'w-full shadow-none border-0',
                    navbar: 'hidden',
                    pageScrollBox: 'p-0',
                  }
                }}
              />
            </motion.div>
          )}

          {/* Local User Management */}
          {!user && localUser && (
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <h4 className="font-display font-600 text-sm text-red-500 mb-2">Danger Zone</h4>
              <p className="text-xs text-secondary mb-4">
                Deleting your account will immediately log you out and schedule your data for permanent deletion within 30 days. This action cannot be easily reversed.
              </p>
              <button 
                onClick={async () => {
                  if (confirm('Are you absolutely sure you want to deactivate and schedule your account for deletion?')) {
                    try {
                      await deleteLocalAccount();
                      logoutLocal();
                      toast.success('Account deactivated successfully.');
                      navigate('/');
                    } catch (err) {
                      toast.error('Failed to delete account.');
                    }
                  }
                }}
                className="btn-danger w-full sm:w-auto"
              >
                Delete my account
              </button>
            </motion.div>
          )}

          <div className="p-3 rounded-xl flex gap-2" style={{ background:'var(--accent-dim)', border:'1px solid var(--accent)30' }}>
            <Info size={13} style={{ color:'var(--accent)', marginTop:1, flexShrink:0 }} />
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-secondary)' }}>
              Authentication is powered by <strong>Clerk</strong>. Supports Google SSO, email/password,
              multi-factor authentication, and session management. Manage advanced settings in your
              Clerk dashboard at <span style={{ color:'var(--accent)' }}>clerk.com</span>.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}

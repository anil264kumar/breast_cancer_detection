import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLocalAuth } from '../context/LocalAuthContext';
import { localRegister, localLogin } from '../utils/api';
import { Activity, Sun, Moon, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Left branding panel (shared) ─────────────────────────────────────────
function BrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between w-[44%] p-12"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
        >
          <Activity size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="font-display font-700 text-base leading-none">MammoAI</p>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Clinical Platform
          </p>
        </div>
      </div>

      <div>
        <h2 className="font-display font-700 text-4xl leading-tight mb-6">
          Clinical-grade<br />
          <span style={{ color: 'var(--accent)' }}>breast cancer</span><br />
          detection
        </h2>
        <div className="space-y-3">
          {[
            'EfficientNetB0 transfer learning',
            '9,685 clinician-validated mammograms',
            'Grad-CAM visual explanations',
            'Full patient record management',
            'Clerk + email authentication',
          ].map(item => (
            <div key={item} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <span className="font-600" style={{ color: 'var(--warning)' }}> Research Only:</span>{' '}
          Developed as Mini-Project at Walchand College of Engineering, Sangli.
         
        </p>
      </div>
    </div>
  );
}

// ── Custom email+password form ────────────────────────────────────────────
function LocalAuthForm({ isSignUp }) {
  const { loginLocal } = useLocalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (isSignUp && !form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    else if (isSignUp && form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      let data;
      if (isSignUp) {
        data = await localRegister(form.firstName, form.lastName, form.email, form.password);
        toast.success('Account created! Welcome to MammoAI');
      } else {
        data = await localLogin(form.email, form.password);
        toast.success(`Welcome back, ${data.user.firstName || data.user.email}!`);
      }
      loginLocal(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Something went wrong. Please try again.';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else if (msg.toLowerCase().includes('password')) setErrors({ password: msg });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field) => ({
    background:   'var(--bg-surface)',
    border:       `1px solid ${errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: '8px',
    padding:      '10px 13px',
    fontSize:     '0.875rem',
    color:        'var(--text-primary)',
    width:        '100%',
    outline:      'none',
    fontFamily:   'DM Sans, sans-serif',
    transition:   'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1"
              style={{ color: 'var(--text-muted)' }}>First Name</label>
            <input
              id="local-firstname"
              type="text"
              placeholder="Jane"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              style={inputStyle('firstName')}
              autoComplete="given-name"
            />
            {errors.firstName && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.firstName}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1"
              style={{ color: 'var(--text-muted)' }}>Last Name</label>
            <input
              id="local-lastname"
              type="text"
              placeholder="Doe"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              style={inputStyle('lastName')}
              autoComplete="family-name"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1"
          style={{ color: 'var(--text-muted)' }}>Email Address</label>
        <input
          id="local-email"
          type="email"
          placeholder="you@hospital.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={inputStyle('email')}
          autoComplete="email"
        />
        {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.email}</p>}
      </div>

      <div>
        <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1"
          style={{ color: 'var(--text-muted)' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="local-password"
            type={showPw ? 'text' : 'password'}
            placeholder={isSignUp ? 'Min. 8 characters' : 'Your password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ ...inputStyle('password'), paddingRight: '42px' }}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.password}</p>}
      </div>

      <button
        id="local-submit-btn"
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-2.5 mt-2"
        style={{ fontSize: '0.9rem', fontWeight: 600 }}
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> {isSignUp ? 'Creating account…' : 'Signing in…'}</>
          : isSignUp ? 'Create Account' : 'Sign In'
        }
      </button>
    </form>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────
export default function AuthPage({ mode }) {
  const { toggle, isDark } = useTheme();
  const location = useLocation();
  const isSignUp = mode === 'sign-up' || location.pathname === '/auth/sign-up';

  // 'clerk' = show Clerk component, 'local' = show custom form
  const [authMethod, setAuthMethod] = useState('clerk');

  const tabStyle = (active) => ({
    flex: 1,
    padding: '8px 0',
    borderRadius: '7px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Instrument Sans, sans-serif',
    fontSize: '0.82rem',
    fontWeight: 600,
    transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? (isDark ? '#0C1017' : '#fff') : 'var(--text-muted)',
  });

  return (
    <div className="min-h-screen flex transition-theme" style={{ background: 'var(--bg)' }}>
      <BrandPanel />

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ position: 'relative' }}>
        {/* Theme toggle */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
            {isDark
              ? <Sun size={16} style={{ color: 'var(--warning)' }} />
              : <Moon size={16} style={{ color: 'var(--accent)' }} />}
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Mobile logo */}
          <div className="mb-6 text-center lg:hidden">
            <Link to="/" className="flex items-center gap-2 justify-center mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
              >
                <Activity size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="font-display font-700 text-base">MammoAI Clinical</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-display font-700 text-2xl mb-1">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {isSignUp
                ? 'Choose how you want to register.'
                : 'Sign in to your MammoAI account.'}
            </p>
          </div>

          {/* Method tabs */}
          <div
            className="flex gap-1 p-1 mb-6 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
          >
            <button
              id="tab-clerk"
              onClick={() => setAuthMethod('clerk')}
              style={tabStyle(authMethod === 'clerk')}
            >
               Clerk / Google
            </button>
            <button
              id="tab-email"
              onClick={() => setAuthMethod('local')}
              style={tabStyle(authMethod === 'local')}
            >
               Email & Password
            </button>
          </div>

          {/* Auth content */}
          {authMethod === 'clerk' ? (
            isSignUp ? (
              <SignUp
                routing="path"
                path="/auth/sign-up"
                signInUrl="/auth/sign-in"
                afterSignUpUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'w-full shadow-none border-0 bg-transparent p-0',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    formButtonPrimary: 'btn-primary w-full justify-center py-2.5',
                    footerActionLink: 'text-accent font-600',
                    formFieldInput: 'input',
                    formFieldLabel: 'text-xs font-display font-600 uppercase tracking-wide mb-1',
                    dividerLine: 'bg-border',
                    socialButtonsBlockButton: 'btn-secondary w-full justify-center',
                  },
                }}
              />
            ) : (
              <SignIn
                routing="path"
                path="/auth/sign-in"
                signUpUrl="/auth/sign-up"
                afterSignInUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'w-full shadow-none border-0 bg-transparent p-0',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    formButtonPrimary: 'btn-primary w-full justify-center py-2.5',
                    footerActionLink: 'text-accent font-600',
                    formFieldInput: 'input',
                    formFieldLabel: 'text-xs font-display font-600 uppercase tracking-wide mb-1',
                    dividerLine: 'bg-border',
                    socialButtonsBlockButton: 'btn-secondary w-full justify-center',
                  },
                }}
              />
            )
          ) : (
            <LocalAuthForm isSignUp={isSignUp} />
          )}

          {/* Switch between sign-in / sign-up */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}
              className="font-600"
              style={{ color: 'var(--accent)' }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

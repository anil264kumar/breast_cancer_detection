import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Activity, Sun, Moon } from 'lucide-react';

// ── Left branding panel ────────────────────────────────────────────────────
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
          <br />
          <span style={{ color: 'var(--accent)' }}>Breast cancer</span><br />
          detection
        </h2>
        <div className="space-y-3">
          {[
            'EfficientNetB0 transfer learning',
            '9,685 clinician-validated mammograms',
            'Grad-CAM visual explanations',
            'Full patient record management',
            'Google & email authentication',
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
          Developed as Mini-Project at Walchand College of Engineering, Sangli.
        </p>
      </div>
    </div>
  );
}

// ── Main AuthPage ──────────────────────────────────────────────────────────
export default function AuthPage({ mode }) {
  const { toggle, isDark } = useTheme();
  const location = useLocation();
  const isSignUp = mode === 'sign-up' || location.pathname === '/auth/sign-up';

  const clerkAppearance = {
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
      footer: 'hidden',
    },
  };

  return (
    <div
      className="min-h-screen flex transition-theme"
      style={{ background: 'var(--bg)' }}
    >
      <BrandPanel />

      {/* Right panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ position: 'relative' }}
      >
        {/* Theme toggle */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
            {isDark ? (
              <Sun size={16} style={{ color: 'var(--warning)' }} />
            ) : (
              <Moon size={16} style={{ color: 'var(--accent)' }} />
            )}
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
                ? 'Sign up with Google or your email address.'
                : 'Sign in to your MammoAI account.'}
            </p>
          </div>

          {/* Clerk Auth Component — hash routing changes only the URL
              fragment (#/factor-two), NOT the path. React Router ignores
              hash changes so the component stays mounted through all steps.
              (routing="virtual" is Clerk v5+ only; we're on v4) */}
          {isSignUp ? (
            <SignUp
              routing="hash"
              signInUrl="/auth/sign-in"
              afterSignUpUrl="/dashboard"
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              routing="hash"
              signUpUrl="/auth/sign-up"
              afterSignInUrl="/dashboard"
              appearance={clerkAppearance}
            />
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

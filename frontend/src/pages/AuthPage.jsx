import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Activity, Sun, Moon } from 'lucide-react';

export default function AuthPage({ mode }) {
  const { toggle, isDark } = useTheme();
  const location = useLocation();
  const isSignUp = mode === 'sign-up' || location.pathname === '/auth/sign-up';

  return (
    <div className="min-h-screen flex transition-theme" style={{ background: 'var(--bg)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] p-12"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
            <Activity size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-display font-700 text-base leading-none">MammoAI</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Clinical Platform</p>
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
              'Secure Clerk authentication',
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
            <span className="font-600" style={{ color: 'var(--warning)' }}>⚠ Research Only:</span>{' '}
            This platform is developed as a Mini-Project (7CS345) at Walchand College of Engineering, Sangli.
            Not approved for clinical patient care.
          </p>
        </div>
      </div>

      {/* Right panel — Clerk form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Theme toggle top-right */}
        <div className="absolute top-5 right-5">
          <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
            {isDark ? <Sun size={16} style={{ color: 'var(--warning)' }} /> : <Moon size={16} style={{ color: 'var(--accent)' }} />}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="flex items-center gap-2 justify-center mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
                <Activity size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <span className="font-display font-700 text-base">MammoAI Clinical</span>
            </Link>
          </div>

          {/* Clerk components — appearance is controlled by Clerk's theming */}
          {isSignUp ? (
            <SignUp
              routing="path"
              path="/auth/sign-up"
              signInUrl="/auth/sign-in"
              afterSignUpUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'w-full shadow-none border-0 bg-transparent p-0',
                  headerTitle: 'font-display font-700 text-2xl',
                  headerSubtitle: 'text-sm',
                  formButtonPrimary: 'btn-primary w-full justify-center py-2.5',
                  footerActionLink: 'text-accent font-600',
                  formFieldInput: 'input',
                  formFieldLabel: 'text-xs font-display font-600 uppercase tracking-wide mb-1',
                  dividerLine: 'bg-border',
                  socialButtonsBlockButton: 'btn-secondary w-full justify-center',
                }
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
                  headerTitle: 'font-display font-700 text-2xl',
                  headerSubtitle: 'text-sm',
                  formButtonPrimary: 'btn-primary w-full justify-center py-2.5',
                  footerActionLink: 'text-accent font-600',
                  formFieldInput: 'input',
                  formFieldLabel: 'text-xs font-display font-600 uppercase tracking-wide mb-1',
                  dividerLine: 'bg-border',
                  socialButtonsBlockButton: 'btn-secondary w-full justify-center',
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

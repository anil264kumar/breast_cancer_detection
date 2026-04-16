import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, Shield, Brain, BarChart3, Eye, Lock,
  ChevronRight, Sun, Moon, CheckCircle, Zap, Globe
} from 'lucide-react';

const FEATURES = [
  { icon: Brain,    title: 'EfficientNetB0 AI',     desc: 'Transfer learning on 9,685 clinician-validated mammogram images.' },
  { icon: Eye,      title: 'Grad-CAM Heatmaps',      desc: 'Visual explanation overlays showing exactly which tissue drove the diagnosis.' },
  { icon: Shield,   title: 'Clinician Validated',     desc: 'Dataset approved by specialist radiologists and breast surgeons.' },
  { icon: BarChart3,title: '94.3% AUC-ROC',          desc: 'State-of-the-art performance on held-out test data.' },
  { icon: Lock,     title: 'Secure Auth via Clerk',  desc: 'Role-based access, SSO, MFA — enterprise-grade authentication.' },
  { icon: Zap,      title: 'Real-time Analysis',      desc: 'Results in seconds with probability score and risk stratification.' },
];

const METRICS = [
  { value: '94.3%', label: 'AUC-ROC' },
  { value: '91.2%', label: 'Accuracy' },
  { value: '88.7%', label: 'Recall' },
  { value: '9,685', label: 'Training Images' },
];

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard');
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen transition-theme" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 backdrop-blur-xl"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
            <Activity size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-display font-700 text-base">
            MammoAI <span style={{ color: 'var(--accent)' }}>Clinical</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
            {isDark ? <Sun size={16} style={{ color: 'var(--warning)' }} /> : <Moon size={16} style={{ color: 'var(--accent)' }} />}
          </button>
          <Link to="/auth/sign-in">
            <button className="btn-secondary text-sm">Sign In</button>
          </Link>
          <Link to="/auth/sign-up">
            <button className="btn-primary text-sm">Get Access</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        {/* Background grid */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ color: 'var(--border)' }} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-6">
          <span className="badge badge-accent">
            <Globe size={10} /> Clinical-Grade AI Platform · v2.0
          </span>
        </motion.div> */}

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
          className="font-display font-700 text-5xl md:text-7xl leading-[1.06] tracking-tight mb-6 max-w-4xl"
        >
          AI-Powered<br />
          <span style={{ color: 'var(--accent)' }}>Breast Cancer</span><br />
          Detection Platform
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg max-w-2xl leading-relaxed mb-10 font-body"
          style={{ color: 'var(--text-secondary)' }}
        >
          A fully functional clinical diagnostic platform for radiologists and oncologists.
          Upload mammograms, receive instant AI predictions with{' '}
          <span style={{ color: 'var(--text-primary)' }} className="font-600">Grad-CAM visual explanations</span>,
          manage patient records, and generate clinical reports — all secured with enterprise-grade authentication.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20"
        >
          <Link to="/auth/sign-up">
            <button className="btn-primary px-8 py-3 text-base flex items-center gap-2">
              Start Clinical Trial <ChevronRight size={16} />
            </button>
          </Link>
          <Link to="/auth/sign-in">
            <button className="btn-secondary px-8 py-3 text-base">Sign In</button>
          </Link>
        </motion.div>

        {/* Metrics row */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl"
        >
          {METRICS.map((m, i) => (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              className="card p-4 text-center"
            >
              <p className="font-display font-700 text-2xl" style={{ color: 'var(--accent)' }}>{m.value}</p>
              <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14">
          <h2 className="font-display font-700 text-3xl md:text-4xl mb-4">
            Everything a clinical team needs
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="max-w-xl mx-auto">
            Built on peer-reviewed research, validated datasets, and enterprise-grade infrastructure.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="card card-hover p-6"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-dim)' }}>
                <f.icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="font-display font-600 text-base mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="card max-w-2xl mx-auto p-12"
          style={{ borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}
        >
          <h2 className="font-display font-700 text-3xl mb-3">Ready to start?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Create your clinical account and run your first mammogram analysis in under 5 minutes.
          </p>
          <Link to="/auth/sign-up">
            <button className="btn-primary px-10 py-3 text-base">
              Create Clinical Account
            </button>
          </Link>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
           Research use only
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 px-6 text-center text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <p>MammoAI Clinical · Mini-Project II · Walchand College of Engineering, Sangli · AY 2025–26</p>

      
      </footer>
    </div>
  );
}

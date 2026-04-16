import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  Upload, X, CheckCircle, AlertTriangle, Brain, Eye,
  FileText, User, ChevronRight, RotateCcw, Info
} from 'lucide-react';
import { predictImage } from '../utils/api';

// ── Animated ring meter ──
function RingMeter({ value, color, size = 110 }) {
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-raised)" strokeWidth="9" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (value / 100) * circ }}
          transition={{ duration: 1.4, ease: [0.4,0,0.2,1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-700 text-base" style={{ color }}>{value.toFixed(1)}%</span>
        <span className="text-[9px] font-display" style={{ color: 'var(--text-muted)' }}>prob.</span>
      </div>
    </div>
  );
}

// ── Scanning loader ──
function ScanLoader({ progress }) {
  const steps = [
    'Uploading image...',
    'Applying CLAHE preprocessing...',
    'Running EfficientNetB0 inference...',
    'Generating Grad-CAM heatmap...',
    'Computing risk assessment...',
  ];
  const si = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);

  return (
    <div className="card p-10 flex flex-col items-center gap-6 text-center">
      {/* Brain icon with scan rings */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {[0,1,2].map(i => (
          <motion.div key={i} className="absolute rounded-full"
            style={{ inset: `${i * -14}px`, border: `1px solid var(--accent)` }}
            animate={{ scale:[1,1.12,1], opacity:[0.7,0.2,0.7] }}
            transition={{ duration: 2.4, delay: i*0.5, repeat: Infinity }}
          />
        ))}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
          <Brain size={28} style={{ color: 'var(--accent)' }} />
        </div>
      </div>

      <div>
        <h3 className="font-display font-600 text-lg mb-1">Analysing Mammogram</h3>
        <motion.p key={si} initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }}
          className="text-sm" style={{ color:'var(--text-secondary)' }}>
          {steps[si]}
        </motion.p>
      </div>

      <div className="w-full max-w-xs">
        <div className="progress-track h-2">
          <motion.div className="progress-fill" style={{ background: 'var(--accent)' }}
            animate={{ width: `${Math.max(progress, 6)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
        <div className="flex justify-between text-xs font-mono mt-1.5" style={{ color:'var(--text-muted)' }}>
          <span>Processing</span><span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Drop zone ──
function DropZone({ file, onFile, onClear }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/bmp':['.bmp'] },
    maxSize: 15 * 1024 * 1024,
    multiple: false,
    onDrop: ([f]) => f && onFile(f),
  });

  if (file) return (
    <div className="relative rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--accent)', background: 'var(--accent-dim)' }}>
      <img src={URL.createObjectURL(file)} alt="Selected"
        className="w-full max-h-72 object-contain" />
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" />
          <span className="text-xs text-white font-display font-600 truncate max-w-[180px]">{file.name}</span>
          <span className="badge badge-neutral text-[9px]">{(file.size/1024).toFixed(0)} KB</span>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div {...getRootProps()} className="rounded-xl cursor-pointer transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center gap-4 text-center p-10"
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
        background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-raised)'
      }}>
      <input {...getInputProps()} />
      <motion.div animate={{ y: isDragActive ? -8 : 0 }} transition={{ type:'spring', stiffness:300 }}
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
        <Upload size={24} style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-muted)' }} />
      </motion.div>
      <div>
        <p className="font-display font-600 text-sm">
          {isDragActive ? 'Drop the mammogram here' : 'Upload Mammogram'}
        </p>
        <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
          Drag & drop or <span style={{ color:'var(--accent)' }}>browse</span> · JPG, PNG, BMP · Max 15 MB
        </p>
      </div>
    </div>
  );
}

// ── Result display ──
function ResultPanel({ result, onReset }) {
  const isCancer  = result.class === 'cancer';
  const prob      = result.probability ?? 0;
  const conf      = result.confidence  ?? 0;
  const accentCol = isCancer ? 'var(--danger)' : 'var(--safe)';
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-4">

      {/* Verdict */}
      <div className="card p-5" style={{ borderColor: isCancer ? 'var(--danger)' : 'var(--safe)', background: isCancer ? 'var(--danger-dim)' : 'var(--safe-dim)' }}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isCancer ? <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                        : <CheckCircle  size={18} style={{ color: 'var(--safe)' }}   />}
              <span className={`badge ${isCancer ? 'badge-danger' : 'badge-safe'}`}>
                {result.risk_level}
              </span>
              {result.demo_mode && <span className="badge badge-warning">Demo Mode</span>}
            </div>
            <h2 className="font-display font-700 text-xl mb-1" style={{ color: accentCol }}>
              {result.prediction}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color:'var(--text-secondary)' }}>
              {result.message}
            </p>
          </div>
          <RingMeter value={prob} color={accentCol} size={100} />
        </div>

        {/* Dual probability bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1" style={{ color:'var(--text-muted)' }}>
            <span>Non-Cancer — {(100-prob).toFixed(1)}%</span>
            <span>Cancer — {prob.toFixed(1)}%</span>
          </div>
          <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background:'var(--bg-raised)' }}>
            <motion.div className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: 'var(--safe)' }}
              initial={{ width:0 }} animate={{ width:`${100-prob}%` }}
              transition={{ duration:1.2, ease:[0.4,0,0.2,1] }} />
            <motion.div className="absolute inset-y-0 right-0 rounded-full"
              style={{ background: 'var(--danger)' }}
              initial={{ width:0 }} animate={{ width:`${prob}%` }}
              transition={{ duration:1.2, ease:[0.4,0,0.2,1] }} />
          </div>
        </div>
      </div>

      {/* Confidence + Risk */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Confidence', value:`${conf.toFixed(1)}%`, sub:'Model certainty', color:'var(--accent)' },
          { label:'Risk Level',  value:result.risk_level, sub:
            result.risk_level==='High Risk'     ? 'Urgent referral needed' :
            result.risk_level==='Moderate Risk' ? 'Follow-up recommended'  : 'Routine screening',
            color: result.risk_level==='High Risk'     ? 'var(--danger)'  :
                   result.risk_level==='Moderate Risk' ? 'var(--warning)' : 'var(--safe)'
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-display font-600 uppercase tracking-wide mb-2" style={{ color:'var(--text-muted)' }}>{label}</p>
            <p className="font-display font-700 text-lg" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Image / Heatmap viewer */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Eye size={15} style={{ color:'var(--accent)' }} />
            <span className="font-display font-600 text-sm">Visual Analysis</span>
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)' }}>
            {['Original','Grad-CAM'].map(t => (
              <button key={t} onClick={() => setShowHeatmap(t==='Grad-CAM')}
                className="px-3 py-1 text-xs font-display font-500 transition-colors"
                style={{
                  background: (t==='Grad-CAM') === showHeatmap ? 'var(--accent-dim)' : 'transparent',
                  color:      (t==='Grad-CAM') === showHeatmap ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="relative" style={{ background:'#000', minHeight:'160px' }}>
          {showHeatmap && result.heatmap ? (
            <motion.img key="hm" initial={{ opacity:0 }} animate={{ opacity:1 }}
              src={result.heatmap} alt="Grad-CAM" className="w-full max-h-64 object-contain" />
          ) : result.image_url ? (
            <motion.img key="orig" initial={{ opacity:0 }} animate={{ opacity:1 }}
              src={result.image_url} alt="Original" className="w-full max-h-64 object-contain" />
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>Preview not available</p>
            </div>
          )}
          {showHeatmap && result.heatmap && <div className="scan-line" />}
          {showHeatmap && !result.heatmap && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background:'rgba(0,0,0,0.7)' }}>
              <Eye size={24} style={{ color:'var(--text-muted)' }} />
              <p className="text-xs text-center px-6" style={{ color:'var(--text-muted)' }}>
                Connect Python ML model on port 8000 to enable Grad-CAM heatmaps
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      {result.metrics && (
        <div className="card p-4">
          <p className="font-display font-600 text-xs uppercase tracking-wide mb-3" style={{ color:'var(--text-muted)' }}>
            Model Performance (Test Set)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.metrics).map(([k,v], i) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="capitalize" style={{ color:'var(--text-secondary)' }}>{k.replace(/_/g,' ')}</span>
                  <span className="font-mono font-600">{v}</span>
                </div>
                <div className="progress-track h-1.5">
                  <motion.div className="progress-fill"
                    style={{ background:'var(--accent)' }}
                    initial={{ width:0 }}
                    animate={{ width: v.includes('%') ? v : `${parseFloat(v)*100}%` }}
                    transition={{ duration:0.9, delay: i*0.12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onReset} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <RotateCcw size={14} /> New Analysis
        </button>
        <Link to="/records" className="flex-1">
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <FileText size={14} /> View Records
          </button>
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-xl flex gap-2.5" style={{ background:'var(--warning-light)', border:'1px solid var(--warning)20' }}>
        <Info size={13} style={{ color:'var(--warning)', marginTop:1, flexShrink:0 }} />
        <p className="text-xs leading-relaxed" style={{ color:'var(--warning)' }}>
          <strong>Medical Disclaimer:</strong> AI-generated prediction only. Not a substitute for radiologist review.
          All diagnostic decisions must be made by licensed medical professionals.
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Analysis Page ──
export default function AnalysisPage() {
  const { user } = useUser();
  const [file, setFile]         = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const [patientName, setPatientName]   = useState('');
  const [patientAge, setPatientAge]     = useState('');
  const [patientId, setPatientId]       = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const handleFile = useCallback((f) => {
    setFile(f); setResult(null); setError('');
  }, []);

  const handleClear = () => {
    setFile(null); setResult(null); setError(''); setProgress(0);
    setPatientName(''); setPatientAge(''); setPatientId(''); setClinicalNotes('');
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true); setError(''); setProgress(0);

    const ticker = setInterval(() => setProgress(p => p < 82 ? p + Math.random() * 10 : p), 450);
    try {
      // Build patient metadata — all fields sent as multipart form data to backend
      const patientMeta = {
        name:          patientName   || '',
        mrn:           patientId     || '',
        age:           patientAge    || '',
        clinicalNotes: clinicalNotes || '',
      };

      // FIXED: correct argument order — predictImage(file, patientMeta, onProgress)
      const data = await predictImage(file, patientMeta, (pct) => setProgress(pct * 0.75));
      clearInterval(ticker); setProgress(100);
      await new Promise(r => setTimeout(r, 400));

      // Backend already saved the full record to MongoDB with patient info.
      // Use the backend response directly — it contains the real MongoDB _id.
      setResult(data);
      toast.success(data.class === 'cancer' ? '⚠ Cancer detected — review required' : '✓ Saved to MongoDB — Non-cancer');
    } catch (err) {
      clearInterval(ticker);
      setError(err?.response?.data?.error || 'Backend connection failed. Ensure server runs on port 5000.');
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display font-700 text-2xl mb-1">New Mammogram Analysis</h1>
        <p className="text-sm" style={{ color:'var(--text-secondary)' }}>
          Upload a mammogram X-ray and complete patient details for a full clinical report.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── LEFT: Input ── */}
        <div className="space-y-5">

          {/* Patient info */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={15} style={{ color:'var(--accent)' }} />
              <h3 className="font-display font-600 text-sm">Patient Information</h3>
              <span className="badge badge-neutral text-[9px]">Optional</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1.5"
                  style={{ color:'var(--text-muted)' }}>Patient Name</label>
                <input className="input text-sm" placeholder="e.g. Priya Sharma"
                  value={patientName} onChange={e => setPatientName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1.5"
                  style={{ color:'var(--text-muted)' }}>Age</label>
                <input className="input text-sm" placeholder="e.g. 25" type="number" min="1" max="120"
                  value={patientAge} onChange={e => setPatientAge(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1.5"
                  style={{ color:'var(--text-muted)' }}>Patient ID</label>
                <input className="input text-sm" placeholder="e.g. 1001"
                  value={patientId} onChange={e => setPatientId(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-display font-600 uppercase tracking-wide mb-1.5"
                  style={{ color:'var(--text-muted)' }}>Clinical Notes</label>
                <textarea className="input text-sm resize-none" rows={2}
                  placeholder="Symptoms, history, referral reason..."
                  value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Upload */}
          <div className="card p-5">
            <h3 className="font-display font-600 text-sm mb-4">Mammogram Image</h3>
            <DropZone file={file} onFile={handleFile} onClear={handleClear} />
          </div>

          {/* Analyse button */}
          <AnimatePresence>
            {file && !loading && !result && (
              <motion.button
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                onClick={handleAnalyse}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                <Brain size={18} /> Analyse Mammogram <ChevronRight size={16} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl text-sm" style={{ background:'var(--danger-dim)', border:'1px solid var(--danger)', color:'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          <AnimatePresence mode="wait">
            {loading ? (
              <ScanLoader key="load" progress={progress} />
            ) : result ? (
              <ResultPanel key="result" result={result} onReset={handleClear} />
            ) : (
              <motion.div key="empty"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="card p-10 flex flex-col items-center justify-center text-center gap-5 min-h-[480px]"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
                  <Brain size={32} style={{ color:'var(--text-muted)' }} />
                </div>
                <div>
                  <h3 className="font-display font-600 text-lg mb-2">Awaiting Analysis</h3>
                  <p className="text-sm" style={{ color:'var(--text-secondary)' }}>
                    Fill patient details, upload a mammogram image, and click Analyse Mammogram.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-left">
                  {['Binary Classification','Probability Score','Risk Stratification','Grad-CAM Heatmap'].map(f => (
                    <div key={f} className="p-3 rounded-lg text-xs font-display font-500"
                      style={{ background:'var(--bg-raised)', color:'var(--text-secondary)' }}>
                      {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

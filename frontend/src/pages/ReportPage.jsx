import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Printer, AlertTriangle, CheckCircle, Eye,
  Brain, User, Shield, CheckSquare, Edit3
} from 'lucide-react';
import { getScan, updateScan } from '../utils/api';

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] font-display font-600 uppercase tracking-wider mb-1" style={{ color:'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-body">{value}</p>
    </div>
  );
}

function MetricBar({ label, value, color }) {
  const pct = value?.includes?.('%') ? parseFloat(value) : parseFloat(value) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="capitalize" style={{ color:'var(--text-secondary)' }}>{label.replace(/_/g,' ')}</span>
        <span className="font-mono font-600">{value}</span>
      </div>
      <div className="progress-track h-1.5">
        <motion.div className="progress-fill" style={{ background: color }}
          initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:0.9, ease:[0.4,0,0.2,1] }} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record,      setRecord]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [editNote,    setEditNote]    = useState('');
  const [savingNote,  setSavingNote]  = useState(false);
  const [showNoteEdit, setShowNoteEdit] = useState(false);

  useEffect(() => {
    getScan(id)
      .then(data => { setRecord(data); setEditNote(data.clinical_notes || ''); })
      .catch(() => { toast.error('Record not found'); navigate('/records'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleMarkReviewed = async () => {
    try {
      await updateScan(id, { reviewed: !record.reviewed });
      setRecord(r => ({ ...r, reviewed: !r.reviewed }));
      toast.success(record.reviewed ? 'Marked as unreviewed' : 'Marked as reviewed');
    } catch { toast.error('Update failed'); }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await updateScan(id, { clinicalNotes: editNote });
      setRecord(r => ({ ...r, clinical_notes: editNote }));
      setShowNoteEdit(false);
      toast.success('Note saved to database');
    } catch { toast.error('Save failed'); }
    finally { setSavingNote(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor:'var(--accent)' }} />
    </div>
  );
  if (!record) return null;

  const isCancer  = record.class === 'cancer';
  const accentCol = isCancer ? 'var(--danger)' : 'var(--safe)';

  return (
    <div className="max-w-4xl space-y-5 print:max-w-none">

      {/* Actions bar */}
      <div className="flex items-center justify-between print:hidden flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft size={15} /> Back to Records
        </button>
        <div className="flex gap-2">
          <button onClick={handleMarkReviewed}
            className={`btn-secondary flex items-center gap-2 text-sm ${record.reviewed ? 'border-accent' : ''}`}
            style={record.reviewed ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}}>
            <CheckSquare size={14} />
            {record.reviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-5 pb-5" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:'var(--accent-dim)', border:'1px solid var(--accent)' }}>
              <Brain size={20} style={{ color:'var(--accent)' }} />
            </div>
            <div>
              <p className="font-display font-700 text-lg">MammoAI Clinical Report</p>
              <p className="font-mono text-xs" style={{ color:'var(--text-muted)' }}>
                ID: {record._id?.slice(-12).toUpperCase() || id?.slice(-12).toUpperCase()}
                {record.demo_mode && <span className="badge badge-warning ml-2 text-[9px]">Demo</span>}
                {record.reviewed  && <span className="badge badge-safe ml-2 text-[9px]">Reviewed</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs" style={{ color:'var(--text-muted)' }}>
              {format(new Date(record.timestamp), 'dd MMMM yyyy')}
            </p>
            <p className="font-mono text-xs" style={{ color:'var(--text-muted)' }}>
              {format(new Date(record.timestamp), 'HH:mm:ss')}
            </p>
          </div>
        </div>

        {/* Verdict */}
        <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }}
          className="p-5 rounded-xl mb-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: isCancer ? 'var(--danger-dim)' : 'var(--safe-dim)', border:`1px solid ${accentCol}40` }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:`${accentCol}20`, border:`1px solid ${accentCol}40` }}>
              {isCancer ? <AlertTriangle size={24} style={{ color:accentCol }} /> : <CheckCircle size={24} style={{ color:accentCol }} />}
            </div>
            <div>
              <p className="font-display font-700 text-2xl" style={{ color:accentCol }}>{record.prediction}</p>
              <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{record.message}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-700 text-3xl" style={{ color:accentCol }}>{record.probability?.toFixed(1)}%</p>
            <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>cancer probability</p>
            <span className={`badge ${record.risk_level==='High Risk'?'badge-danger':record.risk_level==='Moderate Risk'?'badge-warning':'badge-safe'}`}>
              {record.risk_level}
            </span>
          </div>
        </motion.div>

        {/* Patient info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <Field label="Patient Name"   value={record.patient_name || 'Anonymous'} />
          <Field label="Patient Age"    value={record.patient_age ? `${record.patient_age} years` : null} />
          <Field label="MRN"            value={record.patient_mrn} />
          <Field label="Gender"         value={record.patient_gender} />
        </div>

        {/* Clinical notes */}
        <div className="p-4 rounded-xl" style={{ background:'var(--bg-raised)', border:'1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-display font-600 uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>
              Clinical Notes
            </p>
            <button onClick={() => setShowNoteEdit(s => !s)} className="btn-ghost py-0.5 px-2 text-xs flex items-center gap-1">
              <Edit3 size={11} /> {showNoteEdit ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {showNoteEdit ? (
            <div className="space-y-2">
              <textarea className="input text-sm resize-none" rows={3}
                value={editNote} onChange={e => setEditNote(e.target.value)} />
              <button onClick={handleSaveNote} disabled={savingNote} className="btn-primary text-xs py-1.5 px-4">
                {savingNote ? 'Saving...' : 'Save to MongoDB'}
              </button>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color:'var(--text-secondary)' }}>
              {record.clinical_notes || 'No clinical notes recorded.'}
            </p>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Eye size={15} style={{ color:'var(--accent)' }} />
            <span className="font-display font-600 text-sm">Mammogram Images</span>
          </div>
          <div className="flex rounded-lg overflow-hidden print:hidden" style={{ border:'1px solid var(--border)' }}>
            {['Original','Grad-CAM'].map(t => (
              <button key={t} onClick={() => setShowHeatmap(t==='Grad-CAM')}
                className="px-3 py-1 text-xs font-display font-500 transition-colors"
                style={{
                  background: (t==='Grad-CAM')===showHeatmap ? 'var(--accent-dim)' : 'transparent',
                  color:      (t==='Grad-CAM')===showHeatmap ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="p-4" style={{ borderRight:'1px solid var(--border)' }}>
            <p className="text-xs font-display font-600 mb-3" style={{ color:'var(--text-muted)' }}>ORIGINAL</p>
            <div className="rounded-xl overflow-hidden bg-black">
              {record.image_url
                ? <img src={record.image_url} alt="Original" className="w-full max-h-52 object-contain" />
                : <div className="h-40 flex items-center justify-center"><p className="text-xs" style={{ color:'var(--text-muted)' }}>Not available</p></div>
              }
            </div>
            <p className="text-[10px] font-mono mt-2" style={{ color:'var(--text-muted)' }}>
              {record.filename} · {record.file_size_kb} KB
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-display font-600 mb-3" style={{ color:'var(--text-muted)' }}>GRAD-CAM</p>
            <div className="relative rounded-xl overflow-hidden bg-black">
              {record.heatmap
                ? <img src={record.heatmap} alt="Grad-CAM" className="w-full max-h-52 object-contain" />
                : <div className="h-40 flex flex-col items-center justify-center gap-2">
                    <Brain size={24} style={{ color:'var(--text-muted)' }} />
                    <p className="text-xs text-center px-4" style={{ color:'var(--text-muted)' }}>Connect Python ML model for Grad-CAM</p>
                  </div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {record.metrics && (
        <div className="card p-5">
          <h3 className="font-display font-600 text-sm mb-4 flex items-center gap-2">
            <Brain size={15} style={{ color:'var(--accent)' }} /> Model Performance
          </h3>
          <div className="space-y-3">
            {[['accuracy','var(--accent)'],['auc_roc','var(--safe)'],['recall','#818CF8'],['precision','#F59E0B']]
              .filter(([k]) => record.metrics[k])
              .map(([k, c]) => <MetricBar key={k} label={k} value={record.metrics[k]} color={c} />)}
          </div>
          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background:'var(--bg-raised)' }}>
            <p style={{ color:'var(--text-muted)' }}>
              <strong>Model:</strong> {record.model_info?.architecture} · {record.model_info?.dataset}
            </p>
          </div>
        </div>
      )}

      {/* Clinician */}
      <div className="card p-5">
        <h3 className="font-display font-600 text-sm mb-4 flex items-center gap-2">
          <User size={15} style={{ color:'var(--accent)' }} /> Analysed By
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Clinician" value={record.analysed_by} />
          <Field label="Email"     value={record.analysed_by_email} />
          <Field label="Date"      value={format(new Date(record.timestamp), 'dd MMMM yyyy')} />
          <Field label="Time"      value={format(new Date(record.timestamp), 'HH:mm:ss')} />
          <Field label="File"      value={record.filename} />
          <Field label="Storage"   value="MongoDB (persistent)" />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card p-5" style={{ borderColor:'var(--warning)', background:'var(--warning-light)' }}>
        <div className="flex items-start gap-3">
          <Shield size={15} style={{ color:'var(--warning)', marginTop:2, flexShrink:0 }} />
          <p className="text-xs leading-relaxed" style={{ color:'var(--warning)' }}>
            <strong>Medical Disclaimer:</strong> This AI-generated report is for research and educational purposes only.
            It is NOT approved for clinical patient care, diagnosis, or treatment decisions.
            All findings must be reviewed and confirmed by licensed medical professionals.
            Walchand College of Engineering, Sangli — Mini-Project I (7CS345) — AY 2025–26.
          </p>
        </div>
      </div>
    </div>
  );
}

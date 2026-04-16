import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Search, Trash2, ArrowRight, Download, AlertTriangle,
  CheckCircle, FileText, SlidersHorizontal, X, RefreshCw
} from 'lucide-react';
import { getScans, deleteScan, clearAllScans } from '../utils/api';

function exportCSV(records) {
  const headers = ['ID','Patient','MRN','Age','Result','Probability (%)','Risk','Analysed By','Date'];
  const rows = records.map(r => [
    r.id, r.patient_name, r.patient_mrn, r.patient_age,
    r.prediction, r.probability, r.risk_level, r.analysed_by,
    format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm')
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })),
    download: `mammoai_records_${format(new Date(),'yyyyMMdd')}.csv`
  });
  a.click();
  toast.success('Records exported as CSV');
}

export default function RecordsPage() {
  const [records,     setRecords]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterRisk,  setFilterRisk]  = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScans({
        page, limit: LIMIT,
        classification: filterClass,
        riskLevel:      filterRisk,
        search,
        sortBy:    'createdAt',
        sortOrder: 'desc',
      });
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [page, filterClass, filterRisk, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record from the database?')) return;
    try {
      await deleteScan(id);
      toast.success('Record deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL your scan records from MongoDB? This cannot be undone.')) return;
    try {
      const r = await clearAllScans();
      toast.success(`Cleared ${r.count} records`);
      load();
    } catch { toast.error('Clear failed'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-700 text-2xl mb-0.5">Patient Records</h1>
          <p className="text-sm font-mono" style={{ color:'var(--text-secondary)' }}>
            {total} records in MongoDB · page {page}/{pages || 1}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportCSV(records)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={load} className="btn-secondary p-2.5" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {total > 0 && (
            <button onClick={handleClearAll} className="btn-danger flex items-center gap-2 text-sm">
              <Trash2 size={14} /> Clear All
            </button>
          )}
          <Link to="/analysis">
            <button className="btn-primary text-sm">+ New Analysis</button>
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }} />
            <input className="input pl-9 text-sm" placeholder="Search by patient name, MRN, or result..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                <X size={13} style={{ color:'var(--text-muted)' }} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(s => !s)}
            className="btn-secondary flex items-center gap-2 text-sm"
            style={showFilters ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              className="flex flex-wrap gap-4 pt-3 overflow-hidden" style={{ borderTop:'1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-display font-600 uppercase tracking-wide mb-2" style={{ color:'var(--text-muted)' }}>Class</p>
                <div className="flex gap-2">
                  {['all','cancer','non-cancer'].map(v => (
                    <button key={v} onClick={() => { setFilterClass(v); setPage(1); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-display font-500 border transition-colors"
                      style={{
                        background:   filterClass === v ? 'var(--accent-dim)' : 'transparent',
                        borderColor:  filterClass === v ? 'var(--accent)' : 'var(--border)',
                        color:        filterClass === v ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {v === 'all' ? 'All' : v === 'cancer' ? '⚠ Cancer' : '✓ Non-Cancer'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-display font-600 uppercase tracking-wide mb-2" style={{ color:'var(--text-muted)' }}>Risk Level</p>
                <div className="flex gap-2 flex-wrap">
                  {['all','High Risk','Moderate Risk','Low Risk'].map(v => (
                    <button key={v} onClick={() => { setFilterRisk(v); setPage(1); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-display font-500 border transition-colors"
                      style={{
                        background:  filterRisk === v ? 'var(--accent-dim)' : 'transparent',
                        borderColor: filterRisk === v ? 'var(--accent)' : 'var(--border)',
                        color:       filterRisk === v ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      {v === 'all' ? 'All Risks' : v}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center">
            <FileText size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-display font-600 text-base mb-1">
              {total === 0 ? 'No records in database' : 'No matching records'}
            </p>
            <p className="text-sm" style={{ color:'var(--text-muted)' }}>
              {total === 0 ? 'Start a new analysis to create records in MongoDB.' : 'Try adjusting your filters.'}
            </p>
            {total === 0 && <Link to="/analysis"><button className="btn-primary mt-4 text-sm">New Analysis</button></Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th><th>Result</th><th>Probability</th>
                  <th>Risk</th><th>Analysed By</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <motion.tr key={rec.id}
                    initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.25) }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                          style={{ border:'1px solid var(--border)', background:'var(--bg-raised)' }}>
                          {rec.image_url
                            ? <img src={rec.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color:'var(--text-muted)' }}>IMG</div>
                          }
                        </div>
                        <div>
                          <p className="font-display font-600 text-xs">{rec.patient_name || 'Anonymous'}</p>
                          <p className="font-mono text-[10px]" style={{ color:'var(--text-muted)' }}>{rec.patient_mrn || 'No MRN'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {rec.class === 'cancer'
                          ? <AlertTriangle size={13} style={{ color:'var(--danger)' }} />
                          : <CheckCircle  size={13} style={{ color:'var(--safe)'   }} />}
                        <span className={`badge ${rec.class === 'cancer' ? 'badge-danger' : 'badge-safe'}`}>
                          {rec.class === 'cancer' ? 'Cancer' : 'Non-Cancer'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-600">{rec.probability?.toFixed(1)}%</span>
                        <div className="w-16 progress-track h-1.5">
                          <div className="progress-fill h-full"
                            style={{ background: rec.class === 'cancer' ? 'var(--danger)' : 'var(--safe)', width:`${rec.probability}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        rec.risk_level === 'High Risk' ? 'badge-danger' :
                        rec.risk_level === 'Moderate Risk' ? 'badge-warning' : 'badge-safe'
                      }`}>{rec.risk_level}</span>
                    </td>
                    <td>
                      <p className="text-xs font-display font-500">{rec.analysed_by || 'Unknown'}</p>
                      {rec.demo_mode && <span className="badge badge-warning text-[9px]">Demo</span>}
                    </td>
                    <td>
                      <p className="text-xs font-mono">{format(new Date(rec.timestamp), 'dd MMM yyyy')}</p>
                      <p className="text-[10px] font-mono" style={{ color:'var(--text-muted)' }}>
                        {format(new Date(rec.timestamp), 'HH:mm:ss')}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/records/${rec.id}`}>
                          <button className="btn-ghost py-1 px-2 rounded-lg" title="View report"><ArrowRight size={13} /></button>
                        </Link>
                        <button onClick={() => handleDelete(rec.id)}
                          className="btn-ghost py-1 px-2 rounded-lg" style={{ color:'var(--danger)' }} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm">← Prev</button>
          <span className="font-mono text-sm" style={{ color:'var(--text-muted)' }}>
            {page} / {pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
            className="btn-secondary px-3 py-1.5 text-sm">Next →</button>
        </div>
      )}
    </div>
  );
}

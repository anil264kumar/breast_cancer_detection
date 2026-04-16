import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import {
  BarChart2, AlertTriangle, CheckCircle, Clock,
  Scan, ArrowRight, Activity, FileText
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { getScans, getScanStats } from '../utils/api';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={17} style={{ color }} />
        </div>
        <span className="badge badge-neutral text-[10px]">Live</span>
      </div>
      <div>
        <p className="font-display font-700 text-3xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
      {sub && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </motion.div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs font-mono">
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function Skeleton({ h = 'h-8', w = 'w-full' }) {
  return <div className={`skeleton ${h} ${w} rounded-lg`} />;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [stats,     setStats]     = useState(null);
  const [recentRec, setRecentRec] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, scansData] = await Promise.all([
          getScanStats(),
          getScans({ page: 1, limit: 6, sortBy: 'createdAt', sortOrder: 'desc' }),
        ]);
        setStats(statsData);
        setRecentRec(scansData.records || []);
      } catch (e) {
        console.error('Dashboard load error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totals = stats?.totals || {};
  const daily  = stats?.daily  || [];

  const pieData = [
    { name: 'Cancer',     value: totals.cancerCount    || 1, color: 'var(--danger)' },
    { name: 'Non-Cancer', value: totals.nonCancerCount || 3, color: 'var(--safe)'   },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-700 text-2xl mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
          {user?.firstName || 'Doctor'} 👋
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your clinical summary · data from MongoDB
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card gap-3">
              <Skeleton h="h-9" w="w-9" /><Skeleton h="h-8" /><Skeleton h="h-4" w="w-2/3" />
            </div>
          ))
        ) : (
          <>
            <StatCard icon={FileText}      label="Total Scans"      value={totals.totalScans     || 0} sub="All time"            color="var(--accent)"  delay={0}    />
            <StatCard icon={AlertTriangle} label="Cancer Detected"   value={totals.cancerCount    || 0} sub={`${totals.highRiskCount||0} high risk`} color="var(--danger)"  delay={0.07} />
            <StatCard icon={CheckCircle}   label="Non-Cancer"        value={totals.nonCancerCount || 0} sub="Clear results"       color="var(--safe)"    delay={0.14} />
            <StatCard icon={Clock}         label="Demo Mode Scans"   value={totals.demoCount      || 0} sub="Simulated results"   color="var(--warning)" delay={0.21} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-600 text-sm">Scan Activity — Last 7 Days</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>From MongoDB analytics</p>
            </div>
            <span className="badge badge-accent">MongoDB</span>
          </div>
          {loading ? <Skeleton h="h-44" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={daily} margin={{ top:0, right:0, left:-30, bottom:0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCancer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={d => format(new Date(d), 'EEE')}
                  tick={{ fill:'var(--text-muted)', fontSize:11, fontFamily:'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:10, fontFamily:'JetBrains Mono' }}
                  axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke:'var(--border)', strokeWidth:1 }} />
                <Area type="monotone" dataKey="totalScans"  name="Total"  stroke="var(--accent)" strokeWidth={2} fill="url(#gTotal)"  />
                <Area type="monotone" dataKey="cancerCount" name="Cancer" stroke="var(--danger)" strokeWidth={2} fill="url(#gCancer)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="font-display font-600 text-sm">Classification Split</h3>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Lifetime totals</p>
          </div>
          {loading ? <Skeleton h="h-44" /> : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx={70} cy={70} innerRadius={44} outerRadius={64}
                  dataKey="value" strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                </Pie>
              </PieChart>
              <div className="w-full space-y-2">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span style={{ color:'var(--text-secondary)' }}>{p.name}</span>
                    </div>
                    <span className="font-mono font-600">
                      {totals.totalScans > 0 ? Math.round((p.value / totals.totalScans) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent cases */}
      <div className="card">
        <div className="flex items-center justify-between p-5" style={{ borderBottom:'1px solid var(--border)' }}>
          <h3 className="font-display font-600 text-sm">Recent Cases</h3>
          <Link to="/records">
            <button className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1">
              View All <ArrowRight size={12} />
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="h-10" />)}
          </div>
        ) : recentRec.length === 0 ? (
          <div className="p-10 text-center">
            <Scan size={32} className="mx-auto mb-3 opacity-20" />
            <p className="font-display font-600 text-base mb-1">No analyses yet</p>
            <p className="text-sm" style={{ color:'var(--text-muted)' }}>Run your first mammogram analysis.</p>
            <Link to="/analysis">
              <button className="btn-primary mt-4 text-sm">New Analysis</button>
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Result</th>
                <th>Probability</th>
                <th>Risk</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentRec.map(rec => (
                <tr key={rec.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0"
                        style={{ border:'1px solid var(--border)', background:'var(--bg-raised)' }}>
                        {rec.image_url
                          ? <img src={rec.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Activity size={14} style={{ color:'var(--text-muted)' }} />
                            </div>
                        }
                      </div>
                      <div>
                        <p className="text-xs font-display font-600 truncate max-w-[120px]">{rec.patient_name}</p>
                        <p className="text-[10px] font-mono" style={{ color:'var(--text-muted)' }}>{rec.patient_mrn || 'No MRN'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${rec.class === 'cancer' ? 'badge-danger' : 'badge-safe'}`}>
                      {rec.class === 'cancer' ? 'Cancer' : 'Non-Cancer'}
                    </span>
                  </td>
                  <td><span className="font-mono text-xs">{rec.probability?.toFixed(1)}%</span></td>
                  <td>
                    <span className={`badge ${
                      rec.risk_level === 'High Risk' ? 'badge-danger' :
                      rec.risk_level === 'Moderate Risk' ? 'badge-warning' : 'badge-safe'
                    }`}>{rec.risk_level}</span>
                  </td>
                  <td>
                    <span className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>
                      {format(new Date(rec.timestamp), 'dd MMM, HH:mm')}
                    </span>
                  </td>
                  <td>
                    <Link to={`/records/${rec.id}`}>
                      <button className="btn-ghost py-1 px-2"><ArrowRight size={12} /></button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

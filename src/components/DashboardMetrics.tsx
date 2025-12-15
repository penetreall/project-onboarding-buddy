import { useState, useEffect } from 'react';
import { DashboardStats, fetchDashboardStats } from '../lib/api';

export default function DashboardMetrics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <div className="h-3 bg-white/[0.04] w-20 mb-3 rounded"></div>
            <div className="h-7 bg-white/[0.04] w-16 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      label: 'Requisições',
      value: stats.requestsToday.toLocaleString('pt-BR'),
      sublabel: 'hoje',
      trend: null
    },
    {
      label: 'Bloqueios',
      value: stats.blockedToday.toLocaleString('pt-BR'),
      sublabel: `${stats.requestsToday > 0 ? Math.round((stats.blockedToday / stats.requestsToday) * 100) : 0}% do total`,
      trend: null
    },
    {
      label: 'Taxa de detecção',
      value: `${stats.detectionRate}%`,
      sublabel: 'total',
      trend: null
    },
    {
      label: 'Domínios ativos',
      value: stats.activeDomains.toString(),
      sublabel: `de ${stats.activeDomains}`,
      trend: null
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-200"
        >
          <div className="text-[11px] text-[#737373] mb-2 font-medium">
            {metric.label}
          </div>
          <div className="text-[24px] text-white font-semibold mb-1 tabular-nums tracking-tight leading-none">
            {metric.value}
          </div>
          <div className="text-[11px] text-[#666666]">
            {metric.sublabel}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase, TrafficAnalytic, ProtectedDomain } from '../lib/supabase';
import { ChartLine, TrendUp, Shield, Warning, CircleNotch } from 'phosphor-react';

export default function TrafficAnalytics() {
  const [analytics, setAnalytics] = useState<TrafficAnalytic[]>([]);
  const [domains, setDomains] = useState<ProtectedDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedDomain]);

  const loadData = async () => {
    try {
      const { data: domainsData } = await supabase
        .from('protected_domains')
        .select('*')
        .eq('status', 'active');

      setDomains(domainsData || []);

      let query = supabase
        .from('traffic_analytics')
        .select('*, protected_domains!inner(*)')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (selectedDomain !== 'all') {
        query = query.eq('domain_id', selectedDomain);
      }

      const { data: analyticsData } = await query;
      setAnalytics(analyticsData || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: analytics.length,
    legitimate: analytics.filter(a => a.classification === 'legitimate').length,
    suspicious: analytics.filter(a => a.classification === 'suspicious').length,
    bot: analytics.filter(a => a.classification === 'bot').length,
    avgTrustScore: analytics.length > 0
      ? Math.round(analytics.reduce((sum, a) => sum + a.trust_score, 0) / analytics.length)
      : 0,
  };

  const getClassificationStyle = (classification: string) => {
    switch (classification) {
      case 'legitimate':
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'suspicious':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'bot':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' };
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{
          color: '#E2E8F0',
          fontFamily: 'Manrope, sans-serif',
          letterSpacing: '-0.03em'
        }}>
          Análise de Tráfego
        </h1>
        <p style={{ color: 'rgba(226, 232, 240, 0.6)' }}>
          Análise comportamental e classificação de tráfego em tempo real
        </p>
      </div>

      <div className="rounded-xl shadow-lg p-4" style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(74, 144, 226, 0.2)'
      }}>
        <label className="block font-medium mb-2" style={{ color: '#E2E8F0' }}>
          Filtrar por Domínio
        </label>
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl focus:outline-none"
          style={{
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1.5px solid rgba(74, 144, 226, 0.2)',
            color: '#E2E8F0',
            fontFamily: 'Geist, sans-serif'
          }}
        >
          <option value="all">Todos os Domínios</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.protected_domain}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Requisições', value: stats.total, icon: ChartLine, color: '#4A90E2' },
          { label: 'Legítimo', value: stats.legitimate, icon: Shield, color: '#22c55e' },
          { label: 'Suspeito', value: stats.suspicious, icon: Warning, color: '#f59e0b' },
          { label: 'Bots Detectados', value: stats.bot, icon: TrendUp, color: '#ef4444' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl shadow-lg p-6 relative overflow-hidden" style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(74, 144, 226, 0.2)',
              animation: `fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s backwards`
            }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium" style={{ color: 'rgba(226, 232, 240, 0.6)' }}>{stat.label}</h3>
                <Icon size={20} weight="duotone" color={stat.color} />
              </div>
              <p className="text-3xl font-bold" style={{
                color: stat.color,
                fontFamily: 'Manrope, sans-serif',
                letterSpacing: '-0.05em'
              }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl shadow-lg overflow-hidden" style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(74, 144, 226, 0.2)'
      }}>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(74, 144, 226, 0.15)' }}>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{
            color: '#E2E8F0',
            fontFamily: 'Manrope, sans-serif'
          }}>
            <ChartLine size={24} weight="duotone" color="#4A90E2" />
            Análise de Tráfego Recente
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <CircleNotch size={32} weight="bold" className="mx-auto mb-3" style={{
              color: '#4A90E2',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: 'rgba(226, 232, 240, 0.6)' }}>Carregando análises...</p>
          </div>
        ) : analytics.length === 0 ? (
          <div className="p-12 text-center">
            <ChartLine size={64} weight="thin" className="mx-auto mb-4" style={{
              color: 'rgba(74, 144, 226, 0.2)'
            }} />
            <p className="text-lg mb-2" style={{ color: '#E2E8F0' }}>Nenhum dado de tráfego ainda</p>
            <p style={{ color: 'rgba(226, 232, 240, 0.5)' }}>As análises aparecerão aqui quando sua proteção começar a receber tráfego</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(74, 144, 226, 0.08)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider monospace" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider monospace" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                    Fingerprint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider monospace" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                    Trust Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider monospace" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                    Classificação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider monospace" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                    Requisições
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgba(74, 144, 226, 0.1)' }}>
                {analytics.map((item) => {
                  const classStyle = getClassificationStyle(item.classification);
                  return (
                    <tr key={item.id} className="hover:bg-opacity-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm monospace" style={{ color: 'rgba(226, 232, 240, 0.6)' }}>
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm monospace" style={{ color: '#E2E8F0' }}>
                        {item.visitor_fingerprint.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(74, 144, 226, 0.2)' }}>
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${item.trust_score}%`,
                                backgroundColor: getTrustScoreColor(item.trust_score),
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium monospace" style={{ color: getTrustScoreColor(item.trust_score) }}>
                            {item.trust_score}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium monospace" style={{
                          background: classStyle.bg,
                          color: classStyle.color,
                          border: `1px solid ${classStyle.border}`
                        }}>
                          {item.classification.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm monospace" style={{ color: '#E2E8F0' }}>
                        {item.request_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

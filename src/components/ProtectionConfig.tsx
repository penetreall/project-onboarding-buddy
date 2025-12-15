import { useState, useEffect } from 'react';
import { fetchDomains, createDomain as apiCreateDomain, deleteDomain as apiDeleteDomain, updateDomainStatus as apiUpdateDomainStatus, fetchLogs } from '../lib/api';
import { ProtectedDomain } from '../lib/supabase';
import DashboardMetrics from './DashboardMetrics';
import MiniActivityChart from './MiniActivityChart';

interface Domain extends ProtectedDomain {
  param_key?: string;
  safe_url?: string;
  money_url?: string;
  is_active?: boolean;
}

interface DomainStats {
  [key: string]: {
    requestsToday: number;
    lastActivity: Date | null;
    hourlyActivity: number[];
    trafficLevel: 'low' | 'medium' | 'high';
  };
}

interface ProtectionConfigProps {
  onViewChange?: (view: string) => void;
}

export default function ProtectionConfig({ onViewChange }: ProtectionConfigProps = {}) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainStats, setDomainStats] = useState<DomainStats>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showParamKeys, setShowParamKeys] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  const [formData, setFormData] = useState({
    safeUrl: '',
    moneyUrl: '',
  });

  useEffect(() => {
    loadDomains();
    const interval = setInterval(loadDomainStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (domains.length > 0) {
      loadDomainStats();
    }
  }, [domains]);

  const loadDomains = async () => {
    try {
      const domainsData = await fetchDomains();
      setDomains(domainsData);
    } catch (err) {
      console.error('Error loading domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDomainStats = async () => {
    try {
      const stats: DomainStats = {};
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const domain of domains) {
        try {
          const logs = await fetchLogs(domain.id, undefined, 100);

          const todayLogs = logs.filter(log => new Date(log.timestamp) >= todayStart);
          const requestsToday = todayLogs.length;

          const lastLog = logs.length > 0 ? logs[0] : null;
          const lastActivity = lastLog ? new Date(lastLog.timestamp) : null;

          const hourlyActivity = Array(24).fill(0);
          todayLogs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourlyActivity[hour]++;
          });

          const last6Hours = hourlyActivity.slice(-6);

          let trafficLevel: 'low' | 'medium' | 'high' = 'low';
          if (requestsToday > 100) trafficLevel = 'high';
          else if (requestsToday > 20) trafficLevel = 'medium';

          stats[domain.id] = {
            requestsToday,
            lastActivity,
            hourlyActivity: last6Hours,
            trafficLevel
          };
        } catch (err) {
          stats[domain.id] = {
            requestsToday: 0,
            lastActivity: null,
            hourlyActivity: [0, 0, 0, 0, 0, 0],
            trafficLevel: 'low'
          };
        }
      }

      setDomainStats(stats);
    } catch (err) {
      console.error('Error loading domain stats:', err);
    }
  };

  const getTimeAgo = (date: Date | null): string => {
    if (!date) return 'Sem atividade';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes}min`;
    if (hours < 24) return `há ${hours}h`;
    return `há ${days}d`;
  };


  const handleDownload = async (domain: Domain) => {
    try {
      setLoading(true);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bypass-zip?domain_id=${domain.id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate bypass package');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `icewall-${domain.protected_domain.replace(/[^a-z0-9]/gi, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading bypass package:', err);
      alert('Erro ao gerar pacote de proteção. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCreateDomain(formData.safeUrl, formData.moneyUrl);
      await loadDomains();
      setShowForm(false);
      setFormData({ safeUrl: '', moneyUrl: '' });
    } catch (err: any) {
      alert('Erro ao criar domínio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    try {
      setLoading(true);
      await apiDeleteDomain(domainId);
      await loadDomains();
      setShowDeleteConfirm(null);
      setSelectedDomain(null);
    } catch (err: any) {
      alert('Erro ao deletar domínio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDomainStatus = async (domain: Domain) => {
    try {
      setLoading(true);
      await apiUpdateDomainStatus(domain.id, !domain.is_active);
      await loadDomains();
      setSelectedDomain(null);
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForm) {
    return (
      <div className="h-full bg-transparent">
        <div className="border-b border-white/[0.06] px-6 py-5">
          <button
            onClick={() => {
              setShowForm(false);
              setFormData({ safeUrl: '', moneyUrl: '' });
            }}
            className="flex items-center gap-1.5 text-[13px] text-[#A1A1A1] hover:text-white mb-4 transition-colors font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <h1 className="text-xl font-semibold text-white tracking-tight">Nova proteção</h1>
        </div>

        <div className="p-6">
          <div className="max-w-xl">
            <div className="mb-6 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(59 130 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-white mb-1.5">
                    Como funciona
                  </h3>
                  <p className="text-[13px] text-[#A1A1A1] leading-relaxed">
                    A URL Protegida é exibida para auditores e bots. A URL Legítima é mostrada apenas para usuários reais com click_id válido.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-white mb-2">
                  URL Protegida
                </label>
                <input
                  type="url"
                  value={formData.safeUrl}
                  onChange={(e) => setFormData({ ...formData, safeUrl: e.target.value })}
                  required
                  placeholder="https://exemplo.com"
                  className="w-full px-3 py-2.5 text-[13px] bg-white/[0.02] border border-white/[0.08] text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-[#666666]"
                />
                <p className="text-[12px] text-[#737373] mt-2">
                  Página limpa mostrada para auditores
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-white mb-2">
                  URL Legítima
                </label>
                <input
                  type="url"
                  value={formData.moneyUrl}
                  onChange={(e) => setFormData({ ...formData, moneyUrl: e.target.value })}
                  required
                  placeholder="https://exemplo.com"
                  className="w-full px-3 py-2.5 text-[13px] bg-white/[0.02] border border-white/[0.08] text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-[#666666]"
                />
                <p className="text-[12px] text-[#737373] mt-2">
                  Página real mostrada para usuários válidos
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ safeUrl: '', moneyUrl: '' });
                  }}
                  className="px-4 py-2.5 text-[13px] font-medium border border-white/[0.08] text-[#A1A1A1] rounded-lg hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 text-[13px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {loading ? 'Criando...' : 'Criar proteção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (selectedDomain) {
    return (
      <div className="h-full bg-transparent">
        <div className="border-b border-[#252525] px-6 py-4">
          <button
            onClick={() => setSelectedDomain(null)}
            className="flex items-center gap-2 text-[13px] text-[#888888] hover:text-white mb-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <h1 className="text-[20px] font-medium text-white mb-1">Configuração</h1>
          <p className="text-[13px] text-[#666666]">{selectedDomain.protected_domain}</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl space-y-4">
            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
              <div className="text-[12px] text-[#666666] mb-2">Domínio</div>
              <div className="text-[13px] text-white">{selectedDomain.protected_domain}</div>
            </div>

            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
              <div className="text-[12px] text-[#666666] mb-2">URL Protegida (Auditores)</div>
              <div className="text-[13px] text-white font-mono break-all">{selectedDomain.safe_url}</div>
            </div>

            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
              <div className="text-[12px] text-[#666666] mb-2">URL Legítima (Pessoas Reais)</div>
              <div className="text-[13px] text-white font-mono break-all">{selectedDomain.money_url}</div>
            </div>

            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
              <div className="text-[12px] text-[#666666] mb-2">Chave do Parâmetro</div>
              <div className="flex items-center gap-3">
                <div className="text-[13px] text-white font-mono">
                  {showParamKeys[selectedDomain.id] ? selectedDomain.param_key : '••••••••••••••••'}
                </div>
                <button
                  onClick={() => setShowParamKeys({ ...showParamKeys, [selectedDomain.id]: !showParamKeys[selectedDomain.id] })}
                  className="text-[12px] text-[#888888] hover:text-white px-2 py-1 transition-colors"
                >
                  {showParamKeys[selectedDomain.id] ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
              <div className="text-[12px] text-[#666666] mb-2">Status</div>
              <button
                onClick={() => toggleDomainStatus(selectedDomain)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-md transition-colors ${
                  selectedDomain.is_active
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : 'bg-[#EF4444]/10 text-[#EF4444]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: selectedDomain.is_active ? '#10B981' : '#EF4444' }}></span>
                {selectedDomain.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(selectedDomain.id)}
                className="px-4 py-2 text-[13px] text-[#EF4444] border border-[#252525] rounded-md hover:border-[#EF4444]/30 hover:bg-[#EF4444]/5 transition-colors"
              >
                Deletar
              </button>
            </div>

            {showDeleteConfirm === selectedDomain.id && (
              <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-lg p-4">
                <div className="text-[13px] text-white mb-3">
                  Tem certeza que deseja deletar esta proteção?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-3 py-1.5 text-[12px] border border-[#252525] text-[#888888] rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => deleteDomain(showDeleteConfirm)}
                    className="px-3 py-1.5 text-[12px] text-white bg-[#EF4444] rounded-md hover:bg-[#DC2626] transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-transparent">
      <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Proteções</h1>
          <p className="text-[13px] text-[#737373] mt-1">
            {domains.length} {domains.length === 1 ? 'domínio configurado' : 'domínios configurados'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white text-[13px] font-medium rounded-lg transition-all flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova proteção
        </button>
      </div>

      <div className="p-6">
        <DashboardMetrics />

        {loading && domains.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-[#666666]">
            Carregando proteções...
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p className="text-sm text-white font-medium mb-1">Nenhuma proteção configurada</p>
            <p className="text-[13px] text-[#737373]">Crie sua primeira proteção para começar</p>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-lg overflow-hidden">
            {domains.map((domain) => {
              const stats = domainStats[domain.id];
              return (
                <div
                  key={domain.id}
                  className="group px-4 py-3.5 hover:bg-white/[0.02] border-b border-white/[0.06] last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-[13px] text-white font-mono truncate font-medium">
                            {domain.protected_domain}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${domain.is_active ? 'bg-emerald-500' : 'bg-[#404040]'}`}></span>
                            <span className={`text-[11px] font-medium ${domain.is_active ? 'text-[#737373]' : 'text-[#666666]'}`}>
                              {domain.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>

                        {stats && (
                          <div className="flex items-center gap-3 text-[11px] text-[#666666]">
                            <span>{getTimeAgo(stats.lastActivity)}</span>
                            <span>·</span>
                            <span className="tabular-nums">{stats.requestsToday} requisições</span>
                            {stats.hourlyActivity.length > 0 && (
                              <>
                                <span>·</span>
                                <MiniActivityChart
                                  data={stats.hourlyActivity}
                                  color="#666666"
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(domain)}
                        className="text-[12px] font-medium text-[#A1A1A1] hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-all"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => setSelectedDomain(domain)}
                        className="text-[12px] font-medium text-[#A1A1A1] hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-all"
                      >
                        Configurar
                      </button>
                      <button
                        onClick={() => onViewChange?.('logs')}
                        className="text-[12px] font-medium text-[#A1A1A1] hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/[0.04] transition-all"
                      >
                        Ver logs
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(domain.id)}
                        className="text-[#666666] hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.04] transition-all ml-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showDeleteConfirm && !selectedDomain && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
            <div className="p-6 max-w-sm bg-[#0A0A0A] border border-white/[0.1] rounded-xl shadow-2xl">
              <h3 className="text-sm font-semibold text-white mb-2">Deletar proteção</h3>
              <p className="text-[13px] text-[#A1A1A1] mb-5 leading-relaxed">
                Tem certeza que deseja deletar esta proteção? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-3 py-2.5 text-[13px] font-medium border border-white/[0.08] text-[#A1A1A1] rounded-lg hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteDomain(showDeleteConfirm)}
                  className="flex-1 px-3 py-2.5 text-[13px] font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
                >
                  Deletar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

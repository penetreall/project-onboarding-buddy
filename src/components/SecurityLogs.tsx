import { useState, useEffect } from 'react';
import { ProtectedDomain } from '../lib/supabase';
import { AccessLog } from '../types/logs';
import { translateReason } from '../lib/translations';
import { fetchDomains, fetchLogs } from '../lib/api';

export default function SecurityLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [domains, setDomains] = useState<ProtectedDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadData, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDomain, selectedFilter, autoRefresh]);

  const loadData = async () => {
    try {
      const [domainsData, logsData] = await Promise.all([
        fetchDomains(),
        fetchLogs(selectedDomain, selectedFilter, 200)
      ]);

      setDomains(domainsData);
      const uniqueLogs = deduplicateByRequestId(logsData);
      setLogs(uniqueLogs);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const deduplicateByRequestId = (logs: AccessLog[]): AccessLog[] => {
    const seen = new Map<string, AccessLog>();

    for (const log of logs) {
      if (log.request_id) {
        if (!seen.has(log.request_id)) {
          seen.set(log.request_id, log);
        }
      } else {
        seen.set(`${log.id}`, log);
      }
    }

    return Array.from(seen.values());
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}:${seconds}`;
  };

  const stats = {
    total: logs.length,
    allowed: logs.filter(log => !log.is_safe).length,
    denied: logs.filter(log => log.is_safe).length,
  };

  if (selectedLog) {
    return (
      <div className="h-full bg-transparent">
        <div className="border-b border-[#252525] px-6 py-4">
          <button
            onClick={() => setSelectedLog(null)}
            className="flex items-center gap-2 text-[13px] text-[#888888] hover:text-white mb-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <h1 className="text-[20px] font-medium text-white mb-1">Detalhes</h1>
          <p className="text-[13px] text-[#666666] font-mono">{selectedLog.request_id || selectedLog.id}</p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl space-y-3">
            <div className="border border-[#252525] rounded-lg p-4">
              <div className="text-[12px] text-[#666666] mb-2">Status</div>
              <span className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-md ${
                selectedLog.is_safe
                  ? 'bg-[#EF4444]/10 text-[#EF4444]'
                  : 'bg-[#10B981]/10 text-[#10B981]'
              }`}>
                {selectedLog.is_safe ? 'Negado' : 'Permitido'}
              </span>
            </div>

            <div className="border border-[#252525] rounded-lg p-4">
              <div className="text-[12px] text-[#666666] mb-2">IP</div>
              <div className="text-[13px] text-white font-mono">{selectedLog.ip_address}</div>
            </div>

            {selectedLog.user_agent && (
              <div className="border border-[#252525] rounded-lg p-4">
                <div className="text-[12px] text-[#666666] mb-2">User Agent</div>
                <div className="text-[12px] text-[#888888] break-all">{selectedLog.user_agent}</div>
              </div>
            )}

            {selectedLog.reason && (
              <div className="border border-[#252525] rounded-lg p-4">
                <div className="text-[12px] text-[#666666] mb-2">Motivo</div>
                <div className="text-[13px] text-white">{translateReason(selectedLog.reason)}</div>
              </div>
            )}

            <div className="border border-[#252525] rounded-lg p-4">
              <div className="text-[12px] text-[#666666] mb-2">Data/Hora</div>
              <div className="text-[13px] text-white font-mono">{formatDate(selectedLog.timestamp)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-transparent">
      <div className="border-b border-[#252525] px-6 py-4">
        <h1 className="text-[20px] font-medium text-white">Logs</h1>
        <p className="text-[13px] text-[#666666] mt-0.5">{stats.total} registros</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="border border-[#252525] rounded-lg p-4">
            <div className="text-[11px] text-[#666666] mb-1">Total</div>
            <div className="text-[24px] font-medium text-white">{stats.total}</div>
          </div>
          <div className="border border-[#252525] border-l-2 border-l-[#10B981] rounded-lg p-4">
            <div className="text-[11px] text-[#666666] mb-1">Permitidos</div>
            <div className="text-[24px] font-medium text-[#10B981]">{stats.allowed}</div>
          </div>
          <div className="border border-[#252525] border-l-2 border-l-[#EF4444] rounded-lg p-4">
            <div className="text-[11px] text-[#666666] mb-1">Negados</div>
            <div className="text-[24px] font-medium text-[#EF4444]">{stats.denied}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
              selectedFilter === 'all'
                ? 'bg-[#252525] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedFilter('allowed')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
              selectedFilter === 'allowed'
                ? 'bg-[#252525] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Permitidos
          </button>
          <button
            onClick={() => setSelectedFilter('denied')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
              selectedFilter === 'denied'
                ? 'bg-[#252525] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Negados
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-1.5 border border-[#252525] text-[#888888] text-[12px] rounded-md bg-[#0D0D0D] hover:text-white hover:border-[#333333] transition-colors"
            >
              <option value="all">Todos os domínios</option>
              {domains.map(domain => (
                <option key={domain.id} value={domain.id}>{domain.protected_domain}</option>
              ))}
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                autoRefresh
                  ? 'bg-[#10B981]/10 text-[#10B981]'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              {autoRefresh ? 'Ativo' : 'Pausado'}
            </button>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="text-center py-16 text-[13px] text-[#666666]">
            Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-[#888888] mb-1">Nenhum log encontrado</p>
            <p className="text-[13px] text-[#666666]">Os logs aparecerão conforme o tráfego for processado</p>
          </div>
        ) : (
          <div className="border border-[#252525] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252525]">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666666]">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666666]">IP</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666666]">Via</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666666]">Validação</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#666666]">Device</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-[#666666]">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer duration-[120ms]"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded ${
                        log.is_safe
                          ? 'bg-[#EF4444]/10 text-[#EF4444]'
                          : 'bg-[#10B981]/10 text-[#10B981]'
                      }`}>
                        {log.is_safe ? 'Neg' : 'Ok'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-white">
                      {log.ip_address}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#888888]">
                      {log.via || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      <span className="text-[#10B981]">{log.passed_validations || 0}</span>
                      <span className="text-[#666666]">/</span>
                      <span className="text-[#EF4444]">{log.failed_validations || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#888888]">
                      {log.device_type || 'desktop'}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-[#666666] font-mono">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

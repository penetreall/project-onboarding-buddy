import { AccessLog } from '../types/logs';
import { Badge } from './ui/Badge';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { translateReason, translateDecision, translatePlatform, translateNetwork, translateIPType } from '../lib/translations';

interface ForensicLogViewerProps {
  log: AccessLog;
  onClose: () => void;
}

export default function ForensicLogViewer({ log, onClose }: ForensicLogViewerProps) {
  const detectionLayers = log.detection_layers as any || {};
  const riskBreakdown = log.risk_score_breakdown as any || {};

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="backdrop-blur-xl bg-black/60 border border-white/[0.1] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
          <div>
            <h2 className="text-[#e5e5e5] text-xl font-medium">Análise Forense</h2>
            <p className="text-[#808080] text-sm mt-1">ID da Requisição: {log.request_id || 'N/A'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-[#e5e5e5] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#e5e5e5] font-medium">Resumo da Decisão</h3>
              <Badge variant={log.is_safe ? 'danger' : 'success'}>
                {log.is_safe ? 'NEGADO' : 'PERMITIDO'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#808080]">Status:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{translateDecision(log.is_safe)}</span>
              </div>
              <div>
                <span className="text-[#808080]">Gate:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.decision_gate?.toUpperCase() || 'DETERMINÍSTICO'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Motivo Principal:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{translateReason(log.primary_reason)}</span>
              </div>
              <div>
                <span className="text-[#808080]">Score de Risco:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.final_risk_score ? `${(log.final_risk_score * 100).toFixed(0)}%` : 'N/A'}</span>
              </div>
              {log.fatal_error && (
                <div className="col-span-2">
                  <span className="text-[#ff4444]">Erro Fatal:</span>
                  <span className="text-[#e5e5e5] ml-2 font-mono">{log.fatal_error_stage || 'desconhecido'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">IP & Geolocalização</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#808080]">Endereço IP:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.ip}</span>
              </div>
              <div>
                <span className="text-[#808080]">Tipo de IP:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{translateIPType(log.ip_type)}</span>
              </div>
              <div>
                <span className="text-[#808080]">País:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.country}</span>
              </div>
              <div>
                <span className="text-[#808080]">Fonte do País:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.country_source || 'NONE'}</span>
              </div>
              <div>
                <span className="text-[#808080]">ASN:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.asn || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">ISP:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.isp || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Datacenter:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.is_datacenter ? 'sim' : 'não'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Proxy/VPN:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">
                  {log.is_proxy ? 'proxy' : log.is_vpn ? 'vpn' : 'não'}
                </span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">Detecção de Plataforma</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#808080]">Plataforma:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{translatePlatform(log.platform_type)}</span>
              </div>
              <div>
                <span className="text-[#808080]">Confiança:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.platform_confidence ? `${log.platform_confidence.toFixed(0)}%` : '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#808080]">Raciocínio:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.platform_reasoning || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#808080]">User-Agent:</span>
                <p className="text-[#e5e5e5] mt-1 font-mono text-xs break-all">{log.user_agent}</p>
              </div>
              <div>
                <span className="text-[#808080]">Accept-Language:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.accept_language || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Referer:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono text-xs break-all">{log.referer_url || '-'}</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">Validação de Click-ID & Anúncios</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#808080]">Rede:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{translateNetwork(log.ad_network)}</span>
              </div>
              <div>
                <span className="text-[#808080]">Click-ID Presente:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.gclid_present ? 'sim' : 'não'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Click-ID Válido:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.gclid_valid ? 'sim' : 'não'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Tamanho do Click-ID:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.gclid_length || 0} caracteres</span>
              </div>
              <div>
                <span className="text-[#808080]">Entropia do Click-ID:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.gclid_entropy ? `${log.gclid_entropy.toFixed(2)} bits` : '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Click-ID Reutilizado:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.gclid_reused ? 'sim' : 'não'}</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">Camadas de Detecção</h3>
            {Object.keys(detectionLayers).length === 0 ? (
              <p className="text-[#808080] text-sm">Sistema simplificado - camadas não aplicáveis</p>
            ) : (
              <div className="space-y-2 text-sm font-mono">
                {Object.entries(detectionLayers).map(([key, value]: [string, any]) => {
                  const layerName = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  const result = value?.result;
                  const isPass = result === 'PASS';
                  const isFail = result === 'FAIL';

                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isPass && <CheckCircle size={16} className="text-[#00ff00]" />}
                        {isFail && <XCircle size={16} className="text-[#ff4444]" />}
                        {!isPass && !isFail && <div className="w-4 h-4 border border-[#525252] rounded-full" />}
                        <span className="text-[#e5e5e5]">{layerName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={isPass ? 'text-[#00ff00]' : isFail ? 'text-[#ff4444]' : 'text-[#525252]'}>
                          {result || 'NÃO EXECUTADO'}
                        </span>
                        {value?.reason && (
                          <span className="text-[#808080] text-xs">({value.reason})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">Detalhamento do Score de Risco</h3>
            {Object.keys(riskBreakdown).length === 0 ? (
              <p className="text-[#808080] text-sm">Sistema simplificado - detalhamento não disponível</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(riskBreakdown).map(([key, value]: [string, any]) => {
                  const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  const score = value || 0;
                  const color = score > 70 ? 'bg-[#ff4444]' : score > 40 ? 'bg-[#ffaa00]' : 'bg-[#00ff00]';

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#e5e5e5]">{label}</span>
                        <span className="text-[#e5e5e5] font-mono">{score.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <h3 className="text-[#e5e5e5] font-medium mb-4">Contexto Técnico</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#808080]">Data/Hora:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-[#808080]">Tempo de Processamento:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.processing_time_ms ? `${log.processing_time_ms}ms` : '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Versão Edge:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.edge_version || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Versão do Pipeline:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.detection_pipeline_version || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">Template PHP:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono">{log.php_template_version || '-'}</span>
              </div>
              <div>
                <span className="text-[#808080]">ID do Domínio:</span>
                <span className="text-[#e5e5e5] ml-2 font-mono text-xs">{log.domain_id || 'null'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

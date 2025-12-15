export default function HowToUse() {
  return (
    <div className="h-full bg-transparent">
      <div className="border-b border-[#252525] px-6 py-4">
        <h1 className="text-[20px] font-medium text-white">Documentação</h1>
        <p className="text-[13px] text-[#666666] mt-0.5">Como usar o IceWall</p>
      </div>

      <div className="p-6">
        <div className="max-w-2xl space-y-4">
          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <div className="text-[13px] font-medium text-white mb-2">1. Adicionar domínio</div>
            <div className="text-[13px] text-[#888888] space-y-1">
              <p>Navegue até a seção Proteções e clique em Novo:</p>
              <ul className="list-disc list-inside space-y-1 text-[12px] text-[#666666] ml-2">
                <li>URL Legítima: Página limpa que os lead/pessoas reais verão</li>
                <li>URL Protegida: Seu domínio protegido, que crawlers/auditores verão</li>
              </ul>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <div className="text-[13px] font-medium text-white mb-2">2. Baixar pacote</div>
            <div className="text-[13px] text-[#888888] space-y-1">
              <p>Clique no botão de download. O pacote contém:</p>
              <ul className="list-disc list-inside space-y-1 text-[12px] text-[#666666] ml-2">
                <li>Arquivos PHP de proteção</li>
                <li>Scripts de configuração</li>
                <li>Código de integração</li>
              </ul>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <div className="text-[13px] font-medium text-white mb-2">3. Upload dos arquivos</div>
            <div className="text-[13px] text-[#888888] space-y-1">
              <p>Faça upload dos arquivos para a raiz do seu servidor</p>
              <p className="text-[12px] text-[#666666]">Certifique-se de que as permissões dos arquivos estão corretas (644)</p>
            </div>
          </div>

          <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 shadow-lg">
            <div className="text-[13px] font-medium text-white mb-2">4. Monitoramento</div>
            <div className="text-[13px] text-[#888888] space-y-1">
              <p>Verifique os Logs para análise de tráfego</p>
              <p className="text-[12px] text-[#666666]">Monitoramento em tempo real disponível</p>
            </div>
          </div>

          <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#EF4444] mt-0.5 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div className="text-[13px] font-medium text-[#EF4444] mb-1">Aviso importante</div>
                <div className="text-[12px] text-[#888888]">
                  Não modifique os arquivos principais de proteção. Alterações podem quebrar o sistema.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

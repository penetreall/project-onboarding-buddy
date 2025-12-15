import { Card } from './ui/Card';
import { useTheme, Theme } from '../contexts/ThemeContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; name: string; description: string }[] = [
    { id: 'dark', name: 'Dark', description: 'Tema escuro puro com fundo preto absoluto' },
    { id: 'ice', name: 'Ice', description: 'Gradiente azul gelado com transição suave' },
    { id: 'fire', name: 'Fire', description: 'Gradiente vermelho intenso de cima para baixo' },
  ];

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-[#e5e5e5] text-2xl font-medium mb-2">
          Configurações do Sistema
        </h1>
        <p className="text-[#949494] text-sm">
          Configure parâmetros de conta e segurança
        </p>
      </div>

      <Card>
        <h2 className="text-[#e5e5e5] text-lg font-medium mb-6">
          Aparência
        </h2>
        <div className="space-y-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-[120ms] ${
                theme === t.id
                  ? 'border-[#3B82F6]/40 bg-[#3B82F6]/5'
                  : 'backdrop-blur-md bg-white/[0.02] border-white/[0.08] hover:border-white/[0.12] hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#e5e5e5] text-sm font-medium mb-1">
                    {t.name}
                  </h3>
                  <p className="text-[#949494] text-xs">
                    {t.description}
                  </p>
                </div>
                {theme === t.id && (
                  <div className="w-5 h-5 rounded-full bg-[#3B82F6] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

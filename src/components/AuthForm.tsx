import { useState } from 'react';
import { login } from '../lib/api';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export default function AuthForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setButtonState('loading');
    setError(null);

    try {
      await login(username, password);
      setButtonState('success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setButtonState('error');
      setError('Credenciais inválidas');

      setTimeout(() => {
        setButtonState('idle');
        setError(null);
      }, 2000);
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'loading':
        return 'Autenticando...';
      case 'success':
        return 'Bem-vindo';
      case 'error':
        return 'Falhou';
      default:
        return 'Entrar';
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-medium text-white mb-1">IceWall</h1>
          <p className="text-[13px] text-[#666666]">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-[13px] text-[#888888] mb-2">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 text-[13px] bg-[#161616] border border-[#252525] text-white rounded-md focus:outline-none focus:border-[#3B82F6] transition-colors"
              placeholder="seu-usuario"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] text-[#888888] mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-[13px] bg-[#161616] border border-[#252525] text-white rounded-md focus:outline-none focus:border-[#3B82F6] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[12px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={buttonState === 'loading'}
            className={`w-full px-4 py-2.5 text-[13px] font-medium rounded-md transition-colors ${
              buttonState === 'success'
                ? 'bg-[#10B981] text-white'
                : buttonState === 'error'
                ? 'bg-[#EF4444] text-white'
                : 'bg-[#3B82F6] hover:bg-[#2563EB] text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {getButtonText()}
          </button>
        </form>
      </div>
    </div>
  );
}

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

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Autenticando
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Sucesso
          </span>
        );
      case 'error':
        return 'Tentar novamente';
      default:
        return 'Entrar';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] animate-fade-in">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(200,80%,55%)] to-[hsl(200,60%,40%)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-[hsl(var(--color-text-primary))] tracking-tight">IceWall</span>
          </div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--color-text-primary))] mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-[15px] text-[hsl(var(--color-text-secondary))]">
            Entre com suas credenciais para acessar o painel
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-[hsl(var(--color-text-secondary))]">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full h-11 px-4 text-[15px] bg-[hsl(var(--color-surface))] border border-[hsl(var(--color-border))] text-[hsl(var(--color-text-primary))] rounded-lg focus:outline-none focus:border-[hsl(var(--color-accent))] focus:ring-1 focus:ring-[hsl(var(--color-accent))] transition-all duration-200"
              placeholder="seu-usuario"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--color-text-secondary))]">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-11 px-4 text-[15px] bg-[hsl(var(--color-surface))] border border-[hsl(var(--color-border))] text-[hsl(var(--color-text-primary))] rounded-lg focus:outline-none focus:border-[hsl(var(--color-accent))] focus:ring-1 focus:ring-[hsl(var(--color-accent))] transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--color-error))] bg-[hsl(var(--color-error))/0.1] border border-[hsl(var(--color-error))/0.2] px-4 py-3 rounded-lg">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={buttonState === 'loading'}
            className={`w-full h-11 text-[15px] font-medium rounded-lg transition-all duration-200 ${
              buttonState === 'success'
                ? 'bg-[hsl(var(--color-success))] text-white'
                : buttonState === 'error'
                ? 'bg-[hsl(var(--color-error))] text-white'
                : 'bg-[hsl(var(--color-accent))] hover:bg-[hsl(200,80%,50%)] text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {getButtonContent()}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-[hsl(var(--color-text-muted))]">
          Sistema de proteção avançada
        </p>
      </div>
    </div>
  );
}

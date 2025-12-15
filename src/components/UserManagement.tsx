import { useState, useEffect } from 'react';
import { fetchUsers, createUser, AdminUser } from '../lib/api';

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      alert('Erro ao carregar usuários: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createUser(formData.username, formData.password);
      setFormData({ username: '', password: '' });
      setShowForm(false);
      await loadUsers();
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message);
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
              setFormData({ username: '', password: '' });
            }}
            className="flex items-center gap-1.5 text-[13px] text-[#A1A1A1] hover:text-white mb-4 transition-colors font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Voltar
          </button>
          <h1 className="text-xl font-semibold text-white tracking-tight">Novo usuário</h1>
        </div>

        <div className="p-6">
          <div className="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-white mb-2">
                  Nome de usuário
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="usuario"
                  className="w-full px-3 py-2.5 text-[13px] bg-white/[0.02] border border-white/[0.08] text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-[#666666]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-white mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-[13px] bg-white/[0.02] border border-white/[0.08] text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-[#666666]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ username: '', password: '' });
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
                  {loading ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-transparent">
      <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Usuários</h1>
          <p className="text-[13px] text-[#737373] mt-1">
            {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
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
          Novo usuário
        </button>
      </div>

      <div className="p-6">
        {loading && users.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-[#666666]">
            Carregando usuários...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-sm text-white font-medium mb-1">Nenhum usuário cadastrado</p>
            <p className="text-[13px] text-[#737373]">Crie o primeiro usuário para começar</p>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="col-span-5 text-[11px] font-medium text-[#737373] uppercase tracking-wide">Usuário</div>
              <div className="col-span-3 text-[11px] font-medium text-[#737373] uppercase tracking-wide">Tipo</div>
              <div className="col-span-4 text-[11px] font-medium text-[#737373] uppercase tracking-wide text-right">Criado em</div>
            </div>

            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-5 flex items-center">
                  <span className="text-[13px] font-medium text-white">
                    {user.username}
                  </span>
                </div>

                <div className="col-span-3 flex items-center">
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${
                    user.is_admin
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-white/[0.04] text-[#737373]'
                  }`}>
                    {user.is_admin ? 'Admin' : 'Usuário'}
                  </span>
                </div>

                <div className="col-span-4 flex items-center justify-end">
                  <span className="text-[13px] text-[#737373] tabular-nums">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

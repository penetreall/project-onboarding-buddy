import { useState, useEffect } from 'react';
import { logout, DashboardStats, fetchDashboardStats } from '../lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  isAdmin?: boolean;
}

export default function DashboardLayout({ children, currentView, onViewChange, isAdmin = false }: DashboardLayoutProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading sidebar stats:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const menuItems = [
    {
      id: 'protection',
      label: 'Proteções',
      count: stats?.activeDomains,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    },
    {
      id: 'logs',
      label: 'Logs',
      count: stats?.totalLogs,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      )
    },
    {
      id: 'howto',
      label: 'Documentação',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      )
    },
    ...(isAdmin ? [{
      id: 'users',
      label: 'Usuários',
      count: stats?.totalUsers,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    }] : []),
  ];

  return (
    <div className="flex h-screen bg-transparent relative">
      <aside className="w-56 bg-[#0A0A0A] border-r border-white/[0.06] flex flex-col relative z-10">
        <div className="px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-white tracking-tight">IceWall</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-[#A1A1A1] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={isActive ? 'opacity-100' : 'opacity-60'}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="text-[11px] text-[#666666] tabular-nums font-normal">
                    {item.count > 999 ? '999+' : item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
          <button
            onClick={() => onViewChange('settings')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${
              currentView === 'settings'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-[#A1A1A1] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className={currentView === 'settings' ? 'opacity-100' : 'opacity-60'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m5.2-13.8l-3 3m-4.4 4.4l-3 3M23 12h-6m-6 0H1m18.8 5.2l-3-3m-4.4-4.4l-3-3"/>
              </svg>
            </div>
            <span>Configurações</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-[#A1A1A1] hover:text-white hover:bg-white/[0.04] transition-all duration-200"
          >
            <div className="opacity-60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative z-10 bg-[#0A0A0A]">
        {children}
      </main>
    </div>
  );
}

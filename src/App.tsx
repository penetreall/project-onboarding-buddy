import { useState, useEffect } from 'react';
import { getCurrentUser, getSessionId, User } from './lib/api';
import AuthForm from './components/AuthForm';
import DashboardLayout from './components/DashboardLayout';
import ProtectionConfig from './components/ProtectionConfig';
import SecurityLogs from './components/SecurityLogs';
import HowToUse from './components/HowToUse';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('protection');

  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = getSessionId();
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,4%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(200,80%,55%)] to-[hsl(200,60%,40%)] flex items-center justify-center animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="text-sm text-[hsl(0,0%,45%)]">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-[hsl(0,0%,4%)]">
          <AuthForm />
        </div>
      </ThemeProvider>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'protection':
        return <ProtectionConfig onViewChange={setCurrentView} />;
      case 'logs':
        return <SecurityLogs />;
      case 'howto':
        return <HowToUse />;
      case 'users':
        return user.is_admin ? <UserManagement /> : <ProtectionConfig onViewChange={setCurrentView} />;
      case 'settings':
        return <Settings />;
      default:
        return <ProtectionConfig onViewChange={setCurrentView} />;
    }
  };

  return (
    <ThemeProvider>
      <DashboardLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        isAdmin={user.is_admin}
      >
        {renderView()}
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default App;

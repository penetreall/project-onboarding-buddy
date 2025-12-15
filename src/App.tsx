import { useState, useEffect } from 'react';
import { getCurrentUser, getSessionId, User } from './lib/api';
import AuthForm from './components/AuthForm';
import DashboardLayout from './components/DashboardLayout';
import ProtectionConfig from './components/ProtectionConfig';
import SecurityLogs from './components/SecurityLogs';
import HowToUse from './components/HowToUse';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import ParticlesBackground from './components/ParticlesBackground';

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
    return null;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 theme-bg">
        <ParticlesBackground />
        <AuthForm />
      </div>
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
    <div className="fixed inset-0 theme-bg">
      <ParticlesBackground />
      <DashboardLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        isAdmin={user.is_admin}
      >
        {renderView()}
      </DashboardLayout>
    </div>
  );
}

export default App;

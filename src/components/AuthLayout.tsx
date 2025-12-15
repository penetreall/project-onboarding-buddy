import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-bg-app">
      <main className="flex-1 flex items-center justify-center p-8">
        {children}
      </main>

      <footer className="h-10 bg-sidebar-bg flex items-center justify-center" style={{ borderTop: '1px solid #525252' }}>
        <span className="text-[12px] font-medium text-sidebar-text-secondary">IceWall Protection System</span>
      </footer>
    </div>
  );
}

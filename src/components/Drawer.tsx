import { X } from 'phosphor-react';
import { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: '480px' | '600px';
  children: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, title, width = '480px', children }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 199,
          transition: 'opacity 150ms ease-out'
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width,
          height: '100vh',
          background: '#000000',
          borderLeft: '1px solid #111111',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 150ms ease-out'
        }}
      >
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #111111',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            color: '#e5e5e5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '18px',
            fontWeight: 500
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#949494',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 150ms ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e5e5e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#949494';
            }}
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px'
        }}>
          {children}
        </div>
      </div>
    </>
  );
}

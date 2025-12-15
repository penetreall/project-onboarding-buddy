import { CheckCircle } from 'phosphor-react';

interface IceWallNotificationProps {
  message: string;
  onClose: () => void;
}

export function IceWallNotification({ message, onClose }: IceWallNotificationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)'
        }}
        onClick={onClose}
      />

      <div
        className="relative z-10 max-w-md mx-4 rounded-xl"
        style={{
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(20px) saturate(130%)',
          border: '1px solid rgba(74, 144, 226, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
          animation: 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '24px'
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: '40px',
              height: '40px',
              background: 'rgba(74, 144, 226, 0.12)',
              border: '1px solid rgba(74, 144, 226, 0.2)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            <CheckCircle size={22} weight="bold" style={{ color: '#00D4FF' }} />
          </div>

          <div className="flex-1" style={{ paddingTop: '2px' }}>
            <h3 className="font-semibold mb-1.5" style={{
              color: '#00D4FF',
              fontFamily: 'Manrope, sans-serif',
              fontSize: '16px',
              letterSpacing: '-0.01em'
            }}>
              Sucesso
            </h3>
            <p className="leading-relaxed" style={{
              color: 'rgba(226, 232, 240, 0.85)',
              fontSize: '13.5px',
              lineHeight: '1.6'
            }}>
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end" style={{ marginTop: '20px' }}>
          <button
            onClick={onClose}
            className="rounded-lg font-medium text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #4A90E2 0%, #00D4FF 100%)',
              fontFamily: 'Geist, sans-serif',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              padding: '9px 24px',
              fontSize: '14px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
              const overlay = document.createElement('div');
              overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.02);pointer-events:none';
              overlay.className = 'btn-overlay';
              e.currentTarget.appendChild(overlay);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
              const overlay = e.currentTarget.querySelector('.btn-overlay');
              if (overlay) overlay.remove();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

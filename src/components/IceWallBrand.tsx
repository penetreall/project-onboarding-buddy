interface IceWallBrandProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'default' | 'sidebar';
}

export default function IceWallBrand({ size = 'medium', showText = true, variant = 'default' }: IceWallBrandProps) {
  const sizes = {
    small: { icon: 20, text: '16px', gap: '1px', weight: 600 },
    medium: { icon: 28, text: '20px', gap: '1px', weight: 600 },
    large: { icon: 36, text: '24px', gap: '2px', weight: 700 }
  };

  const config = sizes[size];

  if (variant === 'sidebar') {
    return (
      <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'baseline',
          padding: '8px 0',
          overflow: 'visible',
          gap: '1px'
        }}>
          <span style={{
            fontSize: '18px',
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            lineHeight: 1,
            position: 'relative',
            color: '#f8fafc',
            textShadow: '0 0 10px rgba(96, 165, 250, 0.3), 0 0 20px rgba(96, 165, 250, 0.15)'
          }}>
            ICE
          </span>
          <span style={{
            fontSize: '21px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 200,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            position: 'relative',
            color: '#f8fafc',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            Wall
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: '1px'
    }}>
      {showText && (
        <>
          <span style={{
            fontSize: config.text === '20px' ? '17px' : config.text === '16px' ? '14px' : '20px',
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#f8fafc',
            textShadow: '0 0 10px rgba(96, 165, 250, 0.3), 0 0 20px rgba(96, 165, 250, 0.15)'
          }}>
            ICE
          </span>
          <span style={{
            fontSize: config.text,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 200,
            letterSpacing: '-0.05em',
            color: '#f8fafc',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            Wall
          </span>
        </>
      )}
    </div>
  );
}

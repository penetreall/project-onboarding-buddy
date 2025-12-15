import IceWallSymbol from './IceWallSymbol';

export default function IceWallLogo() {
  return (
    <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <IceWallSymbol size={40} />
      <span className="logo-text" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>ICEWALL</span>
    </div>
  );
}

export default function SnowEffect() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: -10 - Math.random() * 20,
    delay: Math.random() * 8,
    duration: 15 + Math.random() * 12,
    size: 0.8 + Math.random() * 1.4,
    opacity: 0.1 + Math.random() * 0.2,
    xMovement: -40 + Math.random() * 80,
    yMovement: 100 + Math.random() * 30,
  }));

  return (
    <div className="particles-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: particle.opacity,
            '--x-movement': `${particle.xMovement}px`,
            '--y-movement': `${particle.yMovement}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

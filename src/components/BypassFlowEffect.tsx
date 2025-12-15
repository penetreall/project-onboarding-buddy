import { useEffect, useRef } from 'react';

interface FlowLineProps {
  position: 'top' | 'bottom';
}

export function FlowLine({ position }: FlowLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = 40 * dpr;
      ctx.scale(dpr, dpr);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const totalWidth = canvas.width / (window.devicePixelRatio || 1);
    const totalHeight = canvas.height / (window.devicePixelRatio || 1);

    const offsetY = totalHeight / 2;
    const amplitude = 8;
    const frequency = 0.012;
    const speed = 0.3;
    const verticalWaveSpeed = 0.003;

    let timeOffset = 0;
    let verticalOffset = 0;
    let animationId: number;

    const getWaveY = (x: number, time: number, verticalTime: number) => {
      const horizontalWave = Math.sin(x * frequency + time) * amplitude;
      const verticalWave = Math.sin(verticalTime) * 4;
      return offsetY + horizontalWave + verticalWave;
    };

    const animate = () => {
      timeOffset += 0.01 * speed;
      verticalOffset += verticalWaveSpeed;

      ctx.clearRect(0, 0, totalWidth, totalHeight);

      ctx.beginPath();
      for (let x = 0; x <= totalWidth; x += 2) {
        const y = getWaveY(x, timeOffset, verticalOffset);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = 'rgba(63, 154, 230, 0.25)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const dotSpacing = 120;
      const totalDots = Math.ceil(totalWidth / dotSpacing) + 2;

      for (let i = 0; i < totalDots; i++) {
        const baseX = (i * dotSpacing - (timeOffset * 100) % dotSpacing);
        const dotX = baseX;

        if (dotX >= -50 && dotX <= totalWidth + 50) {
          const dotY = getWaveY(dotX, timeOffset, verticalOffset);

          const dotRadius = 2;
          const glowRadius = 8;

          const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, glowRadius);
          gradient.addColorStop(0, 'rgba(0, 212, 255, 0.7)');
          gradient.addColorStop(0.3, 'rgba(74, 144, 226, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dotX, dotY, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          const trailLength = 12;
          for (let t = 1; t <= trailLength; t++) {
            const trailX = dotX - t * 5;
            if (trailX < -50 || trailX > totalWidth + 50) continue;

            const trailY = getWaveY(trailX, timeOffset, verticalOffset);
            const trailAlpha = (1 - t / trailLength) * 0.35;
            const trailSize = dotRadius * (1 - t / trailLength * 0.7);

            if (trailAlpha > 0.03) {
              ctx.fillStyle = `rgba(0, 212, 255, ${trailAlpha})`;
              ctx.beginPath();
              ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', updateSize);
    };
  }, [position]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        [position]: 0,
        left: 0,
        width: '100vw',
        height: '40px',
        pointerEvents: 'none',
        opacity: 0.7,
        zIndex: 10,
      }}
    />
  );
}

export default function BypassFlowEffect() {
  return null;
}
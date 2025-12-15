import { useEffect, useRef } from 'react';

export default function SecurityLockAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 600;

    const lockPoints: Array<{ x: number; y: number }> = [];

    const createLockShape = () => {
      const centerX = 300;
      const centerY = 320;
      const bodyWidth = 160;
      const bodyHeight = 180;
      const shackleRadius = 70;

      for (let angle = 180; angle <= 360; angle += 12) {
        const rad = (angle * Math.PI) / 180;
        lockPoints.push({
          x: centerX + Math.cos(rad) * shackleRadius,
          y: centerY - 80 + Math.sin(rad) * shackleRadius,
        });
      }

      const bodyLeft = centerX - bodyWidth / 2;
      const bodyRight = centerX + bodyWidth / 2;
      const bodyTop = centerY - 20;
      const bodyBottom = centerY + bodyHeight;

      for (let y = bodyTop; y <= bodyBottom; y += 12) {
        lockPoints.push({ x: bodyLeft, y });
        lockPoints.push({ x: bodyRight, y });
      }

      for (let x = bodyLeft; x <= bodyRight; x += 12) {
        lockPoints.push({ x, y: bodyTop });
        lockPoints.push({ x, y: bodyBottom });
      }

      for (let i = 0; i < 25; i++) {
        lockPoints.push({
          x: bodyLeft + Math.random() * bodyWidth,
          y: bodyTop + Math.random() * bodyHeight,
        });
      }

      const keyholePoints = 6;
      const keyholeRadius = 18;
      for (let i = 0; i < keyholePoints; i++) {
        const angle = (i / keyholePoints) * Math.PI * 2;
        lockPoints.push({
          x: centerX + Math.cos(angle) * keyholeRadius,
          y: centerY + 40 + Math.sin(angle) * keyholeRadius,
        });
      }
    };

    createLockShape();

    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      lockPoints.forEach((point, i) => {
        lockPoints.forEach((otherPoint, j) => {
          if (i >= j) return;
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 70) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            const alpha = (1 - distance / 70) * 0.4;
            ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      });

      lockPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 1)';
        ctx.fill();

        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 8);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.6)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        maxWidth: '600px',
        maxHeight: '600px',
      }}
    />
  );
}

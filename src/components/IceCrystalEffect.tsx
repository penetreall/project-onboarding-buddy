import { useEffect, useRef, useState } from 'react';

interface Crystal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  breaking: boolean;
  reformTimer: number;
  hexSize: number;
  brightness: number;
  pulsePhase: number;
}

interface SnowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function IceCrystalEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    const width = window.innerWidth;
    const height = window.innerHeight;

    const crystals: Crystal[] = [];
    const snowParticles: SnowParticle[] = [];
    const numCrystals = 35;
    const connectionDistance = 150;
    const breakDistance = 80;
    let breathePhase = 0;

    for (let i = 0; i < numCrystals; i++) {
      crystals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        connections: [],
        breaking: false,
        reformTimer: 0,
        hexSize: 1.5 + Math.random() * 1,
        brightness: 0.15 + Math.random() * 0.15,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 15; i++) {
      snowParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: 0.15 + Math.random() * 0.3,
        size: 0.5 + Math.random() * 1,
        opacity: 0.05 + Math.random() * 0.1,
      });
    }

    const drawHexagon = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      brightness: number
    ) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
      gradient.addColorStop(0, `rgba(0, 212, 255, ${brightness * 0.3})`);
      gradient.addColorStop(0.5, `rgba(0, 102, 255, ${brightness * 0.15})`);
      gradient.addColorStop(1, `rgba(0, 212, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = `rgba(0, 212, 255, ${brightness * 0.4})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
    };

    const drawFrostLine = (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      progress: number,
      brightness: number
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const currentX = x1 + dx * progress;
      const currentY = y1 + dy * progress;

      const gradient = ctx.createLinearGradient(x1, y1, currentX, currentY);
      gradient.addColorStop(0, `rgba(0, 212, 255, ${brightness * 0.1})`);
      gradient.addColorStop(0.5, `rgba(0, 102, 255, ${brightness * 0.15})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${brightness * 0.2})`);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(currentX, currentY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    };

    let animationId: number;

    const animate = () => {
      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, width, height);

      breathePhase += 0.008;
      const breatheFactor = 0.6 + Math.sin(breathePhase) * 0.15;

      const gradient = ctx.createLinearGradient(0, height * 0.8, 0, height);
      gradient.addColorStop(0, 'rgba(0, 102, 255, 0)');
      gradient.addColorStop(1, `rgba(0, 102, 255, ${0.015 * breatheFactor})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (const particle of snowParticles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.y > height) {
          particle.y = -10;
          particle.x = Math.random() * width;
        }
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;

        const particleOpacity = particle.opacity * breatheFactor * 0.7;
        ctx.fillStyle = `rgba(200, 230, 255, ${particleOpacity})`;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }

      for (const crystal of crystals) {
        if (crystal.breaking) {
          crystal.reformTimer++;
          if (crystal.reformTimer > 60) {
            crystal.breaking = false;
            crystal.reformTimer = 0;
          }
          continue;
        }

        crystal.x += crystal.vx;
        crystal.y += crystal.vy;

        if (crystal.x < 0) crystal.x = width;
        if (crystal.x > width) crystal.x = 0;
        if (crystal.y < 0) crystal.y = height;
        if (crystal.y > height) crystal.y = 0;

        const distToMouse = Math.hypot(
          crystal.x - mouseRef.current.x,
          crystal.y - mouseRef.current.y
        );

        if (distToMouse < breakDistance) {
          crystal.breaking = true;
          const angle = Math.atan2(
            crystal.y - mouseRef.current.y,
            crystal.x - mouseRef.current.x
          );
          crystal.vx = Math.cos(angle) * 2;
          crystal.vy = Math.sin(angle) * 2;
        }
      }

      for (let i = 0; i < crystals.length; i++) {
        crystals[i].connections = [];
        if (crystals[i].breaking) continue;

        for (let j = i + 1; j < crystals.length; j++) {
          if (crystals[j].breaking) continue;

          const dx = crystals[j].x - crystals[i].x;
          const dy = crystals[j].y - crystals[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            crystals[i].connections.push(j);

            const progress = 1 - distance / connectionDistance;
            const avgBrightness =
              (crystals[i].brightness + crystals[j].brightness) / 2;
            drawFrostLine(
              ctx,
              crystals[i].x,
              crystals[i].y,
              crystals[j].x,
              crystals[j].y,
              progress * breatheFactor,
              avgBrightness * breatheFactor
            );
          }
        }
      }

      for (const crystal of crystals) {
        if (crystal.breaking) continue;

        crystal.pulsePhase += 0.03;
        const pulseBrightness =
          crystal.brightness * (0.85 + Math.sin(crystal.pulsePhase) * 0.15);

        let size = crystal.hexSize;
        if (isTyping) {
          size *= 1 + Math.sin(crystal.pulsePhase * 2) * 0.15;
        }

        drawHexagon(
          ctx,
          crystal.x,
          crystal.y,
          size,
          pulseBrightness * breatheFactor
        );
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      const newDpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * newDpr;
      canvas.height = window.innerHeight * newDpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(newDpr, newDpr);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const inputElements = document.querySelectorAll('input');
    const handleInput = () => setIsTyping(true);
    const handleBlur = () => setIsTyping(false);

    inputElements.forEach((input) => {
      input.addEventListener('focus', handleInput);
      input.addEventListener('blur', handleBlur);
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      inputElements.forEach((input) => {
        input.removeEventListener('focus', handleInput);
        input.removeEventListener('blur', handleBlur);
      });
    };
  }, [isTyping]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

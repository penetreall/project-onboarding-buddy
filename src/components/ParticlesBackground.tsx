import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

declare global {
  interface Window {
    particlesJS: any;
  }
}

export default function ParticlesBackground() {
  const { theme } = useTheme();

  useEffect(() => {
    const getParticleColor = () => {
      switch (theme) {
        case 'ice':
          return '#5eb3d6';
        case 'fire':
          return '#ff5555';
        case 'dark':
        default:
          return '#666666';
      }
    };

    const initParticles = () => {
      if (window.particlesJS) {
        window.particlesJS('particles-js', {
          particles: {
            number: {
              value: 30,
              density: {
                enable: true,
                value_area: 1500
              }
            },
            color: {
              value: getParticleColor()
            },
            shape: {
              type: 'circle'
            },
            opacity: {
              value: 0.3,
              random: true,
              anim: {
                enable: true,
                speed: 0.4,
                opacity_min: 0.1,
                sync: false
              }
            },
            size: {
              value: 2.5,
              random: true,
              anim: {
                enable: false
              }
            },
            line_linked: {
              enable: false
            },
            move: {
              enable: true,
              speed: 0.8,
              direction: 'bottom',
              random: true,
              straight: false,
              out_mode: 'out',
              bounce: false,
              speed_random: true,
              speed_min: 0.3
            }
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: {
                enable: false
              },
              onclick: {
                enable: false
              },
              resize: true
            }
          },
          retina_detect: true
        });
      }
    };

    if (window.particlesJS) {
      initParticles();
    } else {
      const checkInterval = setInterval(() => {
        if (window.particlesJS) {
          initParticles();
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, [theme]);

  return (
    <div
      id="particles-js"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

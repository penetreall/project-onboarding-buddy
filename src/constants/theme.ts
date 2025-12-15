export const colors = {
  ice: {
    bg: {
      primary: '#0f0f0f',
      secondary: '#111111',
      card: '#0a0a0a',
      hover: '#1a1a1a',
    },
    border: {
      primary: '#111111',
      secondary: '#1a1a1a',
      accent: '#2a2a2a',
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#a0a0a0',
      muted: '#666666',
      disabled: '#404040',
    },
  },
  status: {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  threat: {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const;

export const transitions = {
  fast: 'all 150ms ease-out',
  normal: 'all 250ms ease-out',
  slow: 'all 350ms ease-out',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  glow: '0 0 20px rgba(59, 130, 246, 0.15)',
} as const;

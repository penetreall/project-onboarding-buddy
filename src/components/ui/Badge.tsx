import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'danger' | 'neutral' | 'info';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variants = {
    success: 'bg-[#D1FAE5] text-[#065F46]',
    danger: 'bg-[#FEE2E2] text-[#991B1B]',
    neutral: 'bg-bg-secondary text-text-secondary',
    info: 'bg-[#DBEAFE] text-[#1E40AF]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${variants[variant]}`}>
      {children}
    </span>
  );
}

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`
        backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 shadow-lg
        ${hover ? 'hover:border-white/[0.12] hover:shadow-xl transition-all duration-[120ms]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 border-l-2 shadow-lg" style={{ borderLeftColor: color }}>
      <p className="text-[11px] font-semibold uppercase text-[#888888] mb-2 tracking-wide">{label}</p>
      <p className="text-[32px] font-semibold text-white">{value}</p>
    </div>
  );
}

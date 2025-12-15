interface HighlightSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function HighlightSection({ children, className = '' }: HighlightSectionProps) {
  return (
    <div className={`backdrop-blur-md bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

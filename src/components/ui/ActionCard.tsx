interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'warning';
}

export function ActionCard({ icon, label, onClick, variant = 'default' }: ActionCardProps) {
  const variantStyles = {
    default: 'bg-gradient-to-br from-[#1a1a1a]/60 to-[#141414]/40 border-[#2a2a2a] hover:border-[#3a3a3a]',
    primary: 'bg-gradient-to-br from-[#1e3a5f]/40 to-[#141414]/40 border-[#2563EB]/30 hover:border-[#2563EB]/50',
    warning: 'bg-gradient-to-br from-[#5f2a1e]/40 to-[#141414]/40 border-[#EF4444]/30 hover:border-[#EF4444]/50',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-all backdrop-blur-sm ${variantStyles[variant]}`}
    >
      <div className="text-[#888888]">
        {icon}
      </div>
      <span className="text-[13px] text-white font-medium">
        {label}
      </span>
    </button>
  );
}

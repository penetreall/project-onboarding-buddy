interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`
          w-11 h-6 rounded-full transition-all duration-250
          ${checked ? 'bg-[#3b82f6]' : 'bg-[#1a1a1a]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          peer-focus:ring-2 peer-focus:ring-[#3b82f6] peer-focus:ring-offset-2 peer-focus:ring-offset-[#0f0f0f]
        `}></div>
        <div className={`
          absolute left-[2px] top-[2px] w-5 h-5 rounded-full bg-white
          transition-transform duration-250
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}></div>
      </div>
      {label && (
        <span className="text-sm text-[#e5e5e5] group-hover:text-white transition-colors duration-250">
          {label}
        </span>
      )}
    </label>
  );
}

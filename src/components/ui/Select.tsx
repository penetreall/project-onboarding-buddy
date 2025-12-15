import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2.5
          text-[#e5e5e5]
          focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-250
          ${error ? 'border-[#ef4444]' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
      )}
    </div>
  );
}

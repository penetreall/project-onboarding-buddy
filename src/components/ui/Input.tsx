import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2
            text-text-primary text-[14px] placeholder:text-text-tertiary
            focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-danger' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-[13px] text-danger">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export function Textarea({ label, error, rows = 4, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full bg-bg-primary border border-border-light rounded-lg px-3 py-2
          text-text-primary text-[14px] placeholder:text-text-tertiary
          focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          resize-none
          ${error ? 'border-danger' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[13px] text-danger">{error}</p>
      )}
    </div>
  );
}

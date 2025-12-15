import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary-hover',
    secondary: 'bg-bg-primary text-text-primary border border-border-light hover:border-border-medium hover:bg-bg-secondary',
    danger: 'bg-danger text-white shadow-sm hover:bg-[#DC2626]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-4 py-2 text-[14px]',
    lg: 'px-4 py-2 text-[14px]',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

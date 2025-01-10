import React from 'react';

interface WrapperProps {
  onClick:
    | (() => void)
    | ((e: React.MouseEvent<HTMLButtonElement>) => void)
    | undefined;
  type: 'submit' | 'button';
  ariaLabel: string;
  label: string;
  style: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  type,
  ariaLabel,
  style,
  disabled,
}: WrapperProps) {
  const handleClick = onClick
    ? (e: React.MouseEvent<HTMLButtonElement>) => {
        if (typeof onClick === 'function') onClick(e);
      }
    : undefined;
  return (
    <button
      className={`cursor-pointer transition-bg duration-200  py-1 px-3 rounded-md ${
        style === 'primary'
          ? 'bg-stone-600 hover:bg-stone-800 text-white'
          : 'bg-transparent text-stone-900 hover:bg-stone-100 border border-stone-600'
      }`}
      type={type}
      aria-label={ariaLabel}
      onClick={handleClick}
      disabled={disabled}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

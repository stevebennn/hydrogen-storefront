import React from 'react';

type Props = {
  label: string;
};

// Create a new ButtonWrapper component
type WrapperProps = {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type: 'submit' | 'button';
  ariaLabel: string;
  label: string;
  style: 'primary' | 'secondary';
};

export function Button({label, onClick, type, ariaLabel, style}: WrapperProps) {
  return (
    <button
      className={`cursor-pointer transition-bg duration-200  py-1 px-3 rounded-md ${
        style === 'primary'
          ? 'bg-stone-600 hover:bg-stone-800 text-white'
          : 'bg-transparent text-stone-900 hover:bg-stone-100 border border-stone-600'
      }`}
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

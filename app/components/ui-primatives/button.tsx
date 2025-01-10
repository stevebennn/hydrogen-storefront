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
};

export function Button({label, onClick, type, ariaLabel}: WrapperProps) {
  return (
    <button
      className="bg-stone-600 hover:bg-stone-800 cursor-pointer transition-bg duration-200 text-white py-1 px-3 rounded-md"
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

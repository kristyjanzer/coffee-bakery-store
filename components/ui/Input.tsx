import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

// radius-inputs (DESIGN.md) = 1px, как и у кнопок — общий токен rounded-sm
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none ${className}`.trim()}
      {...props}
    />
  );
}

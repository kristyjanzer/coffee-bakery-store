import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "filled" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// DESIGN.md: rounded-sm (1px) везде, никаких shadow/градиентов, всё в uppercase.
// text-body-sm уже несёт letter-spacing 0.64px = 0.04em при 16px — отдельный tracking не нужен.
const baseStyles =
  "inline-flex items-center justify-center rounded-sm font-venuscom uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

const variantStyles: Record<ButtonVariant, string> = {
  // Filled CTA Button (Lemon) — основное действие
  filled:
    "border-0 bg-lemon-zest px-4 py-3 text-body-sm font-semibold text-black-olive shadow-none hover:opacity-90",
  // Ghost / Outlined Navigation Item — активный пункт навигации на тёмном фоне
  outline:
    "border border-pure-white bg-transparent px-1.5 py-2 text-body-sm font-normal text-warm-cream shadow-none hover:bg-pure-white/10",
  // Ghost Link Button (ORDER NOW) — второстепенное действие, подчёркивание только при наведении
  ghost:
    "border-0 bg-transparent p-0 text-body-sm font-medium text-forest-ink shadow-none hover:underline underline-offset-4",
};

export function Button({
  variant = "filled",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    />
  );
}

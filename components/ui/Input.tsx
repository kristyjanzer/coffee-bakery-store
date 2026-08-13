import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

// radius-inputs (DESIGN.md) = 1px, как и у кнопок — общий токен rounded-sm.
// DESIGN.md не описывает error-токен (палитра — Black Olive/Forest Ink/Lemon
// Zest/Warm Cream/Sage Mist/Pure White), но по явному запросу пользователя
// незаполненные обязательные поля подсвечиваются border-red-500 — осознанное
// отклонение под функциональный сигнал ошибки. Цвет границы выбирается одним
// тернарником, а не добавлением border-red-500 поверх border-sage-mist: два
// конфликтующих Tailwind-класса border-color в одном className не гарантируют
// победу более позднего — порядок в сгенерированном CSS определяет сам
// Tailwind, а не порядок классов в атрибуте.
export function Input({ className = "", error = false, ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-sm border ${error ? "border-red-500" : "border-sage-mist"} bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none ${className}`.trim()}
      {...props}
    />
  );
}

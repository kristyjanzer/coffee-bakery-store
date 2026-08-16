import type { Config } from "tailwindcss";

// Стек шрифта: CSS-переменная --font-venuscom подключается в app/layout.tsx через next/font
// (см. комментарий там же — почему вместо VenusCom используется Manrope)
const venuscomFontStack = [
  "var(--font-venuscom)",
  "ui-sans-serif",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  "sans-serif",
];

// Шрифт логотипа/названия "Coffee Bakery" — --font-gabriela подключается в
// app/layout.tsx через next/font/google (см. комментарий там же)
const gabrielaFontStack = ["var(--font-gabriela)", "serif"];

// Шрифт заголовка Hero-блока — --font-dela-gothic-one подключается в
// app/layout.tsx через next/font/google (см. комментарий там же)
const delaGothicOneFontStack = ["var(--font-dela-gothic-one)", "sans-serif"];

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Токены цвета — DESIGN.md, раздел "Tokens — Colors"
      colors: {
        "black-olive": "#1d0b0d",
        "forest-ink": "#103b15",
        "lemon-zest": "#f7ea48",
        "warm-cream": "#fcf9f0",
        "sage-mist": "#dbe2dc",
        "pure-white": "#ffffff",
      },
      // sans переопределён, чтобы весь текст по умолчанию (Tailwind Preflight
      // ставит font-family через theme('fontFamily.sans') на <html>) уже был
      // в фирменном шрифте без явного класса font-venuscom на каждом узле
      fontFamily: {
        sans: venuscomFontStack,
        venuscom: venuscomFontStack,
        gabriela: gabrielaFontStack,
        "dela-gothic-one": delaGothicOneFontStack,
      },
      // Текстовые роли — DESIGN.md, раздел "Type Scale" (размер/line-height/letter-spacing вместе)
      fontSize: {
        caption: ["14px", { lineHeight: "1.45", letterSpacing: "0.84px" }],
        "body-sm": ["16px", { lineHeight: "1.37", letterSpacing: "0.64px" }],
        "body-lg": ["20px", { lineHeight: "1.25", letterSpacing: "0.4px" }],
        subheading: ["26px", { lineHeight: "1.2", letterSpacing: "0.52px" }],
        "heading-sm": ["30px", { lineHeight: "1.15", letterSpacing: "0.9px" }],
        heading: ["36px", { lineHeight: "1.15", letterSpacing: "1.08px" }],
        "heading-lg": ["46px", { lineHeight: "1.1", letterSpacing: "1.84px" }],
        display: ["68px", { lineHeight: "1.01", letterSpacing: "4.08px" }],
        "display-xl": ["75px", { lineHeight: "1", letterSpacing: "4.5px" }],
      },
      // DESIGN.md: скругления почти нулевые — sm переопределён с дефолтных 2px на 1px
      // (карточки/бейджи/инпуты/кнопки), circular — только для круглой кнопки "наверх"
      borderRadius: {
        sm: "1px",
        circular: "40px",
      },
    },
  },
  plugins: [],
};

export default config;

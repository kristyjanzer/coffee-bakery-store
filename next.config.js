/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 сам дописывает в AGENTS.md инструкции для ИИ-агентов при каждом
  // `next dev` — у нас это curated-файл с правилами проекта, не место для
  // автогенерируемого контента.
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // В этой дев-среде DNS для внешних доменов резолвится в адреса из служебного
    // диапазона 198.18.0.0/15 — новая SSRF-защита Next 16 (dangerouslyAllowLocalIP)
    // из-за этого блокирует загрузку картинок с Cloudinary в dev. В production
    // (реальный DNS на Vercel) флаг не включается — защита остаётся.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

module.exports = nextConfig;
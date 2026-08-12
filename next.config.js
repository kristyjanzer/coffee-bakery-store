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
  },
};

module.exports = nextConfig;
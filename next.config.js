/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 сам дописывает в AGENTS.md инструкции для ИИ-агентов при каждом
  // `next dev` — у нас это curated-файл с правилами проекта, не место для
  // автогенерируемого контента.
  agentRules: false,
  images: {
    // AVIF на ~20-30% легче WebP при том же качестве; по умолчанию Next отдаёт
    // только WebP. Порядок важен — Next пробует форматы слева направо.
    formats: ["image/avif", "image/webp"],
    // В Next 16 quality вне этого списка игнорируется (берётся 75). 65 — для
    // фото Hero под тёмным градиентом и текстом разницы на глаз нет.
    qualities: [65, 75],
    // Оптимизированную картинку держим в кеше дольше (по умолчанию 4 часа).
    minimumCacheTTL: 2678400, // 31 день
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',           // Говорит Next.js сделать статичный сайт
  basePath: '/LA-VINO',       // Название вашего репозитория на GitHub
  images: {
    unoptimized: true,        // Чтобы картинки не ломались на GitHub
  },
};

export default nextConfig;

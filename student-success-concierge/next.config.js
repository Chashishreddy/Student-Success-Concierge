/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration (Next.js 16+ default bundler)
  turbopack: {
    root: __dirname,
  },
  // Webpack fallback (for non-Turbopack builds)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;

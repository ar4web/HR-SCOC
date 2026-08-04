/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['.monkeycode-ai.live'],
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          radix: {
            test: /[\/]node_modules[\/]@radix-ui[\/]/,
            name: 'radix-ui',
            chunks: 'all',
          },
          charts: {
            test: /[\/]node_modules[\/](apexcharts|react-apexcharts)[\/]/,
            name: 'charts',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;

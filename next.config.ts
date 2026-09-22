import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/plans',
        destination: '/pricing',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

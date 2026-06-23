import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/proxy/:path*',
        destination: `${process.env.DJANGO_API_URL || 'https://carhaki-svmo.onrender.com'}/:path*`,
      },
    ];
  },
};

export default nextConfig;

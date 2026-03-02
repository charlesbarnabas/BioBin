/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/BioBin',
  assetPrefix: '/BioBin/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
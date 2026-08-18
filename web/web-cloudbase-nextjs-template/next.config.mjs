/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // SSG 静态导出
  trailingSlash: true, // 兼容静态托管，每个页面生成 index.html
  images: {
    unoptimized: true, // 静态导出不支持图片优化
  },
};

export default nextConfig;

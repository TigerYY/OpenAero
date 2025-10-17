const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化
  swcMinify: true,
  compress: true,
  
  // 图片优化
  images: {
    domains: ['openaero.cn', 'localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // 编译优化
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
  // 启用React严格模式
  reactStrictMode: true,
  
  // 环境变量
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  
  // 安全头
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // 重定向
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Webpack优化
  webpack: (config, { dev, isServer }) => {
    // 开发环境优化
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // 减少bundle大小
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }
    
    return config
  },
};

// Sentry配置
const sentryWebpackPluginOptions = {
  // 在构建时上传source maps到Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // 静默模式，减少构建输出
  silent: true,
  
  // 上传source maps
  widenClientFileUpload: true,
  
  // 隐藏source maps
  hideSourceMaps: true,
  
  // 禁用客户端source maps上传
  disableClientWebpackPlugin: false,
  disableServerWebpackPlugin: false,
  
  // 自动上传
  automaticVercelReleases: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);

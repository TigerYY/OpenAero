const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化
  swcMinify: true,
  reactStrictMode: true,
  
  // ESLint配置
  eslint: {
    // 在生产构建时忽略ESLint错误
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // 实验性功能
  experimental: {
    // 启用服务器组件
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    instrumentationHook: true,
  },

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.example.com',
      },
      {
        protocol: 'https',
        hostname: '**.openaero.cn',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 构建配置
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },

  // 输出配置
  output: 'standalone',
  
  // 压缩配置
  compress: true,
  
  // 开发配置
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
};

// Sentry配置
const sentryWebpackPluginOptions = {
  org: 'openaero',
  project: 'openaero-web',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

module.exports = withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
// const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化
  swcMinify: true,
  reactStrictMode: true,
  
  // 输出配置 - 禁用静态生成以避免预渲染错误
  output: 'standalone',
  
  // 页面优化
  poweredByHeader: false, // 移除 X-Powered-By 头
  compress: true, // 启用 gzip 压缩
  
  // 实验性功能 - 性能优化
  experimental: {
    // 启用服务器组件
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
    // 优化包导入
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
    // 暂时禁用instrumentationHook以提高构建速度
    // instrumentationHook: true,
  },
  
  // TypeScript配置
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  

  // 图片优化
  images: {
    remotePatterns: [
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

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 构建ID
  generateBuildId: async () => {
    return 'openaero-build-' + Date.now();
  },

  // 压缩
  compress: true,

  // 开发指示器
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
};

// Sentry配置已禁用
// const sentryWebpackPluginOptions = {
//   org: 'openaero',
//   project: 'openaero-web',
//   silent: true,
//   widenClientFileUpload: true,
//   hideSourceMaps: true,
//   disableLogger: true,
// };

// 导出配置（不使用Sentry）
module.exports = withNextIntl(nextConfig);
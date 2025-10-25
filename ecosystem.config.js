module.exports = {
  apps: [
    {
      name: 'openaero',
      script: 'npm',
      args: 'start',
      cwd: '/root/openaero.web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_APP_URL: 'https://openaero.cn',
        NEXT_PUBLIC_DEFAULT_LOCALE: 'zh-CN',
        NEXT_PUBLIC_SUPPORTED_LOCALES: 'zh-CN,en-US',
        NEXT_PUBLIC_FALLBACK_LOCALE: 'zh-CN'
      },
      error_file: '/root/openaero.web/logs/err.log',
      out_file: '/root/openaero.web/logs/out.log',
      log_file: '/root/openaero.web/logs/combined.log',
      time: true
    }
  ]
};

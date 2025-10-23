import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    solutions: [
      { name: 'FPV验证机', href: '/solutions/fpv' },
      { name: '安防巡检套件', href: '/solutions/security' },
      { name: '农业植保套件', href: '/solutions/agriculture' },
      { name: '物流配送套件', href: '/solutions/logistics' },
    ],
    creators: [
      { name: '创作者计划', href: '/creators/plan' },
      { name: '申请流程', href: '/creators/apply' },
      { name: '收益分成', href: '/creators/revenue' },
      { name: '技术支持', href: '/creators/support' },
    ],
    resources: [
      { name: '技术文档', href: '/developer/docs' },
      { name: 'API接口', href: '/developer/api' },
      { name: 'SDK下载', href: '/developer/sdk' },
      { name: '社区论坛', href: '/developer/community' },
    ],
    company: [
      { name: '关于我们', href: '/about' },
      { name: '联系我们', href: '/contact' },
      { name: '隐私政策', href: '/privacy' },
      { name: '服务条款', href: '/terms' },
    ],
  };

  return (
    <footer className="bg-secondary-900 text-white">
      <div className="container">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">O</span>
                </div>
                <span className="text-xl font-bold">OpenAero</span>
              </div>
              <p className="text-secondary-300 mb-6 max-w-md">
                {t('description')}
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-secondary-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">GitHub</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-secondary-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-secondary-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Solutions */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {t('solutions.title')}
              </h3>
              <ul className="space-y-3">
                {footerLinks.solutions.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-secondary-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Creators */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {t('creators.title')}
              </h3>
              <ul className="space-y-3">
                {footerLinks.creators.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-secondary-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                资源
              </h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-secondary-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-secondary-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-secondary-400 text-sm">
              © {currentYear} OpenAero. All Rights Reserved. | 域名: openaero.cn
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="text-secondary-400 text-sm">
                粤ICP备2020099654号-3
              </div>
              <div className="text-secondary-400 text-sm">
                粤公网安备
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

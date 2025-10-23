'use client';

import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function HeroSection() {
  const t = useTranslations('hero');
  
  return (
    <section className="relative bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-800 py-4 lg:py-8 text-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative space-y-8"
          >
            {/* 背景卡片 */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl -m-8 p-8 -z-10"></div>
            
            {/* 装饰性边框 */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-success-500/20 to-primary-500/20 rounded-3xl -m-8 -z-20"></div>
            <div className="space-y-6 relative z-10">
              {/* 特色标签 */}
              <div className="inline-flex items-center px-4 py-2 bg-blue-900/30 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                {t('badge')}
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                {t('title')}
                <span className="gradient-text block bg-gradient-to-r from-blue-400 via-blue-300 to-green-400 bg-clip-text text-transparent">
                  {t('titleHighlight')}
                </span>
                {t('titleSuffix')}
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                {t('description')}
                <span className="font-semibold text-blue-400">{t('profitSharing')}</span>。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/solutions">
                  <span className="flex items-center gap-2">
                    {t('cta.exploreSolutions')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="border-2 border-white/30 hover:border-white/50 hover:bg-white/10 transition-all duration-300 text-white bg-transparent">
                <Link href="/creators/apply">
                  <span className="flex items-center gap-2 text-white">
                    {t('cta.becomeCreator')}
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm relative z-10">
              <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-2 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-green-300">{t('features.certification')}</span>
              </div>
              <div className="flex items-center space-x-2 bg-blue-900/30 px-3 py-2 rounded-full border border-blue-500/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-blue-300">{t('features.profitSharing')}</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-800/50 px-3 py-2 rounded-full border border-gray-600/30">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-gray-300">{t('features.supplyChain')}</span>
              </div>
            </div>
            
            {/* 装饰性元素 */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-xl"></div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl p-8">
              {/* Mockup of solution cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">FPV验证机套件</h3>
                      <p className="text-sm opacity-90">创作者: 王工</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">¥2,999</div>
                      <div className="text-sm opacity-90">销售中</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">安防巡检套件</h3>
                      <p className="text-sm text-gray-600">创作者: 李工</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">¥4,599</div>
                      <div className="text-sm text-gray-600">审核中</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-success-500 to-success-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">农业植保套件</h3>
                      <p className="text-sm opacity-90">创作者: 张工</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">¥6,999</div>
                      <div className="text-sm opacity-90">已认证</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl"
              >
                ✨
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-success-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
              >
                🚁
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full opacity-50"></div>
      </div>
    </section>
  );
}

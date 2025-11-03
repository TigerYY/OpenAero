'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';

export function CreatorHero() {
  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-white py-20 lg:py-32">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 内容 */}
          <motion.div
            key="creator-hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-secondary-900 leading-tight">
                成为
                <span className="gradient-text block">OpenAero创作者</span>
                开启您的商业化之路
              </h1>
              <p className="text-xl text-secondary-600 leading-relaxed">
                将您的无人机创新设计转化为商业价值，获得50%的利润分成，与全球顶级供应链伙伴合作，让您的创意触达更多用户。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/creators/apply">立即申请</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/creators/guide">查看指南</Link>
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-secondary-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>50%利润分成</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>专业认证</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>全球供应链</span>
              </div>
            </div>
          </motion.div>

          {/* 视觉 */}
          <motion.div
            key="creator-hero-preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl p-8">
              {/* 创作者仪表盘预览 */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-secondary-900">创作者仪表盘</h3>
                  <span className="px-3 py-1 bg-success-100 text-success-800 text-xs font-medium rounded-full">
                    已认证
                  </span>
                </div>

                {/* 收益统计 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary-600">¥12,580</div>
                    <div className="text-sm text-primary-600">本月收益</div>
                  </div>
                  <div className="bg-success-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-success-600">156</div>
                    <div className="text-sm text-success-600">总销量</div>
                  </div>
                </div>

                {/* 解决方案列表 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div>
                      <div className="font-medium text-secondary-900">FPV验证机套件</div>
                      <div className="text-sm text-secondary-600">已发布</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-secondary-900">¥2,999</div>
                      <div className="text-sm text-success-600">+¥2,099</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div>
                      <div className="font-medium text-secondary-900">安防巡检套件</div>
                      <div className="text-sm text-secondary-600">审核中</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-secondary-900">¥4,599</div>
                      <div className="text-sm text-warning-600">待审核</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 浮动元素 */}
              <motion.div
                key="creator-hero-float-money"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl"
              >
                💰
              </motion.div>
              <motion.div
                key="creator-hero-float-rocket"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-success-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
              >
                🚀
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-success-100 rounded-full opacity-50"></div>
      </div>
    </section>
  );
}

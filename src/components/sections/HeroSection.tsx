'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-white py-20 lg:py-32">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-secondary-900 leading-tight">
                社区驱动的
                <span className="gradient-text block">开放式无人机</span>
                解决方案平台
              </h1>
              <p className="text-xl text-secondary-600 leading-relaxed">
                连接全球无人机创作者与专业客户，将优秀的无人机创新设计进行专业验证、生产和销售，为创作者提供70%的利润分成。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/solutions">浏览解决方案</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/creators/apply">成为创作者</Link>
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-secondary-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>专业认证</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>70%利润分成</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span>全球供应链</span>
              </div>
            </div>
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
                      <div className="text-sm opacity-90">已认证</div>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-secondary-900">安防巡检套件</h3>
                      <p className="text-sm text-secondary-600">创作者: 李工</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-secondary-900">¥4,599</div>
                      <div className="text-sm text-secondary-600">审核中</div>
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-success-100 rounded-full opacity-50"></div>
      </div>
    </section>
  );
}

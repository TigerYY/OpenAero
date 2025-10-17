'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const solutions = [
  {
    id: 'fpv',
    name: 'FPV验证机套件',
    description: '专为FPV飞行爱好者设计的高性能验证机套件，支持4K视频录制和实时图传。',
    price: '¥2,999',
    status: '已认证',
    creator: '王工',
    image: '/images/solutions/fpv.jpg',
    features: ['4K视频录制', '实时图传', 'GPS定位', '自动返航'],
    category: '娱乐',
  },
  {
    id: 'security',
    name: '安防巡检套件',
    description: '适用于安防巡检的专业无人机套件，具备夜视功能和智能避障系统。',
    price: '¥4,599',
    status: '审核中',
    creator: '李工',
    image: '/images/solutions/security.jpg',
    features: ['夜视功能', '智能避障', '长续航', '防水设计'],
    category: '安防',
  },
  {
    id: 'agriculture',
    name: '农业植保套件',
    description: '专为农业植保设计的无人机套件，支持精准喷洒和作物监测。',
    price: '¥6,999',
    status: '已认证',
    creator: '张工',
    image: '/images/solutions/agriculture.jpg',
    features: ['精准喷洒', '作物监测', '大载重', '智能规划'],
    category: '农业',
  },
];

export function SolutionsSection() {
  return (
    <section className="py-20 bg-secondary-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            认证解决方案
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            经过专业认证的无人机核心套件，为不同应用场景提供完整解决方案
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">🚁</div>
                </div>
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      solution.status === '已认证'
                        ? 'bg-success-100 text-success-800'
                        : 'bg-warning-100 text-warning-800'
                    }`}
                  >
                    {solution.status}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-600 font-medium">
                    {solution.category}
                  </span>
                  <span className="text-sm text-secondary-500">
                    创作者: {solution.creator}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  {solution.name}
                </h3>
                <p className="text-secondary-600 mb-4 line-clamp-2">
                  {solution.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {solution.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-md"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-primary-600">
                    {solution.price}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/solutions/${solution.id}`}>查看详情</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <Link href="/solutions">查看所有解决方案</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const caseStudies = [
  {
    id: 'case-1',
    title: '王工的FPV验证机成功案例',
    description: '从个人爱好到商业成功，王工的FPV验证机在平台上获得了巨大成功，月销量超过100套。',
    creator: '王工',
    revenue: '¥299,900',
    sales: '100+',
    image: '/images/cases/fpv-case.jpg',
    tags: ['FPV', '验证机', '成功案例'],
  },
  {
    id: 'case-2',
    title: '李工的安防巡检套件',
    description: '专为安防行业设计的巡检套件，获得了多家安防公司的认可和采购。',
    creator: '李工',
    revenue: '¥459,900',
    sales: '100+',
    image: '/images/cases/security-case.jpg',
    tags: ['安防', '巡检', '行业应用'],
  },
  {
    id: 'case-3',
    title: '张工的农业植保套件',
    description: '针对农业植保需求设计的专业套件，帮助农民提高植保效率，降低成本。',
    creator: '张工',
    revenue: '¥699,900',
    sales: '100+',
    image: '/images/cases/agriculture-case.jpg',
    tags: ['农业', '植保', '智能农业'],
  },
];

export function CaseStudiesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            成功案例
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            看看我们的创作者如何通过平台实现商业成功
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {caseStudies.map((study, index) => (
            <motion.div
              key={study.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="aspect-video bg-gradient-to-br from-success-100 to-success-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">🚁</div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-success-100 text-success-800 text-xs font-medium rounded-full">
                    成功案例
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  {study.title}
                </h3>
                <p className="text-secondary-600 mb-4 line-clamp-2">
                  {study.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {study.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-secondary-500">
                    创作者: {study.creator}
                  </div>
                  <div className="text-sm text-secondary-500">
                    销量: {study.sales}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-success-600">
                    {study.revenue}
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/cases/${study.id}`}>查看详情</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <Link href="/cases">查看所有案例</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

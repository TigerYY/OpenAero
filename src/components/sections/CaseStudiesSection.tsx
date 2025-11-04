'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouting } from '@/lib/routing';

import { Button } from '@/components/ui/Button';

const caseStudies = [
  {
    id: 'case-1',
    titleKey: 'case1.title',
    descriptionKey: 'case1.description',
    creatorKey: 'case1.creator',
    revenue: '¥299,900',
    sales: '100+',
    image: '/images/cases/fpv-case.jpg',
    tags: ['FPV', '验证机', '成功案例'],
  },
  {
    id: 'case-2',
    titleKey: 'case2.title',
    descriptionKey: 'case2.description',
    creatorKey: 'case2.creator',
    revenue: '¥459,900',
    sales: '100+',
    image: '/images/cases/security-case.jpg',
    tags: ['安防', '巡检', '行业应用'],
  },
  {
    id: 'case-3',
    titleKey: 'case3.title',
    descriptionKey: 'case3.description',
    creatorKey: 'case3.creator',
    revenue: '¥699,900',
    sales: '100+',
    image: '/images/cases/agriculture-case.jpg',
    tags: ['农业', '植保', '智能农业'],
  },
];

export function CaseStudiesSection() {
  const t = useTranslations('caseStudies');
  const { route, routes } = useRouting();

  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            {t('subtitle')}
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
                  <span className="text-6xl">🚁</span>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-success-100 text-success-800 text-xs font-medium rounded-full">
                    {t('successCase')}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  {t(study.titleKey)}
                </h3>
                <p className="text-secondary-600 mb-4 line-clamp-2">
                  {t(study.descriptionKey)}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {study.tags.map((tag: string) => (
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
                    {t('creator')}: {t(study.creatorKey)}
                  </div>
                  <div className="text-sm text-secondary-500">
                    {t('sales')}: {study.sales}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-success-600">
                    {study.revenue}
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={route(routes.BUSINESS.CASE_DETAIL.replace('[id]', study.id))}>{t('viewDetails')}</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <Link href={route(routes.BUSINESS.CASES)}>{t('viewAllCases')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

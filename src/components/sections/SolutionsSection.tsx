'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useRouting } from '@/lib/routing';


interface Solution {
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'published' | 'draft' | 'pending';
  creator: {
    name: string;
  };
  category: string;
  tags: string[];
  images: string[];
  createdAt: string;
}

export function SolutionsSection() {
  const t = useTranslations('solutions');
  const { route, routes } = useRouting();
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSolutions = async () => {
      try {
        const response = await fetch('/api/solutions?limit=3&status=published');
        if (!response.ok) {
          throw new Error('Failed to fetch solutions');
        }
        const data = await response.json();
        setSolutions(data.solutions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Fallback to mock data if API fails
        setSolutions([
          {
            id: 'fpv',
            title: 'FPV验证机套件',
            description: '专为FPV飞行爱好者设计的高性能验证机套件，支持4K视频录制和实时图传。',
            price: 2999,
            status: 'published',
            creator: { name: '王工' },
            category: '娱乐',
            tags: ['4K视频录制', '实时图传', 'GPS定位', '自动返航'],
            images: ['/images/solutions/fpv.jpg'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'security',
            title: '安防巡检套件',
            description: '适用于安防巡检的专业无人机套件，具备夜视功能和智能避障系统。',
            price: 4599,
            status: 'published',
            creator: { name: '李工' },
            category: '安防',
            tags: ['夜视功能', '智能避障', '长续航', '防水设计'],
            images: ['/images/solutions/security.jpg'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'agriculture',
            title: '农业植保套件',
            description: '专为农业植保设计的无人机套件，支持精准喷洒和作物监测。',
            price: 6999,
            status: 'published',
            creator: { name: '张工' },
            category: '农业',
            tags: ['精准喷洒', '作物监测', '大载重', '智能规划'],
            images: ['/images/solutions/agriculture.jpg'],
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSolutions();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return t('status.certified');
      case 'pending':
        return t('status.pending');
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <section className="py-20 bg-secondary-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">加载解决方案时出错: {error}</p>
            <Button onClick={() => window.location.reload()}>重试</Button>
          </div>
        ) : (
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
                  {solution.images && solution.images[0] ? (
                    <img
                      src={solution.images[0]}
                      alt={solution.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to drone emoji if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">🚁</span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(solution.status)}`}>
                      {getStatusText(solution.status)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary-600 font-medium">
                      {t(`categories.${solution.category}`) || solution.category}
                    </span>
                    <span className="text-sm text-secondary-500">
                      {t('creator')}: {solution.creator.name}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {solution.title}
                  </h3>
                  <p className="text-secondary-600 mb-4 line-clamp-2">
                    {solution.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {solution.tags?.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary-600">
                      {formatPrice(solution.price)}
                    </div>
                    <Button size="sm" asChild>
                      <Link href={route(routes.BUSINESS.SOLUTION_DETAIL.replace('[id]', solution.id))}>{t('card.viewDetails')}</Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button size="lg" asChild>
            <Link href={route(routes.BUSINESS.SOLUTIONS)}>{t('viewAll')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

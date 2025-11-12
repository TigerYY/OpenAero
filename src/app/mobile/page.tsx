'use client';
import { useRouting } from '@/lib/routing';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  downloads: number;
  image: string;
  author: {
    name: string;
    avatar: string;
  };
}

interface Creator {
  id: string;
  name: string;
  avatar: string;
  speciality: string;
  rating: number;
  solutions: number;
  earnings: number;
}

export default function MobilePage() {
  const { route } = useRouting();
  const [featuredSolutions, setFeaturedSolutions] = useState<Solution[]>([]);
  const [topCreators, setTopCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState({
    totalSolutions: 0,
    totalCreators: 0,
    totalDownloads: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    // 模拟获取数据
    setFeaturedSolutions([
      {
        id: '1',
        title: 'React 电商组件库',
        description: '完整的电商前端解决方案，包含购物车、支付、订单管理等功能',
        category: 'React',
        price: 299,
        rating: 4.8,
        downloads: 1234,
        image: '/api/placeholder/300/200',
        author: {
          name: '张开发',
          avatar: '/api/placeholder/40/40'
        }
      },
      {
        id: '2',
        title: 'Vue.js 管理后台',
        description: '基于 Vue 3 的现代化管理后台模板，支持多主题和国际化',
        category: 'Vue.js',
        price: 199,
        rating: 4.9,
        downloads: 856,
        image: '/api/placeholder/300/200',
        author: {
          name: '李前端',
          avatar: '/api/placeholder/40/40'
        }
      },
      {
        id: '3',
        title: 'Node.js API 框架',
        description: '高性能的 RESTful API 开发框架，内置认证、缓存、日志等功能',
        category: 'Node.js',
        price: 399,
        rating: 4.7,
        downloads: 642,
        image: '/api/placeholder/300/200',
        author: {
          name: '王后端',
          avatar: '/api/placeholder/40/40'
        }
      }
    ]);

    setTopCreators([
      {
        id: '1',
        name: '张开发',
        avatar: '/api/placeholder/60/60',
        speciality: 'React 专家',
        rating: 4.9,
        solutions: 15,
        earnings: 25600
      },
      {
        id: '2',
        name: '李前端',
        avatar: '/api/placeholder/60/60',
        speciality: 'Vue.js 大师',
        rating: 4.8,
        solutions: 12,
        earnings: 18900
      },
      {
        id: '3',
        name: '王后端',
        avatar: '/api/placeholder/60/60',
        speciality: 'Node.js 架构师',
        rating: 4.7,
        solutions: 8,
        earnings: 32100
      }
    ]);

    setStats({
      totalSolutions: 1250,
      totalCreators: 340,
      totalDownloads: 45600,
      totalRevenue: 1280000
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 英雄区域 */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">
              发现优质代码解决方案
            </h1>
            <p className="text-blue-100 mb-8 text-lg">
              连接开发者与创作者，让编程更高效
            </p>
            
            {/* 搜索框 */}
            <div className="relative max-w-md mx-auto mb-8">
              <input
                type="text"
                placeholder="搜索解决方案..."
                className="w-full px-4 py-3 pl-12 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* 快速分类 */}
            <div className="flex flex-wrap justify-center gap-2">
              {['React', 'Vue.js', 'Node.js', 'Python', 'UI设计'].map((category) => (
                <Link
                  key={category}
                  href={`/solutions?category=${category.toLowerCase()}`}
                  className="px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-medium hover:bg-opacity-30 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 统计数据 */}
      <section className="py-8 bg-white">
        <div className="px-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSolutions.toLocaleString()}</div>
              <div className="text-sm text-gray-600">解决方案</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalCreators.toLocaleString()}</div>
              <div className="text-sm text-gray-600">创作者</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalDownloads.toLocaleString()}</div>
              <div className="text-sm text-gray-600">下载量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">¥{(stats.totalRevenue / 10000).toFixed(1)}万</div>
              <div className="text-sm text-gray-600">总收益</div>
            </div>
          </div>
        </div>
      </section>

      {/* 精选解决方案 */}
      <section className="py-8">
        <div className="px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">精选解决方案</h2>
            <Link href={route('/solutions')} className="text-blue-600 text-sm font-medium">
              查看全部 →
            </Link>
          </div>
          
          <div className="space-y-4">
            {featuredSolutions.map((solution) => (
              <div key={solution.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">{solution.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{solution.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {solution.category}
                          </span>
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <span className="text-sm text-gray-600">{solution.rating}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">¥{solution.price}</div>
                          <div className="text-xs text-gray-500">{solution.downloads} 下载</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 顶级创作者 */}
      <section className="py-8 bg-white">
        <div className="px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">顶级创作者</h2>
            <Link href={route('/creators')} className="text-blue-600 text-sm font-medium">
              查看全部 →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {topCreators.map((creator) => (
              <div key={creator.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{creator.name}</h3>
                  <p className="text-sm text-gray-600">{creator.speciality}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="text-sm text-gray-600">{creator.rating}</span>
                    </div>
                    <span className="text-sm text-gray-600">{creator.solutions} 作品</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">¥{creator.earnings.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">总收益</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 行动号召 */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">准备开始了吗？</h2>
          <p className="text-blue-100 mb-8">
            加入 OpenAero 社区，发现更多优质解决方案
          </p>
          <div className="space-y-3">
            <Link
              href={route('/auth/register')}
              className="block w-full max-w-xs mx-auto px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              立即注册
            </Link>
            <Link
              href={route('/creators/apply')}
              className="block w-full max-w-xs mx-auto px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              成为创作者
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
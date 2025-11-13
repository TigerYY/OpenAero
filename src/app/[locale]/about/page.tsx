'use client';

import Link from 'next/link';
import { useRouting } from '@/lib/routing';
import { DefaultLayout } from '@/components/layout/DefaultLayout';

interface AboutPageProps {
  params: {
    locale: string;
  };
}

export default function AboutPage({ params: { locale } }: AboutPageProps) {
  const { route, routes } = useRouting();
  return (
    <DefaultLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-secondary-900 mb-6">
              关于开元空御
            </h1>
            <p className="text-xl text-secondary-600 leading-relaxed">
              我们致力于构建一个社区驱动的开放式无人机解决方案平台，
              连接全球无人机创作者与专业客户，推动无人机技术的创新与应用。
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-secondary-900 mb-6">
                    我们的使命
                  </h2>
                  <p className="text-lg text-secondary-600 mb-6">
                    开元空御致力于打破传统无人机行业的壁垒，通过开放式平台让优秀的创新设计能够快速转化为商业价值。
                  </p>
                  <p className="text-lg text-secondary-600">
                    我们相信，通过社区的力量和开放的合作，能够加速无人机技术的发展，为各行各业提供更好的解决方案。
                  </p>
                </div>
                <div className="bg-primary-50 rounded-lg p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">O</span>
                    </div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                      开放 · 创新 · 共赢
                    </h3>
                    <p className="text-secondary-600">
                      构建开放生态，推动技术创新，实现共同发展
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Values Section */}
      <section className="py-20 bg-secondary-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-secondary-900 text-center mb-12">
                我们的价值观
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    创新驱动
                  </h3>
                  <p className="text-secondary-600">
                    持续推动技术创新，为用户提供前沿的无人机解决方案
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    开放合作
                  </h3>
                  <p className="text-secondary-600">
                    构建开放的生态系统，促进全球创作者和用户的协作
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    品质保证
                  </h3>
                  <p className="text-secondary-600">
                    严格的质量标准和认证流程，确保每个解决方案的可靠性
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Team Section */}
      <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-secondary-900 mb-6">
                我们的团队
              </h2>
              <p className="text-lg text-secondary-600 mb-12">
                开元空御团队由来自航空航天、软件工程、产品设计等领域的专业人士组成，
                我们拥有丰富的无人机技术和平台运营经验。
              </p>
              <div className="bg-primary-50 rounded-lg p-8">
                <p className="text-lg text-secondary-700 italic">
                  &ldquo;我们相信技术的力量能够改变世界，而开放的合作能够加速这一进程。
                  开元空御不仅是一个平台，更是一个连接梦想与现实的桥梁。&rdquo;
                </p>
                <p className="text-secondary-600 mt-4">
                  — 开元空御创始团队
                </p>
              </div>
            </div>
          </div>
        </section>

      {/* Contact Section */}
      <section className="py-20 bg-secondary-900 text-white">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">
                联系我们
              </h2>
              <p className="text-xl text-secondary-300 mb-8">
                有任何问题或建议？我们很乐意听到您的声音
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={route(routes.BUSINESS.CONTACT)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  联系我们
                </Link>
                <Link
                  href={route(routes.BUSINESS.CREATORS_APPLY)}
                  className="bg-transparent border-2 border-white hover:bg-white hover:text-secondary-900 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  成为创作者
                </Link>
              </div>
            </div>
          </div>
        </section>
    </DefaultLayout>
  );
}
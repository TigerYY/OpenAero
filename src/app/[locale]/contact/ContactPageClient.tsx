'use client';
import { useRouting } from '@/lib/routing';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import ContactForm from '@/components/forms/ContactForm';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ContactPageClient() {
  const t = useTranslations('contact');
  const { route, routes } = useRouting();

  const handleContactSubmit = async (data: any) => {
    // 这里可以添加额外的处理逻辑
    console.log('联系表单提交:', data);
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 联系方式信息 */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  {t('contactInfo.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 邮箱 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{t('contactInfo.email.title')}</h3>
                    <p className="text-gray-600 mb-2">{t('contactInfo.email.description')}</p>
                    <a 
                      href="mailto:support@openaero.cn" 
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      support@openaero.cn
                    </a>
                  </div>
                </div>
                
                {/* 客服热线 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{t('contactInfo.phone.title')}</h3>
                    <p className="text-gray-600 mb-2">{t('contactInfo.phone.description')}</p>
                    <a 
                      href="tel:+864006911891" 
                      className="text-green-600 hover:text-green-700 font-medium text-xl"
                    >
                      {t('contactInfo.phone.number')}
                    </a>
                  </div>
                </div>
                
                {/* 工作时间 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{t('contactInfo.workingHours.title')}</h3>
                    <p className="text-gray-600 mb-2">{t('contactInfo.workingHours.description')}</p>
                    <p className="text-purple-600 font-medium">{t('contactInfo.workingHours.hours')}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('contactInfo.workingHours.note')}</p>
                  </div>
                </div>

                {/* 地址信息 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{t('contactInfo.address.title')}</h3>
                    <p className="text-gray-600 mb-2">{t('contactInfo.address.description')}</p>
                    <p className="text-orange-600 font-medium">{t('contactInfo.address.location')}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('contactInfo.address.note')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 快速链接 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {t('quickLinks.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link href={route('/help/faq')}>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('quickLinks.faq')}
                    </Button>
                  </Link>
                  <Link href={route('/help/documentation')}>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('quickLinks.documentation')}
                    </Button>
                  </Link>
                  <Link href={route(routes.CREATORS.APPLY)}>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t('quickLinks.becomeCreator')}
                    </Button>
                  </Link>
                  <Link href={route(routes.BUSINESS.ABOUT)}>
                    <Button variant="outline" className="w-full justify-start">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('quickLinks.aboutUs')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 联系表单 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  {t('form.title')}
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {t('form.description')}
                </p>
              </CardHeader>
              <CardContent>
                <ContactForm onSubmit={handleContactSubmit} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('whyChooseUs.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('whyChooseUs.certification.title')}</h4>
                <p className="text-gray-600 text-sm">
                  {t('whyChooseUs.certification.description')}
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('whyChooseUs.profitSharing.title')}</h4>
                <p className="text-gray-600 text-sm">
                  {t('whyChooseUs.profitSharing.description')}
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('whyChooseUs.supplyChain.title')}</h4>
                <p className="text-gray-600 text-sm">
                  {t('whyChooseUs.supplyChain.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { DefaultLayout } from '@/components/layout/DefaultLayout';
import { useRouting } from '@/lib/routing';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface AboutPageProps {
  params: {
    locale: string;
  };
}

export default function AboutPage({ params: { locale: _locale } }: AboutPageProps) {
  const t = useTranslations('about');
  const { route, routes } = useRouting();
  return (
    <DefaultLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-secondary-900 mb-6">
              {t('title')}
            </h1>
            <p className="text-xl text-secondary-600 leading-relaxed">
              {t('subtitle')}
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
                    {t('mission.title')}
                  </h2>
                  <p className="text-lg text-secondary-600 mb-6">
                    {t('mission.description1')}
                  </p>
                  <p className="text-lg text-secondary-600">
                    {t('mission.description2')}
                  </p>
                </div>
                <div className="bg-primary-50 rounded-lg p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">O</span>
                    </div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                      {t('mission.tagline')}
                    </h3>
                    <p className="text-secondary-600">
                      {t('mission.taglineDescription')}
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
                {t('values.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {t('values.innovation.title')}
                  </h3>
                  <p className="text-secondary-600">
                    {t('values.innovation.description')}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {t('values.openness.title')}
                  </h3>
                  <p className="text-secondary-600">
                    {t('values.openness.description')}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {t('values.quality.title')}
                  </h3>
                  <p className="text-secondary-600">
                    {t('values.quality.description')}
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
                {t('team.title')}
              </h2>
              <p className="text-lg text-secondary-600 mb-12">
                {t('team.description')}
              </p>
              <div className="bg-primary-50 rounded-lg p-8">
                <p className="text-lg text-secondary-700 italic">
                  &ldquo;{t('team.quote')}&rdquo;
                </p>
                <p className="text-secondary-600 mt-4">
                  {t('team.quoteAuthor')}
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
                {t('contact.title')}
              </h2>
              <p className="text-xl text-secondary-300 mb-8">
                {t('contact.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={route(routes.BUSINESS.CONTACT)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {t('contact.contactButton')}
                </Link>
                <Link
                  href={route(routes.BUSINESS.CREATORS_APPLY)}
                  className="bg-transparent border-2 border-white hover:bg-white hover:text-secondary-900 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {t('contact.becomeCreatorButton')}
                </Link>
              </div>
            </div>
          </div>
        </section>
    </DefaultLayout>
  );
}
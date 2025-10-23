'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const partners = [
  {
    nameKey: 'partners.dji.name',
    logo: 'DJI',
    descriptionKey: 'partners.dji.description',
    categoryKey: 'partners.categories.tech',
    color: 'bg-gradient-to-br from-red-500 to-red-600',
    textColor: 'text-white',
  },
  {
    nameKey: 'partners.huawei.name',
    logo: 'HUAWEI',
    descriptionKey: 'partners.huawei.description',
    categoryKey: 'partners.categories.cloud',
    color: 'bg-gradient-to-br from-red-500 to-red-700',
    textColor: 'text-white',
  },
  {
    nameKey: 'partners.alibaba.name',
    logo: 'ALIBABA',
    descriptionKey: 'partners.alibaba.description',
    categoryKey: 'partners.categories.cloud',
    color: 'bg-gradient-to-br from-orange-400 to-orange-600',
    textColor: 'text-white',
  },
  {
    nameKey: 'partners.thunder.name',
    logo: 'THUNDER',
    descriptionKey: 'partners.thunder.description',
    categoryKey: 'partners.categories.tech',
    color: 'bg-gradient-to-br from-blue-500 to-blue-700',
    textColor: 'text-white',
  },
  {
    nameKey: 'partners.sf.name',
    logo: 'SF',
    descriptionKey: 'partners.sf.description',
    categoryKey: 'partners.categories.logistics',
    color: 'bg-gradient-to-br from-red-600 to-red-800',
    textColor: 'text-white',
  },
  {
    nameKey: 'partners.jd.name',
    logo: 'JD',
    descriptionKey: 'partners.jd.description',
    categoryKey: 'partners.categories.logistics',
    color: 'bg-gradient-to-br from-red-500 to-red-700',
    textColor: 'text-white',
  },
];

export function PartnersSection() {
  const t = useTranslations('partners');

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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.nameKey}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300 text-center"
            >
              <div className={`w-12 h-12 ${partner.color} rounded-lg flex items-center justify-center mx-auto mb-3 text-xs font-bold ${partner.textColor} shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105`}>
                <span className="tracking-tight">{partner.logo}</span>
              </div>
              <h3 className="font-semibold text-secondary-900 mb-1">
                {t(partner.nameKey)}
              </h3>
              <p className="text-xs text-secondary-500 mb-2">
                {t(partner.descriptionKey)}
              </p>
              <span className="inline-block px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-md">
                {t(partner.categoryKey)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

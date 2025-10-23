'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const transparencyFeatures = [
  {
    titleKey: 'features.certification.title',
    descriptionKey: 'features.certification.description',
    icon: '🔍',
  },
  {
    titleKey: 'features.costBreakdown.title',
    descriptionKey: 'features.costBreakdown.description',
    icon: '📊',
  },
  {
    titleKey: 'features.progressTracking.title',
    descriptionKey: 'features.progressTracking.description',
    icon: '📈',
  },
  {
    titleKey: 'features.communityOversight.title',
    descriptionKey: 'features.communityOversight.description',
    icon: '👥',
  },
];

export function TransparencySection() {
  const t = useTranslations('transparency');

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {transparencyFeatures.map((feature, index) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3">
                {t(feature.titleKey)}
              </h3>
              <p className="text-secondary-600 leading-relaxed">
                {t(feature.descriptionKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

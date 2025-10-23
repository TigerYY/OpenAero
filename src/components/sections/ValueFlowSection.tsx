'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const valueSteps = [
  {
    step: '01',
    titleKey: 'step1.title',
    descriptionKey: 'step1.description',
    icon: '📝',
  },
  {
    step: '02',
    titleKey: 'step2.title',
    descriptionKey: 'step2.description',
    icon: '🔍',
  },
  {
    step: '03',
    titleKey: 'step3.title',
    descriptionKey: 'step3.description',
    icon: '🏭',
  },
  {
    step: '04',
    titleKey: 'step4.title',
    descriptionKey: 'step4.description',
    icon: '💰',
  },
];

export function ValueFlowSection() {
  const t = useTranslations('valueFlow');

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
          {valueSteps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto text-2xl">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-3">
                  {t(step.titleKey)}
                </h3>
                <p className="text-secondary-600 leading-relaxed">
                  {t(step.descriptionKey)}
                </p>
              </div>

              {/* Connector line */}
              {index < valueSteps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-transparent transform translate-x-4"></div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

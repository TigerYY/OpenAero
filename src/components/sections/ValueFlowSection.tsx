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
    <section className='py-20 bg-gradient-to-b from-gray-50 to-white'>
      <div className='container'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl lg:text-4xl font-bold text-secondary-900 mb-4'>{t('title')}</h2>
          <p className='text-xl text-secondary-600 max-w-3xl mx-auto'>{t('subtitle')}</p>
        </div>

        <div className='relative'>
          {/* Desktop layout */}
          <div className='hidden lg:grid lg:grid-cols-4 gap-8 relative'>
            {valueSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className='relative'
              >
                <div className='text-center bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100'>
                  <div className='relative mb-6'>
                    <div className='w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-md'>
                      {step.icon}
                    </div>
                    <div className='absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg'>
                      {step.step}
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold text-secondary-900 mb-3 min-h-[3rem] flex items-center justify-center'>
                    {t(step.titleKey)}
                  </h3>
                  <p className='text-secondary-600 leading-relaxed text-sm'>
                    {t(step.descriptionKey)}
                  </p>
                </div>

                {/* Connector arrow */}
                {index < valueSteps.length - 1 && (
                  <div className='absolute top-1/2 -right-4 transform -translate-y-1/2 z-10'>
                    <div className='w-8 h-8 bg-white rounded-full shadow-md border-2 border-primary-200 flex items-center justify-center'>
                      <svg
                        className='w-4 h-4 text-primary-600'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 5l7 7-7 7'
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Mobile and tablet layout */}
          <div className='lg:hidden space-y-6'>
            {valueSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className='relative'
              >
                <div className='flex items-start space-x-4 bg-white rounded-xl p-6 shadow-lg border border-gray-100'>
                  <div className='flex-shrink-0'>
                    <div className='relative'>
                      <div className='w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center text-2xl shadow-md'>
                        {step.icon}
                      </div>
                      <div className='absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg'>
                        {step.step}
                      </div>
                    </div>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-lg font-semibold text-secondary-900 mb-2'>
                      {t(step.titleKey)}
                    </h3>
                    <p className='text-secondary-600 leading-relaxed text-sm'>
                      {t(step.descriptionKey)}
                    </p>
                  </div>
                </div>

                {/* Connector line for mobile */}
                {index < valueSteps.length - 1 && (
                  <div className='flex justify-center py-2'>
                    <div className='w-0.5 h-6 bg-gradient-to-b from-primary-300 to-primary-200'></div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

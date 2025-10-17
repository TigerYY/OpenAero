'use client';

import { motion } from 'framer-motion';

const valueSteps = [
  {
    step: '01',
    title: '创作者提交方案',
    description: '无人机创作者提交经过验证的设计方案，包括技术文档、测试报告和BOM清单。',
    icon: '📝',
  },
  {
    step: '02',
    title: '专业审核认证',
    description: '我们的技术团队对方案进行专业审核，确保技术可行性和市场价值。',
    icon: '🔍',
  },
  {
    step: '03',
    title: '供应链生产',
    description: '与全球顶级供应链伙伴合作，进行小批量试产和性能验证。',
    icon: '🏭',
  },
  {
    step: '04',
    title: '平台销售分成',
    description: '通过平台销售，创作者获得50%的利润分成，客户获得认证产品。',
    icon: '💰',
  },
];

export function ValueFlowSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            价值流转流程
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            从创作者提交到客户获得认证产品，我们建立了完整的价值流转体系
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
                  {step.title}
                </h3>
                <p className="text-secondary-600 leading-relaxed">
                  {step.description}
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

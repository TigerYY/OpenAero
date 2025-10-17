'use client';

import { motion } from 'framer-motion';

const transparencyFeatures = [
  {
    title: '公开透明的认证流程',
    description: '所有认证标准、测试流程和审核结果完全公开，确保公平公正。',
    icon: '🔍',
  },
  {
    title: '详细的成本分解',
    description: '每个解决方案的成本构成、利润分配都清晰可见，让创作者和客户都放心。',
    icon: '📊',
  },
  {
    title: '实时进度跟踪',
    description: '从提交到认证，从生产到交付，每个环节的进度都可以实时查看。',
    icon: '📈',
  },
  {
    title: '社区监督机制',
    description: '建立社区监督机制，让所有参与者都能参与到质量监督中来。',
    icon: '👥',
  },
];

export function TransparencySection() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            透明化运营
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            我们相信透明化运营是建立信任的基础，让每个环节都公开透明
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {transparencyFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
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
                {feature.title}
              </h3>
              <p className="text-secondary-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

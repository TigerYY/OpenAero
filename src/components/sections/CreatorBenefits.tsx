'use client';

import { motion } from 'framer-motion';

const benefits = [
  {
    icon: '💰',
    title: '50%利润分成',
    description: '获得销售收入的50%作为创作者收益，远高于行业平均水平',
    highlight: true,
  },
  {
    icon: '🏭',
    title: '全球供应链支持',
    description: '与顶级供应链伙伴合作，提供专业的生产和制造服务',
  },
  {
    icon: '🔍',
    title: '专业认证体系',
    description: '严格的认证流程确保产品质量，提升用户信任度',
  },
  {
    icon: '📈',
    title: '数据分析支持',
    description: '提供详细的销售数据和用户反馈，助力产品优化',
  },
  {
    icon: '🌍',
    title: '全球市场覆盖',
    description: '触达全球用户，让您的创意获得更广泛的认可',
  },
  {
    icon: '🛡️',
    title: '知识产权保护',
    description: '完善的IP保护机制，确保您的创意得到充分保护',
  },
];

export function CreatorBenefits() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            创作者权益
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            我们为创作者提供全方位的支持和服务，让您的创意获得最大价值
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-6 rounded-xl ${
                benefit.highlight
                  ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200'
                  : 'bg-secondary-50 hover:bg-secondary-100'
              } transition-colors duration-300`}
            >
              {benefit.highlight && (
                <div className="absolute -top-3 -right-3 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  推荐
                </div>
              )}
              
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${
                  benefit.highlight ? 'bg-primary-200' : 'bg-white'
                }`}>
                  {benefit.icon}
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${
                  benefit.highlight ? 'text-primary-900' : 'text-secondary-900'
                }`}>
                  {benefit.title}
                </h3>
                <p className={`leading-relaxed ${
                  benefit.highlight ? 'text-primary-700' : 'text-secondary-600'
                }`}>
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

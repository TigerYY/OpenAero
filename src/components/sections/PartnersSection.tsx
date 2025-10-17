'use client';

import { motion } from 'framer-motion';

const partners = [
  {
    name: '大疆创新',
    logo: 'DJI',
    description: '全球领先的无人机技术公司',
    category: '技术合作',
    color: 'bg-gradient-to-br from-red-500 to-red-600',
    textColor: 'text-white',
  },
  {
    name: '华为云',
    logo: 'HUAWEI',
    description: '云计算和AI技术支持',
    category: '云服务',
    color: 'bg-gradient-to-br from-red-500 to-red-700',
    textColor: 'text-white',
  },
  {
    name: '阿里云',
    logo: 'ALIBABA',
    description: '数据存储和计算服务',
    category: '云服务',
    color: 'bg-gradient-to-br from-orange-400 to-orange-600',
    textColor: 'text-white',
  },
  {
    name: '中科创达',
    logo: 'THUNDER',
    description: '嵌入式系统解决方案',
    category: '技术合作',
    color: 'bg-gradient-to-br from-blue-500 to-blue-700',
    textColor: 'text-white',
  },
  {
    name: '顺丰科技',
    logo: 'SF',
    description: '物流配送解决方案',
    category: '物流合作',
    color: 'bg-gradient-to-br from-red-600 to-red-800',
    textColor: 'text-white',
  },
  {
    name: '京东物流',
    logo: 'JD',
    description: '供应链管理服务',
    category: '物流合作',
    color: 'bg-gradient-to-br from-red-500 to-red-700',
    textColor: 'text-white',
  },
];

export function PartnersSection() {
  return (
    <section className="py-20 bg-secondary-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            生态伙伴
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            与全球顶级技术公司和供应链伙伴深度合作，为创作者和客户提供最优质的服务
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.name}
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
                {partner.name}
              </h3>
              <p className="text-xs text-secondary-500 mb-2">
                {partner.description}
              </p>
              <span className="inline-block px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-md">
                {partner.category}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

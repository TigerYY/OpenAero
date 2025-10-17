'use client';

import { motion } from 'framer-motion';

const stats = [
  {
    number: '500+',
    label: '活跃创作者',
    description: '来自全球的专业创作者',
  },
  {
    number: '¥2.5M+',
    label: '创作者收益',
    description: '累计为创作者创造的收益',
  },
  {
    number: '1000+',
    label: '认证解决方案',
    description: '经过专业认证的解决方案',
  },
  {
    number: '95%',
    label: '创作者满意度',
    description: '创作者对平台的满意度',
  },
];

const monthlyRevenue = [
  { month: '1月', revenue: 120000 },
  { month: '2月', revenue: 150000 },
  { month: '3月', revenue: 180000 },
  { month: '4月', revenue: 220000 },
  { month: '5月', revenue: 250000 },
  { month: '6月', revenue: 280000 },
];

export function CreatorStats() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            创作者成就
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            看看我们的创作者社区取得的辉煌成就
          </p>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl lg:text-5xl font-bold text-primary-600 mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-secondary-900 mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-secondary-600">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 收益增长图表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-primary-900 mb-2">
              创作者收益增长趋势
            </h3>
            <p className="text-primary-700">
              过去6个月创作者收益持续增长
            </p>
          </div>

          <div className="flex items-end justify-between h-64 space-x-2">
            {monthlyRevenue.map((data, index) => {
              const maxRevenue = Math.max(...monthlyRevenue.map(d => d.revenue));
              const height = (data.revenue / maxRevenue) * 200;
              
              return (
                <motion.div
                  key={data.month}
                  initial={{ height: 0 }}
                  whileInView={{ height }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex-1 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg relative group"
                >
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-primary-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    ¥{data.revenue.toLocaleString()}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-between mt-4 text-sm text-primary-700">
            {monthlyRevenue.map((data) => (
              <div key={data.month} className="text-center">
                {data.month}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

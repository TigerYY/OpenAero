'use client';

import { motion } from 'framer-motion';

const testimonials = [
  {
    name: '王工',
    role: 'FPV验证机创作者',
    avatar: '👨‍💻',
    content: '通过OpenAero平台，我的FPV验证机设计获得了巨大成功。平台的专业认证体系让用户更信任我的产品，70%的利润分成也让我获得了丰厚的回报。',
    revenue: '¥299,900',
    solutions: 3,
    rating: 5,
  },
  {
    name: '李工',
    role: '安防巡检专家',
    avatar: '👨‍🔬',
    content: '作为安防行业的专家，OpenAero为我提供了展示专业能力的平台。从方案提交到上线销售，整个过程都非常顺畅，技术支持也很到位。',
    revenue: '¥459,900',
    solutions: 2,
    rating: 5,
  },
  {
    name: '张工',
    role: '农业植保专家',
    avatar: '👨‍🌾',
    content: '我的农业植保套件在平台上获得了很好的反响。平台的数据分析功能帮助我了解用户需求，不断优化产品，销量持续增长。',
    revenue: '¥699,900',
    solutions: 4,
    rating: 5,
  },
];

export function CreatorTestimonials() {
  return (
    <section className="py-20 bg-secondary-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            创作者推荐
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            听听我们的成功创作者分享他们的经验
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              {/* 评分 */}
              <div className="flex items-center mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* 内容 */}
              <blockquote className="text-secondary-700 leading-relaxed mb-6">
                "{testimonial.content}"
              </blockquote>

              {/* 创作者信息 */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-2xl mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-secondary-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-secondary-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>

              {/* 成就数据 */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-secondary-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-success-600">
                    {testimonial.revenue}
                  </div>
                  <div className="text-xs text-secondary-600">累计收益</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary-600">
                    {testimonial.solutions}
                  </div>
                  <div className="text-xs text-secondary-600">解决方案</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 底部CTA */}
        <div className="text-center mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white"
          >
            <h3 className="text-2xl font-bold mb-4">
              加入我们的创作者社区
            </h3>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              与500+专业创作者一起，将您的创意转化为商业价值，开启您的成功之路
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary-600 hover:bg-primary-50 px-8 py-3 rounded-lg font-semibold transition-colors">
                立即申请
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 rounded-lg font-semibold transition-colors">
                了解更多
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

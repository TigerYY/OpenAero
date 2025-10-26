'use client';

import { motion } from 'framer-motion';

const processSteps = [
  {
    step: '01',
    title: '提交申请',
    description: '填写创作者申请表，提供个人简介、专业经验和作品展示',
    icon: '📝',
    duration: '1-2天',
  },
  {
    step: '02',
    title: '资质审核',
    description: '我们的团队将审核您的申请，评估您的专业能力和创作潜力',
    icon: '🔍',
    duration: '3-5天',
  },
  {
    step: '03',
    title: '认证通过',
    description: '审核通过后，您将获得创作者认证，可以开始提交解决方案',
    icon: '✅',
    duration: '即时',
  },
  {
    step: '04',
    title: '方案提交',
    description: '提交您的无人机解决方案，包括技术文档、BOM清单和测试报告',
    icon: '🚁',
    duration: '按需',
  },
  {
    step: '05',
    title: '专业审核',
    description: '技术团队对您的方案进行专业审核，确保技术可行性和市场价值',
    icon: '🔬',
    duration: '5-7天',
  },
  {
    step: '06',
    title: '上线销售',
    description: '审核通过后，您的解决方案将在平台上线，开始产生收益',
    icon: '💰',
    duration: '即时',
  },
];

export function CreatorProcess() {
  return (
    <section className="py-20 bg-secondary-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900 mb-4">
            申请流程
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            简单6步，开启您的创作者之旅
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {processSteps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
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
                  
                  <p className="text-secondary-600 leading-relaxed mb-4">
                    {step.description}
                  </p>
                  
                  <div className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full">
                    {step.duration}
                  </div>
                </div>

                {/* 连接线 */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary-200 to-transparent transform -translate-y-1/2"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 底部CTA */}
        <div className="text-center mt-12">
          <motion.div
            key="creator-process-cta"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-8 shadow-sm max-w-2xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-secondary-900 mb-4">
              准备好开始了吗？
            </h3>
            <p className="text-secondary-600 mb-6">
              立即提交创作者申请，开启您的商业化之路
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">
                立即申请
              </button>
              <button className="btn-outline">
                下载申请指南
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

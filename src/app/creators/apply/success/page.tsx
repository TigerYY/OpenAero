import Link from 'next/link';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';

export default function CreatorApplySuccessPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* 成功图标 */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 mb-6">
              <svg
                className="h-8 w-8 text-success-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* 成功信息 */}
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              申请提交成功！
            </h1>
            <p className="text-lg text-secondary-600 mb-8">
              感谢您申请成为开元空御创作者。我们已收到您的申请，将在3-5个工作日内完成审核。
            </p>

            {/* 后续步骤 */}
            <div className="bg-secondary-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                接下来会发生什么？
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-primary-600 text-sm font-medium">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">审核申请</p>
                    <p className="text-secondary-600 text-sm">我们的团队将仔细审核您的申请材料</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-primary-600 text-sm font-medium">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">发送通知</p>
                    <p className="text-secondary-600 text-sm">通过邮件通知您审核结果</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-primary-600 text-sm font-medium">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">开通权限</p>
                    <p className="text-secondary-600 text-sm">审核通过后，您将获得创作者权限和专属后台</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/solutions">
                  浏览解决方案
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/creators">
                  了解更多
                </Link>
              </Button>
            </div>

            {/* 联系信息 */}
            <div className="mt-8 pt-6 border-t border-secondary-200">
              <p className="text-secondary-600 text-sm">
                如有疑问，请联系我们的客服团队：
                <a href="mailto:support@openaero.cn" className="text-primary-600 hover:text-primary-700 ml-1">
                  support@openaero.cn
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

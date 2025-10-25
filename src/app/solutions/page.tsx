export const dynamic = 'force-dynamic';

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          解决方案
        </h1>
        <p className="text-gray-600 mb-6">
          解决方案功能正在开发中，敬请期待！
        </p>
        <div className="text-center">
          <a 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}

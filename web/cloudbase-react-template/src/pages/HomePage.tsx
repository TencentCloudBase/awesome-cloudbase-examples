const HomePage = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">欢迎使用 CloudBase</h1>
        <p className="text-lg text-gray-600">基于 React + Vite + Tailwind CSS，快速开始构建您的应用</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 font-semibold text-gray-900">数据库</h3>
          <p className="text-sm text-gray-600">使用 NoSQL 或 MySQL 存储数据</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 font-semibold text-gray-900">云函数</h3>
          <p className="text-sm text-gray-600">Serverless 后端逻辑</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 font-semibold text-gray-900">认证</h3>
          <p className="text-sm text-gray-600">内置多种登录方式</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

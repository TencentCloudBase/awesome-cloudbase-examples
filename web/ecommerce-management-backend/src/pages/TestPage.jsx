import React, { useState, useEffect } from 'react';
import { app, ensureLogin } from '../utils/cloudbase';

const TestPage = () => {
  const [status, setStatus] = useState('正在测试...');
  const [goods, setGoods] = useState([]);
  const [error, setError] = useState(null);

  const testCloudBase = async () => {
    try {
      setStatus('正在连接云开发...');
      
      // 测试登录
      await ensureLogin();
      setStatus('登录成功，正在获取数据...');
      
      // 测试数据库连接
      const db = app.database();
      const result = await db.collection('goods').limit(3).get();
      
      setGoods(result.data);
      setStatus(`成功获取到 ${result.data.length} 条商品数据`);
      
    } catch (err) {
      console.error('测试失败:', err);
      setError(err.message);
      setStatus('测试失败');
    }
  };

  useEffect(() => {
    testCloudBase();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">云开发连接测试</h1>
      
      <div className="mb-4">
        <p className="text-lg">状态: {status}</p>
        {error && (
          <p className="text-red-500 mt-2">错误: {error}</p>
        )}
      </div>

      {goods.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">获取到的商品数据:</h2>
          <div className="space-y-2">
            {goods.map((item, index) => (
              <div key={index} className="p-3 border rounded">
                <p><strong>商品名称:</strong> {item.goodName}</p>
                <p><strong>SKU:</strong> {item.sku}</p>
                <p><strong>价格:</strong> ¥{item.price}</p>
                <p><strong>状态:</strong> {item.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={testCloudBase}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        重新测试
      </button>
    </div>
  );
};

export default TestPage;

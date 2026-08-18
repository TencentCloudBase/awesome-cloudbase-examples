import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameModePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍳 胡闹厨房</h1>
          <p className="text-gray-600">选择游戏模式开始你的烹饪之旅！</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 单机模式 */}
          <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-4 border-orange-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">单机模式</h3>
              <p className="text-gray-600 mb-6">独自挑战，磨练你的烹饪技巧</p>
              <ul className="text-sm text-gray-700 mb-6 space-y-1">
                <li>• 专注个人技能提升</li>
                <li>• 掌握游戏基础操作</li>
                <li>• 熟悉各种料理制作</li>
                <li>• 挑战高分记录</li>
              </ul>
              <button
                onClick={() => navigate('/game-single')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                开始单机游戏
              </button>
            </div>
          </div>

          {/* 联机模式 */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-4 border-blue-400">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">联机模式</h3>
              <p className="text-gray-600 mb-6">与朋友合作，共同完成订单</p>
              <ul className="text-sm text-gray-700 mb-6 space-y-1">
                <li>• 2人合作烹饪</li>
                <li>• 实时同步游戏状态</li>
                <li>• 分工协作提高效率</li>
                <li>• 体验团队合作乐趣</li>
              </ul>
              <button
                onClick={() => navigate('/multiplayer')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                进入联机大厅
              </button>
            </div>
          </div>

          {/* 排行榜 */}
          <div className="bg-gradient-to-br from-purple-100 to-pink-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-4 border-purple-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">排行榜</h3>
              <p className="text-gray-600 mb-6">查看全服最强厨师排名</p>
              <ul className="text-sm text-gray-700 mb-6 space-y-1">
                <li>• 单人模式排行榜</li>
                <li>• 联机模式排行榜</li>
                <li>• 段位系统展示</li>
                <li>• 挑战更高排名</li>
              </ul>
              <button
                onClick={() => navigate('/leaderboard')}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                查看排行榜
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            ← 返回首页
          </button>
        </div>

        {/* 游戏说明 */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-3">🎮 游戏操作说明</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p><strong>移动:</strong> WASD 或 方向键</p>
              <p><strong>拾取/放置:</strong> 空格键</p>
              <p><strong>交互:</strong> E键（使用工作台/洗碗/灭火）</p>
            </div>
            <div>
              <p><strong>放置到地面:</strong> Q键</p>
              <p><strong>目标:</strong> 按订单制作料理并出餐</p>
              <p><strong>注意:</strong> 避免食物烤糊着火</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModePage; 
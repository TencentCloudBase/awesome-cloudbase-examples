import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const GameHomePage = () => {
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 relative overflow-hidden">
      {/* 像素风背景装饰 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-8 h-8 bg-yellow-300 transform rotate-45"></div>
        <div className="absolute top-20 right-20 w-6 h-6 bg-green-300 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-10 h-10 bg-blue-300 transform rotate-12"></div>
        <div className="absolute bottom-10 right-10 w-12 h-12 bg-purple-300 rounded-lg"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 pixel-font drop-shadow-lg">
            🍳 胡闹厨房
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold">
            合作烹饪，混乱有趣！
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {/* 单机模式 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-4 border-yellow-400"
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👨‍🍳</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">单机模式</h2>
              <p className="text-gray-600">独自挑战厨房混乱</p>
            </div>
            
            <div className="space-y-4">
              <Link 
                to="/game-single"
                className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl text-center text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🎮 开始游戏
              </Link>
              
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">游戏特色：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 多种厨房关卡</li>
                  <li>• 限时烹饪挑战</li>
                  <li>• 像素风格画面</li>
                  <li>• 简单易上手操作</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* 联机模式 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-4 border-blue-400"
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">联机模式</h2>
              <p className="text-gray-600">与朋友一起合作</p>
            </div>
            
            <div className="space-y-4">
              <Link 
                to="/multiplayer"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl text-center text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🏠 进入联机大厅
              </Link>
              
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">联机特色：</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 实时多人协作</li>
                  <li>• 云开发实时推送</li>
                  <li>• 房间系统</li>
                  <li>• 语音聊天支持</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* 排行榜入口 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-4 border-purple-400"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">排行榜</h2>
              <p className="text-gray-600 mb-6">查看全服最强厨师排名，挑战更高段位！</p>
              
              <Link 
                to="/leaderboard"
                className="block w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl text-center text-lg transition-all duration-200 transform hover:scale-105 shadow-lg mb-4"
              >
                🎯 查看排名
              </Link>
              
              <div className="space-y-2 text-sm">
                <div className="bg-purple-100 rounded-lg p-3">
                  <div className="font-bold text-purple-700">单人排行榜</div>
                  <div className="text-purple-600">个人实力展示</div>
                </div>
                <div className="bg-pink-100 rounded-lg p-3">
                  <div className="font-bold text-pink-700">联机排行榜</div>
                  <div className="text-pink-600">团队协作能力</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 游戏说明 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl"
        >
          <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">🎯 游戏玩法</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-bold mb-2">基础操作：</h4>
              <ul className="space-y-1">
                <li>• WASD 移动角色</li>
                <li>• 空格键 拾取/放下</li>
                <li>• E键 交互/使用</li>
                <li>• Q键 丢弃物品</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">游戏目标：</h4>
              <ul className="space-y-1">
                <li>• 完成客户订单</li>
                <li>• 合理分工协作</li>
                <li>• 在限时内达成目标</li>
                <li>• 获得高分评价</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .pixel-font {
          font-family: 'Courier New', monospace;
          text-shadow: 4px 4px 0px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default GameHomePage; 
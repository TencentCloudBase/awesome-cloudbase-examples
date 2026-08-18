import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import cloudbase from '../utils/cloudbase';

// 段位配置
const RANK_SYSTEM = [
  { name: '新手厨师', minScore: 0, color: 'text-gray-600', icon: '👨‍🍳', bgColor: 'bg-gray-100' },
  { name: '学徒厨师', minScore: 100, color: 'text-green-600', icon: '🧑‍🍳', bgColor: 'bg-green-100' },
  { name: '熟练厨师', minScore: 300, color: 'text-blue-600', icon: '👩‍🍳', bgColor: 'bg-blue-100' },
  { name: '高级厨师', minScore: 600, color: 'text-purple-600', icon: '🍳', bgColor: 'bg-purple-100' },
  { name: '主厨', minScore: 1000, color: 'text-orange-600', icon: '👨‍🍳‍', bgColor: 'bg-orange-100' },
  { name: '料理大师', minScore: 1500, color: 'text-red-600', icon: '🏆', bgColor: 'bg-red-100' },
  { name: '传奇厨神', minScore: 2500, color: 'text-yellow-600', icon: '⭐', bgColor: 'bg-yellow-100' },
];

// 获取段位信息
const getRankInfo = (score) => {
  for (let i = RANK_SYSTEM.length - 1; i >= 0; i--) {
    if (score >= RANK_SYSTEM[i].minScore) {
      return RANK_SYSTEM[i];
    }
  }
  return RANK_SYSTEM[0];
};

// 获取下一段位信息
const getNextRankInfo = (score) => {
  const currentRank = getRankInfo(score);
  const currentIndex = RANK_SYSTEM.findIndex(rank => rank.name === currentRank.name);
  if (currentIndex < RANK_SYSTEM.length - 1) {
    return RANK_SYSTEM[currentIndex + 1];
  }
  return null;
};

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState(null);

  // 获取排行榜数据
  const fetchLeaderboard = async (mode) => {
    try {
      setLoading(true);
      setError(null);

      // 确保用户已登录
      await cloudbase.ensureLogin();
      
      // 调用云函数获取排行榜
      const result = await cloudbase.callFunction({
        name: 'getLeaderboard',
        data: { mode }
      });

      if (result.result.success) {
        setLeaderboard(result.result.data.leaderboard || []);
        setUserStats(result.result.data.userStats || null);
      } else {
        setError(result.result.message || '获取排行榜失败');
      }
    } catch (err) {
      console.error('获取排行榜失败:', err);
      setError('网络错误，请稍后重试');
      // 设置模拟数据用于演示
      setLeaderboard([
        { userId: 'user1', nickname: '料理高手', score: 2800, rank: 1, gamesPlayed: 150 },
        { userId: 'user2', nickname: '厨房达人', score: 2350, rank: 2, gamesPlayed: 120 },
        { userId: 'user3', nickname: '烹饪大师', score: 1980, rank: 3, gamesPlayed: 98 },
        { userId: 'user4', nickname: '美食专家', score: 1750, rank: 4, gamesPlayed: 85 },
        { userId: 'user5', nickname: '厨艺新星', score: 1520, rank: 5, gamesPlayed: 67 },
      ]);
      setUserStats({ score: 1200, rank: 15, gamesPlayed: 45 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🏆 排行榜
          </h1>
          <p className="text-xl text-white/90">
            展示最强厨师的荣耀时刻
          </p>
        </motion.div>

        {/* 返回按钮 */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Link 
            to="/overcooked-game"
            className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200"
          >
            ← 返回游戏主页
          </Link>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* 模式切换标签 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2">
              <button
                onClick={() => handleTabChange('single')}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                  activeTab === 'single'
                    ? 'bg-white text-orange-600 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                👨‍🍳 单人模式
              </button>
              <button
                onClick={() => handleTabChange('multiplayer')}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                  activeTab === 'multiplayer'
                    ? 'bg-white text-orange-600 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                👥 联机模式
              </button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 用户个人统计 */}
            {userStats && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="lg:col-span-1"
              >
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                    🎯 我的战绩
                  </h3>
                  
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full ${getRankInfo(userStats.score).bgColor} ${getRankInfo(userStats.score).color} font-bold text-lg mb-2`}>
                      <span className="mr-2">{getRankInfo(userStats.score).icon}</span>
                      {getRankInfo(userStats.score).name}
                    </div>
                    <div className="text-3xl font-bold text-gray-800">{userStats.score} 分</div>
                    <div className="text-gray-600">排名: #{userStats.rank}</div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                      <span className="text-gray-700">游戏场次</span>
                      <span className="font-bold text-gray-800">{userStats.gamesPlayed}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                      <span className="text-gray-700">平均得分</span>
                      <span className="font-bold text-gray-800">
                        {Math.round(userStats.score / userStats.gamesPlayed)}
                      </span>
                    </div>

                    {/* 段位进度 */}
                    {getNextRankInfo(userStats.score) && (
                      <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700">距离下一段位</span>
                          <span className="font-bold text-purple-600">
                            {getNextRankInfo(userStats.score).name}
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, ((userStats.score - getRankInfo(userStats.score).minScore) / (getNextRankInfo(userStats.score).minScore - getRankInfo(userStats.score).minScore)) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {getNextRankInfo(userStats.score).minScore - userStats.score} 分升级
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 排行榜主体 */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={userStats ? "lg:col-span-2" : "lg:col-span-3"}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  {activeTab === 'single' ? '👨‍🍳 单人模式排行榜' : '👥 联机模式排行榜'}
                </h3>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
                    <p className="text-gray-600">加载排行榜数据中...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 mb-4">⚠️ {error}</div>
                    <button 
                      onClick={() => fetchLeaderboard(activeTab)}
                      className="btn btn-primary"
                    >
                      重新加载
                    </button>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🍳</div>
                    <p className="text-gray-600">暂无排行榜数据</p>
                    <p className="text-sm text-gray-500 mt-2">
                      快去游戏中创造属于你的传奇吧！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((player, index) => {
                      const rankInfo = getRankInfo(player.score);
                      const isTopThree = index < 3;
                      
                      return (
                        <motion.div
                          key={player.userId}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`flex items-center p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
                            isTopThree 
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          {/* 排名 */}
                          <div className="flex items-center justify-center w-12 h-12 mr-4">
                            {index === 0 && (
                              <div className="text-3xl">🥇</div>
                            )}
                            {index === 1 && (
                              <div className="text-3xl">🥈</div>
                            )}
                            {index === 2 && (
                              <div className="text-3xl">🥉</div>
                            )}
                            {index >= 3 && (
                              <div className="text-xl font-bold text-gray-600">
                                #{index + 1}
                              </div>
                            )}
                          </div>

                          {/* 玩家信息 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-lg text-gray-800">
                                {player.nickname || `玩家${player.userId.slice(-4)}`}
                              </div>
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${rankInfo.bgColor} ${rankInfo.color}`}>
                                <span className="mr-1">{rankInfo.icon}</span>
                                {rankInfo.name}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              游戏场次: {player.gamesPlayed} | 平均得分: {Math.round(player.score / player.gamesPlayed)}
                            </div>
                          </div>

                          {/* 分数 */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-800">
                              {player.score.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">积分</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* 段位说明 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                🏅 段位系统
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {RANK_SYSTEM.map((rank, index) => (
                  <div 
                    key={index}
                    className={`text-center p-3 rounded-lg ${rank.bgColor} border-2 border-transparent hover:border-gray-300 transition-all duration-200`}
                  >
                    <div className="text-2xl mb-2">{rank.icon}</div>
                    <div className={`font-bold text-sm ${rank.color}`}>
                      {rank.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {rank.minScore}+ 分
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage; 
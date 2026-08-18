import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const RoomPage = () => {
  const navigate = useNavigate();
  const { action, roomId } = useParams(); // action: 'create' or 'join'
  
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameReady, setGameReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 根据路由参数判断是创建房间还是加入房间
    if (action === 'create') {
      createRoom();
    } else if (action === 'join' && roomId) {
      setRoomCode(roomId);
      // 这里后续会集成云开发实时推送来加入房间
    }
  }, [action, roomId]);

  const createRoom = async () => {
    setLoading(true);
    try {
      // 生成房间号
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(newRoomCode);
      setIsHost(true);
      
      // 后续这里会集成云开发数据库和实时推送
      // 创建房间记录到数据库
      // await cloudbase.database().collection('game_rooms').add({
      //   roomCode: newRoomCode,
      //   hostId: 'current_user_id',
      //   players: [],
      //   status: 'waiting',
      //   createdAt: new Date()
      // });
      
      setPlayers([{ id: 'host', name: playerName || '房主', isHost: true, ready: false }]);
      setError('');
    } catch (err) {
      setError('创建房间失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('请输入房间号和玩家昵称');
      return;
    }

    setLoading(true);
    try {
      // 后续这里会集成云开发数据库查询和实时推送
      // const roomDoc = await cloudbase.database().collection('game_rooms')
      //   .where({ roomCode: roomCode.toUpperCase() }).get();
      
      // 模拟加入房间成功
      setPlayers([
        { id: 'host', name: '房主', isHost: true, ready: true },
        { id: 'player2', name: playerName, isHost: false, ready: false }
      ]);
      setError('');
    } catch (err) {
      setError('加入房间失败，请检查房间号');
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = () => {
    // 后续集成云开发实时推送来同步准备状态
    setPlayers(prev => prev.map(player => 
      player.id === (isHost ? 'host' : 'player2') 
        ? { ...player, ready: !player.ready }
        : player
    ));
  };

  const startGame = () => {
    if (isHost && players.every(p => p.ready)) {
      // 后续这里会通过云开发实时推送通知所有玩家开始游戏
      navigate('/game/multiplayer');
    }
  };

  const leaveRoom = () => {
    // 后续这里会清理云开发数据库中的房间数据
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* 标题栏 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <button
            onClick={leaveRoom}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ← 离开房间
          </button>
          <h1 className="text-3xl font-bold text-white">
            {action === 'create' ? '🏠 创建房间' : '🚪 加入房间'}
          </h1>
          <div className="w-20"></div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 房间信息 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">房间信息</h2>
            
            {roomCode ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">房间号</p>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <span className="text-3xl font-mono font-bold text-blue-600">{roomCode}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">分享此房间号给朋友</p>
                </div>

                {!isHost && (
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">玩家昵称</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="输入你的昵称"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      maxLength={10}
                    />
                  </div>
                )}

                {!players.length && !isHost && (
                  <button
                    onClick={joinRoom}
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    {loading ? '加入中...' : '加入房间'}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">正在创建房间...</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </motion.div>

          {/* 玩家列表 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              玩家列表 ({players.length}/2)
            </h2>

            <div className="space-y-4">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    player.ready 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      player.ready ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="font-semibold text-gray-800">
                      {player.name}
                      {player.isHost && ' 👑'}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    player.ready 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {player.ready ? '已准备' : '未准备'}
                  </span>
                </div>
              ))}

              {/* 空位显示 */}
              {players.length < 2 && (
                <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                  <span className="text-gray-500">等待玩家加入...</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            {players.length > 0 && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={toggleReady}
                  className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-200 ${
                    players.find(p => p.id === (isHost ? 'host' : 'player2'))?.ready
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {players.find(p => p.id === (isHost ? 'host' : 'player2'))?.ready ? '取消准备' : '准备就绪'}
                </button>

                {isHost && (
                  <button
                    onClick={startGame}
                    disabled={!players.every(p => p.ready) || players.length < 2}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    {players.length < 2 ? '等待玩家加入' : 
                     players.every(p => p.ready) ? '开始游戏' : '等待所有玩家准备'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* 功能说明 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">💡 联机模式说明</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-bold mb-2 text-blue-600">房间功能：</h4>
              <ul className="space-y-1">
                <li>• 支持2人联机合作</li>
                <li>• 实时同步游戏状态</li>
                <li>• 房间号分享邀请</li>
                <li>• 准备状态确认</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2 text-green-600">合作玩法：</h4>
              <ul className="space-y-1">
                <li>• 分工协作完成订单</li>
                <li>• 实时语音沟通（待开发）</li>
                <li>• 共享分数排行榜</li>
                <li>• 更高难度挑战</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RoomPage; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import multiplayerManager from '../utils/multiplayerManager';

const MultiplayerLobby = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('menu'); // menu, create, join, waiting
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 监听房间状态变化
    const handleRoomStateChanged = ({ newState }) => {
      setRoomData(newState);
      
      // 如果游戏开始，跳转到游戏页面
      if (newState.status === 'playing') {
        navigate('/multiplayer-game');
      }
    };

    multiplayerManager.on('roomStateChanged', handleRoomStateChanged);

    return () => {
      multiplayerManager.off('roomStateChanged', handleRoomStateChanged);
    };
  }, [navigate]);

  // 创建房间
  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    setLoading(true);
    setError('');

    try {
      multiplayerManager.setPlayerInfo(nickname.trim());
      const result = await multiplayerManager.createRoom();

      if (result.success) {
        setRoomData(result.roomData);
        setCurrentView('waiting');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('创建房间失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加入房间
  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (!roomCode.trim()) {
      setError('请输入房间码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      multiplayerManager.setPlayerInfo(nickname.trim());
      const result = await multiplayerManager.joinRoom(roomCode.trim().toUpperCase());

      if (result.success) {
        setRoomData(result.roomData);
        setCurrentView('waiting');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('加入房间失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 开始游戏
  const handleStartGame = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await multiplayerManager.startGame();
      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      setError('开始游戏失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 离开房间
  const handleLeaveRoom = async () => {
    setLoading(true);
    try {
      await multiplayerManager.leaveRoom();
      setCurrentView('menu');
      setRoomData(null);
      setError('');
    } catch (error) {
      setError('离开房间失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 返回主菜单
  const handleBackToMenu = () => {
    setCurrentView('menu');
    setError('');
    setRoomCode('');
  };

  // 主菜单视图
  const renderMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍳 联机厨房</h1>
          <p className="text-gray-600">与朋友一起烹饪美食！</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              玩家昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setCurrentView('create')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🏠 创建房间
          </button>
          
          <button
            onClick={() => setCurrentView('join')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🚪 加入房间
          </button>
          
          <button
            onClick={() => navigate('/overcooked-game')}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ← 返回游戏选择
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // 创建房间视图
  const renderCreate = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🏠 创建房间</h2>
          <p className="text-gray-600">创建一个新的游戏房间</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              玩家昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? '创建中...' : '🚀 创建房间'}
          </button>
          
          <button
            onClick={handleBackToMenu}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ← 返回
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // 加入房间视图
  const renderJoin = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🚪 加入房间</h2>
          <p className="text-gray-600">输入房间码加入游戏</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              玩家昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              房间码
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="输入6位房间码"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              maxLength={6}
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? '加入中...' : '🎯 加入房间'}
          </button>
          
          <button
            onClick={handleBackToMenu}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            ← 返回
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // 等待房间视图
  const renderWaiting = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🎮 游戏房间</h2>
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">房间码</p>
            <p className="text-3xl font-mono font-bold text-orange-600">{roomData?.roomCode}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            玩家列表 ({roomData?.currentPlayers}/{roomData?.maxPlayers})
          </h3>
          <div className="space-y-2">
            {roomData?.players?.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {index + 1}
                  </div>
                  <span className="font-medium">{player.nickname}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {player.isHost && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      房主
                    </span>
                  )}
                  {player.playerId === multiplayerManager.playerId && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      你
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {multiplayerManager.isRoomHost() && roomData?.currentPlayers >= 2 && (
            <button
              onClick={handleStartGame}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '启动中...' : '🚀 开始游戏'}
            </button>
          )}
          
          {multiplayerManager.isRoomHost() && roomData?.currentPlayers < 2 && (
            <div className="text-center p-4 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800">等待其他玩家加入...</p>
            </div>
          )}
          
          {!multiplayerManager.isRoomHost() && (
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <p className="text-blue-800">等待房主开始游戏...</p>
            </div>
          )}
          
          <button
            onClick={handleLeaveRoom}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🚪 离开房间
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // 根据当前视图渲染对应组件
  switch (currentView) {
    case 'create':
      return renderCreate();
    case 'join':
      return renderJoin();
    case 'waiting':
      return renderWaiting();
    default:
      return renderMenu();
  }
};

export default MultiplayerLobby; 
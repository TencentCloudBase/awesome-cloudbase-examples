import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import GameScene from '../game/GameScene';

const GamePage = ({ mode = 'single' }) => {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);
  const navigate = useNavigate();
  const [gameInfo, setGameInfo] = useState({
    currentOrder: null,
    score: 0,
    timeLeft: 180,
    completedOrders: 0,
    playerHolding: null,
    recipeSteps: ''
  });

  useEffect(() => {
    if (phaserGameRef.current) {
      return;
    }

    // 创建自定义的GameScene类，预设游戏模式
    class CustomGameScene extends GameScene {
      constructor() {
        super();
        this.gameMode = mode; // 在构造函数中设置游戏模式
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      backgroundColor: '#2c3e50',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [CustomGameScene]
    };

    phaserGameRef.current = new Phaser.Game(config);

    // 监听游戏状态更新
    const handleGameUpdate = (event) => {
      setGameInfo(event.detail);
    };

    // 监听返回菜单事件
    const handleReturnToMenu = (event) => {
      console.log('🔄 收到返回菜单事件:', event.detail);
      handleBackToMenu();
    };

    window.addEventListener('gameStateUpdate', handleGameUpdate);
    window.addEventListener('returnToMenu', handleReturnToMenu);

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      window.removeEventListener('gameStateUpdate', handleGameUpdate);
      window.removeEventListener('returnToMenu', handleReturnToMenu);
    };
  }, [mode]);

  const handleBackToMenu = () => {
    if (mode === 'multiplayer') {
      // 联机模式返回联机大厅
      navigate('/multiplayer');
    } else {
      // 单机模式返回游戏模式选择页面
      navigate('/overcooked-game');
    }
  };

  const getIngredientDisplayName = (type) => {
    const displayNames = {
      tomato: '番茄',
      lettuce: '生菜',
      bread: '面包',
      chopped_tomato: '切好的番茄',
      chopped_lettuce: '切好的生菜',
      cooked_tomato: '烹饪番茄',
      cooked_lettuce: '烹饪生菜',
      burnt_tomato: '烤糊的番茄',
      burnt_lettuce: '烤糊的生菜',
      prepared_plate: '装好的盘子',
      plate: '干净盘子',
      dirty_plate: '脏盘子',
    };
    return displayNames[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      {/* 游戏标题栏 */}
      <div className="w-full mb-4 flex justify-between items-center">
        <button
          onClick={handleBackToMenu}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          ← 返回菜单
        </button>
        <h1 className="text-2xl font-bold text-white">
          {mode === 'multiplayer' ? '🍳 联机厨房' : '🍳 单机厨房'}
        </h1>
        <div className="w-20 text-sm text-gray-600">
          {mode === 'multiplayer' ? '与朋友合作烹饪' : '独自挑战'}
        </div>
      </div>

      {/* 主游戏区域 */}
      <div className="flex-1 flex gap-4 max-w-7xl mx-auto w-full">
        {/* 左侧信息面板 */}
        <div className="w-64 bg-gray-800 rounded-lg p-4 text-white space-y-4">
          <h3 className="text-lg font-bold text-yellow-400 border-b border-gray-600 pb-2">📊 游戏状态</h3>
          
          <div className="space-y-2">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-yellow-300 font-bold">分数: {gameInfo.score}</div>
              <div className="text-red-300">时间: {gameInfo.timeLeft}秒</div>
              <div className="text-green-300">完成: {gameInfo.completedOrders}单</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-blue-400">当前手持:</h4>
            <div className="bg-gray-700 p-2 rounded text-sm">
              {gameInfo.playerHolding ? getIngredientDisplayName(gameInfo.playerHolding) : '无'}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-purple-400">🎮 操作说明:</h4>
            <div className="text-xs space-y-1">
              <div><span className="bg-gray-700 px-2 py-1 rounded">WASD</span> 移动</div>
              <div><span className="bg-gray-700 px-2 py-1 rounded">空格</span> 拾取/放下/出餐</div>
              <div><span className="bg-gray-700 px-2 py-1 rounded">E</span> 使用工作台/洗碗</div>
              <div><span className="bg-gray-700 px-2 py-1 rounded">Q</span> 放置到地面</div>
            </div>
          </div>
        </div>

        {/* 中间游戏画面 */}
        <div className="flex-1 flex justify-center items-center">
          <div className="bg-black rounded-lg shadow-2xl overflow-hidden border-4 border-gray-700">
            <div 
              ref={gameRef} 
              id="phaser-game-container"
              style={{ 
                width: '800px', 
                height: '600px',
                display: 'block',
                position: 'relative'
              }}
            >
            </div>
          </div>
        </div>

        {/* 右侧订单信息面板 */}
        <div className="w-80 bg-gray-800 rounded-lg p-4 text-white space-y-4">
          <h3 className="text-lg font-bold text-green-400 border-b border-gray-600 pb-2">📋 当前订单</h3>
          
          {gameInfo.currentOrder ? (
            <div className="space-y-3">
              <div className="bg-green-900 p-3 rounded border border-green-600">
                <div className="font-bold text-green-300">{gameInfo.currentOrder.name}</div>
                <div className="text-yellow-300">奖励: {gameInfo.currentOrder.points}分</div>
                <div className="text-red-300">剩余: {gameInfo.currentOrder.timeRemaining}秒</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-orange-400">🥗 所需食材:</h4>
                <div className="bg-gray-700 p-3 rounded">
                  {gameInfo.currentOrder.ingredients?.map((ingredient, index) => (
                    <div key={index} className="text-sm">
                      • {getIngredientDisplayName(ingredient)}
                    </div>
                  ))}
                </div>
              </div>

              {gameInfo.recipeSteps && (
                <div className="space-y-2">
                  <h4 className="font-bold text-cyan-400">📝 制作步骤:</h4>
                  <div className="bg-gray-700 p-3 rounded text-sm leading-relaxed">
                    {gameInfo.recipeSteps}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-700 p-4 rounded text-center text-gray-400">
              等待订单中...
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-red-400">⚠️ 重要提示:</h4>
            <div className="bg-red-900 p-3 rounded text-sm space-y-1">
              <div>• 烹饪超过6秒会烤糊</div>
              <div>• 烤糊食物需丢到垃圾桶</div>
              <div>• 完成订单后清洗脏盘子</div>
              <div>• 合理安排时间避免浪费</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage; 
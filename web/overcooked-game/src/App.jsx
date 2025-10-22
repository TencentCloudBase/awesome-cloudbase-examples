import { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import cloudbase from './utils/cloudbase'
import GamePage from './pages/GamePage'
import GameModePage from './pages/GameModePage'
import LeaderboardPage from './pages/LeaderboardPage'
import Footer from './components/Footer'
import MultiplayerLobby from './pages/MultiplayerLobby'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初始化登录
    const initAuth = async () => {
      try {
        console.log('开始登录...');
        await cloudbase.ensureLogin()
        console.log('登录成功');
        setIsLoggedIn(true)
      } catch (error) {
        console.error('登录失败', error)
      } finally {
        console.log('设置loading状态为false');
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="ml-2">加载中...</p>
      </div>
    )
  }

  console.log('渲染主应用UI');
  
  return (
    <Router>
          <Routes>
            {/* 首页直接跳转到游戏模式选择页面 */}
            <Route path="/" element={<Navigate to="/overcooked-game" replace />} />
            
            {/* 游戏入口 - 模式选择页面 */}
            <Route path="/overcooked-game" element={<GameModePage />} />
            
            {/* 单机游戏 */}
            <Route path="/game-single" element={<GamePage mode="single" />} />
            
            {/* 联机相关 */}
            <Route path="/multiplayer" element={<MultiplayerLobby />} />
            <Route path="/multiplayer-game" element={<GamePage mode="multiplayer" />} />
            
            {/* 排行榜 */}
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            
            {/* 可以在这里添加新的路由 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        <Footer />
    </Router>
  )
}

export default App

import { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import cloudbase from './utils/cloudbase'
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import GoodsPage from './pages/GoodsPage'
import UsersPage from './pages/UsersPage'
import OrdersPage from './pages/OrdersPage'
import PromotionsPage from './pages/PromotionsPage'
import TestPage from './pages/TestPage'
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
      <AdminLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goods" element={<GoodsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AdminLayout>
    </Router>
  )
}

export default App

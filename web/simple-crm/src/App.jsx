import { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import cloudbase from './utils/cloudbase'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomerPage from './pages/CustomerPage'
import InteractionPage from './pages/InteractionPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AuthGuard from './components/AuthGuard'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: null, // null: 检查中, true: 已登录, false: 未登录
    user: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const checkAuthState = async () => {
      try {
        const loginState = await cloudbase.getLoginState();

        if (loginState && loginState.user) {
          // 检查是否为真实用户登录（非匿名）
          const isRealUser = !loginState.user.isAnonymous && !loginState.user.isOffline;
          setAuthState({
            isAuthenticated: isRealUser,
            user: isRealUser ? loginState.user : null
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null
          });
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
        setAuthState({
          isAuthenticated: false,
          user: null
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const handleLoginSuccess = (loginState) => {
    setAuthState({
      isAuthenticated: true,
      user: loginState.user
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">初始化应用...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <Routes>
            {/* 首页路由 */}
            <Route
              path="/"
              element={
                authState.isAuthenticated ?
                  <Navigate to="/dashboard" replace /> :
                  <HomePage />
              }
            />

            {/* 登录页面 */}
            <Route
              path="/login"
              element={
                authState.isAuthenticated ?
                  <Navigate to="/dashboard" replace /> :
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
              }
            />

            {/* 主控制台 - 需要登录 */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              }
            />

            {/* 客户管理 - 需要登录 */}
            <Route
              path="/customers"
              element={
                <AuthGuard>
                  <CustomerPage />
                </AuthGuard>
              }
            />

            {/* 互动记录 - 需要登录 */}
            <Route
              path="/interactions"
              element={
                <AuthGuard>
                  <InteractionPage />
                </AuthGuard>
              }
            />

            {/* 数据可视化 - 需要登录 */}
            <Route
              path="/analytics"
              element={
                <AuthGuard>
                  <AnalyticsPage />
                </AuthGuard>
              }
            />

            {/* 其他受保护的路由可以在这里添加 */}

            {/* 404 处理 */}
            <Route
              path="*"
              element={
                authState.isAuthenticated ?
                  <Navigate to="/dashboard" replace /> :
                  <Navigate to="/" replace />
              }
            />
          </Routes>
        </main>

        {/* 只在首页显示Footer */}
        {!authState.isAuthenticated && <Footer />}
      </div>
    </Router>
  );
}

export default App

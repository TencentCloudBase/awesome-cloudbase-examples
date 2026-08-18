import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import cloudbase from '../utils/cloudbase';

/**
 * 认证守卫组件
 * 用于保护需要登录才能访问的页面
 */
const AuthGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null: 检查中, true: 已登录, false: 未登录
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loginState = await cloudbase.getLoginState();
        
        if (loginState && loginState.user) {
          // 检查是否为真实用户登录（非匿名）
          const isRealUser = !loginState.user.isAnonymous && !loginState.user.isOffline;
          setIsAuthenticated(isRealUser);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('检查认证状态失败:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 正在检查认证状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  // 已登录，渲染子组件
  return children;
};

export default AuthGuard;

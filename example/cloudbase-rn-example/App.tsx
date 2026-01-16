import React, {useState, useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import ConfigScreen from './src/screens/ConfigScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TestScreen from './src/screens/TestScreen';
import useAuth from './src/hooks/useAuth';
import {isConfigured, initCloudbase} from './src/config/cloudbase';

type Screen = 'profile' | 'test';

const App: React.FC = () => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const {isLoggedIn, user, loading, logout, refreshUser} = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('profile');

  // 检查是否已配置
  useEffect(() => {
    const checkConfig = () => {
      if (isConfigured()) {
        try {
          initCloudbase();
          setConfigured(true);
        } catch {
          setConfigured(false);
        }
      } else {
        setConfigured(false);
      }
    };
    checkConfig();
  }, []);

  // 检查配置中
  if (configured === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  // 未配置，显示配置页面（配置后立即生效）
  if (!configured) {
    return <ConfigScreen onConfigured={() => setConfigured(true)} />;
  }

  // 初始加载状态
  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  // 已登录
  if (isLoggedIn && user) {
    // 测试页面
    if (currentScreen === 'test') {
      return <TestScreen onBack={() => setCurrentScreen('profile')} />;
    }

    // 用户信息页面
    return (
      <ProfileScreen
        user={user}
        loading={loading}
        onLogout={logout}
        onRefresh={refreshUser}
        onNavigateToTest={() => setCurrentScreen('test')}
      />
    );
  }

  // 未登录显示登录页面
  return <LoginScreen onLoginSuccess={refreshUser} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default App;

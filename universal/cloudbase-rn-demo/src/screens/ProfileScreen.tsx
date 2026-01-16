import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {UserInfo} from '../types/auth';

interface ProfileScreenProps {
  user: UserInfo;
  loading: boolean;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onNavigateToTest?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  loading,
  onLogout,
  onRefresh,
  onNavigateToTest,
}) => {
  const handleLogout = async () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            await onLogout();
          } catch (e) {
            Alert.alert('错误', '退出登录失败');
          }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
      Alert.alert('成功', '用户信息已刷新');
    } catch (e) {
      Alert.alert('错误', '刷新失败');
    }
  };

  // 获取性别显示文本
  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'MALE':
        return '男';
      case 'FEMALE':
        return '女';
      default:
        return '未设置';
    }
  };

  // 获取用户显示名称
  const getDisplayName = () => {
    if (user.is_anonymous) {
      return '匿名用户';
    }
    return user.nickname || user.username || user.email || user.phone || '未设置昵称';
  };

  // 获取头像 URI
  const getAvatarUri = () => {
    if (user.avatar_url) {
      return {uri: user.avatar_url};
    }
    return null;
  };

  // 获取用户首字母
  const getAvatarLetter = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 用户头像和基本信息 */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {getAvatarUri() ? (
              <Image source={getAvatarUri()!} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  user.is_anonymous && styles.avatarAnonymous,
                ]}>
                <Text style={styles.avatarText}>{getAvatarLetter()}</Text>
              </View>
            )}
            {user.is_anonymous && (
              <View style={styles.anonymousBadge}>
                <Text style={styles.anonymousBadgeText}>匿名</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{getDisplayName()}</Text>
          <Text style={styles.userId}>ID: {user.id}</Text>
        </View>

        {/* 用户详细信息卡片 */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>账号信息</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>用户ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {user.id}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>用户名</Text>
            <Text style={styles.infoValue}>{user.username || '未设置'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>昵称</Text>
            <Text style={styles.infoValue}>{user.nickname || '未设置'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>手机号</Text>
            <Text style={styles.infoValue}>{user.phone || '未绑定'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>邮箱</Text>
            <Text style={styles.infoValue}>{user.email || '未绑定'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>性别</Text>
            <Text style={styles.infoValue}>{getGenderText(user.gender)}</Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>账号类型</Text>
            <Text
              style={[
                styles.infoValue,
                user.is_anonymous && styles.anonymousText,
              ]}>
              {user.is_anonymous ? '匿名账号' : '正式账号'}
            </Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          {onNavigateToTest && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={onNavigateToTest}>
              <Text style={styles.testButtonText}>SDK 功能测试</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#1890ff" />
            ) : (
              <Text style={styles.refreshButtonText}>刷新用户信息</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}>
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        </View>

        {/* 环境信息 */}
        <View style={styles.envInfo}>
          <Text style={styles.envTitle}>CloudBase 环境</Text>
          <Text style={styles.envText}>环境ID: lowcode-1gk9y5ik310a94df</Text>
          <Text style={styles.envText}>地域: ap-shanghai</Text>
          <Text style={styles.envText}>SDK: @cloudbase/js-sdk v3</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAnonymous: {
    backgroundColor: '#999',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  anonymousBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  anonymousBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  anonymousText: {
    color: '#ff9800',
  },
  actions: {
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  refreshButtonText: {
    color: '#1890ff',
    fontSize: 16,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#722ed1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  envInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    opacity: 0.8,
  },
  envTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  envText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default ProfileScreen;

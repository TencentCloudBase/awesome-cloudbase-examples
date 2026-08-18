import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {LoginMethod} from '../types/auth';
import useAuth from '../hooks/useAuth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({onLoginSuccess}) => {
  const {
    loading,
    error,
    loginWithPassword,
    sendPhoneOtp,
    loginWithPhoneOtp,
    sendEmailOtp,
    loginWithEmailOtp,
    loginAnonymously,
    clearError,
  } = useAuth();

  // 当前登录方式
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    LoginMethod.USERNAME_PASSWORD,
  );

  // 表单状态
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');

  // 验证码发送状态
  const [phoneSent, setPhoneSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 验证码倒计时
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      Alert.alert('错误', error);
      clearError();
    }
  }, [error, clearError]);

  // 手机验证码倒计时
  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  // 邮箱验证码倒计时
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // 用户名/邮箱/手机号 + 密码登录
  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    try {
      await loginWithPassword(identifier, password);
      onLoginSuccess();
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 发送手机验证码 (signInWithOtp)
  const handleSendPhoneOtp = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }
    if (phoneCountdown > 0) {
      return;
    }
    try {
      await sendPhoneOtp(phoneNumber);
      setPhoneSent(true);
      setPhoneCountdown(60);
      Alert.alert('成功', '验证码已发送');
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 手机验证码登录 (verifyOtp)
  const handlePhoneLogin = async () => {
    if (!phoneCode.trim()) {
      Alert.alert('提示', '请输入验证码');
      return;
    }
    if (!phoneSent) {
      Alert.alert('提示', '请先获取验证码');
      return;
    }
    try {
      await loginWithPhoneOtp(phoneCode);
      onLoginSuccess();
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 发送邮箱验证码 (signInWithOtp)
  const handleSendEmailOtp = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入邮箱地址');
      return;
    }
    if (emailCountdown > 0) {
      return;
    }
    try {
      await sendEmailOtp(email);
      setEmailSent(true);
      setEmailCountdown(60);
      Alert.alert('成功', '验证码已发送');
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 邮箱验证码登录 (verifyOtp)
  const handleEmailLogin = async () => {
    if (!emailCode.trim()) {
      Alert.alert('提示', '请输入验证码');
      return;
    }
    if (!emailSent) {
      Alert.alert('提示', '请先获取验证码');
      return;
    }
    try {
      await loginWithEmailOtp(emailCode);
      onLoginSuccess();
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 匿名登录 (signInAnonymously)
  const handleAnonymousLogin = async () => {
    try {
      await loginAnonymously();
      onLoginSuccess();
    } catch (e) {
      // 错误已在 useAuth 中处理
    }
  };

  // 渲染登录方式选择器
  const renderMethodSelector = () => (
    <View style={styles.methodSelector}>
      <TouchableOpacity
        style={[
          styles.methodButton,
          loginMethod === LoginMethod.USERNAME_PASSWORD && styles.methodButtonActive,
        ]}
        onPress={() => setLoginMethod(LoginMethod.USERNAME_PASSWORD)}>
        <Text
          style={[
            styles.methodButtonText,
            loginMethod === LoginMethod.USERNAME_PASSWORD &&
              styles.methodButtonTextActive,
          ]}>
          账号密码
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.methodButton,
          loginMethod === LoginMethod.PHONE_OTP && styles.methodButtonActive,
        ]}
        onPress={() => setLoginMethod(LoginMethod.PHONE_OTP)}>
        <Text
          style={[
            styles.methodButtonText,
            loginMethod === LoginMethod.PHONE_OTP && styles.methodButtonTextActive,
          ]}>
          手机验证码
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.methodButton,
          loginMethod === LoginMethod.EMAIL_OTP && styles.methodButtonActive,
        ]}
        onPress={() => setLoginMethod(LoginMethod.EMAIL_OTP)}>
        <Text
          style={[
            styles.methodButtonText,
            loginMethod === LoginMethod.EMAIL_OTP && styles.methodButtonTextActive,
          ]}>
          邮箱验证码
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 渲染用户名密码登录表单
  const renderPasswordForm = () => (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>用户名/手机号/邮箱</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入用户名、手机号或邮箱"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>密码</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <TouchableOpacity
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handlePasswordLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 渲染手机验证码登录表单
  const renderPhoneForm = () => (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>手机号</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入手机号"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>验证码</Text>
        <View style={styles.codeInputRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="请输入验证码"
            value={phoneCode}
            onChangeText={setPhoneCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[
              styles.sendCodeButton,
              phoneCountdown > 0 && styles.sendCodeButtonDisabled,
            ]}
            onPress={handleSendPhoneOtp}
            disabled={phoneCountdown > 0}>
            <Text
              style={[
                styles.sendCodeButtonText,
                phoneCountdown > 0 && styles.sendCodeButtonTextDisabled,
              ]}>
              {phoneCountdown > 0 ? `${phoneCountdown}s` : '发送验证码'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handlePhoneLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 渲染邮箱验证码登录表单
  const renderEmailForm = () => (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>邮箱地址</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入邮箱地址"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>验证码</Text>
        <View style={styles.codeInputRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="请输入验证码"
            value={emailCode}
            onChangeText={setEmailCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[
              styles.sendCodeButton,
              emailCountdown > 0 && styles.sendCodeButtonDisabled,
            ]}
            onPress={handleSendEmailOtp}
            disabled={emailCountdown > 0}>
            <Text
              style={[
                styles.sendCodeButtonText,
                emailCountdown > 0 && styles.sendCodeButtonTextDisabled,
              ]}>
              {emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
        onPress={handleEmailLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 渲染当前登录表单
  const renderCurrentForm = () => {
    switch (loginMethod) {
      case LoginMethod.USERNAME_PASSWORD:
        return renderPasswordForm();
      case LoginMethod.PHONE_OTP:
        return renderPhoneForm();
      case LoginMethod.EMAIL_OTP:
        return renderEmailForm();
      default:
        return renderPasswordForm();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>欢迎登录</Text>
            <Text style={styles.subtitle}>React Native + CloudBase v3</Text>
          </View>

          {renderMethodSelector()}
          {renderCurrentForm()}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>其他登录方式</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.anonymousButton}
            onPress={handleAnonymousLogin}
            disabled={loading}>
            <Text style={styles.anonymousButtonText}>匿名登录</Text>
          </TouchableOpacity>

          <Text style={styles.tipText}>
            提示：使用前请在 CloudBase 控制台启用对应的登录方式
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: '#1890ff',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  codeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    marginRight: 12,
  },
  sendCodeButton: {
    backgroundColor: '#1890ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendCodeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendCodeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sendCodeButtonTextDisabled: {
    color: '#999',
  },
  loginButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  anonymousButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  anonymousButtonText: {
    color: '#666',
    fontSize: 16,
  },
  tipText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 24,
  },
});

export default LoginScreen;

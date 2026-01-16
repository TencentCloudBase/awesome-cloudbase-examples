import {useState, useEffect, useCallback, useRef} from 'react';
import {
  AuthState,
  UserInfo,
  VerifyOtpFunction,
  AuthEventType,
} from '../types/auth';
import authService from '../services/authService';
import {isConfigured} from '../config/cloudbase';

/**
 * 认证 Hook - 基于 @cloudbase/js-sdk v3 API
 * 注意：只有在 CloudBase 已初始化后才能使用
 */
export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
    loading: true,
    error: null,
  });

  // 验证码回调函数缓存
  const phoneVerifyRef = useRef<VerifyOtpFunction | null>(null);
  const emailVerifyRef = useRef<VerifyOtpFunction | null>(null);

  // 初始化检查登录状态
  useEffect(() => {
    // 未配置时不执行任何操作
    if (!isConfigured()) {
      setState(prev => ({...prev, loading: false}));
      return;
    }

    checkSession();

    // 监听认证状态变化
    authService.onAuthStateChange(
      (event: AuthEventType, session, _info) => {
        console.log('Auth state changed:', event, session, _info);
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              setState({
                isLoggedIn: true,
                user: session.user as UserInfo,
                loading: false,
                error: null,
              });
            }
            break;
          case 'SIGNED_OUT':
            setState({
              isLoggedIn: false,
              user: null,
              loading: false,
              error: null,
            });
            break;
          case 'TOKEN_REFRESHED':
            // Token 刷新，可能需要更新用户信息
            checkSession();
            break;
          case 'INITIAL_SESSION':
            if (session?.user) {
              setState({
                isLoggedIn: true,
                user: session.user as UserInfo,
                loading: false,
                error: null,
              });
            } else {
              setState(prev => ({...prev, loading: false}));
            }
            break;
        }
      },
    );
  }, []);

  // 检查当前会话状态
  const checkSession = useCallback(async () => {
    try {
      setState(prev => ({...prev, loading: true, error: null}));
      const {user, session, error} = await authService.getSession();

      if (error) {
        setState({
          isLoggedIn: false,
          user: null,
          loading: false,
          error: error.message,
        });
        return;
      }

      setState({
        isLoggedIn: !!session,
        user: user,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        isLoggedIn: false,
        user: null,
        loading: false,
        error: (error as Error).message,
      });
    }
  }, []);

  // 用户名/邮箱/手机号 + 密码登录
  const loginWithPassword = useCallback(
    async (identifier: string, password: string) => {
      try {
        setState(prev => ({...prev, loading: true, error: null}));
        const result = await authService.signInWithPassword(identifier, password);

        if (result.error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: getErrorMessage(result.error!.code),
          }));
          throw result.error;
        }

        // 登录成功，状态会通过 onAuthStateChange 更新
        setState(prev => ({...prev, loading: false}));
      } catch (error: any) {
        if (!error.code) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: (error as Error).message,
          }));
        }
        throw error;
      }
    },
    [],
  );

  // 发送手机验证码
  const sendPhoneOtp = useCallback(async (phoneNumber: string) => {
    try {
      const {verifyOtp, error} = await authService.sendPhoneOtp(phoneNumber);

      if (error) {
        setState(prev => ({
          ...prev,
          error: getErrorMessage(error.code),
        }));
        throw error;
      }

      // 保存验证回调函数
      phoneVerifyRef.current = verifyOtp;
      return true;
    } catch (error: any) {
      if (!error.code) {
        setState(prev => ({
          ...prev,
          error: (error as Error).message,
        }));
      }
      throw error;
    }
  }, []);

  // 手机验证码登录
  const loginWithPhoneOtp = useCallback(async (code: string) => {
    if (!phoneVerifyRef.current) {
      throw new Error('请先获取验证码');
    }

    try {
      setState(prev => ({...prev, loading: true, error: null}));
      const result = await phoneVerifyRef.current({token: code});

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: getErrorMessage(result.error.code),
        }));
        throw result.error;
      }

      // 清除验证回调
      phoneVerifyRef.current = null;
      setState(prev => ({...prev, loading: false}));
    } catch (error: any) {
      if (!error.code) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: (error as Error).message,
        }));
      }
      throw error;
    }
  }, []);

  // 发送邮箱验证码
  const sendEmailOtp = useCallback(async (email: string) => {
    try {
      const {verifyOtp, error} = await authService.sendEmailOtp(email);

      if (error) {
        setState(prev => ({
          ...prev,
          error: getErrorMessage(error.code),
        }));
        throw error;
      }

      // 保存验证回调函数
      emailVerifyRef.current = verifyOtp;
      return true;
    } catch (error: any) {
      if (!error.code) {
        setState(prev => ({
          ...prev,
          error: (error as Error).message,
        }));
      }
      throw error;
    }
  }, []);

  // 邮箱验证码登录
  const loginWithEmailOtp = useCallback(async (code: string) => {
    if (!emailVerifyRef.current) {
      throw new Error('请先获取验证码');
    }

    try {
      setState(prev => ({...prev, loading: true, error: null}));
      const result = await emailVerifyRef.current({token: code});

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: getErrorMessage(result.error.code),
        }));
        throw result.error;
      }

      // 清除验证回调
      emailVerifyRef.current = null;
      setState(prev => ({...prev, loading: false}));
    } catch (error: any) {
      if (!error.code) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: (error as Error).message,
        }));
      }
      throw error;
    }
  }, []);

  // 匿名登录
  const loginAnonymously = useCallback(async () => {
    try {
      setState(prev => ({...prev, loading: true, error: null}));
      const result = await authService.signInAnonymously();

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: getErrorMessage(result.error!.code),
        }));
        throw result.error;
      }

      setState(prev => ({...prev, loading: false}));
    } catch (error: any) {
      if (!error.code) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: (error as Error).message,
        }));
      }
      throw error;
    }
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    try {
      setState(prev => ({...prev, loading: true, error: null}));
      const {error} = await authService.signOut();

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        throw error;
      }

      setState({
        isLoggedIn: false,
        user: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({...prev, error: null}));
  }, []);

  return {
    ...state,
    loginWithPassword,
    sendPhoneOtp,
    loginWithPhoneOtp,
    sendEmailOtp,
    loginWithEmailOtp,
    loginAnonymously,
    logout,
    clearError,
    refreshUser: checkSession,
  };
};

// 错误码映射 (v3 API 错误码)
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    // 通用错误
    unreachable: '网络连接失败，请检查网络设置',
    permission_denied: '权限不足，请检查安全域名配置',
    resource_exhausted: '请求过于频繁，请稍后再试',

    // 登录相关
    not_found: '用户不存在',
    invalid_password: '密码不正确',
    password_not_set: '当前用户未设置密码，请使用验证码登录',
    user_pending: '该用户未激活，请联系管理员',
    user_blocked: '该用户被停用，请联系管理员',
    invalid_status: '密码重试次数过多，请稍后重试',

    // 验证码相关
    invalid_code: '验证码不正确',
    code_expired: '验证码已过期，请重新获取',
    max_attempts_exceeded: '验证次数过多，请稍后重试',
    captcha_required: '需要图形验证码',
    captcha_invalid: '验证码不正确',

    // 注册相关
    email_already_exists: '邮箱已被注册',
    phone_already_exists: '手机号已被注册',
    username_already_exists: '用户名已被使用',
    password_too_weak: '密码强度不足',
    invalid_email: '邮箱格式错误',
    invalid_phone: '手机号格式错误',

    // 令牌相关
    invalid_refresh_token: '刷新令牌无效，请重新登录',
    refresh_token_expired: '刷新令牌已过期，请重新登录',
    token_expired: '访问令牌已过期',

    // 第三方登录
    invalid_provider_token: '第三方平台令牌无效',
    provider_not_supported: '不支持的第三方平台',
    failed_precondition: '从第三方获取用户信息失败',
  };
  return messages[code] || `操作失败: ${code}`;
}

export default useAuth;

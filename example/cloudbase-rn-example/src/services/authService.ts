import {getAuth} from '../config/cloudbase';
import {
  UserInfo,
  Session,
  SignInResult,
  VerifyOtpFunction,
  AuthEventType,
} from '../types/auth';

/**
 * 认证服务 - 基于 @cloudbase/js-sdk v3 API
 */
export const authService = {
  /**
   * 用户名/邮箱/手机号 + 密码登录
   * signInWithPassword API
   */
  async signInWithPassword(
    identifier: string,
    password: string,
  ): Promise<SignInResult> {
    const auth = getAuth();
    // 判断是邮箱、手机号还是用户名
    const isEmail = identifier.includes('@');
    const isPhone = /^1[3-9]\d{9}$/.test(identifier);

    const params: any = {password};
    if (isEmail) {
      params.email = identifier;
    } else if (isPhone) {
      params.phone = identifier;
    } else {
      params.username = identifier;
    }

    const result = await auth.signInWithPassword(params);
    return result as SignInResult;
  },

  /**
   * 发送手机验证码并获取验证回调
   * signInWithOtp API - phone
   */
  async sendPhoneOtp(phoneNumber: string): Promise<{
    verifyOtp: VerifyOtpFunction | null;
    error: any;
  }> {
    const auth = getAuth();
    const result = await auth.signInWithOtp({
      phone: phoneNumber,
    });
    return {
      verifyOtp: result.data?.verifyOtp ?? null,
      error: result.error,
    };
  },

  /**
   * 发送邮箱验证码并获取验证回调
   * signInWithOtp API - email
   */
  async sendEmailOtp(email: string): Promise<{
    verifyOtp: VerifyOtpFunction | null;
    error: any;
  }> {
    const auth = getAuth();
    const result = await auth.signInWithOtp({
      email: email,
    });
    return {
      verifyOtp: result.data?.verifyOtp ?? null,
      error: result.error,
    };
  },

  /**
   * 匿名登录
   * signInAnonymously API
   */
  async signInAnonymously(): Promise<SignInResult> {
    const auth = getAuth();
    const result = await auth.signInAnonymously();
    return result as SignInResult;
  },

  /**
   * 获取当前会话信息
   * getSession API
   */
  async getSession(): Promise<{
    user: UserInfo | null;
    session: Session | null;
    error: any;
  }> {
    const auth = getAuth();
    const result = await auth.getSession();
    return {
      user: result.data?.session?.user || null,
      session: result.data?.session || null,
      error: result.error,
    };
  },

  /**
   * 刷新会话
   * refreshSession API
   */
  async refreshSession(): Promise<SignInResult> {
    const auth = getAuth();
    const result = await auth.refreshSession();
    return result as SignInResult;
  },

  /**
   * 退出登录
   * signOut API
   */
  async signOut(): Promise<{error: any}> {
    const auth = getAuth();
    const result = await auth.signOut();
    return {error: result.error};
  },

  /**
   * 监听认证状态变化
   * onAuthStateChange API
   */
  onAuthStateChange(
    callback: (
      event: AuthEventType,
      session: Session | null,
      info?: any,
    ) => void,
  ): void {
    const auth = getAuth();
    auth.onAuthStateChange((event: any, session: any, info: any) => {
      callback(event as AuthEventType, session, info);
    });
  },

  /**
   * 用户注册（智能注册并登录流程）
   * signUp API
   */
  async signUp(params: {
    email?: string;
    phone?: string;
    password?: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    gender?: 'MALE' | 'FEMALE';
    anonymous_token?: string;
  }): Promise<{
    verifyOtp: VerifyOtpFunction | null;
    error: any;
  }> {
    const auth = getAuth();
    const result = await auth.signUp(params);
    return {
      verifyOtp: result.data?.verifyOtp ?? null,
      error: result.error,
    };
  },

  /**
   * 更新用户信息
   * updateUser API
   */
  async updateUser(data: {
    nickname?: string;
    avatar_url?: string;
    gender?: 'MALE' | 'FEMALE';
  }): Promise<{error: any}> {
    const auth = getAuth();
    const result = await auth.updateUser(data);
    return {error: result.error};
  },
};

export default authService;

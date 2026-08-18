import { sys } from 'cc';
import { cloudbaseService } from './CloudbaseService';
import { STORAGE_KEYS } from '../config/CloudbaseConfig';

export interface User {
  uid?: string;
  email?: string;
  phone?: string;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  loginType?: string;
}

/**
 * 认证服务类
 */
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {
    this.loadUser();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadUser(): void {
    const userStr = sys.localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch {
        this.currentUser = null;
      }
    }
  }

  private saveUser(user: User): void {
    this.currentUser = user;
    sys.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearUser(): void {
    this.currentUser = null;
    sys.localStorage.removeItem(STORAGE_KEYS.USER);
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * 用户名密码登录
   */
  async signInWithPassword(username: string, password: string): Promise<{ error?: any; user?: User }> {
    try {
      const auth = cloudbaseService.getAuth();
      const result = await auth.signInWithPassword({ username, password });
      
      if (result.error) {
        return { error: result.error };
      }

      const user: User = {
        uid: result.data?.session?.user?.id || result.data?.user?.id,
        username: result.data?.session?.user?.user_metadata?.username || username,
        loginType: 'PASSWORD',
      };
      this.saveUser(user);
      return { user };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * 发送手机验证码
   */
  async sendPhoneOtp(phone: string): Promise<{ verifyOtp?: (code: string) => Promise<any>; error?: any }> {
    try {
      const auth = cloudbaseService.getAuth();
      const result = await auth.signInWithOtp({ phone });

      if (result.error) {
        return { error: result.error };
      }

      const verifyOtp = async (token: string) => {
        const verifyResult = await result.data?.verifyOtp?.({ token, phone });
        if (!verifyResult?.error) {
          const user: User = {
            uid: verifyResult?.data?.session?.user?.id,
            phone,
            loginType: 'PHONE_OTP',
          };
          this.saveUser(user);
        }
        return verifyResult;
      };

      return { verifyOtp: result.data?.verifyOtp ? verifyOtp : undefined };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * 发送邮箱验证码
   */
  async sendEmailOtp(email: string): Promise<{ verifyOtp?: (code: string) => Promise<any>; error?: any }> {
    try {
      const auth = cloudbaseService.getAuth();
      const result = await auth.signInWithOtp({ email });

      if (result.error) {
        return { error: result.error };
      }

      const verifyOtp = async (token: string) => {
        const verifyResult = await result.data?.verifyOtp?.({ token, email });
        if (!verifyResult?.error) {
          const user: User = {
            uid: verifyResult?.data?.session?.user?.id,
            email,
            loginType: 'EMAIL_OTP',
          };
          this.saveUser(user);
        }
        return verifyResult;
      };

      return { verifyOtp: result.data?.verifyOtp ? verifyOtp : undefined };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * 匿名登录
   */
  async signInAnonymously(): Promise<{ error?: any; user?: User }> {
    try {
      const auth = cloudbaseService.getAuth();
      const result = await auth.signInAnonymously();

      if (result.error) {
        return { error: result.error };
      }

      const user: User = {
        uid: result.data?.session?.user?.id || result.data?.user?.id,
        loginType: 'ANONYMOUS',
      };
      this.saveUser(user);
      return { user };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const auth = cloudbaseService.getAuth();
      const user = await auth.getCurrentUser();
      if (user) {
        const userData: User = {
          uid: user.uid,
          email: user.email,
          username: user.username,
          loginType: user.loginType,
        };
        this.saveUser(userData);
        return userData;
      }
      return null;
    } catch {
      return this.currentUser;
    }
  }

  /**
   * 退出登录
   */
  async signOut(): Promise<void> {
    try {
      const auth = cloudbaseService.getAuth();
      await auth.signOut();
    } catch {
      // 忽略错误
    }
    this.clearUser();
  }
}

export const authService = AuthService.getInstance();

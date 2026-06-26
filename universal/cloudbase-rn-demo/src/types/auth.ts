// 用户信息类型 (v3 API)
export interface UserInfo {
  id: string;
  email?: string;
  phone?: string;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  gender?: 'MALE' | 'FEMALE';
  is_anonymous?: boolean;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, any>;
}

// 会话信息类型 (v3 API)
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: UserInfo;
}

// 登录方式枚举
export enum LoginMethod {
  USERNAME_PASSWORD = 'username_password',
  PHONE_OTP = 'phone_otp',
  EMAIL_OTP = 'email_otp',
  ANONYMOUS = 'anonymous',
}

// 验证 OTP 回调函数类型 - 使用更宽松的类型以兼容 SDK
export type VerifyOtpFunction = (params: {
  token: string;
  messageId?: string;
}) => Promise<any>;

// 登录结果类型
export interface SignInResult {
  data: {
    user?: UserInfo;
    session?: Session;
  };
  error: AuthError | null;
}

// OTP 登录结果类型
export interface OtpResult {
  data: {
    verifyOtp: VerifyOtpFunction;
  };
  error: AuthError | null;
}

// 认证错误类型
export interface AuthError {
  code: string;
  message: string;
}

// 认证状态
export interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
}

// 认证事件类型
export type AuthEventType =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'PASSWORD_RECOVERY'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'BIND_IDENTITY';

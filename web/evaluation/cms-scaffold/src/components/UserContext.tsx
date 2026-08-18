import { createContext, useContext } from "react";
import type { CurrentUser } from "../types";

export interface UserContextValue {
  currentUser: CurrentUser | null;
  loading: boolean;
}

export const UserContext = createContext<UserContextValue>({
  currentUser: null,
  loading: true,
});

/**
 * 获取当前用户信息的 Hook
 * 必须在 ProtectedRoute 包裹的组件内使用
 */
export function useCurrentUser(): UserContextValue {
  return useContext(UserContext);
}

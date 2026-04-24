import { useState, useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { checkAuth, getCurrentUser } from "../lib/auth";
import { UserContext } from "./UserContext";
import type { CurrentUser } from "../types";

interface Props {
  children: ReactNode;
}

/**
 * 路由守卫组件
 *
 * 检查登录状态,未登录则跳转到 /login。
 * 登录后获取当前用户信息并通过 UserContext 向下传递。
 */
export default function ProtectedRoute({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    checkAuth()
      .then(async (result) => {
        setAuthed(result);
        if (result) {
          try {
            const user = await getCurrentUser();
            setCurrentUser(user);
          } catch (err) {
            console.error("获取用户信息失败:", err);
          }
        }
      })
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div data-testid="auth-checking" className="loading">检查登录状态...</div>;
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return (
    <UserContext.Provider value={{ currentUser, loading: false }}>
      {children}
    </UserContext.Provider>
  );
}

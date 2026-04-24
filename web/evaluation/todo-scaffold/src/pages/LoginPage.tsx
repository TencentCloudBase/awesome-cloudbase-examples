import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(account, password);
      if (success) {
        navigate("/todos", { replace: true });
      } else {
        setError("登录失败,请检查用户名或密码");
      }
    } catch (err: any) {
      setError(err?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="page auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Todo 应用</h1>

        <form
          data-testid="login-form"
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="login-account">用户名</label>
            <input
              data-testid="login-account-input"
              id="login-account"
              type="text"
              placeholder="请输入用户名"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label htmlFor="login-password">密码</label>
            <input
              data-testid="login-password-input"
              id="login-password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div data-testid="login-error" className="form-error">
              {error}
            </div>
          )}

          {loading && (
            <div data-testid="login-loading" className="form-loading">
              登录中...
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !account || !password}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="auth-switch-link">
          没有账号?<Link to="/register">创建账号</Link>
        </div>
      </div>
    </div>
  );
}

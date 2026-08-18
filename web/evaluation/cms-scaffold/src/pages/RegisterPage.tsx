import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../lib/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 前端校验：密码一致性
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    // 前端校验：密码长度
    if (password.length < 6) {
      setError("密码长度不能少于 6 位");
      return;
    }

    setLoading(true);

    try {
      const ok = await register(account, password);
      if (ok) {
        setSuccess("注册成功，即将跳转到登录页...");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1500);
      } else {
        setError("注册失败，请重试");
      }
    } catch (err: any) {
      setError(err?.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="register-page" className="page login-page">
      <div className="login-container">
        <h1 className="login-title">创建账号</h1>

        <form
          data-testid="register-form"
          className="login-form"
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <label htmlFor="register-account">用户名</label>
            <input
              data-testid="register-account-input"
              id="register-account"
              type="text"
              placeholder="请输入用户名"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-password">密码</label>
            <input
              data-testid="register-password-input"
              id="register-password"
              type="password"
              placeholder="请输入密码（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="register-confirm-password">确认密码</label>
            <input
              data-testid="register-confirm-password-input"
              id="register-confirm-password"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div data-testid="register-error" className="form-error">
              {error}
            </div>
          )}

          {success && (
            <div data-testid="register-success" className="form-success">
              {success}
            </div>
          )}

          {loading && (
            <div data-testid="register-loading" className="form-loading">
              注册中...
            </div>
          )}

          <button
            data-testid="register-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !account || !password || !confirmPassword}
          >
            {loading ? "注册中..." : "创建账号"}
          </button>
        </form>

        <div className="auth-switch-link">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
}

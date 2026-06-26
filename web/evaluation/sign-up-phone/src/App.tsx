import { useRef, useState } from 'react'
import './App.css'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const verifyOtpRef = useRef<((params: { token: string }) => Promise<unknown>) | null>(null)

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) return
    setLoading(true)
    try {
      // TODO: 调用发送验证码 API，并把返回的 data.verifyOtp 保存到 verifyOtpRef.current
      // 这里故意使用 ref，而不是 useState：直接 setState(fn) 会被 React 当成 updater 执行
      setCodeSent(true)
    } catch (error) {
      console.error('发送验证码失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 注册
  const handleRegister = async () => {
    if (!phone || !code || !verifyOtpRef.current) return
    setLoading(true)
    try {
      // TODO: 调用注册 API，例如 await verifyOtpRef.current({ token: code })
    } catch (error) {
      console.error('注册失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container" data-testid="register-container">
      <h1 data-testid="register-title">手机号注册</h1>

      <div className="form-group" data-testid="username-form-group">
        <input
          type="text"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          data-testid="username-input"
        />
      </div>

      <div className="form-group" data-testid="password-form-group">
        <input
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          data-testid="password-input"
        />
      </div>

      <div className="form-group" data-testid="phone-form-group">
        <input
          type="tel"
          placeholder="请输入手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          data-testid="phone-input"
        />
        <button
          onClick={handleSendCode}
          disabled={!phone || loading}
          className="send-code-btn"
          data-testid="send-code-btn"
        >
          {codeSent ? '重新发送' : '发送验证码'}
        </button>
      </div>

      <div className="form-group" data-testid="code-form-group">
        <input
          type="text"
          placeholder="请输入验证码"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          data-testid="verification-code-input"
        />
      </div>

      <button
        onClick={handleRegister}
        disabled={!phone || !code || loading}
        className="register-btn"
        data-testid="register-btn"
      >
        {loading ? '处理中...' : '注册'}
      </button>
    </div>
  )
}

export default App

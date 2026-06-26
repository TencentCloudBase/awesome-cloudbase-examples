import { useRef, useState } from 'react'
import './App.css'

function App() {
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

  // 登录
  const handleLogin = async () => {
    if (!phone || !code || !verifyOtpRef.current) return
    setLoading(true)
    try {
      // TODO: 调用登录 API，例如 await verifyOtpRef.current({ token: code })
    } catch (error) {
      console.error('登录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" data-testid="login-container">
      <h1 data-testid="login-title">手机号登录</h1>

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
        onClick={handleLogin}
        disabled={!phone || !code || loading}
        className="login-btn"
        data-testid="login-btn"
      >
        {loading ? '处理中...' : '登录'}
      </button>
    </div>
  )
}

export default App
